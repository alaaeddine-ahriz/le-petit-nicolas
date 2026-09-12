import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendMessage } from "@/agent/tools/telegram";
import { resolvePoll } from "@data/repository";

const TELEGRAM_API_BASE = "https://api.telegram.org";
const TELEGRAM_MESSAGE_LIMIT = 4096;

const started = globalThis as typeof globalThis & {
  __telegramUpdatesListenerStarted?: boolean;
};

/**
 * Telegram chat ids currently "in teacher mode" (sent /teacher this server
 * run). In-memory only — lost on restart, same tradeoff as pollRegistry.
 * Once a chat is in this set, every subsequent text message from it is
 * forwarded to the mathQuiz agent as a normal conversational turn, rather
 * than being intercepted as a fixed command.
 */
const teacherModeChats = new Set<number>();

interface TelegramUpdate {
  update_id: number;
  message?: {
    text?: string;
    from?: { id: number };
    chat: { id: number };
  };
  poll_answer?: {
    poll_id: string;
    user?: { id: number };
    option_ids: number[];
  };
}

/**
 * Long-polls Telegram's getUpdates for poll_answer and message events.
 *
 * - poll_answer: records each answer into Supabase's quiz_answers table,
 *   using the in-memory pollRegistry populated by sendPollToClass to map a
 *   Telegram poll id back to our quiz/option rows.
 * - message: "/teacher" from a matched teachers row activates teacher mode
 *   for that chat (activation ping only). Any later text from a chat already
 *   in teacher mode is forwarded to the mathQuiz agent as a normal
 *   conversational turn (create a quiz, approve/send it, ask for stats,
 *   ask about a specific student, ...) and the agent's reply is relayed
 *   back. Silently ignored for anyone else (students included, and
 *   teachers who haven't sent /teacher yet) — this is not a documented
 *   command/flow for non-teachers.
 *
 * NOTE: this consumes the same bot's update queue as CopilotKit's Telegram
 * channel (agent/src/telegram/start.ts). Telegram allows only one long-poll
 * consumer per bot token. instrumentation.ts skips this listener whenever
 * that channel is running.
 */
export function startTelegramUpdatesListener(): void {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn("Telegram updates listener skipped: missing TELEGRAM_BOT_TOKEN");
    return;
  }

  if (started.__telegramUpdatesListenerStarted) return;
  started.__telegramUpdatesListenerStarted = true;

  void pollLoop(botToken);
}

async function pollLoop(botToken: string): Promise<void> {
  let offset: number | undefined;

  for (;;) {
    try {
      const params = new URLSearchParams({
        timeout: "30",
        allowed_updates: JSON.stringify(["poll_answer", "message"]),
      });
      if (offset !== undefined) params.set("offset", String(offset));

      const response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/getUpdates?${params.toString()}`);
      const data = (await response.json()) as { ok: boolean; result?: TelegramUpdate[] };

      if (!data.ok || !data.result) continue;

      for (const update of data.result) {
        offset = update.update_id + 1;
        if (update.poll_answer) {
          await handlePollAnswer(update.poll_answer);
        }
        if (update.message) {
          await handleMessage(botToken, update.message);
        }
      }
    } catch (error) {
      console.error("Telegram updates listener error:", error);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

async function handlePollAnswer(pollAnswer: NonNullable<TelegramUpdate["poll_answer"]>): Promise<void> {
  // Looked up in quiz_poll_sends (Supabase) rather than process memory, so
  // answers to polls sent before a dev-server reload still resolve.
  const mapping = await resolvePoll(pollAnswer.poll_id);
  if (!mapping) {
    return; // Not one of ours — nothing to record against.
  }

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

  const { data: existing } = await supabase
    .from("quiz_answers")
    .select("id")
    .eq("quiz_id", mapping.quizId)
    .eq("student_id", mapping.studentId)
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
      student_id: mapping.studentId,
      option_id: optionId,
      answered_at: answeredAt,
    });
  }
}

async function handleMessage(
  botToken: string,
  message: NonNullable<TelegramUpdate["message"]>,
): Promise<void> {
  const text = message.text?.trim();
  const senderId = message.from?.id;
  if (!text || !senderId) return;

  const supabase = createAdminClient();
  const { data: teacher, error } = await supabase
    .from("teachers")
    .select("id")
    .eq("telegram_user_id", senderId)
    .maybeSingle();

  if (error || !teacher) {
    return; // Not a recognized teacher — stay silent, don't reveal this command/bot exists.
  }

  const chatId = message.chat.id;

  if (/^\/teacher\b/i.test(text)) {
    teacherModeChats.add(chatId);
    await sendMessage(botToken, chatId, "🎓 Teacher mode activated.");
    return;
  }

  if (!teacherModeChats.has(chatId)) {
    // Recognized teacher, but hasn't sent /teacher yet this server run (or it
    // restarted since) — don't surprise-activate on arbitrary text.
    return;
  }

  await forwardToMathQuizAgent(botToken, chatId, text);
}

/**
 * Forwards a teacher's chat message to the mathQuiz agent as one conversation
 * turn, over the same AG-UI HTTP endpoint CopilotChat itself uses
 * (/api/copilotkit/agent/mathQuiz/run), and relays the assistant's final text
 * reply back to Telegram. threadId is stable per Telegram chat so the agent's
 * own server-side thread state (pending proposed question, etc.) carries
 * across messages within this server's lifetime.
 */
async function forwardToMathQuizAgent(botToken: string, chatId: number, text: string): Promise<void> {
  const port = process.env.PORT ?? "3000";
  const url = `http://localhost:${port}/api/copilotkit/agent/mathQuiz/run`;

  await sendMessage(botToken, chatId, "⏳ Building...");

  let reply: string;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        threadId: `telegram-teacher-${chatId}`,
        runId: randomUUID(),
        state: {},
        messages: [{ id: randomUUID(), role: "user", content: text }],
        tools: [],
        context: [],
        forwardedProps: {},
      }),
    });

    if (!response.ok || !response.body) {
      console.error(`mathQuiz agent request failed: HTTP ${response.status}`);
      reply = "Sorry, I couldn't reach the quiz agent just now — try again in a moment.";
    } else {
      reply = await parseAgentReply(response);
    }
  } catch (err) {
    console.error("Failed to forward message to mathQuiz agent:", err);
    reply = "Sorry, something went wrong reaching the quiz agent — try again in a moment.";
  }

  await sendLongMessage(botToken, chatId, reply || "(no reply)");
}

