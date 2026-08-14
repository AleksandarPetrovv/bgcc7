"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Download, FileArchive, UploadCloud } from "lucide-react";
import { Btn } from "@/components/admin/form";
import { useDict } from "@/components/site/lang";
import { Tabs } from "@/components/site/tabs";
import type { Pack } from "@/lib/data";
import { cn } from "@/lib/utils";

type StageInfo = { slug: string; title: string; pack: Pack | null };

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(n > 100 * 1024 * 1024 ? 0 : 1)} MB`;

export function PackUploader({ stages, locale }: { stages: StageInfo[]; locale: string }) {
  const t = useDict();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [slug, setSlug] = useState(stages[0]?.slug ?? "");
  const [progress, setProgress] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [over, setOver] = useState(false);
  const stage = stages.find((s) => s.slug === slug);
  if (!stage) return null;
  const name = (s: StageInfo) => t.rounds[s.title] ?? s.title;

  function upload(file: File) {
    if (!file.name.toLowerCase().endsWith(".zip")) return setMsg({ ok: false, text: t.admin.packErrors.notZip });
    setMsg(null);
    setProgress(0);
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `/api/admin/mappack/${slug}`);
    xhr.setRequestHeader("Content-Type", "application/zip");
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(e.loaded / e.total);
    xhr.onload = () => {
      setProgress(null);
      let err = "failed";
      try {
        err = JSON.parse(xhr.responseText).error ?? err;
      } catch {}
      if (xhr.status === 200) {
        setMsg({ ok: true, text: t.admin.packDone });
        router.refresh();
      } else setMsg({ ok: false, text: t.admin.packErrors[err] ?? t.admin.packErrors.failed });
    };
    xhr.onerror = () => {
      setProgress(null);
      setMsg({ ok: false, text: t.admin.packErrors.failed });
    };
    xhr.send(file);
  }

  async function remove() {
    if (!window.confirm(t.admin.confirmDeletePack)) return;
    const res = await fetch(`/api/admin/mappack/${slug}`, { method: "DELETE" });
    setMsg(res.ok ? { ok: true, text: t.admin.saved } : { ok: false, text: t.admin.error });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Tabs
        label={t.admin.packs}
        index={stages.findIndex((s) => s.slug === slug)}
        onChange={(i) => {
          setSlug(stages[i].slug);
          setMsg(null);
        }}
        options={stages.map((s) => (
          <>
            {name(s)}
            <span className={cn("size-1.5 rotate-45", s.pack ? "bg-balkan" : "bg-line")} aria-hidden />
          </>
        ))}
      />

      <div className="flex flex-wrap items-center gap-3 border border-line bg-ink/50 px-4 py-3 text-sm">
        <FileArchive className={cn("size-5 shrink-0", stage.pack ? "text-balkan" : "text-ash")} />
        {stage.pack ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="font-bold">{t.admin.packCurrent}</span>{" "}
              <span className="num text-ash">
                {mb(stage.pack.size)}
                {stage.pack.at && ` · ${new Date(stage.pack.at).toLocaleString(locale, { timeZone: "Europe/Sofia", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}`}
              </span>
            </span>
            <a href={`/download/${slug}`} download className="num inline-flex items-center gap-1.5 text-xs text-ash transition-colors hover:text-paper">
              <Download className="size-3.5" /> /download/{slug}
            </a>
            <Btn type="button" tone="outline" small onClick={remove}>
              {t.admin.packDelete}
            </Btn>
          </>
        ) : (
          <span className="text-ash">{t.admin.packNone}</span>
        )}
      </div>

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
        <span className="text-sm font-bold uppercase tracking-wide">{stage.pack ? t.admin.packReplace(name(stage)) : t.admin.packDrop(name(stage))}</span>
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
