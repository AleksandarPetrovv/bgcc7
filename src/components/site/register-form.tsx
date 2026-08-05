"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { SlantButton } from "./page";
import { useDict } from "./lang";
import { login } from "@/app/pickems/actions";
import { signUp, withdraw } from "@/app/register/actions";

type Props = { user: { name: string; image: string | null } | null; registered: boolean };

export function RegisterForm({ user, registered }: Props) {
  const t = useDict();
  const path = usePathname();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: typeof signUp) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error === "notBg" ? t.register.notBg : t.register.error);
    });

  return (
    <div className="self-start border border-line bg-coal">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <span className="text-sm font-black uppercase tracking-wide">{t.register.entry}</span>
        <span className={registered ? "text-xs font-black uppercase tracking-widest text-balkan" : "text-xs font-black uppercase tracking-widest text-ash"}>
          {registered ? t.register.signedUp : t.register.notSigned}
        </span>
      </div>
      <div className="space-y-5 p-5 sm:p-7">
        {user ? (
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {user.image && <img src={user.image} alt="" className="size-16 shrink-0" />}
            <div className="min-w-0">
              <div className="truncate font-display text-2xl font-bold lowercase">{user.name}</div>
              {registered && (
                <div className="mt-1 flex items-center gap-1.5 text-sm font-black uppercase text-balkan">
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

        {registered && <p className="text-sm text-ash">{t.register.doneText}</p>}
        {error && <p className="text-sm font-bold text-rose-hi">{error}</p>}

        <div className="border-t border-line pt-5">
          {!user ? (
            <SlantButton tone="balkan" onClick={() => start(() => login(path))}>
              {t.nav.login}
            </SlantButton>
          ) : registered ? (
            <SlantButton tone="outline" onClick={() => run(withdraw)}>
              {t.register.withdraw}
            </SlantButton>
          ) : (
            <SlantButton tone="balkan" onClick={() => run(signUp)}>
              {pending ? "…" : t.register.signUp}
            </SlantButton>
          )}
        </div>
      </div>
    </div>
  );
}
