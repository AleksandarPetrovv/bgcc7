import { notFound } from "next/navigation";
import { AdminNav } from "./admin-nav";
import { TriTick } from "@/components/site/graphics";
import { Tag } from "@/components/site/page";
import { auth } from "@/auth";
import { getViewer } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { can, hasAdmin, type Perm } from "@/lib/roles";
import { getEdition } from "@/db/edition";
import { siteEdition } from "@/db";
import { EditionSwitch } from "./edition/edition-switch";

const MENU: { href: string; perm: Perm }[] = [
  { href: "/admin", perm: "overview" },
  { href: "/admin/phase", perm: "phase" },
  { href: "/admin/screening", perm: "screening" },
  { href: "/admin/lobbies", perm: "lobbies" },
  { href: "/admin/qualifiers", perm: "qualifiers" },
  { href: "/admin/mappools", perm: "mappools" },
  { href: "/admin/teams", perm: "teams" },
  { href: "/admin/matches", perm: "matches" },
  { href: "/admin/draft", perm: "draft" },
  { href: "/admin/refapp", perm: "matches" },
  { href: "/admin/stream", perm: "stream" },
  { href: "/admin/overlay", perm: "overlay" },
  { href: "/admin/site", perm: "phase" },
  { href: "/admin/staff", perm: "staff" },
  { href: "/admin/log", perm: "log" },
  { href: "/admin/settings", perm: "settings" },
  { href: "/admin/format", perm: "format" },
];

const QUALS = ["/admin/lobbies", "/admin/qualifiers"];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const [viewer, session, t] = await Promise.all([getViewer(), auth(), getDict()]);
  if (!viewer || !hasAdmin(viewer.roles)) notFound();
  const edition = getEdition();
  const items = MENU.filter((m) => can(viewer.roles, m.perm) && (edition === "bgcc6" || !QUALS.includes(m.href))).map((m) => ({ href: m.href, label: t.admin.menu[m.href.split("/")[2] ?? "overview"] }));
  const name = session?.user?.name;
  const avatar = session?.user?.image;
  return (
    <div className="adm mx-auto flex w-full max-w-page flex-col gap-6 px-4 pb-16 pt-6 sm:px-6 lg:flex-row lg:gap-10 lg:px-10 lg:pt-10 2xl:gap-14 2xl:px-14">
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
                <div className="heading-slam break-words text-xl leading-tight">
                  {t.admin.hello}, {name}!
                </div>
                <Tag tone="balkan" className="mt-1.5">
                  {viewer.roles.map((r) => t.admin.roles[r]).join(" + ")}
                </Tag>
              </div>
            </div>
          </div>
          <AdminNav items={items} />
          {viewer.roles.includes("host") && <EditionSwitch edition={siteEdition()} viewing={edition} />}
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
