"use client";

import { useState } from "react";
import { Crown, User } from "lucide-react";
import { useDict } from "@/components/site/lang";
import type { Pooler, Voter } from "@/db/pool-sheet";
import { cn } from "@/lib/utils";
import { SlantBg } from "@/components/site/slant";
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
  const pts = all.length ? all.reduce((a, b) => a + b, 0) : null;
  const preview = draft.n !== null && draft.n !== draft.saved;

  return (
    <>
      {canVote &&
        !picked &&
        (own ? (
          <span className="relative isolate flex min-h-10 w-24 shrink-0 cursor-default items-center justify-center text-xs font-display font-bold text-ash">
            <SlantBg className="border border-rose/30" />
            <span className="flex items-center gap-1.5">
              <User className="size-3.5" />
              {t.admin.yourSuggestion}
            </span>
          </span>
        ) : (
          <VotePicker id={id} mine={mine} mineNote={mineNote} onDraft={(n, saved) => setDraft({ n, saved })} />
        ))}
      <div className="relative flex w-28 flex-col items-center leading-none">
        <span className="relative isolate flex h-10 min-w-24 items-center justify-center px-3">
          <SlantBg
            className={cn(
              "border bg-ink/60 transition-[border-color,box-shadow] duration-200",
              preview
                ? "border-dashed border-paper/40"
                : won
                  ? "border-balkan shadow-[3px_3px_0_0_var(--balkan-deep)]"
                  : lead && !picked
                    ? "border-rose shadow-[3px_3px_0_0_var(--rose-deep)]"
                    : "border-paper/30",
            )}
          />
          {lead && !picked && (
            <span className="absolute -left-1.5 -top-2.5 isolate grid size-6 place-items-center text-white">
              <SlantBg className="bg-rose shadow-[2px_2px_0_0_var(--rose-deep)]" />
              <Crown className="size-3.5" />
            </span>
          )}
          <span className={cn("heading-slam text-[1.7rem] leading-none tabular-nums", pts === null ? "text-paper/70" : "text-paper")}>
            {pts === null ? (
              "?"
            ) : (
              <>
                {pts}
                <span className="text-[0.65rem] font-display font-bold text-paper/70"> {t.admin.ptsUnit}</span>
              </>
            )}
          </span>
        </span>
        <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap">
          {preview ? (
            <span className="text-[0.68rem] font-display font-bold text-ash">{t.admin.withYours}</span>
          ) : (
            <VotesPop label={t.admin.votesIn(votes.length)} votes={votes} waiting={waiting} pts={pts} />
          )}
        </span>
      </div>
    </>
  );
}
