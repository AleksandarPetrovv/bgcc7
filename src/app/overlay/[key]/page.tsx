import { notFound, redirect } from "next/navigation";
import { getFormat } from "@/db/edition";
import { getMatches } from "@/db/tournament";
import { overlayUser, streamMatches } from "@/db/stream";
import { matchIdFromSlug } from "@/lib/format";
import { userPath } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Overlay({ params }: { params: Promise<{ key: string }> }) {
  const key = decodeURIComponent((await params).key).toLowerCase();
  const f = getFormat();
  const id = matchIdFromSlug(f, key);
  let who: string | null = null;
  let match = id ? ((await getMatches()).find((m) => m.id === id) ?? null) : null;
  if (!id) {
    const u = await overlayUser(key);
    if (!u) notFound();
    if (userPath(u.name) !== key) redirect(`/overlay/${userPath(u.name)}`);
    who = u.name;
    match = (await streamMatches(u.osuId, false))[0] ?? null;
  } else if (!match) notFound();

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-ink">
      <div className="grid justify-items-center gap-4 text-center">
        <span className="heading-slam text-6xl">{f.name}</span>
        {match && (
          <span className="flex items-center gap-4 text-3xl font-black">
            <span className="h-8 w-1.5 bg-rose" aria-hidden />
            {match.team1.name}
            <span className="text-base uppercase text-ash">vs</span>
            {match.team2.name}
            <span className="h-8 w-1.5 bg-azure" aria-hidden />
          </span>
        )}
        <span className="text-sm font-black uppercase tracking-[0.2em] text-ash">overlay coming soon{who ? ` · ${who}` : ""}</span>
      </div>
    </div>
  );
}
