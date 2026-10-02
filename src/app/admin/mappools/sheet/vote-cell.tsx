"use client";

import { useState } from "react";
import { Crown } from "lucide-react";
import { useDict } from "@/components/site/lang";
import type { Pooler, Voter } from "@/db/pool-sheet";
import { scoreColor } from "@/lib/score-color";
import { cn } from "@/lib/utils";
import { VotePicker } from "./vote-picker";
import { VotesPop } from "./votes-pop";

type Props = {
  id: number;
  viewer: number;
  mine: number | null;
  mineNote: string;
  canVote: boolean;
  own: boolean;
  picked: boolean;
  won: boolean;
  lead: boolean;
  votes: Voter[];
  waiting: Pooler[];
};

export function VoteCell({ id, viewer, mine, mineNote, canVote, own, picked, won, lead, votes, waiting }: Props) {
  const t = useDict();
  const [draft, setDraft] = useState<{ n: number | null; saved: number | null }>({ n: mine, saved: mine });
  const [seen, setSeen] = useState(mine);
  if (seen !== mine) {
    setSeen(mine);
    if (draft.n === draft.saved) setDraft({ n: mine, saved: mine });
  }
  const others = votes.filter((v) => v.osuId !== viewer).map((v) => v.score);
  const mineNow = draft.n;
  const all = mineNow === null ? others : [...others, mineNow];
  const avg = all.length ? all.reduce((a, b) => a + b, 0) / all.length : null;
  const preview = draft.n !== null && draft.n !== draft.saved;

  return (
    <>
      {canVote &&
        !picked &&
        (own ? (
          <span className="text-xs font-black uppercase text-ash">{t.admin.yourSuggestion}</span>
        ) : (
          <VotePicker id={id} mine={mine} mineNote={mineNote} onDraft={(n, saved) => setDraft({ n, saved })} />
        ))}
      <div className="relative flex w-28 flex-col items-center leading-none">
        <span
          className={cn(
            "relative flex h-10 min-w-24 -skew-x-12 items-center justify-center border bg-ink/60 px-3 transition-[border-color,box-shadow] duration-200",
            preview
              ? "border-dashed border-paper/40"
              : won
                ? "border-balkan shadow-[3px_3px_0_0_var(--color-balkan-deep)]"
                : lead && !picked
                  ? "border-rose shadow-[3px_3px_0_0_var(--color-rose-deep)]"
                  : "border-line",
          )}
        >
          {lead && !picked && (
            <span className="absolute -left-2.5 -top-2.5 grid size-6 place-items-center bg-rose text-white shadow-[2px_2px_0_0_var(--color-rose-deep)]">
              <Crown className="size-3.5 skew-x-12" />
            </span>
          )}
          <span className={cn("heading-slam skew-x-12 text-[1.7rem] leading-none tabular-nums", avg === null ? "text-ash" : "text-paper")}>
            {avg === null ? (
              <span className="font-sans text-[0.65rem] font-bold text-ash">?/10</span>
            ) : (
              <>
                {avg.toFixed(1)}
                <span className="font-sans text-[0.65rem] font-bold text-ash">/10</span>
              </>
            )}
          </span>
          {avg !== null && <span className="absolute inset-x-0 bottom-0 h-[3px] opacity-80 transition-colors duration-200" style={{ background: scoreColor(avg) }} aria-hidden />}
        </span>
        <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap">
          {preview ? (
            <span className="text-[0.68rem] font-bold uppercase text-ash">{t.admin.withYours}</span>
          ) : (
            <VotesPop label={t.admin.votesIn(votes.length)} votes={votes} waiting={waiting} avg={avg} />
          )}
        </span>
      </div>
    </>
  );
}
