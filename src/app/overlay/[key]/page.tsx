import { notFound, redirect } from "next/navigation";
import { getFormat } from "@/db/edition";
import { getMatches } from "@/db/tournament";
import { overlayUser } from "@/db/stream";
import { matchIdFromSlug } from "@/lib/format";
import { userPath } from "@/lib/data";
import { isScene } from "@/lib/scenes";
import { OverlayView } from "./overlay-view";

export const dynamic = "force-dynamic";

export default async function Overlay({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ scene?: string | string[]; stage?: string | string[] }> }) {
  const key = decodeURIComponent((await params).key).toLowerCase();
  if (key === "demo") {
    const scene = (await searchParams).scene;
    const stage = (await searchParams).stage;
    return <OverlayView overlayKey="demo" scene={isScene(scene) ? scene : undefined} stage={typeof stage === "string" ? stage : undefined} />;
  }
  const f = getFormat();
  const id = matchIdFromSlug(f, key);
  const match = id ? ((await getMatches()).find((m) => m.id === id) ?? null) : null;
  if (!id) {
    const u = await overlayUser(key);
    if (!u) notFound();
    if (userPath(u.name) !== key) redirect(`/overlay/${userPath(u.name)}`);
  } else if (!match) notFound();

  return <OverlayView overlayKey={key} />;
}
