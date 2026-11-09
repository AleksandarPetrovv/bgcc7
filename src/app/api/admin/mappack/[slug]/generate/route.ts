import { staffFor } from "@/lib/authz";
import { packJob, startPackJob } from "@/lib/pack-builder";

export async function GET(_: Request, { params }: RouteContext<"/api/admin/mappack/[slug]/generate">) {
  if (!(await staffFor("host"))) return Response.json({ error: "forbidden" }, { status: 403 });
  return Response.json(packJob((await params).slug));
}

export async function POST(_: Request, { params }: RouteContext<"/api/admin/mappack/[slug]/generate">) {
  const who = await staffFor("host");
  if (!who) return Response.json({ error: "forbidden" }, { status: 403 });
  return Response.json(startPackJob((await params).slug, who.osuId));
}
