import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/osu-api";
import { pickemsHref, userPath } from "@/lib/data";
import { ArrowLeft } from "lucide-react";
import { Container, PageTitle, Wide } from "@/components/site/page";
import { PickemsBracket } from "@/components/site/pickems-bracket";
import { getBracketOf } from "@/db/queries";
import { getDict } from "@/lib/i18n/server";
import { requireSection } from "@/lib/authz";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export default async function UserBracket({ params }: { params: Promise<{ user: string }> }) {
  await requireSection("pickems");
  const { user } = await params;
  let name = user;
  try {
    name = decodeURIComponent(user);
  } catch {}
  if (name !== userPath(name)) redirect(pickemsHref(name));
  let [u] = await db.select({ osuId: users.osuId }).from(users).where(eq(sql`replace(lower(${users.username}), ' ', '_')`, name)).limit(1);
  if (!u) {
    const o = await getUser(name, "username").catch(() => null);
    const [known] = o ? await db.select({ osuId: users.osuId, username: users.username }).from(users).where(eq(users.osuId, o.id)).limit(1) : [];
    if (o && known) {
      if (known.username !== o.username) await db.update(users).set({ username: o.username }).where(eq(users.osuId, o.id));
      if (userPath(o.username) !== name) redirect(pickemsHref(o.username));
      u = known;
    } else {
      const [byId] = /^[1-9]\d{0,9}$/.test(name) ? await db.select({ username: users.username }).from(users).where(eq(users.osuId, Number(name))).limit(1) : [];
      if (byId) redirect(pickemsHref(byId.username));
      notFound();
    }
  }
  const [t, entry] = await Promise.all([getDict(), getBracketOf(u.osuId)]);
  if (!entry) notFound();

  return (
    <Container>
      <Link href="/pickems" className="mb-4 inline-flex items-center gap-1.5 text-xs font-black uppercase text-ash hover:text-paper">
        <ArrowLeft className="size-4" /> {t.pickems.back}
      </Link>
      <PageTitle mark="tick"
        right={
          entry.picks && (
            <span className="in-pop num inline-block text-2xl text-balkan [--d:0.4s]">
              {entry.points} {t.common.pts}
            </span>
          )
        }
      >
        <span className="inline-flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {entry.avatarUrl && <img src={entry.avatarUrl} alt="" className="in-spin size-12" />}
          {t.pickems.bracketOf(entry.username)}
        </span>
      </PageTitle>
      {entry.picks ? <Wide>
          <PickemsBracket picks={entry.picks} />
        </Wide> : <p className="py-10 text-center text-ash">{t.pickems.notSaved}</p>}
    </Container>
  );
}
