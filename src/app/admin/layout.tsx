import { notFound } from "next/navigation";
import { AdminNav } from "./admin-nav";
import { SpeedMark } from "@/components/site/graphics";
import { Tag } from "@/components/site/page";
import { auth } from "@/auth";
import { getViewer } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { can, type Perm } from "@/lib/roles";

const MENU: { href: string; perm: Perm }[] = [
  { href: "/admin", perm: "overview" },
  { href: "/admin/phase", perm: "phase" },
  { href: "/admin/staff", perm: "staff" },
  { href: "/admin/log", perm: "log" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const [viewer, session, t] = await Promise.all([getViewer(), auth(), getDict()]);
  if (!viewer?.role) notFound();
  const items = MENU.filter((m) => can(viewer.role, m.perm)).map((m) => ({ href: m.href, label: t.admin.menu[m.perm] }));
  return (
    <div className="flex min-h-[calc(100vh-72px)] flex-col lg:flex-row">
      <aside className="shrink-0 border-b border-line bg-coal lg:w-60 lg:border-b-0 lg:border-r">
        <div className="hidden items-center gap-2 border-b border-line p-4 lg:flex">
          <SpeedMark className="h-6 w-16" />
          <span className="text-xs font-black uppercase tracking-widest text-ash">{t.admin.title}</span>
        </div>
        <AdminNav items={items} />
        <div className="m-3 hidden border border-line p-3 text-xs text-ash lg:block">
          {t.admin.signedIn} <span className="font-bold text-paper">{session?.user?.name}</span>
          <div className="mt-1">
            <Tag tone="balkan">{t.admin.roles[viewer.role]}</Tag>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1 p-4 sm:p-8">{children}</div>
    </div>
  );
}
