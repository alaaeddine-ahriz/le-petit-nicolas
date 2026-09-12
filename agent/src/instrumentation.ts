export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startTelegramChannel } = await import("@/telegram/start");
  await startTelegramChannel();
  const { startTelegramUpdatesListener } = await import("@/telegram/updates-listener");
  startTelegramUpdatesListener();
}
