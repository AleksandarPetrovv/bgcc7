import { requireRole } from "@/lib/authz";
import { packJob, startPackJob } from "@/lib/pack-builder";

async function staff() {
  try {
    return await requireRole("mappools");
  } catch {
    return null;
  }
}

export async function GET(_: Request, { params }: RouteContext<"/api/admin/mappack/[slug]/generate">) {
  if (!(await staff())) return Response.json({ error: "forbidden" }, { status: 403 });
  return Response.json(packJob((await params).slug));
}

export async function POST(_: Request, { params }: RouteContext<"/api/admin/mappack/[slug]/generate">) {
  const who = await staff();
  if (!who) return Response.json({ error: "forbidden" }, { status: 403 });
  return Response.json(startPackJob((await params).slug, who.osuId));
}
