import { defineTool } from "@copilotkit/runtime/v2";
import { z } from "zod";
import {
  appendTranscriptSegment,
  CONCEPT_TIME_EXCEEDED_MINUTES,
  courseDocument,
  lessonState,
  minutesBetween,
  newConceptEntry,
  resetLessonState,
  setCourseDocument,
  trimBufferToWindow,
  type ConceptContext,
  type ConceptEntry,
  type CourseDocument,
  type CourseDocumentSection,
} from "@/agent/state/lesson-state";

const LOW_CONFIDENCE_THRESHOLD = 0.4;
const COMMAND_CONFIDENCE_THRESHOLD = 0.6;
const EXCERPT_WINDOW_MS = 3 * 60 * 1000;

const DISCOURSE_MARKERS = [
  "passons à",
  "passons a",
  "maintenant",
  "on va voir",
  "ensuite",
  "prochaine notion",
  "autre chose",
  "alors",
  "bon",
  "donc",
];

type TeacherCommand = "start_lesson" | "end_lesson" | "pause" | "resume";

const COMMAND_PHRASES: Record<TeacherCommand, string[]> = {
  start_lesson: ["start lesson", "commencer le cours"],
  end_lesson: ["end lesson", "terminer le cours"],
  pause: ["pause"],
  resume: ["resume", "reprendre"],
};

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * Checks whether a transcript segment or text input matches one of the four
 * teacher voice commands. Called before `ingest_transcript_segment` so
 * commands never enter the transcript buffer as lesson content.
 */
export const parse_teacher_command = defineTool({
  name: "parse_teacher_command",
  description:
    "Checks whether a piece of text matches one of the four teacher voice commands (start lesson, end lesson, pause, resume), in French or English. Call this before ingest_transcript_segment for every incoming segment.",
  parameters: z.object({
    text: z.string().describe("The text to check for a teacher command"),
  }),
  execute: async ({ text }) => {
    const normalized = normalize(text);
    if (!normalized) {
      return { command: null, matchedPhrase: null, confidence: 0 };
    }

    let best: { command: TeacherCommand; phrase: string; confidence: number } | null = null;
    for (const [command, phrases] of Object.entries(COMMAND_PHRASES) as [TeacherCommand, string[]][]) {
      for (const phrase of phrases) {
        if (normalized === phrase) {
          best = { command, phrase, confidence: 0.95 };
          break;
        }
        if (normalized.includes(phrase) && (!best || best.confidence < 0.75)) {
          best = { command, phrase, confidence: 0.75 };
        }
      }
      if (best?.confidence === 0.95) break;
    }

    if (!best || best.confidence < COMMAND_CONFIDENCE_THRESHOLD) {
      return { command: null, matchedPhrase: null, confidence: best?.confidence ?? 0 };
    }

    return { command: best.command, matchedPhrase: best.phrase, confidence: best.confidence };
  },
});

/**
 * Applies a matched teacher command to the lesson lifecycle. Call this after
 * `parse_teacher_command` returns a non-null command.
 */
export const apply_teacher_command = defineTool({
  name: "apply_teacher_command",
  description:
    "Applies a teacher lifecycle command (start_lesson, end_lesson, pause, resume) matched by parse_teacher_command to the live lesson state.",
  parameters: z.object({
    command: z.enum(["start_lesson", "end_lesson", "pause", "resume"]),
    timestamp: z.string().optional().describe("ISO 8601 timestamp; defaults to now"),
  }),
  execute: async ({ command, timestamp }) => {
    const ts = timestamp ?? new Date().toISOString();

    switch (command) {
      case "start_lesson": {
        resetLessonState();
        lessonState.lessonPhase = "active";
        lessonState.lessonStartTime = ts;
        return { lessonPhase: lessonState.lessonPhase, lessonStartTime: ts, lessonEndTime: null, applied: true };
      }
      case "end_lesson": {
        if (lessonState.lessonPhase === "idle") {
          return {
            lessonPhase: lessonState.lessonPhase,
            lessonStartTime: lessonState.lessonStartTime,
            lessonEndTime: lessonState.lessonEndTime,
            applied: false,
          };
        }
        lessonState.lessonPhase = "ended";
        lessonState.lessonEndTime = ts;
        return {
          lessonPhase: lessonState.lessonPhase,
          lessonStartTime: lessonState.lessonStartTime,
          lessonEndTime: ts,
          applied: true,
        };
      }
      case "pause": {
        const applied = lessonState.lessonPhase === "active";
        if (applied) lessonState.lessonPhase = "paused";
        return {
          lessonPhase: lessonState.lessonPhase,
          lessonStartTime: lessonState.lessonStartTime,
          lessonEndTime: lessonState.lessonEndTime,
          applied,
        };
      }
      case "resume": {
        const applied = lessonState.lessonPhase === "paused";
        if (applied) lessonState.lessonPhase = "active";
        return {
          lessonPhase: lessonState.lessonPhase,
          lessonStartTime: lessonState.lessonStartTime,
          lessonEndTime: lessonState.lessonEndTime,
          applied,
        };
      }
    }
  },
});

