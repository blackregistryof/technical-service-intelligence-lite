// Runs once when a server instance starts, before it handles requests.

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { dataSourceStartupLog } = await import("./lib/data/source");
  const { level, message } = dataSourceStartupLog();
  console[level](message);
}
