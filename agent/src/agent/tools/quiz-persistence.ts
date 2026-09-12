import { defineTool } from "@copilotkit/runtime/v2";
import { z } from "zod";
import { createAdminClient } from "@/utils/supabase/admin";
import { questionBuilderState } from "@/agent/state/question-builder-state";

const OPTION_LABELS = ["A", "B", "C", "D"] as const;

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
  }),
  execute: async ({ conceptLabel, transcriptExcerpt, fathomMeetingId }) => {
    const proposed = questionBuilderState.proposedQuestion;
    if (!proposed) {
      return { ok: false, error: "There is no proposed question in state to save" };
    }
    if (proposed.options.length !== 4) {
      return { ok: false, error: `Expected exactly 4 options, found ${proposed.options.length}` };
    }

    const supabase = createAdminClient();

    const lessonQuery = supabase
      .from("lessons")
      .select("id")
      .order("started_at", { ascending: false })
      .limit(1);

    const { data: lessons, error: lessonError } = fathomMeetingId
      ? await supabase
          .from("lessons")
          .select("id")
          .eq("course_document_ref", `fathom:${fathomMeetingId}`)
          .order("started_at", { ascending: false })
          .limit(1)
      : await lessonQuery;

    if (lessonError) {
      return { ok: false, error: `Failed to find a lesson row: ${lessonError.message}` };
    }
    const lessonId = lessons?.[0]?.id as string | undefined;
    if (!lessonId) {
      return { ok: false, error: "No lesson row found to attach this quiz to" };
    }

    const { data: concept, error: conceptError } = await supabase
      .from("concepts_detected")
      .insert({
        lesson_id: lessonId,
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

export const get_quiz_stats = defineTool({
  name: "get_quiz_stats",
  description:
    "Read comprehension-check results for a lesson: how many students answered each quiz, percent correct, and which misconceptions came up most. Defaults to the most recent lesson if lessonId is not given.",
  parameters: z.object({
    lessonId: z.string().optional().describe("The lessons.id to report on; defaults to the most recent lesson"),
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

    const { data: concepts, error: conceptsError } = await supabase
      .from("concepts_detected")
      .select("id, label")
      .eq("lesson_id", lessonRow.id);

    if (conceptsError) {
      return { ok: false, error: `Failed to load concepts: ${conceptsError.message}` };
    }
    if (!concepts || concepts.length === 0) {
      return { ok: true, lessonTitle: lessonRow.title, totalStudents: totalStudents ?? 0, quizzes: [] };
    }

    const conceptIds = concepts.map((c) => c.id);
    const { data: quizzes, error: quizzesError } = await supabase
      .from("quizzes")
      .select("id, question, concept_id")
      .in("concept_id", conceptIds);

    if (quizzesError) {
      return { ok: false, error: `Failed to load quizzes: ${quizzesError.message}` };
    }

    const quizStats = [];
    for (const quiz of quizzes ?? []) {
      const concept = concepts.find((c) => c.id === quiz.concept_id);

      const { data: options } = await supabase
        .from("quiz_options")
        .select("id, is_correct, misconception_label")
        .eq("quiz_id", quiz.id);

      const { data: answers } = await supabase
        .from("quiz_answers")
        .select("option_id")
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

      quizStats.push({
        quizId: quiz.id,
        conceptLabel: concept?.label ?? null,
        question: quiz.question,
        totalStudents: totalStudents ?? 0,
        answeredCount,
        correctCount,
        percentCorrect: answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : null,
        misconceptionBreakdown: misconceptionCounts,
      });
    }

    return {
      ok: true,
      lessonTitle: lessonRow.title,
      totalStudents: totalStudents ?? 0,
      quizzes: quizStats,
    };
  },
});