/**
 * Loads and parses the teacher's course document into the structured
 * CourseDocument format. Heuristic markdown parsing: `#` = title, `##` =
 * sections, bullet lines are sorted into concepts/examples/notation by
 * keyword. Called once at lesson start.
 */
export const load_course_document = defineTool({
  name: "load_course_document",
  description:
    "Parses the teacher's course document (raw markdown) into a structured CourseDocument and caches it for the lesson.",
  parameters: z.object({
    documentRaw: z.string().nullable().describe("Raw markdown/text of the course document"),
  }),
  execute: async ({ documentRaw }) => {
    if (!documentRaw || !documentRaw.trim()) {
      setCourseDocument(null);
      return { courseDocument: null, parseErrors: ["No course document provided"] };
    }

    const parseErrors: string[] = [];
    const lines = documentRaw.split("\n");

    let title = "Untitled course document";
    const sections: CourseDocumentSection[] = [];
    let current: CourseDocumentSection | null = null;
    let sectionIndex = 0;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (line.startsWith("## ")) {
        sectionIndex += 1;
        current = {
          id: String(sectionIndex),
          title: line.slice(3).trim(),
          concepts: [],
          examples: [],
          notation: [],
        };
        sections.push(current);
        continue;
      }

      if (line.startsWith("# ")) {
        title = line.slice(2).trim();
        continue;
      }

      if (line.startsWith("- ") || line.startsWith("* ")) {
        const item = line.slice(2).trim();
        if (!current) {
          parseErrors.push(`Bullet found before any section heading: "${item}"`);
          continue;
        }
        const lower = item.toLowerCase();
        if (lower.includes("exemple") || lower.includes("example")) {
          current.examples.push(item);
        } else if (lower.includes("notation")) {
          current.notation.push(item);
        } else {
          current.concepts.push(item);
        }
      }
    }

    const gradeMatch = documentRaw.match(/6ème|5ème|4ème|3ème/i);

    const parsed: CourseDocument = {
      title,
      sections,
      gradeLevel: gradeMatch?.[0] ?? "unknown",
      subject: "mathématiques",
    };

    setCourseDocument(parsed);
    return { courseDocument: parsed, parseErrors };
  },
});

/**
 * Receives a single transcription segment and processes it into lesson
 * state. The primary ingestion path — called for every non-command segment
 * the Deepgram stream pushes. Buffering always takes priority over analysis.
 */
export const ingest_transcript_segment = defineTool({
  name: "ingest_transcript_segment",
  description:
    "Ingests one transcription segment (already confirmed NOT to be a teacher command) into the rolling transcript buffer and current concept tracking.",
  parameters: z.object({
    text: z.string(),
    timestamp: z.string().describe("ISO 8601 timestamp"),
    confidence: z.number().min(0).max(1),
  }),
  execute: async ({ text, timestamp, confidence }) => {
    if (!text.trim()) {
      return {
        segmentAppended: false,
        conceptUpdated: false,
        transitionDetected: false,
        conceptWrapped: null as ConceptContext | null,
        error: null,
      };
    }

    let ts = timestamp;
    if (Number.isNaN(new Date(ts).getTime())) {
      ts = new Date().toISOString();
    }

    try {
      appendTranscriptSegment({
        text,
        timestamp: ts,
        confidence,
        lowConfidence: confidence < LOW_CONFIDENCE_THRESHOLD,
      });

      if (lessonState.lessonPhase === "paused" || lessonState.lessonPhase === "idle") {
        return {
          segmentAppended: true,
          conceptUpdated: false,
          transitionDetected: false,
          conceptWrapped: null as ConceptContext | null,
          error: null,
        };
      }

      if (!lessonState.currentConcept) {
        lessonState.currentConcept = newConceptEntry(
          text.length > 60 ? `${text.slice(0, 57)}...` : text,
          ts,
          null,
        );
      }
      lessonState.timeOnConcept = minutesBetween(lessonState.currentConcept.startTime, ts);

      // Transition detection and wrapping are separate tool calls
      // (detect_concept_transition / wrap_concept) driven by the agent's
      // own reasoning loop, not performed inline here.
      return {
        segmentAppended: true,
        conceptUpdated: true,
        transitionDetected: false,
        conceptWrapped: null as ConceptContext | null,
        error: null,
      };
    } catch (err) {
      return {
        segmentAppended: true,
        conceptUpdated: false,
        transitionDetected: false,
        conceptWrapped: null as ConceptContext | null,
        error: err instanceof Error ? err.message : "Unknown ingestion error",
      };
    }
  },
});

/**
 * Analyzes the current transcript buffer and concept state to determine
 * whether the teacher has transitioned to a new concept.
 */