/**
 * Reads an AG-UI SSE response body to completion and concatenates the
 * TEXT_MESSAGE_CONTENT deltas into the assistant's final reply text. Ignores
 * reasoning/tool-call event types — this is a chat bridge, not a debug
 * console. Hand-rolled (no SSE client library) since we only need the final
 * text, not incremental delivery to Telegram.
 */
async function parseAgentReply(response: Response): Promise<string> {
  const raw = await response.text();
  let textReply = "";
  let sawError: string | null = null;
  let finishReason: string | null = null;

  for (const block of raw.split("\n\n")) {
    const dataLine = block
      .split("\n")
      .find((line) => line.startsWith("data:"));
    if (!dataLine) continue;

    const jsonText = dataLine.slice("data:".length).trim();
    if (!jsonText) continue;

    let event: { type?: string; delta?: string; message?: string; finishReason?: string };
    try {
      event = JSON.parse(jsonText);
    } catch {
      continue;
    }

    if (event.type === "TEXT_MESSAGE_CONTENT" && typeof event.delta === "string") {
      textReply += event.delta;
    } else if (event.type === "RUN_ERROR") {
      sawError = event.message ?? "unknown error";
    } else if (event.type === "RUN_FINISHED") {
      finishReason = event.finishReason ?? null;
    }
  }

  // "stop" means the model chose to end its turn naturally. Anything else
  // (e.g. "length" / "tool-calls" from hitting maxSteps mid-batch) means it
  // was cut off — some tool calls (sends, saves) may have already happened,
  // but there's no natural closing text, so say so instead of going silent.
  const cutOffNotice =
    finishReason && finishReason !== "stop"
      ? "\n\n⚠️ I hit my step limit before finishing this turn — some of what you asked may be incomplete. Ask me to continue or check status."
      : "";

  if (textReply.trim()) return textReply.trim() + cutOffNotice;
  if (sawError) {
    console.error("mathQuiz agent RUN_ERROR:", sawError);
    return "Sorry, the quiz agent hit an error processing that — try again in a moment.";
  }
  if (cutOffNotice) return `I hit my step limit before producing a reply for that.${cutOffNotice}`;
  return "(no reply)";
}

async function sendLongMessage(botToken: string, chatId: number, text: string): Promise<void> {
  for (let i = 0; i < text.length; i += TELEGRAM_MESSAGE_LIMIT) {
    await sendMessage(botToken, chatId, text.slice(i, i + TELEGRAM_MESSAGE_LIMIT));
  }
}
