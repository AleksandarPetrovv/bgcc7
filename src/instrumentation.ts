export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.DATABASE_URL) return;
  const { default: postgres } = await import("postgres");
  const { bootEdition, restartDraftClocks, tickKey } = await import("./lib/boot");
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  try {
    await bootEdition(sql);
    await restartDraftClocks(sql).catch((e) => console.error("[boot] draft clocks", e));
  } catch (e) {
    // db/index.ts asks again on first use
    console.error("[boot] edition", e);
  } finally {
    await sql.end().catch(() => {});
  }
  // discord reminders: a local ping into the app each minute, so the work runs with the normal server code
  if (process.env.DISCORD_BOT_TOKEN && process.env.AUTH_SECRET) {
    const tick = tickKey(process.env.AUTH_SECRET);
    const url = `http://127.0.0.1:${process.env.PORT ?? 3000}/api/discord/tick`;
    setInterval(() => void fetch(url, { method: "POST", headers: { "x-tick": tick } }).catch(() => {}), 60_000).unref();
    if (process.env.NODE_ENV === "production") (await import("./lib/discord-gateway")).startGateway(process.env.DISCORD_BOT_TOKEN);
  }
}
