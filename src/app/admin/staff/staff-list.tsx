"use client";

import { useRef, useState, useTransition } from "react";
import { Reorder, useDragControls } from "motion/react";
import { Check, Crown, Gavel, GripVertical, Lock, Map as MapIcon, TriangleAlert } from "lucide-react";
import { ActionForm } from "@/components/admin/form";
import { useDict } from "@/components/site/lang";
import { flagUrl } from "@/lib/data";
import { ROLES, STAFF_ROLES, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { removeStaff, reorderStaff, updateStaff } from "./actions";

export type StaffRow = {
  osuId: number;
  username: string;
  avatarUrl: string | null;
  country: string | null;
  permRoles: string[];
  displayRoles: string[];
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
      </div>
      {s.clash && (
        <p className="flex items-start gap-2 border-b border-line bg-rose/10 px-4 py-2.5 text-sm text-rose-hi">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {t.admin.staffPlays}
        </p>
      )}
      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-end">
        <ActionForm action={updateStaff.bind(null, s.osuId)} className="flex flex-1 flex-col gap-4">
          <PermPicker initial={s.permRoles} />
          <fieldset>
            <legend className="mb-1.5 text-xs font-bold uppercase text-ash">{t.admin.publicRoles}</legend>
            <div className="flex flex-wrap gap-1.5">
              {STAFF_ROLES.map((r, k) => (
                <label
                  key={r}
                  style={{ "--i": k, "--s": "0.04s", "--d": "0.7s" } as React.CSSProperties}
                  className="in-pop flex min-h-9 -skew-x-12 cursor-pointer items-center border border-line px-3 text-xs font-black uppercase text-ash transition-[color,background-color,border-color,box-shadow] duration-200 hover:border-paper/40 hover:text-paper has-[:checked]:border-rose has-[:checked]:bg-rose has-[:checked]:text-white has-[:checked]:shadow-[3px_3px_0_0_var(--color-rose-deep)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-rose"
                >
                  <input type="checkbox" name="displayRoles" value={r} defaultChecked={s.displayRoles.includes(r)} className="sr-only" />
                  <span className="skew-x-12">{t.staff.roles[r] ?? r}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </ActionForm>
        <ActionForm action={removeStaff.bind(null, s.osuId)} submit={t.admin.remove} ghost confirm={t.admin.confirmRemove} />
      </div>
    </Reorder.Item>
  );
}

const PERM_ICON: Record<Role, typeof Crown> = { host: Crown, referee: Gavel, mappooler: MapIcon };

function PermPicker({ initial }: { initial: string[] }) {
  const t = useDict();
  const [on, setOn] = useState(() => new Set(initial));
  const host = on.has("host");
  const toggle = (r: Role) =>
    setOn((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else if (r === "host") return new Set([r]);
      else next.add(r);
      return next;
    });
  return (
    <fieldset>
      <legend className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase text-ash">
        {t.admin.permission}
        {on.size === 0 && <span className="font-black text-rose-hi">· {t.admin.noPerm}</span>}
      </legend>
      <div className="flex flex-wrap gap-2">
        {ROLES.map((r, k) => {
          const Icon = PERM_ICON[r];
          const checked = on.has(r);
          const blocked = host && r !== "host";
          return (
            <label
              key={r}
              style={{ "--i": k, "--s": "0.05s", "--d": "0.65s" } as React.CSSProperties}
              className={cn(
                "in-pop group/perm flex h-10 -skew-x-12 items-center border px-3 transition-[color,background-color,border-color,box-shadow,opacity] duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-rose",
                checked ? "border-rose bg-rose text-white shadow-[3px_3px_0_0_var(--color-rose-deep)]" : "border-line bg-ink/40 text-ash",
                blocked ? "cursor-not-allowed" : "cursor-pointer",
                blocked && !checked && "opacity-35",
                !blocked && !checked && "hover:border-paper/40 hover:text-paper",
              )}
            >
              <input type="checkbox" name="permRoles" value={r} checked={checked} disabled={blocked} onChange={() => toggle(r)} className="sr-only" />
              <span className="flex skew-x-12 items-center gap-2 text-xs font-black uppercase">
                <span className={cn("grid size-4 place-items-center border transition-colors", checked ? "border-white bg-white text-rose" : "border-current")}>
                  {checked ? <Check className="size-3" strokeWidth={3.5} /> : blocked && <Lock className="size-2.5" />}
                </span>
                <Icon className="size-3.5" />
                {t.admin.roles[r]}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
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
