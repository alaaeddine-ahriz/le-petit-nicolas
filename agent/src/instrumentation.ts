export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startTelegramChannel } = await import("@/telegram/start");
  await startTelegramChannel();

  // Telegram allows only one getUpdates consumer per bot token. CopilotKit's
  // channel already long-polls; starting the quiz updates-listener too causes
  // a 409 and the bot never receives DMs.
  const copilotKitOwnsPolling = Boolean(
    process.env.TELEGRAM_BOT_TOKEN &&
      (process.env.CPK_INTELLIGENCE_API_KEY || process.env.COPILOTKIT_API_KEY),
  );
  if (copilotKitOwnsPolling) {
    console.warn(
      "Updates listener skipped: CopilotKit Telegram channel owns getUpdates.",
    );
    return;
  }

  const { startTelegramUpdatesListener } = await import("@/telegram/updates-listener");
  startTelegramUpdatesListener();
}
