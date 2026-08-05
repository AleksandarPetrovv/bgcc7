import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Container, PageTitle } from "@/components/site/page";
import { PickemsBracket } from "@/components/site/pickems-bracket";
import { getBracketOf } from "@/db/queries";
import { getDict } from "@/lib/i18n/server";

export default async function UserBracket({ params }: PageProps<"/pickems/[osuId]">) {
  const { osuId } = await params;
  const id = Number(osuId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [t, entry] = await Promise.all([getDict(), getBracketOf(id)]);
  if (!entry) notFound();

  return (
    <Container className="max-w-[1400px]">
      <Link href="/pickems" className="mb-4 inline-flex items-center gap-1.5 text-xs font-black uppercase text-ash hover:text-paper">
        <ArrowLeft className="size-4" /> {t.pickems.back}
      </Link>
      <PageTitle
        right={
          entry.picks && (
            <span className="num text-2xl text-balkan">
              {entry.points} {t.common.pts}
            </span>
          )
        }
      >
        <span className="inline-flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {entry.avatarUrl && <img src={entry.avatarUrl} alt="" className="size-12" />}
          {t.pickems.bracketOf(entry.username)}
        </span>
      </PageTitle>
      {entry.picks ? <PickemsBracket picks={entry.picks} /> : <p className="py-10 text-center text-ash">{t.pickems.notSaved}</p>}
    </Container>
  );
}
