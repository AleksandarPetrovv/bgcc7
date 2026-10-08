"use client";

import { Flash } from "@/components/admin/flash";
import { useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, Reorder, useDragControls } from "motion/react";
import { GripVertical, Pencil, X } from "lucide-react";
import { ActionForm, inputCls, Field } from "@/components/admin/form";
import { Avatar } from "@/components/site/avatar";
import { useDict } from "@/components/site/lang";
import type { Sponsor } from "@/lib/data";
import { cn } from "@/lib/utils";
import { deleteSponsor, reorderSponsors, updateSponsor } from "./actions";

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
      whileDrag={{ scale: 1.02, boxShadow: "6px 6px 0 0 var(--color-rose-deep)", zIndex: 10 }}
      className="relative border border-line bg-coal"
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          aria-label={t.admin.dragHint}
          title={t.admin.dragHint}
          className="cursor-grab touch-none p-1 text-ash transition-colors hover:text-paper active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
        <span className="in-drop num w-6 text-center text-lg text-ash" style={{ "--i": i, "--s": "0.08s", "--d": "0.6s" } as React.CSSProperties}>
          {i + 1}
        </span>
        <span className="in-spin inline-flex" style={{ "--i": i, "--s": "0.08s", "--d": "0.65s" } as React.CSSProperties}>
          <Avatar src={s.image} className="size-9" />
        </span>
        <a
          href={s.url ?? undefined}
          target="_blank"
          rel="noreferrer"
          className="in-wipe min-w-0 flex-1 truncate font-black transition-colors hover:text-rose-hi"
          style={{ "--i": i, "--s": "0.08s", "--d": "0.75s" } as React.CSSProperties}
        >
          {s.name}
        </a>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          aria-label={t.admin.edit}
          title={t.admin.edit}
          className={cn("p-2 transition-colors", editing ? "text-rose-hi" : "text-ash hover:text-paper")}
        >
          {editing ? <X className="size-4" /> : <Pencil className="size-4" />}
        </button>
        <ActionForm action={deleteSponsor.bind(null, s.id)} submit={t.admin.remove} ghost confirm={t.admin.confirmDeleteSponsor} />
      </div>
      <AnimatePresence initial={false}>
        {editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <ActionForm action={updateSponsor.bind(null, s.id)} className="flex items-center gap-3 border-t border-dashed border-line px-3 py-3">
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
  const [items, setItems] = useState(sponsors);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const latest = useRef(sponsors);

  function commit() {
    const ids = latest.current.map((s) => s.id);
    if (ids.join() === sponsors.map((s) => s.id).join()) return;
    start(async () => {
      const r = await reorderSponsors(ids);
      setSaved(!!r?.ok);
    });
  }

  if (!items.length) return <p className="text-sm text-ash">{t.admin.noSponsors}</p>;
  return (
    <div>
      <Reorder.Group
        axis="y"
        values={items}
        onReorder={(v) => {
          latest.current = v;
          setItems(v);
        }}
        className={cn("space-y-2", pending && "opacity-70")}
      >
        {items.map((s, i) => (
          <Row key={s.id} s={s} i={i} onDrop={commit} />
        ))}
      </Reorder.Group>
      <p className="mt-2 text-xs text-ash">
        {t.admin.dragHint}
        {saved && !pending && <Flash className="ml-2 font-bold uppercase tracking-wide text-balkan">{t.admin.saved}</Flash>}
      </p>
    </div>
  );
}
