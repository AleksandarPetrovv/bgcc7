"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { SlantButton } from "./page";
import { useDict } from "./lang";
import { login } from "@/app/pickems/actions";
import { signUp, withdraw } from "@/app/register/actions";
import { cn } from "@/lib/utils";
import type { WindowState } from "@/lib/time";

type Props = {
  user: { name: string; image: string | null } | null;
  status: "pending" | "approved" | "denied" | null;
  state: WindowState;
  opensAt: string;
};

const TONE = { pending: "text-paper", approved: "text-balkan", denied: "text-rose-hi" };

export function RegisterForm({ user, status, state, opensAt }: Props) {
  const t = useDict();
  const path = usePathname();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: typeof signUp) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error === "notBg" ? t.register.notBg : res.error === "closed" ? t.register.closedError : t.register.error);
    });

  return (
    <div className="self-start border border-line bg-coal">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <span className="text-sm font-black uppercase tracking-wide">{t.register.entry}</span>
        <span className={cn("text-xs font-black uppercase tracking-widest", status ? TONE[status] : "text-ash")}>
          {status ? t.register.statusText[status] : t.register.notSigned}
        </span>
      </div>
      <div className="space-y-5 p-5 sm:p-7">
        {user ? (
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {user.image && <img src={user.image} alt="" className="size-16 shrink-0" />}
            <div className="min-w-0">
              <div className="truncate font-display text-2xl font-bold lowercase">{user.name}</div>
              {status && (
                <div className={cn("mt-1 flex items-center gap-1.5 text-sm font-black uppercase", TONE[status])}>
                  <Check className="size-4" /> {t.register.signedUp}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="font-black uppercase">{t.register.loginFirst}</div>
            <p className="mt-1 text-sm text-ash">{t.register.loginText}</p>
          </div>
        )}

        {status && <p className="text-sm text-ash">{t.register.doneTexts[status]}</p>}
        {!status && state !== "open" && (
          <p className="text-sm font-bold text-paper/80">{state === "soon" ? t.register.soonText(opensAt) : t.register.closedText}</p>
        )}
        {error && <p className="text-sm font-bold text-rose-hi">{error}</p>}

        <div className={cn("border-t border-line pt-5", pending && "pointer-events-none opacity-60")}>
          {!user ? (
            <SlantButton tone="balkan" onClick={() => start(() => login(path))}>
              {t.nav.login}
            </SlantButton>
          ) : status ? (
            <SlantButton tone="outline" onClick={() => run(withdraw)}>
              {pending ? "…" : t.register.withdraw}
            </SlantButton>
          ) : state === "open" ? (
            <SlantButton tone="balkan" onClick={() => run(signUp)}>
              {pending ? "…" : t.register.signUp}
            </SlantButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
