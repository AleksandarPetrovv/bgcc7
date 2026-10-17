"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, Plus, X } from "lucide-react";
import { Btn, Field, inputCls } from "@/components/admin/form";
import { useDict } from "@/components/site/lang";
import type { ActionResult } from "@/lib/roles";
import { cn } from "@/lib/utils";

type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
type Props = { action: Action; title: string; slot: string; color: string; submit: string; icon?: "plus" | "pencil" };

function Pop({ action, title, slot, color, submit, onClose, at, closing }: Omit<Props, "icon"> & { onClose: () => void; at: { top: number; left: number }; closing: boolean }) {
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
  const err =
    state && !state.ok
      ? state.error === "notFound"
        ? t.admin.notFound
        : state.error === "taken"
          ? t.admin.taken
          : state.error === "oneEach"
            ? t.admin.oneEach
            : t.admin.error
      : null;
  return (
    <div
      ref={box}
      role="dialog"
      aria-label={`${title} ${slot}`}
      className={cn(
        "fixed z-[80] w-[min(26rem,calc(100vw-1.5rem))] overflow-hidden border border-line bg-coal shadow-[5px_5px_0_0_var(--color-rose-deep)]",
        closing ? "slot-pop-out" : "vote-pop",
      )}
      style={at}
    >
      <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: color }} aria-hidden />
      <div className="flex items-center gap-3 border-b border-line bg-ink/60 px-4 py-3">
        <span className="heading-slam -skew-x-12 border px-2 py-0.5 text-xl leading-none" style={{ borderColor: color, color }}>
          <span className="inline-block skew-x-12">{slot}</span>
        </span>
        <span className="min-w-0 flex-1 text-sm font-bold text-paper">{title}</span>
        <button type="button" onClick={onClose} aria-label={t.admin.close} className="grid size-8 place-items-center text-ash transition-colors hover:text-paper">
          <X className="size-4" />
        </button>
      </div>
      <form action={formAction} className="flex items-stretch gap-3 p-4">
        <Field name="beatmap" required autoFocus placeholder={t.admin.pasteMap} aria-label={t.admin.beatmap} className={cn(inputCls, "min-w-0 flex-1 focus-within:!shadow-none")} />
        <Btn type="submit" disabled={pending} className="h-10 min-h-0 shrink-0 px-5 shadow-none hover:shadow-none">
          {pending ? t.admin.saving : submit}
        </Btn>
      </form>
      {err && <p className="-mt-1.5 px-4 pb-3 text-xs font-bold uppercase tracking-wide text-rose-hi">{err}</p>}
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
    const below = r.bottom + 8 + 150 < window.innerHeight;
    clearTimeout(timer.current);
    setClosing(false);
    setN((x) => x + 1);
    setAt({ top: below ? r.bottom + 8 : Math.max(12, r.top - 8 - 150), left: Math.max(12, Math.min(window.innerWidth - w - 12, r.right - w)) });
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
          "group grid shrink-0 -skew-x-12 place-items-center border transition-[color,background-color,border-color,transform,translate,scale,rotate] duration-200 hover:-translate-y-0.5",
          "size-10",
          at
            ? closing
              ? "border-rose/60 text-rose-hi"
              : "border-rose bg-rose text-white"
            : icon === "plus"
              ? "border-rose/60 text-rose-hi hover:border-rose hover:bg-rose hover:text-white"
              : "border-line text-ash hover:border-paper/40 hover:text-paper",
        )}
      >
        <Icon
          className={cn(
            "size-4 skew-x-12 transition-transform duration-200",
            at && !closing ? (icon === "plus" ? "rotate-45" : "-rotate-12") : icon === "pencil" && "group-hover:-rotate-12",
          )}
          strokeWidth={icon === "plus" ? 3 : 2}
        />
      </button>
      {at && createPortal(<Pop key={n} {...props} onClose={close} at={at} closing={closing} />, document.body)}
    </>
  );
}
