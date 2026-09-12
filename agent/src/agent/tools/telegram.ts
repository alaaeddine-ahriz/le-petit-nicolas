import { defineTool } from "@copilotkit/runtime/v2";
import { z } from "zod";
import { createAdminClient } from "@/utils/supabase/admin";
import { recordPollSend, markQuizSent } from "@data/repository";

const TELEGRAM_API_BASE = "https://api.telegram.org";

interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

function requireBotToken() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN");
  }
  return botToken;
}

async function findClassIdForQuiz(quizId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("concept_id")
    .eq("id", quizId)
    .single();
  if (!quiz) return null;

  const { data: concept } = await supabase
    .from("concepts_detected")
    .select("lesson_id")
    .eq("id", quiz.concept_id)
    .single();
  if (!concept) return null;

  const { data: lesson } = await supabase
    .from("lessons")
    .select("class_id")
    .eq("id", concept.lesson_id)
    .single();
  return lesson?.class_id ?? null;
}

// The poll → quiz mapping used to be an in-memory Map here. It's now the
// `quiz_poll_sends` table (see recordPollSend / resolvePoll in @data/repository),
// because `next dev` reloads wiped it and answers to already-sent polls were
// silently dropped.

async function sendPollToChat(
  botToken: string,
  chatId: number,
  question: string,
  options: string[],
  correctOptionIndex: number,
  isAnonymous: boolean,
) {
  const response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/sendPoll`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      question,
      options,
      type: "quiz",
      correct_option_id: correctOptionIndex,
      is_anonymous: isAnonymous,
    }),
  });

  return (await response.json()) as TelegramApiResponse<{
    message_id: number;
    chat: { id: number };
    poll?: { id: string };
  }>;
}

export const sendPollToClass = defineTool({
  name: "sendPollToClass",
  description:
    "Send a quiz-style poll to every onboarded student in the quiz's class, individually, in their own private Telegram chat (this product has no class group — each student answers 1:1 with the bot). Only call this when the teacher has explicitly asked to send, approve, or post the current proposed question — never on your own initiative. Requires the quiz to already be persisted via save_quiz_to_supabase.",
  parameters: z.object({
    question: z
      .string()
      .min(1)
      .max(300)
      .describe("The poll question text (Telegram's sendPoll limit is 300 characters)"),
    options: z
      .array(z.string().min(1).max(100))
      .min(2)
      .max(10)
      .describe("The poll's answer options, 2 to 10 items, each 1-100 characters"),
    correctOptionIndex: z
      .number()
      .int()
      .min(0)
      .describe("0-based index into options identifying the correct answer"),
    isAnonymous: z
      .boolean()
      .default(false)
      .describe(
        "Whether student votes are anonymous. Defaults to false — Telegram only reports poll_answer updates (needed to record who answered what) for non-anonymous polls.",
      ),
    quizId: z
      .string()
      .describe("The Supabase quizzes.id this poll corresponds to (from save_quiz_to_supabase) — used to find the class roster"),
    optionIds: z
      .array(z.string())
      .describe("The Supabase quiz_options.id values, in the same order as options (from save_quiz_to_supabase)"),
  }),
  execute: async ({ question, options, correctOptionIndex, isAnonymous, quizId, optionIds }) => {
    if (correctOptionIndex >= options.length) {
      return {
        ok: false,
        error: `correctOptionIndex ${correctOptionIndex} is out of range for ${options.length} options`,
      };
    }
    if (optionIds.length !== options.length) {
      return {
        ok: false,
        error: `optionIds length (${optionIds.length}) does not match options length (${options.length})`,
      };
    }

    const botToken = requireBotToken();

    const classId = await findClassIdForQuiz(quizId);
    if (!classId) {
      return { ok: false, error: `Could not resolve a class for quizId ${quizId}` };
    }

    const supabase = createAdminClient();
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id, first_name, telegram_chat_id")
      .eq("class_id", classId);

    if (studentsError) {
      return { ok: false, error: `Failed to load students: ${studentsError.message}` };
    }
    if (!students || students.length === 0) {
      return { ok: false, error: "No students found in this class" };
    }

    const results: Array<{ studentId: string; firstName: string; ok: boolean; reason?: string }> = [];

    for (const student of students) {
      if (!student.telegram_chat_id) {
        results.push({
          studentId: student.id,
          firstName: student.first_name,
          ok: false,
          reason: "not onboarded yet (no telegram_chat_id — student must /start the bot first)",
        });
        continue;
      }

      const data = await sendPollToChat(
        botToken,
        student.telegram_chat_id,
        question,
        options,
        correctOptionIndex,
        isAnonymous,
      );

      if (!data.ok) {
        results.push({
          studentId: student.id,
          firstName: student.first_name,
          ok: false,
          reason: data.description ?? "Telegram API request failed",
        });
        continue;
      }

      const pollId = data.result?.poll?.id;
      if (pollId) {
        await recordPollSend({
          telegramPollId: pollId,
          quizId,
          studentId: student.id,
          optionIds,
        });
      }
      results.push({ studentId: student.id, firstName: student.first_name, ok: true });
    }

    const sentCount = results.filter((r) => r.ok).length;
    if (sentCount > 0) await markQuizSent(quizId);
    return {
      ok: sentCount > 0,
      sentCount,
      totalStudents: students.length,
      results,
    };
  },
});
