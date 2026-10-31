"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/site/modal";
import { SlantButton } from "@/components/site/page";
import { useDict } from "@/components/site/lang";
import { DISCORD_URL } from "@/lib/links";
import { cn } from "@/lib/utils";
import { confirmDiscord, linkDiscord, unlinkDiscord } from "./discord-actions";

type Fail = "notFound" | "taken" | "failed" | "dm" | "wait" | "expired";
type Step = { k: "input" } | { k: "code"; name: string; wrong?: boolean } | { k: "ok"; name: string } | { k: Fail };
const FAILS: string[] = ["notFound", "taken", "dm", "wait", "expired"];

export function DiscordPrompt({ open: ctl, onClose }: { open?: boolean; onClose?: () => void }) {
  const t = useDict();
  const d = t.sched.dc;
  const router = useRouter();
  const [own, setOwn] = useState(true);
  const open = ctl ?? own;
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>({ k: "input" });
  const [pending, start] = useTransition();
  const fail = (e: string): Step => ({ k: (FAILS.includes(e) ? e : "failed") as Fail });

  const check = () =>
    start(async () => {
      const res = await linkDiscord(name).catch(() => ({ ok: false as const, error: "failed" as const }));
      setCode("");
      setStep(res.ok ? { k: "code", name: res.name } : fail(res.error));
    });

  const verify = (shown: string) =>
    start(async () => {
      const res = await confirmDiscord(code).catch(() => ({ ok: false as const, error: "failed" as const }));
      setStep(res.ok ? { k: "ok", name: res.name } : res.error === "wrong" ? { k: "code", name: shown, wrong: true } : fail(res.error));
    });

  const msg: Record<Fail, string> = { notFound: d.notFound, taken: d.taken, failed: d.failed, dm: d.dmFailed, wait: d.wait, expired: d.expired };
  const wrap = "flex min-h-11 min-w-0 flex-1 -skew-x-12 border border-line bg-ink focus-within:border-balkan";
  const field = "adm-bare min-w-0 flex-1 skew-x-12 border-0 bg-transparent px-4 text-base text-paper outline-none placeholder:text-ash";

  const close = () => {
    setOwn(false);
    onClose?.();
    if (step.k === "ok") router.refresh();
  };

  return (
    <Modal open={open} onClose={close} tone="balkan">
      {step.k === "ok" ? (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <CheckCircle2 className="size-10 text-balkan-hi" />
          <p className="text-sm font-bold text-paper">{d.ok(step.name)}</p>
          <SlantButton tone="balkan" onClick={close} className="px-6 py-2.5">
            {d.done}
          </SlantButton>
        </div>
      ) : step.k === "code" ? (
        <>
          <h3 className="heading-slam pr-6 text-2xl">{d.codeTitle}</h3>
          <p className="mt-1.5 text-sm text-ash">{d.codeText(step.name)}</p>
          <form
            className="mt-5 flex flex-col items-center gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.length === 6 && !pending) verify(step.name);
            }}
          >
            <label className="sr-only" htmlFor="dc-code">
              {d.codeLabel}
            </label>
            {/* one real input under 6 drawn boxes, so paste and one-time-code autofill keep working */}
            <div className="group relative flex gap-2 px-2">
              <input
                id="dc-code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  if (step.wrong) setStep({ ...step, wrong: false });
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                className="peer absolute inset-0 z-10 w-full cursor-text opacity-0"
              />
              {Array.from({ length: 6 }, (_, i) => (
                <span
                  key={i}
                  aria-hidden
                  className={cn(
                    "grid h-14 w-11 -skew-x-12 place-items-center border bg-ink transition-colors",
                    step.wrong ? "border-rose" : "border-line",
                    i === Math.min(code.length, 5) && "peer-focus:border-balkan",
                  )}
                >
                  <span className="skew-x-12 font-display text-2xl font-black text-paper">{code[i] ?? ""}</span>
                </span>
              ))}
            </div>
            <SlantButton type="submit" tone="balkan" disabled={pending || code.length !== 6} className="px-8 py-2.5">
              {pending ? d.checking : d.verify}
            </SlantButton>
          </form>
          {step.wrong && <p className="mt-3 text-sm font-bold text-rose-hi">{d.wrong}</p>}
          <button type="button" onClick={() => setStep({ k: "input" })} className="mt-4 text-xs font-display font-bold text-ash hover:text-paper">
            {d.back}
          </button>
        </>
      ) : step.k !== "input" ? (
        <div className="flex flex-col items-center gap-5 py-4 text-center">
          <p className="text-sm font-bold text-rose-hi">{msg[step.k]}</p>
          <SlantButton tone="paper" onClick={() => setStep({ k: "input" })} className="px-7 py-2.5">
            {d.retry}
          </SlantButton>
        </div>
      ) : (
        <>
          <h3 className="heading-slam pr-6 text-2xl">{d.title}</h3>
          <p className="mt-1.5 text-sm text-ash">{d.text}</p>
          <form
            className="mt-5 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim() && !pending) check();
            }}
          >
            <label className="sr-only" htmlFor="dc-name">
              {d.label}
            </label>
            <span className={wrap}>
            <input
              id="dc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={d.label}
              autoComplete="off"
              maxLength={40}
              className={field}
            />
            </span>
            <SlantButton type="submit" tone="balkan" disabled={pending} className="shrink-0 px-4">
              {pending ? d.checking : d.check}
            </SlantButton>
          </form>
          <div className="mt-6 flex flex-col items-center gap-2.5 border-t border-dashed border-line pt-5 text-center">
            <p className="text-xs font-display font-bold text-paper">{d.need}</p>
            <SlantButton tone="balkan" href={DISCORD_URL}>
              {t.common.discord}
            </SlantButton>
          </div>
        </>
      )}
    </Modal>
  );
}

export function DiscordLine({ name }: { name: string | null }) {
  const t = useDict();
  const d = t.sched.dc;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const unlink = () =>
    start(async () => {
      await unlinkDiscord().catch(() => null);
      router.refresh();
    });
  const btn = "text-xs font-display font-bold text-ash hover:text-paper disabled:opacity-50";
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ash">
      {name ? <span>{d.linked(name)}</span> : null}
      <button type="button" onClick={() => setOpen(true)} className={btn}>
        {name ? d.change : d.missing}
      </button>
      {name && (
        <button type="button" onClick={unlink} disabled={pending} className={btn}>
          {d.unlink}
        </button>
      )}
      <DiscordPrompt key={String(open)} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
