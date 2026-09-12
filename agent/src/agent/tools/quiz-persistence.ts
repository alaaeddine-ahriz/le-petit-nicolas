import { defineTool } from "@copilotkit/runtime/v2";
import { z } from "zod";
import { createAdminClient } from "@/utils/supabase/admin";
import { questionBuilderState, validateProposedQuestion, type QuestionOption } from "@/agent/state/question-builder-state";

const OPTION_LABELS = ["A", "B", "C", "D"] as const;

/**
 * Safety net for a recurring model mistake: writing LaTeX (\frac{}{}, \sqrt{},
 * \(...\), $...$, ^{}) even when told not to, which Telegram displays as raw
 * text instead of rendering. Cheap regex conversions rather than a full LaTeX
 * parser - covers the patterns that actually show up in practice.
 */
function stripLatex(text: string): string {
  return text
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "$1/$2")
    .replace(/\\sqrt\{([^{}]*)\}/g, "√$1")
    .replace(/\\left|\\right/g, "")
    .replace(/\\\(|\\\)|\\\[|\\\]/g, "")
    .replace(/\$\$?/g, "")
    .replace(/\^\{([^{}]*)\}/g, "^$1")
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\,/g, " ")
    .trim();
}

const questionOptionSchema = z.object({
  text: z.string().min(1).describe("The answer text in French, using the teacher's notation"),
  isCorrect: z.boolean().describe("True for the correct answer, false for all distractors"),
  misconceptionId: z
    .string()
    .min(1)
    .describe('Taxonomy ID this option encodes ("CORRECT" for the right answer, e.g. "FRAC-001" for a distractor)'),
  misconceptionDescription: z
    .string()
    .min(1)
    .describe('Short description of the cognitive error ("Correct answer" for the right one)'),
});

/**
 * Combines what used to be two separate steps (propose_question, then
 * save_quiz_to_supabase) into one tool that takes the full question content
 * as parameters. This is a deliberate reliability fix: models — especially
 * smaller ones — kept writing out a nicely formatted question in chat text
 * without actually calling propose_question first, leaving nothing recorded
 * anywhere. A single call that REQUIRES the question/options as arguments
 * cannot be skipped that way — there is no "describe now, persist later"
 * path anymore, because persisting IS providing the content.
 */
export const propose_and_save_quiz = defineTool({
  name: "propose_and_save_quiz",
  description:
    "Build AND persist a French multiple-choice comprehension question in one step: writes it to shared state (so get_current_question/reject_question keep working) and immediately saves it to Supabase (concept + quiz + options). This is the ONLY way to create a quiz — always call this with the full question and options as soon as you've decided on them, in the same turn, BEFORE describing the question in chat text. Never draft a question in prose first and call this 'afterward' — chat text is just a human-readable echo of what this tool already recorded, never a substitute for calling it.",
  parameters: z.object({
    questionText: z.string().min(1).describe("The question text, in French"),
    options: z
      .array(questionOptionSchema)
      .length(4)
      .describe("Exactly 4 options: 1 correct + 3 distractors, each distractor mapping to a distinct misconception ID"),
    conceptLabel: z
      .string()
      .min(1)
      .describe("Short label identifying which discussion moment/concept this question covers"),
    transcriptExcerpt: z
      .string()
      .min(1)
      .describe("The transcript excerpt (or summary text) this question was built from, as plain text"),
    exampleOrigin: z
      .enum(["transcript", "synthesized"])
      .describe("Whether the example was taken verbatim from the transcript or synthesized from the summary"),
    fathomMeetingId: z
      .string()
      .optional()
      .describe("The Fathom meeting id this transcript came from, if known (used to find the right lesson row)"),
    lessonId: z
      .string()
      .optional()
      .describe("The lessons.id directly, if already known (e.g. from list_lessons/get_lesson_transcript) — takes priority over fathomMeetingId"),
  }),
  execute: async ({ questionText, options, conceptLabel, transcriptExcerpt, exampleOrigin, fathomMeetingId, lessonId }) => {
    validateProposedQuestion(options as QuestionOption[]);

    const cleanQuestionText = stripLatex(questionText);
    const cleanOptions = (options as QuestionOption[]).map((option) => ({
      ...option,
      text: stripLatex(option.text),
    }));

    questionBuilderState.proposedQuestion = {
      questionText: cleanQuestionText,
      options: cleanOptions,
      conceptReference: { conceptName: conceptLabel, documentSection: null, offDocument: false },
      sourceTranscript: [{ timestamp: new Date().toISOString(), text: transcriptExcerpt }],
      generatedAt: new Date().toISOString(),
      exampleOrigin,
      regenerationCount: questionBuilderState.regenerationCount,
      status: "proposed",
    };

    const saveResult = await saveCurrentQuestionToSupabase({ conceptLabel, transcriptExcerpt, fathomMeetingId, lessonId });
    return { proposedQuestion: questionBuilderState.proposedQuestion, ...saveResult };
  },
});

