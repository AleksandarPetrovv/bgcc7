"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { ImagePlus } from "lucide-react";
import { Popup, PopupTitle } from "@/components/site/popup";
import { SlantBg, SlantButton } from "@/components/site/slant";
import { useDict } from "@/components/site/lang";
import { cn } from "@/lib/utils";
import { SquareCrop, type CropSrc } from "./square-crop";

const MAX = 20 * 1024 * 1024;
const d = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

/** forced while the captain owes a pick: no close, an empty send keeps the captain defaults */
export function TeamPrompt({ avatar }: { avatar: string }) {
  const t = useDict();
  const r = t.teamReq;
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [pic, setPic] = useState<{ file: File; url: string } | null>(null);
  const [crop, setCrop] = useState<CropSrc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const pick = async (f: File | null) => {
    if (pic) URL.revokeObjectURL(pic.url);
    setPic(null);
    setError(null);
    if (input.current) input.current.value = "";
    if (!f) return;
    if (f.size > MAX) return setError(r.errors.tooBig);
    const bmp = await createImageBitmap(f).catch(() => null);
    if (!bmp) return setError(r.errors.notImage);
    const { width: w, height: h } = bmp;
    bmp.close();
    if (w === h) setPic({ file: f, url: URL.createObjectURL(f) });
    else setCrop({ url: URL.createObjectURL(f), w, h });
  };

  const closeCrop = (f?: File) => {
    if (crop) URL.revokeObjectURL(crop.url);
    setCrop(null);
    if (f) setPic({ file: f, url: URL.createObjectURL(f) });
  };

  const send = async () => {
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("name", name);
    if (pic) fd.set("pic", pic.file);
    const res = await fetch("/api/team-request", { method: "POST", body: fd }).catch(() => null);
    const body = (await res?.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    setBusy(false);
    if (!body?.ok) return setError(r.errors[body?.error ?? ""] ?? r.errors.failed);
    setDone(true);
    router.refresh();
  };

  const wrap = "group/tf relative isolate flex h-11 min-w-0 border border-transparent";
  const box = "-inset-px border border-line bg-ink group-focus-within/tf:border-rose";

  return (
    <Popup open={!done} tone="rose" shadow={6} className="p-5 sm:p-6" label={r.title}>
      <PopupTitle className="in-up heading-slam text-2xl" style={d(0.1)}>
        {r.title}
      </PopupTitle>
      <p className="in-up mt-1.5 text-sm text-ash" style={d(0.18)}>
        {r.text}
      </p>
      <form
        className="mt-5 flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) send();
        }}
      >
        <div className="in-up flex items-center gap-4" style={d(0.26)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pic?.url ?? avatar} alt="" className="size-20 shrink-0 rounded-full bg-slate object-cover sm:size-24" />
          <div className="flex min-w-0 flex-col items-start gap-2">
            <span className="text-xs font-display font-bold text-paper">{r.pic}</span>
            <div className="flex flex-wrap items-center gap-3">
              <SlantButton tone="paper" onClick={() => input.current?.click()} className="px-4 py-2">
                <ImagePlus className="size-4" aria-hidden />
                {pic ? r.change : r.choose}
              </SlantButton>
              {pic && (
                <button
                  type="button"
                  onClick={() => pick(null)}
                  className="text-xs font-display font-bold text-ash transition-colors hover:text-rose-hi"
                >
                  {r.remove}
                </button>
              )}
            </div>
            <span className="text-[0.7rem] text-ash">{r.hint}</span>
          </div>
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" tabIndex={-1} onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        </div>
        <label className="in-up flex flex-col gap-2" style={d(0.34)}>
          <span className="text-xs font-display font-bold text-paper">{r.name}</span>
          <span className={wrap}>
            <SlantBg className={box} />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoComplete="off"
              spellCheck={false}
              className="adm-bare min-w-0 flex-1 border-0 bg-transparent px-4 text-base text-paper outline-none"
            />
          </span>
        </label>
        {error && <p className="text-sm font-bold text-rose-hi">{error}</p>}
        <div className="in-up flex justify-center" style={d(0.42)}>
          <SlantButton type="submit" disabled={busy} className={cn("px-10 py-2.5", busy && "opacity-70")}>
            {busy ? r.sending : r.send}
          </SlantButton>
        </div>
      </form>
      <AnimatePresence>{crop && <SquareCrop key={crop.url} src={crop} onDone={closeCrop} onCancel={() => closeCrop()} />}</AnimatePresence>
    </Popup>
  );
}
