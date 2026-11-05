export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initBackgroundCron } = await import("./lib/reminders-service");
    initBackgroundCron();
  }
}
