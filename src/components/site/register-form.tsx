"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { setFlash } from "./flash";
import { Check } from "lucide-react";
import { SlantButton } from "./page";
import { useDict } from "./lang";
import { login } from "@/app/(site)/pickems/actions";
import { signUp, withdraw } from "@/app/(site)/register/actions";
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
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: typeof signUp) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) return setError(res.error === "notBg" ? t.register.notBg : res.error === "closed" ? t.register.closedError : t.register.error);
      if (fn === signUp) {
        setFlash("signedUp");
        router.push("/");
      }
    });

  return (
    <div className="self-start border border-line bg-coal">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <span className="text-sm font-black uppercase tracking-wide">{t.register.entry}</span>
        <span className={cn("text-xs font-black uppercase tracking-[0.14em]", status ? TONE[status] : "text-ash")}>
          {status ? t.register.statusText[status] : t.register.notSigned}
        </span>
      </div>
      <div className="space-y-5 p-5 sm:p-7">
        {user ? (
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {user.image && <img src={user.image} alt="" className="size-16 shrink-0" />}
            <div className="min-w-0">
              <div className="truncate text-2xl font-black">{user.name}</div>
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

        {(!user || state === "open") && (
          <div className={cn("flex flex-wrap gap-3 border-t border-line pt-5", pending && "pointer-events-none opacity-60")}>
            {!user ? (
              <SlantButton tone="balkan" onClick={() => start(() => login(path))}>
                {t.nav.login}
              </SlantButton>
            ) : status ? (
              <SlantButton tone="outline" onClick={() => run(withdraw)}>
                {pending ? "…" : t.register.withdraw}
              </SlantButton>
            ) : (
              <SlantButton tone="balkan" onClick={() => run(signUp)}>
                {pending ? "…" : t.register.signUp}
              </SlantButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
