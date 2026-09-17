import { requireRole } from "@/lib/authz";
import { packJobs } from "@/lib/pack-builder";

export async function GET() {
  try {
    await requireRole("mappools");
  } catch {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  return Response.json(packJobs(), { headers: { "Cache-Control": "no-store" } });
}
