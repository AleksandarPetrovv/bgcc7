import { staffFor } from "@/lib/authz";
import { packJob, startPackJob } from "@/lib/pack-builder";

export async function GET(_: Request, { params }: RouteContext<"/api/admin/mappack/[slug]/generate">) {
  if (!(await staffFor("poolEdit"))) return Response.json({ error: "forbidden" }, { status: 403 });
  return Response.json(packJob((await params).slug));
}

export async function POST(_: Request, { params }: RouteContext<"/api/admin/mappack/[slug]/generate">) {
  const who = await staffFor("poolEdit");
  if (!who) return Response.json({ error: "forbidden" }, { status: 403 });
  return Response.json(startPackJob((await params).slug, who.osuId));
}
