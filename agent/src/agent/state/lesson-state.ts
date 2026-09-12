/** A single segment of Deepgram transcription. */
export interface TranscriptSegment {
  /** The transcribed text (in French). */
  text: string;
  /** ISO 8601 timestamp of the segment. */
  timestamp: string;
  /** Deepgram confidence score (0-1). */
  confidence: number;
  /** True if confidence was below the low-confidence threshold. */
  lowConfidence?: boolean;
}

/** An example used by the teacher during a concept. */
export interface ExampleEntry {
  /** The example content as transcribed (in French). */
  content: string;
  /** Type of example. */
  type: "numeric" | "geometric" | "word_problem" | "demonstration" | "analogy" | "other";
  /** ISO 8601 timestamp when this example was mentioned. */
  timestamp: string;
  /** True if this example appears in the course document. */
  fromDocument: boolean;
}

/** A single concept tracked during the lesson. */
export interface ConceptEntry {
  /** Internal unique identifier. */
  id: string;
  /** Human-readable concept name in French (e.g., "Addition de fractions"). */
  name: string;
  /** The course document section this concept maps to, or null if off-document. */
  documentSection: string | null;
  /** True if this concept was not in the teacher's course document. */
  offDocument: boolean;
  /** ISO 8601 timestamp when tracking this concept began. */
  startTime: string;
  /** ISO 8601 timestamp when tracking this concept ended (null if current). */
  endTime: string | null;
  /** Minutes spent on this concept (computed at wrap time). */
  timeOnConcept: number;
  /** Examples used during this concept. */
  examples: ExampleEntry[];
  /** 2-3 sentence summary of what was taught (in French). Set at wrap time. */
  summary: string | null;
  /** Why this concept was wrapped. */
  wrapReason: "topic_shift" | "summary_and_transition" | "time_exceeded" | "lesson_ended" | null;
}

/** The complete live model of the lesson, owned and written exclusively by Lesson Tracker. */
export interface LessonState {
  /** The concept currently being taught, or null if between concepts or lesson not active. */
  currentConcept: ConceptEntry | null;
  /** Chronological list of all concepts covered so far in this lesson. Newest is last. */
  conceptHistory: ConceptEntry[];
  /** Examples the teacher has used during the current concept. */
  examplesUsed: ExampleEntry[];
  /** Minutes spent on the current concept (computed from currentConcept.startTime). */
  timeOnConcept: number;
  /** Current phase of the lesson. */
  lessonPhase: "idle" | "active" | "paused" | "ended";
  /** ISO 8601 timestamp when the lesson started. Null if not started. */
  lessonStartTime: string | null;
  /** ISO 8601 timestamp when the lesson ended. Null if not ended. */
  lessonEndTime: string | null;
  /** Rolling buffer of recent transcript segments (last 5 minutes). */
  currentTranscriptBuffer: TranscriptSegment[];
}

/** The context package sent to Question Builder when a concept wraps. */
export interface ConceptContext {
  /** The concept name (French). */
  conceptName: string;
  /** 2-3 sentence summary of what was taught (French). */
  conceptSummary: string;
  /** Last 3 minutes of transcript (verbatim segments with timestamps). */
  transcriptExcerpt: TranscriptSegment[];
  /** Examples used during this concept. */
  examplesUsed: ExampleEntry[];
  /** Duration in minutes. */
  timeOnConcept: number;
  /** Course document section this maps to, or null. */
  documentSection: string | null;
  /** Whether this concept was off-document. */
  offDocument: boolean;
}

export interface CourseDocumentSection {
  /** Section identifier (e.g., "3.1"). */
  id: string;
  /** Section title (French). */
  title: string;
  /** Key concepts covered in this section. */
  concepts: string[];
  /** Examples provided in the document. */
  examples: string[];
  /** Mathematical notation conventions used. */
  notation: string[];
}

export interface CourseDocument {
  /** Document title (e.g., "Chapitre 3: Les fractions"). */
  title: string;
  /** Ordered list of sections in the document. */
  sections: CourseDocumentSection[];
  /** The grade level this document targets (6eme, 5eme, 4eme, 3eme). */
  gradeLevel: string;
  /** Subject area (always "mathematiques" for this project). */
  subject: string;
}

const BUFFER_WINDOW_MS = 5 * 60 * 1000;
const TIME_EXCEEDED_MINUTES = 12;

export const initialLessonState: LessonState = {
  currentConcept: null,
  conceptHistory: [],
  examplesUsed: [],
  timeOnConcept: 0,
  lessonPhase: "idle",
  lessonStartTime: null,
  lessonEndTime: null,
  currentTranscriptBuffer: [],
};

/** Singleton mutable lesson state. Single-teacher, single-lesson-at-a-time demo scope. */
export const lessonState: LessonState = { ...initialLessonState, currentTranscriptBuffer: [] };

/** Cached parsed course document, loaded once per lesson via `load_course_document`. */
export let courseDocument: CourseDocument | null = null;

export function setCourseDocument(doc: CourseDocument | null): void {
  courseDocument = doc;
}

export function resetLessonState(): void {
  lessonState.currentConcept = null;
  lessonState.conceptHistory = [];
  lessonState.examplesUsed = [];
  lessonState.timeOnConcept = 0;
  lessonState.lessonPhase = "idle";
  lessonState.lessonStartTime = null;
  lessonState.lessonEndTime = null;
  lessonState.currentTranscriptBuffer = [];
}

export function minutesBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, (end - start) / 60_000);
}

/** Trims the transcript buffer to segments within the given window (ms) counted back from `nowIso`. */
export function trimBufferToWindow(
  buffer: TranscriptSegment[],
  windowMs: number,
  nowIso: string,
): TranscriptSegment[] {
  const now = new Date(nowIso).getTime();
  if (Number.isNaN(now)) return buffer;
  return buffer.filter((segment) => {
    const t = new Date(segment.timestamp).getTime();
    return !Number.isNaN(t) && now - t <= windowMs;
  });
}

export function appendTranscriptSegment(segment: TranscriptSegment): void {
  lessonState.currentTranscriptBuffer = trimBufferToWindow(
    [...lessonState.currentTranscriptBuffer, segment],
    BUFFER_WINDOW_MS,
    segment.timestamp,
  );
}

export function newConceptEntry(name: string, startTime: string, documentSection: string | null): ConceptEntry {
  return {
    id: `concept_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    documentSection,
    offDocument: documentSection === null,
    startTime,
    endTime: null,
    timeOnConcept: 0,
    examples: [],
    summary: null,
    wrapReason: null,
  };
}

export const CONCEPT_TIME_EXCEEDED_MINUTES = TIME_EXCEEDED_MINUTES;
