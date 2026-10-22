"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { saveInfoText } from "./actions";

export function Editable({ path, raw, on, block, children }: { path: string; raw: string; on: boolean; block?: boolean; children: React.ReactNode }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(raw);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!on) return <>{children}</>;

  if (!editing) {
    const Tag = block ? "div" : "span";
    return (
      <Tag
        role="button"
        tabIndex={0}
        title="Click to edit"
        onClick={(e) => {
          e.preventDefault();
          setText(raw);
          setFailed(false);
          setEditing(true);
        }}
        onKeyDown={(e) => e.key === "Enter" && setEditing(true)}
        className="cursor-text outline-dashed outline-1 outline-offset-2 outline-transparent transition-[outline-color] hover:outline-gold"
      >
        {children}
      </Tag>
    );
  }

  const save = () =>
    start(async () => {
      const r = await saveInfoText(path, text);
      if (!r.ok) return setFailed(true);
      setEditing(false);
      router.refresh();
    });

  return (
    <span className={cn("flex w-full flex-col gap-2", block ? "my-1" : "inline-flex align-top")}>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save();
        }}
        rows={Math.min(8, Math.max(1, Math.ceil(text.length / 70)))}
        className="w-full min-w-[12rem] resize-y border border-gold bg-ink px-3 py-2 text-[0.95rem] font-normal normal-case leading-relaxed tracking-normal text-paper outline-none"
      />
      <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide">
        <button type="button" disabled={pending} onClick={save} className="-skew-x-12 bg-gold px-3 py-1 text-paper disabled:opacity-50">
          <span className="inline-block skew-x-12">{pending ? "Saving…" : "Save"}</span>
        </button>
        <button type="button" disabled={pending} onClick={() => setEditing(false)} className="-skew-x-12 border border-line px-3 py-1 text-ash hover:text-paper">
          <span className="inline-block skew-x-12">Cancel</span>
        </button>
        {failed && <span className="text-rose-hi">Couldn&apos;t save</span>}
        <span className="ml-auto font-bold normal-case tracking-normal text-ash">Empty = default text</span>
      </span>
    </span>
  );
}
