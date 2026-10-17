"use client";

import { useState, useTransition } from "react";
import { useDict } from "@/components/site/lang";
import { cn } from "@/lib/utils";
import { bookLobby, leaveLobby } from "./actions";

export function LobbyButton({ lobbyId, mine, full, hasBooking }: { lobbyId: number; mine: boolean; full: boolean; hasBooking: boolean }) {
  const t = useDict();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => ReturnType<typeof leaveLobby>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(t.qual.errors[res.error] ?? t.qual.errors.error);
    });

  if (full && !mine) return <span className="text-xs font-black uppercase text-ash">{t.qual.full}</span>;
  return (
    <span className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => (mine ? leaveLobby() : bookLobby(lobbyId)))}
        className={cn(
          "min-h-9 px-3 text-xs font-black uppercase tracking-wide transition disabled:opacity-50",
          mine ? "border border-line text-ash hover:border-rose hover:text-paper" : "bg-balkan text-ink hover:bg-paper",
        )}
      >
        {pending ? "…" : mine ? t.qual.leave : hasBooking ? t.qual.switchHere : t.qual.book}
      </button>
      {error && <span className="max-w-48 text-right text-xs font-bold text-rose-hi">{error}</span>}
    </span>
  );
}
