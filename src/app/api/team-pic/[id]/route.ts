import { staffFor } from "@/lib/authz";
import { teamPic } from "@/db/team-requests";

export async function GET(_: Request, { params }: RouteContext<"/api/team-pic/[id]">) {
  const id = Number((await params).id);
  const r = Number.isInteger(id) && id > 0 ? await teamPic(id) : null;
  // only accepted pictures are public; hosts can see pending ones to review them
  if (!r || (r.status !== "accepted" && !(await staffFor("host")))) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(r.pic!), {
    headers: {
      "Content-Type": r.mime!,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Disposition": "inline",
      "Cache-Control": r.status === "accepted" ? "public, max-age=31536000, immutable" : "private, no-store",
    },
  });
}
