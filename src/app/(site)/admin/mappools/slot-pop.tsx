"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { Btn, Field } from "@/components/admin/form";
import { useDict } from "@/components/site/lang";
import { errorText, type ActionResult } from "@/lib/action-result";
import { modHi } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { SlantBg } from "@/components/site/slant";
import { AnchoredPopup, type PopPlace } from "@/components/site/anchored-popup";
import type { SubcategoryGroup } from "@/lib/format-plan";

type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
type Props = { action: Action; title: string; slot: string; color: string; submit: string; icon?: "plus" | "pencil"; tags?: { groups: SubcategoryGroup[]; preset: string[] } };

function Pop({ action, slot, color, submit, tags, onClose }: Omit<Props, "icon"> & { onClose: () => void }) {
  const t = useDict();
  const [state, formAction, pending] = useActionState(action, null);
  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);
  const err = state && !state.ok ? errorText(t, state.error) : null;
  return (
    <>
      <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: color }} aria-hidden />
      <div className="flex items-center gap-3 border-b border-line bg-ink/60 px-4 py-3">
        <span className="heading-slam relative isolate px-2 py-0.5 text-xl leading-none" style={{ color: modHi(color) }}>
          <SlantBg className="border" style={{ borderColor: modHi(color) }} />
          {slot}
        </span>
        <button type="button" onClick={onClose} aria-label={t.admin.close} className="ml-auto grid size-8 place-items-center text-ash transition-colors hover:text-paper">
          <X className="size-4" />
        </button>
      </div>
      <form action={formAction}>
        <div className="flex items-stretch gap-3 p-4">
          <Field name="beatmap" required autoFocus placeholder={t.admin.linkOrId} aria-label={t.admin.beatmap} className="min-w-0 flex-1 focus-within:before:!shadow-none" inputClassName="pr-3 placeholder:text-sm placeholder:text-ash/60" />
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
    </>
  );
}

export function SlotPop({ icon = "plus", ...props }: Props) {
  const btn = useRef<HTMLButtonElement>(null);
  const [at, setAt] = useState(false);
  const [n, setN] = useState(0);
  const close = useCallback(() => setAt(false), []);
  const Icon = icon === "plus" ? Plus : Pencil;
  const h = props.tags ? 380 : 150;

  const place = useCallback(
    (r: DOMRect): PopPlace => {
      const width = Math.min(480, window.innerWidth - 24);
      const left = Math.max(12, Math.min(window.innerWidth - width - 12, r.right - width));
      return r.bottom + 8 + h < window.innerHeight ? { left, top: r.bottom + 8, width } : { left, top: r.top - 8, width, up: true };
    },
    [h],
  );

  const open = () => {
    setN((x) => x + 1);
    setAt(true);
  };

  return (
    <>
      <button
        ref={btn}
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => (at ? close() : open())}
        aria-expanded={!!at}
        aria-label={`${props.title} ${props.slot}`}
        title={props.title}
        className={cn(
          "group relative isolate grid shrink-0 place-items-center transition-[color,transform,translate,scale,rotate] duration-200 hover:-translate-y-0.5",
          "size-10",
          at ? "text-white" : icon === "plus" ? "text-rose-hi hover:text-white" : "text-ash hover:text-paper",
        )}
      >
        <SlantBg
          className={cn(
            "border transition-[background-color,border-color] duration-200",
            at
              ? "border-rose bg-rose"
              : icon === "plus"
                ? "border-rose/60 group-hover:border-rose group-hover:bg-rose"
                : "border-line group-hover:border-paper/40",
          )}
        />
        <Icon className={cn("col-start-1 row-start-1 size-4 transition-opacity duration-200", icon === "plus" && at && "opacity-0")} strokeWidth={icon === "plus" ? 3 : 2} />
        {icon === "plus" && <X className={cn("col-start-1 row-start-1 size-4 transition-opacity duration-200", at ? "opacity-100" : "opacity-0")} strokeWidth={3} aria-hidden />}
      </button>
      <AnchoredPopup
        anchor={btn}
        open={at}
        onClose={close}
        place={place}
        chrome={false}
        role="dialog"
        aria-label={`${props.title} ${props.slot}`}
        className="z-[80] overflow-hidden border border-line bg-coal shadow-[5px_5px_0_0_var(--rose-deep)]"
      >
        <Pop key={n} {...props} onClose={close} />
      </AnchoredPopup>
    </>
  );
}
