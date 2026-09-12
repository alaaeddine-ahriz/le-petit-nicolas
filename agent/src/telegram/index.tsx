/** @jsxImportSource @copilotkit/channels-ui */
import { createChannel, Message } from "@copilotkit/channels";
import {
  defaultTelegramContext,
  defaultTelegramTools,
  telegram,
} from "@copilotkit/channels-telegram";
import { agent } from "@/agent";
import { handlePollAnswer } from "@/telegram/updates-listener";

const token = process.env.TELEGRAM_BOT_TOKEN;
const channelName = process.env.CHANNEL_CODE ?? "le-petit-nicolas";

export const telegramChannel = token
  ? createTelegramChannel(token, channelName)
  : undefined;

function createTelegramChannel(botToken: string, name: string) {
  const channel = createChannel({
    name,
    identifyUser: "platform",
    agent,
    adapters: [telegramWithConflictRetry(botToken)],
    tools: [...defaultTelegramTools],
    context: [...defaultTelegramContext],
  });

  channel.onMention(async ({ thread, message }) => {
    await thread.runAgent({ prompt: message.text });
  });

  channel.onMessage(async ({ thread, message }) => {
    await thread.runAgent({ prompt: message.text });
  });

  channel.onThreadStarted(async ({ thread }) => {
    await thread.post(
      <Message>Hello, how can I help you today?</Message>,
    );
  });

  return channel;
}

/**
 * CopilotKit's Telegram adapter calls grammY `bot.start()` once and gives up on
 * a 409. Telegram only allows one getUpdates consumer, so a leftover poll from
 * the previous `npm run dev` (timeout 30s) makes the new process go silent.
 * Retry until we own the queue.
 */
function telegramWithConflictRetry(botToken: string) {
  const adapter = telegram({ token: botToken });

  // When CopilotKit owns getUpdates, it is the only consumer — so quiz answers
  // have to be handled here too. Its allowed_updates list omits "poll_answer",
  // and Telegram simply never delivers an update type that isn't listed, so the
  // list is widened on the way through as well. Without both of these, polls go
  // out and every answer is silently lost (quiz_answers stays empty).
  adapter.bot.on("poll_answer", async (ctx) => {
    try {
      await handlePollAnswer(ctx.pollAnswer);
    } catch (error) {
      console.error("Failed to record poll answer:", error);
    }
  });

  const start = adapter.bot.start.bind(adapter.bot);
  adapter.bot.start = ((options?: Parameters<typeof adapter.bot.start>[0]) =>
    startPollingWithRetry(() =>
      start({
        ...options,
        allowed_updates: [...(options?.allowed_updates ?? []), "poll_answer"],
      }),
    )) as typeof adapter.bot.start;

  return adapter;
}

function isTelegram409(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { error_code?: number; message?: string };
  return (
    candidate.error_code === 409 ||
    (typeof candidate.message === "string" &&
      candidate.message.includes("409") &&
      candidate.message.toLowerCase().includes("conflict"))
  );
}

async function startPollingWithRetry(start: () => Promise<void>): Promise<void> {
  const maxAttempts = 10;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await start();
      return;
    } catch (error) {
      if (!isTelegram409(error) || attempt === maxAttempts) throw error;
      const delayMs = Math.min(3000 * attempt, 15000);
      console.warn(
        `[telegram] getUpdates conflict; retry ${attempt}/${maxAttempts} in ${delayMs / 1000}s…`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
