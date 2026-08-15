import { notFound } from "next/navigation";
import { AdminNav } from "./admin-nav";
import { TriTick } from "@/components/site/graphics";
import { Tag } from "@/components/site/page";
import { auth } from "@/auth";
import { getViewer } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { can, type Perm } from "@/lib/roles";

const MENU: { href: string; perm: Perm }[] = [
  { href: "/admin", perm: "overview" },
  { href: "/admin/phase", perm: "phase" },
  { href: "/admin/screening", perm: "screening" },
  { href: "/admin/lobbies", perm: "lobbies" },
  { href: "/admin/qualifiers", perm: "qualifiers" },
  { href: "/admin/mappools", perm: "mappools" },
  { href: "/admin/teams", perm: "teams" },
  { href: "/admin/matches", perm: "matches" },
  { href: "/admin/site", perm: "phase" },
  { href: "/admin/staff", perm: "staff" },
  { href: "/admin/log", perm: "log" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const [viewer, session, t] = await Promise.all([getViewer(), auth(), getDict()]);
  if (!viewer?.role) notFound();
  const items = MENU.filter((m) => can(viewer.role, m.perm)).map((m) => ({ href: m.href, label: t.admin.menu[m.href.split("/")[2] ?? "overview"] }));
  const name = session?.user?.name;
  const avatar = session?.user?.image;
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 pb-16 pt-6 sm:px-6 lg:flex-row lg:gap-10 lg:pt-10">
      <aside className="shrink-0 lg:sticky lg:top-[104px] lg:w-72 lg:self-start">
        <div className="relative overflow-hidden border border-line bg-coal">
          <div className="relative hidden border-b border-dashed border-line p-5 lg:block">
            <span className="anim-twinkle absolute right-5 top-4 text-lg text-rose-hi" aria-hidden>
              ✦
            </span>
            <span className="anim-twinkle absolute right-11 top-10 text-xs text-balkan [animation-delay:0.8s]" aria-hidden>
              ✦
            </span>
            <span className="anim-twinkle absolute right-7 top-14 text-[0.6rem] text-paper/60 [animation-delay:1.6s]" aria-hidden>
              ✦
            </span>
            <TriTick className="h-3 w-[22px]" />
            <div className="mt-4 flex items-center gap-3">
              {avatar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" className="size-12 shrink-0 rounded-full object-cover ring-2 ring-rose/40 ring-offset-2 ring-offset-coal" />
              )}
              <div className="min-w-0">
                <div className="break-words font-display text-xl font-black leading-tight tracking-tight">
                  {t.admin.hello}, {name}!
                </div>
                <Tag tone="balkan" className="mt-1.5">
                  {t.admin.roles[viewer.role]}
                </Tag>
              </div>
            </div>
          </div>
          <AdminNav items={items} />
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
