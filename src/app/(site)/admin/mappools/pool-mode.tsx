"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { ListChecks, PencilRuler } from "lucide-react";
import { LinkTabs } from "@/components/site/tabs";
import { PageTitle } from "@/components/site/page-title";
import { useDict } from "@/components/site/lang";

export function PoolMode({ edit }: { edit: boolean }) {
  const t = useDict();
  const path = usePathname();
  const stage = useSearchParams().get("stage");
  const items = [
    { href: "/admin/mappools", Icon: PencilRuler, label: t.admin.poolEdit },
    { href: "/admin/mappools/sheet", Icon: ListChecks, label: t.admin.poolSheet },
  ];
  // the bgcc6 create page shares this folder's layout but not the switch
  if (!items.some((x) => x.href === path)) return null;
  return (
    <>
      <PageTitle mark="notes">{t.admin.menu.mappools}</PageTitle>
      {edit && <LinkTabs
        className="in-left mb-5 [--d:0.1s]"
        items={items.map(({ href, Icon, label }) => ({
          href: `${href}${stage ? `?stage=${stage}` : ""}`,
          active: path === href,
          label: (
            <>
              <Icon className="size-3.5" />
              {label}
            </>
          ),
        }))}
      />}
    </>
  );
}
