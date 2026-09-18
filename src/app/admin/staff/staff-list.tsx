"use client";

import { useRef, useState, useTransition } from "react";
import { Reorder, useDragControls } from "motion/react";
import { GripVertical, TriangleAlert } from "lucide-react";
import { ActionForm } from "@/components/admin/form";
import { Dropdown } from "@/components/admin/dropdown";
import { useDict } from "@/components/site/lang";
import { flagUrl } from "@/lib/data";
import { ROLES, STAFF_ROLES } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { removeStaff, reorderStaff, updateStaff } from "./actions";

export type StaffRow = {
  osuId: number;
  username: string;
  avatarUrl: string | null;
  country: string | null;
  permRole: string | null;
  displayRoles: string[];
  builtIn: boolean;
  clash: boolean;
};

function Row({ s, i, onDrop }: { s: StaffRow; i: number; onDrop: () => void }) {
  const t = useDict();
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={s}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDrop}
      layout="position"
      whileDrag={{ scale: 1.01, boxShadow: "6px 6px 0 0 var(--color-rose-deep)", zIndex: 10 }}
      className="relative border border-line bg-coal"
    >
      <div className="flex items-center gap-3 border-b border-line px-3 py-3 sm:px-4">
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          aria-label={t.admin.dragHint}
          title={t.admin.dragHint}
          className="cursor-grab touch-none p-1 text-ash transition-colors hover:text-paper active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
        <span className="in-drop num w-6 text-center text-lg text-ash" style={{ "--i": Math.min(i, 8), "--s": "0.06s", "--d": "0.4s" } as React.CSSProperties}>
          {i + 1}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {s.avatarUrl && <img src={s.avatarUrl} alt="" className="in-spin size-9 [--d:0.5s]" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {s.country && <img src={flagUrl(s.country)} alt="" className="h-2.5" />}
        <span className="in-wipe min-w-0 truncate font-black [--d:0.6s]">{s.username}</span>
        <span className="num hidden text-xs text-ash sm:inline">#{s.osuId}</span>
        {s.builtIn && <span className="in-slam ml-auto text-xs font-black uppercase text-balkan [--d:0.75s]">{t.admin.builtIn}</span>}
      </div>
      {s.clash && (
        <p className="flex items-start gap-2 border-b border-line bg-rose/10 px-4 py-2.5 text-sm text-rose-hi">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {t.admin.staffPlays}
        </p>
      )}
      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-end">
        <ActionForm action={updateStaff.bind(null, s.osuId)} className="flex flex-1 flex-col gap-4">
          <label className="flex min-w-0 flex-col gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.1em] text-ash transition-colors sm:w-56">
            {t.admin.permission}
            <Dropdown
              name="permRole"
              defaultValue={s.builtIn ? "host" : (s.permRole ?? "")}
              disabled={s.builtIn}
              options={[{ value: "", label: t.admin.noPerm }, ...ROLES.map((r) => ({ value: r, label: t.admin.roles[r] }))]}
            />
          </label>
          <fieldset>
            <legend className="mb-1.5 text-xs font-bold uppercase text-ash">{t.admin.publicRoles}</legend>
            <div className="flex flex-wrap gap-1.5">
              {STAFF_ROLES.map((r, k) => (
                <label
                  key={r}
                  style={{ "--i": k, "--s": "0.04s", "--d": "0.7s" } as React.CSSProperties}
                  className="in-pop cursor-pointer border border-line px-2 py-1.5 text-xs font-black uppercase text-ash transition-colors has-[:checked]:border-rose has-[:checked]:bg-rose has-[:checked]:text-white"
                >
                  <input type="checkbox" name="displayRoles" value={r} defaultChecked={s.displayRoles.includes(r)} className="sr-only" />
                  {t.staff.roles[r] ?? r}
                </label>
              ))}
            </div>
          </fieldset>
        </ActionForm>
        {!s.builtIn && <ActionForm action={removeStaff.bind(null, s.osuId)} submit={t.admin.remove} ghost confirm={t.admin.confirmRemove} />}
      </div>
    </Reorder.Item>
  );
}

export function StaffList({ rows }: { rows: StaffRow[] }) {
  const t = useDict();
  const [items, setItems] = useState(rows);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const latest = useRef(rows);

  function commit() {
    const ids = latest.current.map((s) => s.osuId);
    if (ids.join() === rows.map((s) => s.osuId).join()) return;
    start(async () => {
      const r = await reorderStaff(ids);
      setSaved(!!r?.ok);
    });
  }

  return (
    <div>
      <p className="mb-2 text-xs text-ash">
        {t.admin.dragHint}
        {saved && !pending && <span className="ml-2 font-bold uppercase tracking-wide text-balkan">{t.admin.saved}</span>}
      </p>
      <Reorder.Group
        axis="y"
        values={items}
        onReorder={(v) => {
          latest.current = v;
          setItems(v);
        }}
        className={cn("space-y-3", pending && "opacity-70")}
      >
        {items.map((s, i) => (
          <Row key={s.osuId} s={s} i={i} onDrop={commit} />
        ))}
      </Reorder.Group>
    </div>
  );
}