export const detect_concept_transition = defineTool({
  name: "detect_concept_transition",
  description:
    "Analyzes the current transcript buffer against the current concept to detect a concept transition (discourse marker, topic shift, or 12-minute time-exceeded suggestion).",
  parameters: z.object({}),
  execute: async () => {
    const buffer = lessonState.currentTranscriptBuffer;
    if (buffer.length === 0) {
      return {
        transitionDetected: false,
        transitionReason: null,
        discourseMarkerFound: null,
        newConceptName: null,
        documentSectionMatch: null,
        offDocument: false,
        confidence: 0,
      };
    }

    const last = buffer[buffer.length - 1];
    const lastLower = last.text.toLowerCase();
    const marker = DISCOURSE_MARKERS.find((m) => lastLower.includes(m));

    function matchDocumentSection(candidate: string | null): { id: string | null; offDocument: boolean } {
      if (courseDocument === null) {
        // Document not loaded yet — resolved once it loads, per spec.
        return { id: null, offDocument: false };
      }
      if (!candidate) return { id: null, offDocument: true };
      const lowerCandidate = candidate.toLowerCase();
      const match = courseDocument.sections.find((section) =>
        section.concepts.some((c) => lowerCandidate.includes(c.toLowerCase()) || c.toLowerCase().includes(lowerCandidate)),
      );
      return { id: match?.id ?? null, offDocument: !match };
    }

    if (marker && lessonState.currentConcept) {
      const newConceptName = last.text.length > 60 ? `${last.text.slice(0, 57)}...` : last.text;
      const { id, offDocument } = matchDocumentSection(newConceptName);
      return {
        transitionDetected: true,
        transitionReason: "discourse_marker" as const,
        discourseMarkerFound: marker,
        newConceptName,
        documentSectionMatch: id,
        offDocument,
        confidence: 0.7,
      };
    }

    if (lessonState.currentConcept) {
      const elapsed = minutesBetween(lessonState.currentConcept.startTime, last.timestamp);
      if (elapsed >= CONCEPT_TIME_EXCEEDED_MINUTES) {
        return {
          transitionDetected: true,
          transitionReason: "time_exceeded" as const,
          discourseMarkerFound: null,
          newConceptName: null,
          documentSectionMatch: null,
          offDocument: false,
          confidence: 0.55,
        };
      }
    }

    return {
      transitionDetected: false,
      transitionReason: null,
      discourseMarkerFound: null,
      newConceptName: null,
      documentSectionMatch: null,
      offDocument: false,
      confidence: 0,
    };
  },
});

/**
 * Finalizes the current concept, computes its summary, packages the
 * ConceptContext payload for the Question Builder, and moves the entry into
 * conceptHistory.
 */
export const wrap_concept = defineTool({
  name: "wrap_concept",
  description:
    "Finalizes the current concept (sets endTime, timeOnConcept, summary), packages the ConceptContext payload for the Question Builder, and archives it into conceptHistory.",
  parameters: z.object({
    reason: z.enum(["topic_shift", "summary_and_transition", "time_exceeded", "lesson_ended"]).optional(),
    endTime: z.string().optional().describe("ISO 8601 timestamp; defaults to now"),
  }),
  execute: async ({ reason, endTime }) => {
    const current = lessonState.currentConcept;
    if (!current) {
      return {
        conceptContext: null as ConceptContext | null,
        finalizedConcept: null as ConceptEntry | null,
        signalReady: false,
      };
    }

    const ts = endTime ?? new Date().toISOString();
    const timeOnConcept = minutesBetween(current.startTime, ts);

    let excerpt = trimBufferToWindow(lessonState.currentTranscriptBuffer, EXCERPT_WINDOW_MS, ts);
    if (excerpt.length === 0 && lessonState.currentTranscriptBuffer.length > 0) {
      // Never emit an empty excerpt if any transcript exists.
      excerpt = lessonState.currentTranscriptBuffer;
    }

    const summary = `Concept enseigné: ${current.name}. Durée: ${Math.round(timeOnConcept)} minutes.`;

    const finalized: ConceptEntry = {
      ...current,
      endTime: ts,
      timeOnConcept,
      summary,
      wrapReason: reason ?? "topic_shift",
    };

    lessonState.conceptHistory = [...lessonState.conceptHistory, finalized];
    lessonState.currentConcept = null;
    lessonState.timeOnConcept = 0;
    lessonState.examplesUsed = [];

    const conceptContext: ConceptContext = {
      conceptName: finalized.name,
      conceptSummary: summary,
      transcriptExcerpt: excerpt,
      examplesUsed: finalized.examples,
      timeOnConcept,
      documentSection: finalized.documentSection,
      offDocument: finalized.offDocument,
    };

    return { conceptContext, finalizedConcept: finalized, signalReady: true };
  },
});
