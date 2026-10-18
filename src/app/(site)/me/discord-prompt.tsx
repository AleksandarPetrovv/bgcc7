"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/site/modal";
import { SlantButton } from "@/components/site/page";
import { useDict } from "@/components/site/lang";
import { DISCORD_URL } from "@/lib/links";
import { linkDiscord, unlinkDiscord } from "./discord-actions";

type Step = { k: "input" } | { k: "ok"; name: string } | { k: "notFound" } | { k: "taken" } | { k: "failed" };

export function DiscordPrompt({ open: ctl, onClose }: { open?: boolean; onClose?: () => void }) {
  const t = useDict();
  const d = t.sched.dc;
  const router = useRouter();
  const [own, setOwn] = useState(true);
  const open = ctl ?? own;
  const [name, setName] = useState("");
  const [step, setStep] = useState<Step>({ k: "input" });
  const [pending, start] = useTransition();

  const check = () =>
    start(async () => {
      const res = await linkDiscord(name).catch(() => ({ ok: false as const, error: "failed" as const }));
      setStep(res.ok ? { k: "ok", name: res.name } : { k: res.error === "notFound" || res.error === "taken" ? res.error : "failed" });
    });

  const close = () => {
    setOwn(false);
    onClose?.();
    if (step.k === "ok") router.refresh();
  };

  return (
    <Modal open={open} onClose={close} tone="balkan">
      {step.k === "ok" ? (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <CheckCircle2 className="size-10 text-balkan" />
          <p className="text-sm font-bold text-paper">{d.ok(step.name)}</p>
          <SlantButton tone="balkan" onClick={close} className="px-6 py-2.5">
            {d.done}
          </SlantButton>
        </div>
      ) : step.k !== "input" ? (
        <div className="flex flex-col items-center gap-5 py-4 text-center">
          <p className="text-sm font-bold text-rose-hi">{step.k === "notFound" ? d.notFound : step.k === "taken" ? d.taken : d.failed}</p>
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
            <input
              id="dc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={d.label}
              autoComplete="off"
              maxLength={40}
              className="min-h-11 min-w-0 flex-1 border border-line bg-ink px-3 text-base text-paper outline-none focus:border-balkan"
            />
            <SlantButton type="submit" tone="balkan" disabled={pending} className="shrink-0 px-4">
              {pending ? d.checking : d.check}
            </SlantButton>
          </form>
          <div className="mt-6 flex flex-col items-center gap-2.5 border-t border-dashed border-line pt-5 text-center">
            <p className="text-xs font-black uppercase tracking-wide text-paper">{d.need}</p>
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
  const btn = "text-xs font-black uppercase tracking-wide text-ash hover:text-paper disabled:opacity-50";
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
