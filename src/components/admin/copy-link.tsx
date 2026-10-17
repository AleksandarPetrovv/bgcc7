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
      className={cn("group flex min-w-0 max-w-full -skew-x-12 items-center gap-3 border border-line bg-ink px-4 py-2.5 text-left transition-colors hover:border-paper", className)}
      title={t.admin.overlay.copy}
    >
      <span className="num min-w-0 skew-x-12 truncate text-sm text-paper">{url}</span>
      <span className="ml-auto flex shrink-0 skew-x-12 items-center gap-1.5 text-xs font-black uppercase tracking-wide text-ash group-hover:text-paper">
        {copied ? <Check className="size-3.5 text-balkan" /> : <Copy className="size-3.5" />}
        {copied ? t.admin.overlay.copied : t.admin.overlay.copy}
      </span>
    </button>
  );
}
