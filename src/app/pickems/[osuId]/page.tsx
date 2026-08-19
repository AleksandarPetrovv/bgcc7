import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Container, PageTitle, Wide } from "@/components/site/page";
import { PickemsBracket } from "@/components/site/pickems-bracket";
import { getBracketOf } from "@/db/queries";
import { getDict } from "@/lib/i18n/server";
import { requireSection } from "@/lib/authz";

export default async function UserBracket({ params }: PageProps<"/pickems/[osuId]">) {
  await requireSection("pickems");
  const { osuId } = await params;
  const id = Number(osuId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [t, entry] = await Promise.all([getDict(), getBracketOf(id)]);
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
