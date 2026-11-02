"use client";

import { useState } from "react";
import { AnimatePresence, motion, Reorder, useDragControls } from "motion/react";
import { SortableList } from "@/components/admin/sortable-list";
import { GripVertical, Pencil, X } from "lucide-react";
import { ActionForm, inputCls, Field } from "@/components/admin/form";
import { Avatar } from "@/components/site/avatar";
import { useDict } from "@/components/site/lang";
import type { Sponsor } from "@/lib/data";
import { cn } from "@/lib/utils";
import { deleteSponsor, reorderSponsors, updateSponsor } from "./actions";
import { EASE } from "@/lib/ease";

function Row({ s, i, onDrop }: { s: Sponsor; i: number; onDrop: () => void }) {
  const t = useDict();
  const controls = useDragControls();
  const [editing, setEditing] = useState(false);
  return (
    <Reorder.Item
      value={s}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDrop}
      layout="position"
      whileDrag={{ scale: 1.02, boxShadow: "6px 6px 0 0 var(--rose-deep)", zIndex: 10 }}
      data-cascade
      className="in-left relative border-b border-line bg-ink"
    >
      <div className="flex items-center gap-3 py-2.5">
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          aria-label={t.admin.dragHint}
          title={t.admin.dragHint}
          className="cursor-grab touch-none p-1 text-ash transition-colors hover:text-paper active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
        <span data-cascade className="in-drop num w-6 text-center text-lg text-ash">
          {i + 1}
        </span>
        <span data-cascade className="in-spin inline-flex">
          <Avatar src={s.image} className="size-9" />
        </span>
        <a
          href={s.url ?? undefined}
          target="_blank"
          rel="noreferrer"
          data-cascade
          className="in-wipe min-w-0 flex-1 truncate font-display font-black transition-colors hover:text-rose-hi"
        >
          {s.name}
        </a>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          aria-label={t.admin.edit}
          title={t.admin.edit}
          data-cascade
          className={cn("in-pop p-2 transition-colors", editing ? "text-rose-hi" : "text-ash hover:text-paper")}
        >
          {editing ? <X className="size-4" /> : <Pencil className="size-4" />}
        </button>
        <span data-cascade className="in-right">
          <ActionForm action={deleteSponsor.bind(null, s.id)} submit={t.admin.remove} ghost confirm={t.admin.confirmDeleteSponsor} />
        </span>
      </div>
      <AnimatePresence initial={false}>
        {editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden"
          >
            <ActionForm action={updateSponsor.bind(null, s.id)} className="flex items-center gap-3 border-t border-line py-3">
              <Field name="q" required defaultValue={s.url ?? s.name} aria-label={t.admin.sponsorQ} className={cn(inputCls, "flex-1")} />
            </ActionForm>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

export function SponsorList({ sponsors }: { sponsors: Sponsor[] }) {
  const t = useDict();
  if (!sponsors.length) return <p className="text-sm text-ash">{t.admin.noSponsors}</p>;
  return (
    <SortableList rows={sponsors} id={(s) => s.id} save={reorderSponsors} hint="bottom" className="border-t border-line" row={Row} />
  );
}
