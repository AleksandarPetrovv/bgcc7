"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, Plus, X } from "lucide-react";
import { Btn, Field } from "@/components/admin/form";
import { useDict } from "@/components/site/lang";
import { errorText, type ActionResult } from "@/lib/action-result";
import { modHi } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { SlantBg } from "@/components/site/slant";
import type { SubcategoryGroup } from "@/lib/format-plan";

type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
type Props = { action: Action; title: string; slot: string; color: string; submit: string; icon?: "plus" | "pencil"; tags?: { groups: SubcategoryGroup[]; preset: string[] } };

function Pop({ action, title, slot, color, submit, tags, onClose, at, closing }: Omit<Props, "icon"> & { onClose: () => void; at: { top: number; left: number }; closing: boolean }) {
  const t = useDict();
  const box = useRef<HTMLDivElement>(null);
  const [state, formAction, pending] = useActionState(action, null);
  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);
  useEffect(() => {
    const down = (e: PointerEvent) => e.target instanceof Node && !box.current?.contains(e.target) && onClose();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const scroll = (e: Event) => e.target instanceof Node && !box.current?.contains(e.target) && onClose();
    window.addEventListener("pointerdown", down);
    window.addEventListener("keydown", key);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", scroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("keydown", key);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", scroll, { capture: true });
    };
  }, [onClose]);
  const err = state && !state.ok ? errorText(t, state.error) : null;
  return (
    <div
      ref={box}
      role="dialog"
      aria-label={`${title} ${slot}`}
      className={cn(
        "fixed z-[80] w-[min(26rem,calc(100vw-1.5rem))] overflow-hidden border border-line bg-coal shadow-[5px_5px_0_0_var(--rose-deep)]",
        closing ? "slot-pop-out" : "slot-pop-in",
      )}
      style={at}
    >
      <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: color }} aria-hidden />
      <div className="flex items-center gap-3 border-b border-line bg-ink/60 px-4 py-3">
        <span className="heading-slam relative isolate px-2 py-0.5 text-xl leading-none" style={{ color: modHi(color) }}>
          <SlantBg className="border" style={{ borderColor: modHi(color) }} />
          {slot}
        </span>
        <span className="min-w-0 flex-1 text-sm font-display font-bold text-paper">{title}</span>
        <button type="button" onClick={onClose} aria-label={t.admin.close} className="grid size-8 place-items-center text-ash transition-colors hover:text-paper">
          <X className="size-4" />
        </button>
      </div>
      <form action={formAction}>
        <div className="flex items-stretch gap-3 p-4">
          <Field name="beatmap" required autoFocus placeholder={t.admin.pasteMap} aria-label={t.admin.beatmap} className="min-w-0 flex-1 focus-within:before:!shadow-none" inputClassName="pr-3" />
          <Btn type="submit" disabled={pending} className="h-10 min-h-0 shrink-0 px-5">
            {pending ? t.admin.saving : submit}
          </Btn>
        </div>
        {tags && (
          <fieldset className="max-h-56 overflow-y-auto overscroll-contain border-t border-line px-4 py-3">
            <legend className="sr-only">{t.admin.mapTagsPick}</legend>
            <p className="mb-2 text-xs font-display font-bold text-paper">{t.admin.mapTagsPick}</p>
            <div className="flex flex-wrap gap-1.5">
              {tags.groups.flatMap((g) => g.items).map((item) => (
                <label key={item.id} className="group/tag relative isolate cursor-pointer px-2 py-1 text-xs font-display font-bold text-ash transition-colors hover:text-paper has-[:checked]:text-paper" style={{ "--c": modHi(color) } as React.CSSProperties}>
                  <SlantBg className="border border-line transition-colors group-has-[:checked]/tag:border-[var(--c)] group-has-[:checked]/tag:bg-[color-mix(in_srgb,var(--c)_18%,transparent)] group-has-[:focus-visible]/tag:ring-2 group-has-[:focus-visible]/tag:ring-rose" />
                  <input type="checkbox" name="tags" value={item.id} defaultChecked={tags.preset.includes(item.id)} className="sr-only" />
                  {item.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </form>
      {err && <p className="-mt-1.5 px-4 pb-3 text-xs font-display font-bold text-rose-hi">{err}</p>}
    </div>
  );
}

export function SlotPop({ icon = "plus", ...props }: Props) {
  const btn = useRef<HTMLButtonElement>(null);
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);
  const [closing, setClosing] = useState(false);
  const [n, setN] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const close = useCallback(() => {
    setClosing(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setAt(null);
      setClosing(false);
    }, 140);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  const Icon = icon === "plus" ? Plus : Pencil;

  const open = () => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const w = Math.min(416, window.innerWidth - 24);
    const h = props.tags ? 380 : 150;
    const below = r.bottom + 8 + h < window.innerHeight;
    clearTimeout(timer.current);
    setClosing(false);
    setN((x) => x + 1);
    setAt({ top: below ? r.bottom + 8 : Math.max(12, r.top - 8 - h), left: Math.max(12, Math.min(window.innerWidth - w - 12, r.right - w)) });
  };

  return (
    <>
      <button
        ref={btn}
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => (at && !closing ? close() : open())}
        aria-expanded={!!at}
        aria-label={`${props.title} ${props.slot}`}
        title={props.title}
        className={cn(
          "group relative isolate grid shrink-0 place-items-center transition-[color,transform,translate,scale,rotate] duration-200 hover:-translate-y-0.5",
          "size-10",
          at ? (closing ? "text-rose-hi" : "text-white") : icon === "plus" ? "text-rose-hi hover:text-white" : "text-ash hover:text-paper",
        )}
      >
        <SlantBg
          className={cn(
            "border transition-[background-color,border-color] duration-200",
            at
              ? closing
                ? "border-rose/60"
                : "border-rose bg-rose"
              : icon === "plus"
                ? "border-rose/60 group-hover:border-rose group-hover:bg-rose"
                : "border-line group-hover:border-paper/40",
          )}
        />
        <Icon
          className={cn(
            "size-4 transition-transform duration-200",
            at && !closing ? (icon === "plus" ? "rotate-45" : "-rotate-12") : icon === "pencil" && "group-hover:-rotate-12",
          )}
          strokeWidth={icon === "plus" ? 3 : 2}
        />
      </button>
      {at && createPortal(<Pop key={n} {...props} onClose={close} at={at} closing={closing} />, document.body)}
    </>
  );
}
