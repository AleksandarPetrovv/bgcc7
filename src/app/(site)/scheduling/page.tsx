import { notFound } from "next/navigation";
import { Container } from "@/components/site/page";
import { PageTitle } from "@/components/site/page-title";
import { getAllTeams } from "@/db/tournament";
import { mySchedule } from "@/db/schedule";
import { getMe } from "@/db/viewer";
import { getDict } from "@/lib/i18n/server";
import { roundName } from "@/lib/i18n/dict";
import { isOpen, weekOf } from "@/lib/schedule";
import { SchedCard, type Side } from "./sched-card";
import { SchedPoll } from "./poll";
import { schedSig } from "./actions";

export default async function Scheduling() {
  const [t, v, teams] = await Promise.all([getDict(), getMe(), getAllTeams()]);
  if (!v?.canSchedule) notFound();
  const [list, sig] = await Promise.all([mySchedule(v.myTeam), schedSig()]);
  const side = (id: string): Side => {
    const x = teams.find((tm) => tm.id === id);
    return { id, name: x?.name ?? id, image: x?.image ?? "", players: x?.players.map((p) => p.userId) ?? [], names: x?.players.map((p) => p.username) ?? [] };
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
      <SchedPoll sig={sig} />
      {rows.length ? (
        <div className="mx-auto grid max-w-3xl gap-14 pb-16">
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
              viewer={v.osuId}
              readOnly={!v.captainOf}
            />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-ash">{t.sched.empty}</p>
      )}
    </Container>
  );
}