export const list_pending_quizzes = defineTool({
  name: "list_pending_quizzes",
  description:
    "List quizzes already saved to Supabase (via save_quiz_to_supabase) that have NOT been sent yet (sent_at is null) for a lesson. Use this before sending when the teacher says 'send it' / 'envoyer' — do not rely only on the in-chat conversation to remember what was built, since it may not be reachable at send time (e.g. this bot forwards Telegram messages one at a time, without full conversation history). This is the reliable source of truth for 'what's ready to send'.",
  parameters: z.object({
    lessonId: z.string().optional().describe("The lessons.id to check; defaults to the most recent lesson"),
  }),
  execute: async ({ lessonId }) => {
    const supabase = createAdminClient();

    let resolvedLessonId = lessonId;
    if (!resolvedLessonId) {
      const { data: lessons, error } = await supabase
        .from("lessons")
        .select("id")
        .order("started_at", { ascending: false })
        .limit(1);
      if (error || !lessons?.[0]) {
        return { ok: false, error: `Could not find a lesson: ${error?.message ?? "no lessons found"}` };
      }
      resolvedLessonId = lessons[0].id as string;
    }

    const { data: concepts, error: conceptsError } = await supabase
      .from("concepts_detected")
      .select("id")
      .eq("lesson_id", resolvedLessonId);

    if (conceptsError) {
      return { ok: false, error: `Failed to load concepts: ${conceptsError.message}` };
    }
    if (!concepts || concepts.length === 0) {
      return { ok: true, pendingQuizzes: [] };
    }

    const { data: quizzes, error: quizzesError } = await supabase
      .from("quizzes")
      .select("id, question")
      .in("concept_id", concepts.map((c) => c.id))
      .is("sent_at", null);

    if (quizzesError) {
      return { ok: false, error: `Failed to load quizzes: ${quizzesError.message}` };
    }
    if (!quizzes || quizzes.length === 0) {
      return { ok: true, pendingQuizzes: [] };
    }

    const pendingQuizzes = [];
    for (const quiz of quizzes) {
      const { data: options } = await supabase
        .from("quiz_options")
        .select("id, label, text, is_correct")
        .eq("quiz_id", quiz.id)
        .order("label", { ascending: true });

      pendingQuizzes.push({
        quizId: quiz.id,
        question: quiz.question,
        options: (options ?? []).map((o) => ({ id: o.id, text: o.text, isCorrect: o.is_correct })),
        correctOptionIndex: (options ?? []).findIndex((o) => o.is_correct),
      });
    }

    return { ok: true, pendingQuizzes };
  },
});

