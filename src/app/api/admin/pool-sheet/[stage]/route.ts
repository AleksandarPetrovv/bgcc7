import { sheetVersion } from "@/db/pool-sheet";
import { requireRole } from "@/lib/authz";

export async function GET(_: Request, { params }: { params: Promise<{ stage: string }> }) {
  try {
    await requireRole("mappools");
  } catch {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const id = Number((await params).stage);
  if (!Number.isInteger(id)) return Response.json({ error: "invalid" }, { status: 400 });
  return Response.json({ v: await sheetVersion(id) }, { headers: { "Cache-Control": "no-store" } });
}
