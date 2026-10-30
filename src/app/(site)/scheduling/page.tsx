import { notFound } from "next/navigation";
import { Container, PageTitle } from "@/components/site/page";
import { getSettings } from "@/db/settings";
import { getAllTeams } from "@/db/tournament";
import { mySchedule } from "@/db/schedule";
import { getViewer } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { roundName } from "@/lib/i18n/dict";
import { isOpen, weekOf } from "@/lib/schedule";
import { SchedCard, type Side } from "./sched-card";

export default async function Scheduling() {
  const [t, v, settings, teams] = await Promise.all([getDict(), getViewer(), getSettings(), getAllTeams()]);
  if (!v || settings.phase !== "playoffs") notFound();
  const list = await mySchedule(v.osuId);
  if (!list.length && !teams.some((x) => x.players[0]?.userId === v.osuId)) notFound();
  const side = (id: string): Side => {
    const x = teams.find((tm) => tm.id === id);
    return { id, name: x?.name ?? id, image: x?.image ?? "", players: x?.players.map((p) => p.userId) ?? [] };
  };
  const rows = list
    .map((m) => {
      const w = weekOf(m.week);
      return { m, w, open: isOpen(w) };
    })
    .sort((a, b) => (a.w?.deadline.getTime() ?? Infinity) - (b.w?.deadline.getTime() ?? Infinity));
  return (
    <Container plain>
      <PageTitle mark="clock">{t.sched.title}</PageTitle>
      {rows.length ? (
        <div className="mx-auto grid max-w-3xl gap-6 pb-16">
          {rows.map(({ m, w, open }, n) => (
            <SchedCard
              key={m.id}
              n={n}
              m={m}
              round={roundName(t, m.round)}
              me={side(m.mine)}
              opp={side(m.opp)}
              week={w ? { deadline: w.deadline.toISOString(), min: w.min, max: w.max } : null}
              open={open}
            />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-ash">{t.sched.empty}</p>
      )}
    </Container>
  );
}