export const list_lessons = defineTool({
  name: "list_lessons",
  description:
    "List available lessons (with their class name and status) that have a transcript stored in Supabase, so the teacher can pick which one to build a quiz from. Prefer this over asking Fathom when a lesson already has transcript chunks saved here.",
  parameters: z.object({
    limit: z.number().int().min(1).max(50).default(10).describe("Max number of lessons to return, most recent first"),
  }),
  execute: async ({ limit }) => {
    const supabase = createAdminClient();
    const { data: lessons, error } = await supabase
      .from("lessons")
      .select("id, title, status, course_document_ref, started_at, class_id")
      .order("started_at", { ascending: false })
      .limit(limit);

    if (error) {
      return { ok: false, error: `Failed to list lessons: ${error.message}` };
    }
    if (!lessons || lessons.length === 0) {
      return { ok: true, lessons: [] };
    }

    const classIds = [...new Set(lessons.map((l) => l.class_id))];
    const { data: classes } = await supabase.from("classes").select("id, name, subject").in("id", classIds);

    const withClassName = lessons.map((lesson) => {
      const cls = classes?.find((c) => c.id === lesson.class_id);
      return {
        lessonId: lesson.id,
        title: lesson.title,
        status: lesson.status,
        className: cls?.name ?? null,
        subject: cls?.subject ?? null,
        sourceRef: lesson.course_document_ref,
        startedAt: lesson.started_at,
      };
    });

    return { ok: true, lessons: withClassName };
  },
});

export const get_lesson_transcript = defineTool({
  name: "get_lesson_transcript",
  description:
    "Read the full transcript of a lesson from Supabase's lesson_transcript_chunks (chunks ordered by time), for lessons whose transcript was already ingested there (see list_lessons). Use this instead of the Fathom MCP tools when the lesson came from this seeded/ingested source rather than a live Fathom meeting.",
  parameters: z.object({
    lessonId: z.string().describe("The lessons.id to read the transcript for"),
  }),
  execute: async ({ lessonId }) => {
    const supabase = createAdminClient();
    const { data: chunks, error } = await supabase
      .from("lesson_transcript_chunks")
      .select("text, started_at_ms, ended_at_ms")
      .eq("lesson_id", lessonId)
      .order("started_at_ms", { ascending: true });

    if (error) {
      return { ok: false, error: `Failed to read transcript: ${error.message}` };
    }
    if (!chunks || chunks.length === 0) {
      return { ok: false, error: "No transcript chunks found for this lesson" };
    }

    return {
      ok: true,
      lessonId,
      chunks: chunks.map((c) => ({
        text: c.text,
        startedAtMs: c.started_at_ms,
        endedAtMs: c.ended_at_ms,
      })),
    };
  },
});

interface SaveResult {
  ok: boolean;
  error?: string;
  quizId?: string;
  optionIds?: string[];
}

/**
 * The actual Supabase persistence, shared by propose_and_save_quiz (the
 * normal path) and the legacy save_quiz_to_supabase tool below (kept for
 * anything still calling it directly, but no longer registered on the agent).
 */
