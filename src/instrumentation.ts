export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.DATABASE_URL) return;
  const { default: postgres } = await import("postgres");
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  try {
    const [row] = await sql<{ edition: string }[]>`select edition from public.settings where id = 1`;
    (globalThis as { bgccEdition?: string }).bgccEdition = row?.edition === "bgcc6" ? "bgcc6" : "bgcc7";
  } catch {
  } finally {
    await sql.end().catch(() => {});
  }
  // discord reminders: a local ping into the app each minute, so the work runs with the normal server code
  if (process.env.DISCORD_BOT_TOKEN && process.env.AUTH_SECRET) {
    const { createHash } = await import("node:crypto");
    const tick = createHash("sha256").update(`discord-tick:${process.env.AUTH_SECRET}`).digest("hex");
    const url = `http://127.0.0.1:${process.env.PORT ?? 3000}/api/discord/tick`;
    setInterval(() => void fetch(url, { method: "POST", headers: { "x-tick": tick } }).catch(() => {}), 60_000).unref();
  }
}
