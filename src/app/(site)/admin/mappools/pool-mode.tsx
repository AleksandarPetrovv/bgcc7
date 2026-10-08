import Link from "next/link";
import { Eye, ListChecks, PencilRuler } from "lucide-react";
import type { Dict } from "@/lib/i18n/dict";
import { cn } from "@/lib/utils";

export function PoolMode({ t, on, stage, edit }: { t: Dict; on: "sheet" | "edit"; stage?: string; edit: boolean }) {
  const items = [
    { k: "sheet" as const, Icon: ListChecks, label: t.admin.poolSheet },
    { k: "edit" as const, Icon: edit ? PencilRuler : Eye, label: edit ? t.admin.poolEdit : t.admin.poolView },
  ];
  return (
    <div className="in-left mb-5 flex gap-2 [--d:0.1s]">
      {items.map(({ k, Icon, label }) => (
        <Link
          key={k}
          href={`/admin/mappools/${k}${stage ? `?stage=${stage}` : ""}`}
          aria-current={on === k ? "page" : undefined}
          className={cn(
            "flex h-9 -skew-x-12 items-center border px-3.5 transition-[color,background-color,border-color,box-shadow] duration-200",
            on === k ? "border-rose bg-rose text-white shadow-[3px_3px_0_0_var(--color-rose-deep)]" : "border-line bg-ink/40 text-ash hover:border-paper/40 hover:text-paper",
          )}
        >
          <span className="flex skew-x-12 items-center gap-2 text-xs font-black uppercase">
            <Icon className="size-3.5" />
            {label}
          </span>
        </Link>
      ))}
    </div>
  );
}