async function saveCurrentQuestionToSupabase(input: {
  conceptLabel: string;
  transcriptExcerpt: string;
  fathomMeetingId?: string;
  lessonId?: string;
}): Promise<SaveResult> {
  const { conceptLabel, transcriptExcerpt, fathomMeetingId, lessonId } = input;
  const proposed = questionBuilderState.proposedQuestion;
  if (!proposed) {
    return { ok: false, error: "There is no proposed question in state to save" };
  }
  if (proposed.options.length !== 4) {
    return { ok: false, error: `Expected exactly 4 options, found ${proposed.options.length}` };
  }

  const supabase = createAdminClient();

    let resolvedLessonId = lessonId;
    if (!resolvedLessonId) {
      const { data: lessons, error: lessonError } = fathomMeetingId
        ? await supabase
            .from("lessons")
            .select("id")
            .eq("course_document_ref", `fathom:${fathomMeetingId}`)
            .order("started_at", { ascending: false })
            .limit(1)
        : await supabase
            .from("lessons")
            .select("id")
            .order("started_at", { ascending: false })
            .limit(1);

      if (lessonError) {
        return { ok: false, error: `Failed to find a lesson row: ${lessonError.message}` };
      }
      resolvedLessonId = lessons?.[0]?.id as string | undefined;
      if (!resolvedLessonId) {
        return { ok: false, error: "No lesson row found to attach this quiz to" };
      }
    }

    const { data: concept, error: conceptError } = await supabase
      .from("concepts_detected")
      .insert({
        lesson_id: resolvedLessonId,
        label: conceptLabel,
        transcript_excerpt: transcriptExcerpt,
        status: "detected",
        detected_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (conceptError || !concept) {
      return { ok: false, error: `Failed to insert concept: ${conceptError?.message}` };
    }

    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        concept_id: concept.id,
        question: proposed.questionText,
        approved_by_teacher: true,
        approved_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (quizError || !quiz) {
      return { ok: false, error: `Failed to insert quiz: ${quizError?.message}` };
    }

    const optionRows = proposed.options.map((option, index) => ({
      quiz_id: quiz.id,
      label: OPTION_LABELS[index],
      text: option.text,
      is_correct: option.isCorrect,
      misconception_label: option.misconceptionId === "CORRECT" ? null : option.misconceptionId,
    }));

    const { data: insertedOptions, error: optionsError } = await supabase
      .from("quiz_options")
      .insert(optionRows)
      .select("id, label")
      .order("label", { ascending: true });

    if (optionsError || !insertedOptions) {
      return { ok: false, error: `Failed to insert quiz options: ${optionsError?.message}` };
    }

    const optionIds = OPTION_LABELS.map(
      (label) => insertedOptions.find((row) => row.label === label)?.id as string,
    );

  return {
    ok: true,
    quizId: quiz.id as string,
    optionIds,
  };
}

/** @deprecated Not registered on the agent anymore — use propose_and_save_quiz instead, which cannot be called without also supplying the question content. */
export const save_quiz_to_supabase = defineTool({
  name: "save_quiz_to_supabase",
  description: "Deprecated — use propose_and_save_quiz instead.",
  parameters: z.object({
    conceptLabel: z.string().min(1),
    transcriptExcerpt: z.string().min(1),
    fathomMeetingId: z.string().optional(),
    lessonId: z.string().optional(),
  }),
  execute: async (input) => saveCurrentQuestionToSupabase(input),
});

export interface StudentQuizResult {
  studentId: string;
  firstName: string;
  answered: boolean;
  correct: boolean | null;
  misconceptionLabel: string | null;
}

export interface QuizStat {
  quizId: string;
  conceptLabel: string | null;
  question: string;
  totalStudents: number;
  answeredCount: number;
  correctCount: number;
  percentCorrect: number | null;
  misconceptionBreakdown: Record<string, number>;
  studentBreakdown: StudentQuizResult[];
}

export interface LessonQuizStatsResult {
  ok: boolean;
  error?: string;
  lessonId?: string;
  lessonTitle?: string | null;
  totalStudents?: number;
  quizzes?: QuizStat[];
}

/**
 * Core query logic behind the get_quiz_stats tool, extracted so it can also
 * be called directly (e.g. from the Telegram /teacher command handler)
 * without going through the agent's tool-calling loop.
 */
export async function computeLessonQuizStats(
  lessonId?: string,
  teacherId?: string,
): Promise<LessonQuizStatsResult> {
  const supabase = createAdminClient();

  let resolvedLessonId = lessonId;
  if (!resolvedLessonId) {
    let query = supabase
      .from("lessons")
      .select("id")
      .order("started_at", { ascending: false })
      .limit(1);
    if (teacherId) {
      query = query.eq("teacher_id", teacherId);
    }
    const { data: lessons, error } = await query;
    if (error || !lessons?.[0]) {
      return { ok: false, error: `Could not find a lesson: ${error?.message ?? "no lessons found"}` };
    }
    resolvedLessonId = lessons[0].id as string;
  }

  const { data: lessonRow, error: lessonError } = await supabase
    .from("lessons")
    .select("id, title, class_id")
    .eq("id", resolvedLessonId)
    .single();

  if (lessonError || !lessonRow) {
    return { ok: false, error: `Lesson not found: ${lessonError?.message}` };
  }

  const { count: totalStudents } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("class_id", lessonRow.class_id);

  const { data: roster } = await supabase
    .from("students")
    .select("id, first_name")
    .eq("class_id", lessonRow.class_id);

  const { data: concepts, error: conceptsError } = await supabase
    .from("concepts_detected")
    .select("id, label")
    .eq("lesson_id", lessonRow.id);

  if (conceptsError) {
    return { ok: false, error: `Failed to load concepts: ${conceptsError.message}` };
  }
  if (!concepts || concepts.length === 0) {
    return {
      ok: true,
      lessonId: lessonRow.id,
      lessonTitle: lessonRow.title,
      totalStudents: totalStudents ?? 0,
      quizzes: [],
    };
  }

  const conceptIds = concepts.map((c) => c.id);
  const { data: quizzes, error: quizzesError } = await supabase
    .from("quizzes")
    .select("id, question, concept_id")
    .in("concept_id", conceptIds);

  if (quizzesError) {
    return { ok: false, error: `Failed to load quizzes: ${quizzesError.message}` };
  }

  const quizStats: QuizStat[] = [];
  for (const quiz of quizzes ?? []) {
    const concept = concepts.find((c) => c.id === quiz.concept_id);

    const { data: options } = await supabase
      .from("quiz_options")
      .select("id, is_correct, misconception_label")
      .eq("quiz_id", quiz.id);

    const { data: answers } = await supabase
      .from("quiz_answers")
      .select("student_id, option_id")
      .eq("quiz_id", quiz.id);

    const answeredCount = answers?.length ?? 0;
    const correctOptionId = options?.find((o) => o.is_correct)?.id;
    const correctCount = answers?.filter((a) => a.option_id === correctOptionId).length ?? 0;

    const misconceptionCounts: Record<string, number> = {};
    for (const answer of answers ?? []) {
      if (answer.option_id === correctOptionId) continue;
      const option = options?.find((o) => o.id === answer.option_id);
      const label = option?.misconception_label ?? "unknown";
      misconceptionCounts[label] = (misconceptionCounts[label] ?? 0) + 1;
    }

    const studentBreakdown: StudentQuizResult[] = (roster ?? []).map((student) => {
      const answer = answers?.find((a) => a.student_id === student.id);
      if (!answer) {
        return {
          studentId: student.id,
          firstName: student.first_name,
          answered: false,
          correct: null,
          misconceptionLabel: null,
        };
      }
      const isCorrect = answer.option_id === correctOptionId;
      const option = options?.find((o) => o.id === answer.option_id);
      return {
        studentId: student.id,
        firstName: student.first_name,
        answered: true,
        correct: isCorrect,
        misconceptionLabel: isCorrect ? null : (option?.misconception_label ?? "unknown"),
      };
    });

    quizStats.push({
      quizId: quiz.id,
      conceptLabel: concept?.label ?? null,
      question: quiz.question,
      totalStudents: totalStudents ?? 0,
      answeredCount,
      correctCount,
      percentCorrect: answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : null,
      misconceptionBreakdown: misconceptionCounts,
      studentBreakdown,
    });
  }

  return {
    ok: true,
    lessonId: lessonRow.id,
    lessonTitle: lessonRow.title,
    totalStudents: totalStudents ?? 0,
    quizzes: quizStats,
  };
}

export const get_quiz_stats = defineTool({
  name: "get_quiz_stats",
  description:
    "Read comprehension-check results for a lesson: how many students answered each quiz, percent correct, and which misconceptions came up most. Each quiz also includes a studentBreakdown array (per student: answered, correct, misconceptionLabel) — use this when the teacher asks about a specific student or wants per-student areas of improvement, not just class-wide stats. Defaults to the most recent lesson if lessonId is not given.",
  parameters: z.object({
    lessonId: z.string().optional().describe("The lessons.id to report on; defaults to the most recent lesson"),
  }),
  execute: async ({ lessonId }) => {
    return computeLessonQuizStats(lessonId);
  },
});
