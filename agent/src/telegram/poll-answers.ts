import { createAdminClient } from "@/utils/supabase/admin";
import { pollRegistry } from "@/agent/tools/telegram";

const TELEGRAM_API_BASE = "https://api.telegram.org";

const started = globalThis as typeof globalThis & {
  __pollAnswerListenerStarted?: boolean;
};

interface PollAnswerUpdate {
  update_id: number;
  poll_answer?: {
    poll_id: string;
    user?: { id: number };
    option_ids: number[];
  };
}

/**
 * Long-polls Telegram's getUpdates for poll_answer events and records each
 * answer into Supabase's quiz_answers table, using the in-memory
 * pollRegistry populated by sendPollToClass to map a Telegram poll id back
 * to our quiz/option rows.
 *
 * NOTE: this consumes the same bot's update queue as the teammate's
 * CopilotKit Telegram channel (agent/src/telegram/start.ts /
 * agent/src/telegram/index.tsx). Telegram allows only one clean long-poll
 * consumer per bot token — running both at once would race and steal each
 * other's updates. That channel is currently disabled (no
 * CPK_INTELLIGENCE_API_KEY configured), so this is safe today. Revisit
 * before enabling that channel.
 */
export function startPollAnswerListener(): void {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn("Poll answer listener skipped: missing TELEGRAM_BOT_TOKEN");
    return;
  }

  if (started.__pollAnswerListenerStarted) return;
  started.__pollAnswerListenerStarted = true;

  void pollLoop(botToken);
}

async function pollLoop(botToken: string): Promise<void> {
  let offset: number | undefined;

  for (;;) {
    try {
      const params = new URLSearchParams({
        timeout: "30",
        allowed_updates: JSON.stringify(["poll_answer"]),
      });
      if (offset !== undefined) params.set("offset", String(offset));

      const response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/getUpdates?${params.toString()}`);
      const data = (await response.json()) as { ok: boolean; result?: PollAnswerUpdate[] };

      if (!data.ok || !data.result) continue;

      for (const update of data.result) {
        offset = update.update_id + 1;
        if (update.poll_answer) {
          await handlePollAnswer(update.poll_answer);
        }
      }
    } catch (error) {
      console.error("Poll answer listener error:", error);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

async function handlePollAnswer(pollAnswer: NonNullable<PollAnswerUpdate["poll_answer"]>): Promise<void> {
  const mapping = pollRegistry.get(pollAnswer.poll_id);
  if (!mapping) {
    return; // Poll from a previous server run, or not one of ours — nothing to record against.
  }

  const telegramUserId = pollAnswer.user?.id;
  if (!telegramUserId) return;

  const chosenIndex = pollAnswer.option_ids[0];
  if (chosenIndex === undefined) {
    return; // Student retracted their answer — leaving the prior recorded answer in place.
  }

  const optionId = mapping.optionIds[chosenIndex];
  if (!optionId) {
    console.warn(`Poll answer option index ${chosenIndex} out of range for quiz ${mapping.quizId}`);
    return;
  }

  const supabase = createAdminClient();

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();

  if (studentError || !student) {
    console.warn(`Poll answer from unknown telegram user ${telegramUserId} — no matching student row`);
    return;
  }

  const { data: existing } = await supabase
    .from("quiz_answers")
    .select("id")
    .eq("quiz_id", mapping.quizId)
    .eq("student_id", student.id)
    .maybeSingle();

  const answeredAt = new Date().toISOString();

  if (existing) {
    await supabase
      .from("quiz_answers")
      .update({ option_id: optionId, answered_at: answeredAt })
      .eq("id", existing.id);
  } else {
    await supabase.from("quiz_answers").insert({
      quiz_id: mapping.quizId,
      student_id: student.id,
      option_id: optionId,
      answered_at: answeredAt,
    });
  }
}
