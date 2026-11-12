"use client";

import { useRef, useState, useTransition } from "react";
import { Reorder } from "motion/react";
import { Flash } from "@/components/admin/flash";
import { useDict } from "@/components/site/lang";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";

type Props<T> = {
  rows: T[];
  id: (row: T) => number;
  save: (ids: number[]) => Promise<ActionResult>;
  hint: "top" | "bottom";
  className?: string;
  wrap?: (list: React.ReactNode) => React.ReactNode;
  row: React.ComponentType<{ s: T; i: number; onDrop: () => void }>;
};

/** drag-to-reorder list: `row` renders its own Reorder.Item and calls onDrop on drag end; the new order is saved once per drop */
export function SortableList<T>({ rows, id, save, hint, className, wrap = (l) => l, row: Row }: Props<T>) {
  const t = useDict();
  const [items, setItems] = useState(rows);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const latest = useRef(rows);

  function commit() {
    const ids = latest.current.map(id);
    if (ids.join() === rows.map(id).join()) return;
    start(async () => {
      const r = await save(ids);
      setSaved(!!r?.ok);
    });
  }

  const note = (
    <p className={cn(hint === "top" ? "mb-2" : "mt-2", "text-xs text-ash")}>
      {saved && !pending && <Flash className="font-display font-bold text-balkan-hi">{t.admin.saved}</Flash>}
    </p>
  );

  return (
    <div>
      {hint === "top" && note}
      {wrap(
        <Reorder.Group
          axis="y"
          values={items}
          onReorder={(v) => {
            latest.current = v;
            setItems(v);
          }}
          className={cn(className, pending && "opacity-70")}
        >
          {items.map((s, i) => (
            <Row key={id(s)} s={s} i={i} onDrop={commit} />
          ))}
        </Reorder.Group>,
      )}
      {hint === "bottom" && note}
    </div>
  );
}
