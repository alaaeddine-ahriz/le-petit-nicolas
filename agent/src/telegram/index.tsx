/** @jsxImportSource @copilotkit/channels-ui */
import { createChannel, Message } from "@copilotkit/channels";
import {
  defaultTelegramContext,
  defaultTelegramTools,
  telegram,
} from "@copilotkit/channels-telegram";
import { agent } from "@/agent";

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
    adapters: [telegram({ token: botToken })],
    tools: [...defaultTelegramTools],
    context: [...defaultTelegramContext],
  });

  channel.onMention(async ({ thread }) => {
    await thread.runAgent();
  });

  channel.onMessage(async ({ thread }) => {
    await thread.runAgent();
  });

  channel.onThreadStarted(async ({ thread }) => {
    await thread.post(
      <Message>Hello, how can I help you today?</Message>,
    );
  });

  return channel;
}
