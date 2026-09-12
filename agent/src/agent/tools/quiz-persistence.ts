import { defineTool } from "@copilotkit/runtime/v2";
import { z } from "zod";
import { createAdminClient } from "@/utils/supabase/admin";
import { questionBuilderState } from "@/agent/state/question-builder-state";

const OPTION_LABELS = ["A", "B", "C", "D"] as const;

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

export const save_quiz_to_supabase = defineTool({
  name: "save_quiz_to_supabase",
  description:
    "Persist the current proposed question to Supabase (as a concept + quiz + options), so it can be tracked and its answers analyzed later. Call this after propose_question and before sendPollToClass.",
  parameters: z.object({
    conceptLabel: z
      .string()
      .min(1)
      .describe("Short label identifying which discussion moment/concept this question covers"),
    transcriptExcerpt: z
      .string()
      .min(1)
      .describe("The transcript excerpt (or summary text) this question was built from, as plain text"),
    fathomMeetingId: z
      .string()
      .optional()
      .describe("The Fathom meeting id this transcript came from, if known (used to find the right lesson row)"),
    lessonId: z
      .string()
      .optional()
      .describe("The lessons.id directly, if already known (e.g. from list_lessons/get_lesson_transcript) — takes priority over fathomMeetingId"),
  }),
  execute: async ({ conceptLabel, transcriptExcerpt, fathomMeetingId, lessonId }) => {
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
  },
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
