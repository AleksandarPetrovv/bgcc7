"use client";

import { Btn } from "@/components/admin/form";
import { useDict } from "@/components/site/lang";
import { ModBadge } from "@/components/site/match-dialog";
import { Popup } from "@/components/site/popup";
import { PICK_MODS, togglePick } from "@/lib/mods";

/** just the mod badges: one pick writes and closes; multi-pick slots toggle (NM and DT alone, HD+HR together) and confirm */
export function ModPick({ open, label, sel, multi, onSel, onDone, onClose }: { open: boolean; label: string; sel: string[]; multi: boolean; onSel: (mods: string[]) => void; onDone: (mods: string[]) => void; onClose: () => void }) {
  const t = useDict();
  return (
    <Popup open={open} onClose={onClose} closeButton={false} shadow={6} label={label} className="max-w-xs p-5">
      <div className="flex flex-wrap justify-center gap-3">
        {PICK_MODS.map((m, n) => (
          <button key={m} type="button" aria-pressed={sel.includes(m)} onClick={() => (multi ? onSel(togglePick(sel, m)) : onDone([m]))} className="p-1 transition-transform duration-200 hover:-translate-y-0.5">
            <ModBadge mods={[m]} on={sel.includes(m)} d={`${0.05 + n * 0.05}s`} className="px-3 py-1.5 text-sm" />
          </button>
        ))}
      </div>
      {multi && (
        <div className="mt-4 flex justify-center">
          <Btn type="button" disabled={!sel.length} onClick={() => onDone(sel)}>
            {t.admin.ms.confirm}
          </Btn>
        </div>
      )}
    </Popup>
  );
}
