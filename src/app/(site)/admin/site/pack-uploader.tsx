"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Download, FileArchive, PackagePlus, UploadCloud } from "lucide-react";
import { Btn } from "@/components/admin/form";
import { useDict } from "@/components/site/lang";
import { Tabs } from "@/components/site/tabs";
import type { Pack } from "@/lib/data";
import { cn } from "@/lib/utils";
import { TZ } from "@/lib/time";

type StageInfo = { slug: string; title: string; pack: Pack | null };
type Job = { state: "running" | "done" | "error"; done: number; total: number; missing: string[]; error?: string; size?: number; zipping?: boolean };

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(n > 100 * 1024 * 1024 ? 0 : 1)} MB`;

const latest = (a: Pack | null, b: Pack | null | undefined) => (b === undefined ? a : !a || !b ? (b ?? a) : (b.at ?? "") > (a.at ?? "") ? b : a);

export function PackUploader({ stages, locale, simple, lead }: { stages: StageInfo[]; locale: string; simple?: boolean; lead?: React.ReactNode }) {
  const t = useDict();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [slug, setSlug] = useState(stages[0]?.slug ?? "");
  const [progress, setProgress] = useState<number | null>(null);
  const [msgs, setMsgs] = useState<Record<string, { ok: boolean; text: string } | null>>({});
  const [over, setOver] = useState(false);
  const [jobs, setJobs] = useState<Record<string, Job>>({});
  const [made, setMade] = useState<Record<string, Pack>>({});
  const prev = useRef<Record<string, Job["state"]>>({});

  const setMsg = useCallback((m: { ok: boolean; text: string } | null, key = slug) => setMsgs((all) => ({ ...all, [key]: m })), [slug]);

  const sync = useCallback(async () => {
    const res = await fetch("/api/admin/mappack/jobs", { cache: "no-store" }).catch(() => null);
    if (!res?.ok) return;
    const all: Record<string, Job> = await res.json();
    let finished = false;
    for (const [key, j] of Object.entries(all)) {
      if (prev.current[key] === "running" && j.state !== "running") {
        finished = true;
        if (j.state === "done") {
          setMade((p) => ({ ...p, [key]: { size: j.size ?? 0, at: new Date().toISOString() } }));
          setMsgs((m) => ({ ...m, [key]: { ok: true, text: t.admin.packGenerated } }));
        } else {
          const text = j.error === "missing" ? t.admin.packMissing(j.missing.join(", ")) : j.error === "empty" ? t.admin.packEmpty : t.admin.packGenFailed;
          setMsgs((m) => ({ ...m, [key]: { ok: false, text } }));
        }
      }
      prev.current[key] = j.state;
    }
    setJobs(all);
    if (finished) router.refresh();
  }, [router, t]);

  const anyRunning = Object.values(jobs).some((j) => j.state === "running");

  useEffect(() => {
    const first = setTimeout(sync, 0);
    return () => clearTimeout(first);
  }, [sync]);

  useEffect(() => {
    if (!anyRunning) return;
    const id = setInterval(sync, 1500);
    return () => clearInterval(id);
  }, [anyRunning, sync]);

  const msg = msgs[slug] ?? null;
  useEffect(() => {
    if (!msg?.ok) return;
    const key = slug;
    const id = setTimeout(() => setMsgs((all) => (all[key] === msg ? { ...all, [key]: null } : all)), 3000);
    return () => clearTimeout(id);
  }, [msg, slug]);

  const stage = stages.find((s) => s.slug === slug);
  if (!stage) return null;
  const packOf = (s: StageInfo) => latest(s.pack, made[s.slug]);
  const pack = packOf(stage);
  const job = jobs[slug];
  const generating = job?.state === "running";
  const forget = (key: string) =>
    setMade((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });

  async function generate() {
    const key = slug;
    if (pack && !window.confirm(t.admin.confirmGeneratePack)) return;
    setMsg(null, key);
    const res = await fetch(`/api/admin/mappack/${key}/generate`, { method: "POST" }).catch(() => null);
    if (!res?.ok) return setMsg({ ok: false, text: t.admin.packGenFailed }, key);
    const j: Job = await res.json();
    prev.current[key] = j.state;
    setJobs((all) => ({ ...all, [key]: j }));
  }
  const name = (s: StageInfo) => t.rounds[s.title] ?? s.title;

  function upload(file: File) {
    const key = slug;
    if (!file.name.toLowerCase().endsWith(".zip")) return setMsg({ ok: false, text: t.admin.packErrors.notZip });
    setMsg(null);
    setProgress(0);
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `/api/admin/mappack/${key}`);
    xhr.setRequestHeader("Content-Type", "application/zip");
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(e.loaded / e.total);
    xhr.onload = () => {
      setProgress(null);
      let err = "failed";
      try {
        err = JSON.parse(xhr.responseText).error ?? err;
      } catch {}
      if (xhr.status === 200) {
        forget(key);
        setMsg({ ok: true, text: t.admin.packDone }, key);
        router.refresh();
      } else setMsg({ ok: false, text: t.admin.packErrors[err] ?? t.admin.packErrors.failed }, key);
    };
    xhr.onerror = () => {
      setProgress(null);
      setMsg({ ok: false, text: t.admin.packErrors.failed }, key);
    };
    xhr.send(file);
  }

  async function remove() {
    if (!window.confirm(t.admin.confirmDeletePack)) return;
    const key = slug;
    const res = await fetch(`/api/admin/mappack/${key}`, { method: "DELETE" });
    forget(key);
    setMsg(res.ok ? { ok: true, text: t.admin.saved } : { ok: false, text: t.admin.error }, key);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {!simple && (
        <Tabs
          label={t.admin.packs}
          index={stages.findIndex((s) => s.slug === slug)}
          onChange={(i) => setSlug(stages[i].slug)}
          options={stages.map((s) => (
            <>
              {name(s)}
              <span className={cn("size-1.5 rotate-45", jobs[s.slug]?.state === "running" ? "animate-pulse bg-rose" : packOf(s) ? "bg-balkan" : "bg-line")} aria-hidden />
            </>
          ))}
        />
      )}

      <div className="flex flex-wrap items-center gap-3 border border-line bg-ink/50 px-4 py-3 text-sm">
        <FileArchive className={cn("size-5 shrink-0", pack ? "text-balkan" : "text-ash")} />
        {pack ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="font-bold">{t.admin.packCurrent}</span>{" "}
              <span className="num text-ash">
                {mb(pack.size)}
                {pack.at &&
                  ` · ${new Date(pack.at).toLocaleString(locale, { timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}`}
              </span>
            </span>
            {simple ? (
              <a
                href={`/download/${stage.slug}?v=${pack.at ?? pack.size}`}
                download
                aria-label={t.admin.packDownload}
                title={t.admin.packDownload}
                className="lift-sm grid size-10 shrink-0 -skew-x-12 place-items-center border border-balkan/60 text-balkan transition-colors hover:bg-balkan hover:text-white"
              >
                <Download className="size-4 skew-x-12" />
              </a>
            ) : (
              <Btn type="button" tone="outline" small onClick={remove}>
                {t.admin.packDelete}
              </Btn>
            )}
          </>
        ) : (
          <span className="text-ash">{t.admin.packNone}</span>
        )}
      </div>

      {!simple && (
        <button
          type="button"
          disabled={progress !== null}
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const f = e.dataTransfer.files[0];
            if (f) upload(f);
          }}
          className={cn(
            "group relative flex w-full flex-col items-center justify-center gap-2 overflow-hidden border-2 border-dashed px-4 py-8 text-center transition-colors",
            over ? "border-rose bg-rose/10" : "border-line hover:border-paper/40",
          )}
        >
          <motion.span animate={over ? { y: -4, scale: 1.1 } : { y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
            <UploadCloud className={cn("size-8 transition-colors", over ? "text-rose-hi" : "text-ash group-hover:text-paper")} />
          </motion.span>
          <span className="text-sm font-bold uppercase tracking-wide">{pack ? t.admin.packReplace(name(stage)) : t.admin.packDrop(name(stage))}</span>
          <span className="text-xs text-ash">{t.admin.packHint}</span>
          <AnimatePresence>
            {progress !== null && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-x-0 bottom-0 h-1.5 bg-slate">
                <motion.span className="block h-full origin-left bg-rose" animate={{ scaleX: progress }} transition={{ ease: "easeOut", duration: 0.2 }} />
              </motion.span>
            )}
          </AnimatePresence>
          {progress !== null && <span className="num text-lg text-paper">{Math.round(progress * 100)}%</span>}
        </button>
      )}
      {simple && (
        <div className="grid gap-3 sm:grid-cols-2">
          {lead}
          <Btn type="button" tone="rose" onClick={generate} disabled={generating || progress !== null} className="h-10 w-full shadow-[3px_3px_0_0_var(--color-rose-deep)]">
            <PackagePlus className="size-3.5" /> {t.admin.packGenerate}
          </Btn>
        </div>
      )}
      <div className={cn("flex flex-wrap items-center gap-3", simple ? (generating ? "" : "hidden") : "border border-line bg-ink/50 px-4 py-3")}>
        {!simple && (
          <Btn type="button" tone="outline" small onClick={generate} disabled={generating || progress !== null}>
            <PackagePlus className="size-3.5" /> {t.admin.packGenerate}
          </Btn>
        )}
        {generating ? (
          <span className="num min-w-0 flex-1 text-xs text-paper">
            {job.zipping ? t.admin.packZipping : job.total ? t.admin.packGenerating(job.done, job.total) : t.admin.packPreparing}
            <span className="mt-1.5 block h-1 bg-slate">
              <motion.span
                className="block h-full origin-left bg-rose"
                animate={{ scaleX: job.total ? job.done / job.total : 0.05 }}
                transition={{ ease: "easeOut", duration: 0.3 }}
              />
            </span>
          </span>
        ) : (
          <span className="min-w-0 flex-1 text-xs text-ash">{t.admin.packGenerateHint}</span>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
      <AnimatePresence>
        {msg && (
          <motion.p
            role="status"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn("text-xs font-bold uppercase tracking-wide", msg.ok ? "text-balkan" : "text-rose-hi")}
          >
            {msg.text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
