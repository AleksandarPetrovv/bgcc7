"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useDict } from "@/components/site/lang";
import { cn } from "@/lib/utils";

export function CopyLink({ url, className }: { url: string; className?: string }) {
  const t = useDict();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(url).then(() => setCopied(true)).catch(() => {})}
      onMouseLeave={() => setCopied(false)}
      className={cn("group relative flex min-w-0 max-w-full items-center gap-3 px-4 py-2.5 text-left", className)}
      title={t.admin.overlay.copy}
    >
      <span className="pointer-events-none absolute inset-0 -skew-x-12 border border-line bg-ink transition-colors group-hover:border-paper" aria-hidden />
      <span className="num relative min-w-0 truncate text-sm text-paper">{url}</span>
      <span className="relative ml-auto flex shrink-0 items-center gap-1.5 text-xs font-display font-bold text-ash group-hover:text-paper">
        {copied ? <Check className="size-3.5 text-balkan-hi" /> : <Copy className="size-3.5" />}
        {copied ? t.admin.overlay.copied : t.admin.overlay.copy}
      </span>
    </button>
  );
}
