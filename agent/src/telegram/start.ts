import { createCopilotNodeListener } from "@copilotkit/runtime/v2/node";
import { runtime } from "@/runtime";
import { telegramChannel } from "@/telegram";

const started = globalThis as typeof globalThis & {
  __telegramChannelStarted?: boolean;
};

export async function startTelegramChannel() {
  if (!telegramChannel) {
    console.warn("Telegram skipped: missing TELEGRAM_BOT_TOKEN");
    return;
  }

  if (!process.env.CPK_INTELLIGENCE_API_KEY && !process.env.COPILOTKIT_API_KEY) {
    console.warn("Telegram skipped: missing CPK_INTELLIGENCE_API_KEY");
    return;
  }

  if (started.__telegramChannelStarted) return;
  started.__telegramChannelStarted = true;

  const listener = createCopilotNodeListener({ runtime });
  await listener.channels?.ready();
}
