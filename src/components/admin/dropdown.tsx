"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/site/avatar";

export type DropOption = {
  value: string;
  label: string;
  hint?: string;
  color?: string;
  avatar?: string | null;
};

type Props = {
  options: DropOption[];
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  multiple?: boolean;
  "aria-label"?: string;
};

const noop = () => () => {};
const EASE = [0.16, 1, 0.3, 1] as const;

function OptionAvatar({ src }: { src: string | null }) {
  return (
    <span className="relative inline-flex size-7 shrink-0 -skew-x-12 overflow-hidden border border-paper/30 bg-slate">
      <Avatar src={src} className="size-full scale-125 skew-x-12 rounded-none ring-0 ring-offset-0" />
    </span>
  );
}

export function Dropdown({ options, name, value, defaultValue, onChange, placeholder, required, disabled, className, multiple, "aria-label": aria }: Props) {
  const id = useId();
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const [inner, setInner] = useState(defaultValue ?? "");
  const cur = value ?? inner;
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const [q, setQ] = useState("");
  const [pos, setPos] = useState<{
    left: number;
    top: number;
    width: number;
    up: boolean;
  } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const search = options.length > 8;
  const shown = q ? options.filter((o) => `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(q.toLowerCase())) : options;
  const picked = multiple ? cur.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const sel: DropOption | undefined = multiple ? (picked.length ? { value: cur, label: options.filter((o) => picked.includes(o.value)).map((o) => o.label).join(", ") } : undefined) : options.find((o) => o.value === cur);

  const place = useCallback(() => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom;
    const up = below < 280 && r.top > below;
    setPos({
      left: r.left,
      top: up ? r.top - 6 : r.bottom + 6,
      width: Math.max(r.width, 200),
      up,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const el = e.target as Node;
      if (!btn.current?.contains(el) && !list.current?.contains(el)) setOpen(false);
    };
    document.addEventListener("pointerdown", down);
    return () => document.removeEventListener("pointerdown", down);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>(`[data-i="${hi}"]`)?.scrollIntoView({ block: "nearest" });
  }, [hi, open]);

  const toggle = (next: boolean) => {
    if (next) {
      setQ("");
      setHi(
        Math.max(
          0,
          options.findIndex((o) => o.value === cur),
        ),
      );
    }
    setOpen(next);
  };

  const choose = (raw: string) => {
    const v = multiple ? options.filter((o) => (o.value === raw ? !picked.includes(raw) : picked.includes(o.value))).map((o) => o.value).join(", ") : raw;
    if (value === undefined) setInner(v);
    onChange?.(v);
    if (multiple) return;
    setOpen(false);
    btn.current?.focus();
  };

  const key = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        toggle(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      btn.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => Math.min(shown.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (shown[hi]) choose(shown[hi].value);
    } else if (e.key === "Tab") setOpen(false);
  };

  return (
    <span className={cn("relative inline-flex min-w-0", className)}>
      <button
        ref={btn}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={aria}
        onClick={() => toggle(!open)}
        onKeyDown={key}
        className={cn(
          "group relative flex h-10 w-full min-w-0 -skew-x-12 items-center border border-b-2 bg-field px-3 text-left text-sm normal-case tracking-normal outline-none transition-[border-color,background-color,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-rose disabled:cursor-not-allowed disabled:opacity-50",
          open ? "border-rose bg-rose/10 shadow-[4px_4px_0_0_var(--color-rose-deep)]" : "border-line hover:border-paper/40",
        )}
      >
        <span className="flex min-w-0 flex-1 skew-x-12 items-center gap-2">
          {sel?.avatar !== undefined && <OptionAvatar src={sel.avatar} />}
          {sel?.color && <span className="size-2 shrink-0 rotate-45" style={{ background: sel.color }} aria-hidden />}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={cur}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.22, ease: EASE }}
              className={cn("min-w-0 flex-1 truncate font-bold", sel ? "text-paper" : "text-ash")}
            >
              {sel?.label ?? placeholder ?? "—"}
            </motion.span>
          </AnimatePresence>
          <ChevronDown className={cn("size-4 shrink-0 transition-transform duration-300", open ? "rotate-180 text-rose-hi" : "text-ash group-hover:text-paper")} />
        </span>
      </button>
      {name && !disabled && (
        <input
          tabIndex={-1}
          aria-hidden
          name={name}
          value={cur}
          required={required}
          onChange={() => {}}
          onInvalid={() => btn.current?.focus()}
          className="pointer-events-none absolute inset-x-0 bottom-0 w-full"
          style={{ opacity: 0, height: 1, minHeight: 0, padding: 0, border: 0 }}
        />
      )}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <motion.div
                ref={list}
                id={id}
                role="listbox"
                initial={{ opacity: 0, scaleY: 0.6, y: pos.up ? 8 : -8 }}
                animate={{ opacity: 1, scaleY: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scaleY: 0.7,
                  y: pos.up ? 6 : -6,
                  transition: { duration: 0.15 },
                }}
                transition={{ duration: 0.28, ease: EASE }}
                onKeyDown={key}
                className="fixed z-[70] flex max-h-72 flex-col overflow-hidden border border-rose bg-coal shadow-[6px_6px_0_0_var(--color-rose-deep)]"
                style={{
                  left: pos.left,
                  width: pos.width,
                  ...(pos.up
                    ? {
                        bottom: window.innerHeight - pos.top,
                        transformOrigin: "bottom",
                      }
                    : { top: pos.top, transformOrigin: "top" }),
                }}
              >
                <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-rose via-rose-hi to-transparent" aria-hidden />
                {search && (
                  <label className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2">
                    <Search className="size-3.5 shrink-0 text-ash" />
                    <input
                      autoFocus
                      value={q}
                      onChange={(e) => {
                        setQ(e.target.value);
                        setHi(0);
                      }}
                      className="min-h-0 w-full border-0 bg-transparent p-0 text-sm text-paper outline-none placeholder:text-ash"
                      placeholder="…"
                    />
                  </label>
                )}
                <div className="min-h-0 overflow-y-auto overscroll-contain p-1">
                  {shown.map((o, i) => {
                    const on = multiple ? picked.includes(o.value) : o.value === cur;
                    const lit = i === hi;
                    return (
                      <motion.button
                        key={o.value}
                        type="button"
                        role="option"
                        aria-selected={on}
                        data-i={i}
                        tabIndex={-1}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{
                          opacity: 1,
                          x: 0,
                          transition: {
                            duration: 0.25,
                            ease: EASE,
                            delay: Math.min(i, 10) * 0.02,
                          },
                        }}
                        onPointerEnter={() => setHi(i)}
                        onClick={() => choose(o.value)}
                        className={cn(
                          "relative flex min-h-9 w-full items-center gap-2 px-3 text-left text-sm transition-colors",
                          on ? "text-white" : lit ? "text-paper" : "text-paper/75",
                        )}
                      >
                        {lit && (
                          <motion.span
                            layoutId={`${id}-hi`}
                            className={cn("absolute inset-0", on ? "bg-rose" : "bg-white/[0.07]")}
                            transition={{
                              type: "spring",
                              stiffness: 600,
                              damping: 42,
                            }}
                            aria-hidden
                          />
                        )}
                        {!lit && on && <span className="absolute inset-0 bg-rose/80" aria-hidden />}
                        {o.color && <span className="relative size-2 shrink-0 rotate-45" style={{ background: o.color }} aria-hidden />}
                        {o.avatar !== undefined && <OptionAvatar src={o.avatar} />}
                        <span className="relative min-w-0 flex-1 truncate font-bold">{o.label}</span>
                        {o.hint && <span className="num relative shrink-0 text-xs opacity-60">{o.hint}</span>}
                        {on && (
                          <motion.span initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} className="relative shrink-0">
                            <Check className="size-3.5" strokeWidth={3} />
                          </motion.span>
                        )}
                      </motion.button>
                    );
                  })}
                  {!shown.length && <span className="block px-3 py-2 text-sm text-ash">—</span>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </span>
  );
}
