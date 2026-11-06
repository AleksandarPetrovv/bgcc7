import { Eye, ListChecks, PencilRuler } from "lucide-react";
import type { Dict } from "@/lib/i18n/dict";
import { LinkTabs } from "@/components/site/tabs";

export function PoolMode({ t, on, stage, edit }: { t: Dict; on: "sheet" | "edit"; stage?: string; edit: boolean }) {
  const items = [
    { k: "sheet" as const, Icon: ListChecks, label: t.admin.poolSheet },
    { k: "edit" as const, Icon: edit ? PencilRuler : Eye, label: edit ? t.admin.poolEdit : t.admin.poolView },
  ];
  return (
    <LinkTabs
      className="in-left mb-5 [--d:0.1s]"
      items={items.map(({ k, Icon, label }) => ({
        href: `/admin/mappools/${k}${stage ? `?stage=${stage}` : ""}`,
        active: on === k,
        label: (
          <>
            <Icon className="size-3.5" />
            {label}
          </>
        ),
      }))}
    />
  );
}
