"use client";

import { useContext } from "react";
import { Reorder, useDragControls } from "motion/react";
import { GripVertical, Plus, Trash2, X } from "lucide-react";
import { useDict } from "@/components/site/lang";
import { newId, type SubcategoryGroup } from "@/lib/format-plan";
import { Edit } from "./format-context";

type SubItem = SubcategoryGroup["items"][number];

function SubRow({ item, group, onName, onRemove }: { item: SubItem; group: string; onName: (name: string) => void; onRemove: () => void }) {
  const t = useDict();
  const edit = useContext(Edit);
  const drag = useDragControls();
  return (
    <Reorder.Item value={item} dragListener={false} dragControls={drag} whileDrag={{ scale: 1.02, boxShadow: "4px 4px 0 0 var(--rose-deep)", zIndex: 10 }} className="relative flex items-center border border-line bg-ink">
      <input value={item.name} readOnly={!edit} maxLength={80} aria-label={`${group}: ${t.admin.fp.subcategory}`} onChange={(e) => onName(e.target.value)} className="min-w-0 flex-1 bg-transparent px-2 py-2 text-xs font-display font-semibold outline-none focus:text-rose-hi" />
      {edit && (
        <>
          <button type="button" onPointerDown={(e) => drag.start(e)} aria-label={t.admin.fp.drag} title={t.admin.fp.drag} className="grid size-8 shrink-0 cursor-grab touch-none place-items-center text-ash transition-colors hover:text-paper active:cursor-grabbing">
            <GripVertical className="size-3.5" />
          </button>
          <button type="button" onClick={onRemove} aria-label={`${t.admin.fp.removeSubcategory}: ${item.name}`} className="grid size-8 shrink-0 place-items-center text-ash transition-colors hover:text-rose-hi">
            <Trash2 className="size-3.5" />
          </button>
        </>
      )}
    </Reorder.Item>
  );
}

export function SubcategoryEditor({ groups, onChange }: { groups: SubcategoryGroup[]; onChange: (groups: SubcategoryGroup[]) => void }) {
  const t = useDict();
  const edit = useContext(Edit);
  const update = (id: string, group: SubcategoryGroup) => onChange(groups.map((g) => g.id === id ? group : g));
  const removeGroup = (group: SubcategoryGroup) => {
    if (group.items.length && !window.confirm(t.admin.fp.confirmRemoveGroup(group.name))) return;
    onChange(groups.filter((g) => g.id !== group.id));
  };
  return <section className="relative border border-line bg-coal">
    <span className="absolute inset-x-0 top-0 h-0.5 bg-rose" aria-hidden />
    <header className="border-b border-line px-4 py-3 sm:px-5"><h2 className="heading-slam text-2xl">{t.admin.fp.subcategories}</h2></header>
    <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-5">
      {groups.map((group) => <div key={group.id} className="min-w-0">
        <h3 className="mb-3 flex items-center gap-1 border-b border-line pb-2 text-sm font-display font-bold text-rose-hi">
          <input value={group.name} readOnly={!edit} maxLength={60} aria-label={`${t.admin.fp.category}: ${group.name}`} onChange={(e) => update(group.id, { ...group, name: e.target.value })} className="w-full min-w-0 flex-1 bg-transparent font-display font-bold outline-none focus:text-paper" />
          {edit && (
            <button type="button" onClick={() => removeGroup(group)} aria-label={`${t.admin.fp.removeGroup}: ${group.name}`} title={t.admin.fp.removeGroup} className="grid size-7 shrink-0 place-items-center text-ash transition-colors hover:text-rose-hi">
              <X className="size-4" />
            </button>
          )}
        </h3>
        <Reorder.Group axis="y" values={group.items} onReorder={(items) => update(group.id, { ...group, items })} className="space-y-1.5">
          {group.items.map((item) => (
            <SubRow
              key={item.id}
              item={item}
              group={group.name}
              onName={(name) => update(group.id, { ...group, items: group.items.map((x) => x.id === item.id ? { ...x, name } : x) })}
              onRemove={() => update(group.id, { ...group, items: group.items.filter((x) => x.id !== item.id) })}
            />
          ))}
        </Reorder.Group>
        {edit && <button type="button" onClick={() => update(group.id, { ...group, items: [...group.items, { id: newId(), name: t.admin.fp.newSubcategory }] })} className="mt-2 flex w-full items-center justify-center gap-1 border border-dashed border-line px-2 py-2 text-xs font-display font-bold text-ash hover:border-rose hover:text-rose-hi"><Plus className="size-3.5" />{t.admin.fp.addSubcategory}</button>}
      </div>)}
      {edit && groups.length < 16 && (
        <button
          type="button"
          onClick={() => onChange([...groups, { id: newId(), name: t.admin.fp.newGroup, items: [] }])}
          className="flex min-h-24 -skew-x-6 items-center justify-center gap-2 border border-dashed border-line text-xs font-display font-bold text-ash transition-colors hover:border-rose hover:text-rose-hi"
        >
          <span className="flex skew-x-6 items-center gap-2">
            <Plus className="size-3.5" strokeWidth={3} /> {t.admin.fp.addGroup}
          </span>
        </button>
      )}
    </div>
  </section>;
}

