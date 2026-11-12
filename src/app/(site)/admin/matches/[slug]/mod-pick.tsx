"use client";

import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Btn } from "@/components/admin/form";
import { useDict } from "@/components/site/lang";
import { ModBadge } from "@/components/site/match-dialog";
import { PICK_MODS, togglePick, validPick } from "@/lib/mods";

/** the player's mod badge is the button; the badges open under it: one pick writes and closes; multi-pick slots toggle (NM and DT alone, HD+HR together) and confirm */
export function ModPick({ mods, multi, disabled, label, onDone }: { mods: string[]; multi: boolean; disabled: boolean; label: string; onDone: (mods: string[]) => void }) {
  const t = useDict();
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const done = (m: string[]) => {
    onDone(m);
    setOpen(false);
  };
  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        if (o) setSel(validPick(mods, multi) ? mods : []);
        setOpen(o);
      }}
    >
      <Popover.Trigger disabled={disabled} aria-label={label} className="shrink-0 cursor-pointer p-0.5 transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-default disabled:opacity-40 disabled:hover:translate-y-0">
        <ModBadge mods={mods} d="0s" className="px-2 py-1 text-[0.7rem]" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="center" sideOffset={6} className="z-50">
          <Popover.Popup
            aria-label={label}
            className="flex origin-(--transform-origin) flex-col items-center gap-2 border border-line bg-coal p-2 outline-none transition-[opacity,transform] duration-150 ease-out data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0"
          >
            <div className="flex gap-1">
              {PICK_MODS.map((m) => (
                <button key={m} type="button" aria-pressed={sel.includes(m)} onClick={() => (multi ? setSel(togglePick(sel, m)) : done([m]))} className="cursor-pointer p-1 transition-transform duration-200 hover:-translate-y-0.5">
                  <ModBadge mods={[m]} on={sel.includes(m)} d="0s" className="px-2.5 py-1.5 text-xs" />
                </button>
              ))}
            </div>
            {multi && (
              <Btn type="button" disabled={!sel.length} onClick={() => done(sel)}>
                {t.admin.ms.confirm}
              </Btn>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
