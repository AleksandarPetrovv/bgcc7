export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.DATABASE_URL) return;
  const { default: postgres } = await import("postgres");
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  try {
    const [row] = await sql<{ edition: string }[]>`select edition from public.settings where id = 1`;
    (globalThis as { bgccEdition?: string }).bgccEdition = row?.edition === "bgcc7" ? "bgcc7" : "bgcc6";
  } catch {
  } finally {
    await sql.end().catch(() => {});
  }
}
