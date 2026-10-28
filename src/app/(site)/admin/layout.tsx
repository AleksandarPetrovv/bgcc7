import { notFound } from "next/navigation";
import { AdminNav } from "./admin-nav";
import { Glyph } from "@/components/site/graphics";
import { Tag } from "@/components/site/page";
import { auth } from "@/auth";
import { getViewer } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { can, hasAdmin } from "@/lib/roles";
import { siteEdition } from "@/db";
import { getHosts } from "@/db/admin";
import type { Role } from "@/lib/roles";
import { EditionSwitch } from "./edition-bgcc6/edition-switch";
import { adminMenu } from "./menu";
import { avatarPath } from "@/lib/avatar";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const [viewer, session, t] = await Promise.all([getViewer(), auth(), getDict()]);
  if (!viewer || !hasAdmin(viewer.roles)) notFound();
  const items = adminMenu().filter((m) => m.perm.some((p) => can(viewer.roles, p))).map((m) => ({ href: m.href, label: t.admin.menu[m.href.split("/")[2] ?? "overview"] }));
  const hosts = viewer.roles.includes("host") ? await getHosts() : [];
  const hostIndex = hosts.findIndex((host) => host.osuId === viewer.osuId);
  const mainRoles: Role[] = ["referee", "commentator", "mappooler", "playtester"];
  const roleLabels = viewer.roles.includes("host")
    ? [t.info.hostRoles[hostIndex > 0 ? 1 : 0]]
    : mainRoles.filter((role) => viewer.roles.includes(role)).map((role) => t.admin.roles[role]);
  const name = session?.user?.name;
  const avatar = avatarPath(viewer.osuId);
  return (
    <div className="adm mx-auto flex w-full max-w-page flex-col gap-6 px-4 pb-16 pt-6 sm:px-6 lg:flex-row lg:gap-10 lg:px-10 lg:pt-10 2xl:gap-14 2xl:px-14">
      <aside className="shrink-0 lg:sticky lg:top-[104px] lg:max-h-[calc(100dvh-128px)] lg:w-72 lg:self-start lg:overflow-y-auto lg:overscroll-contain">
        <div className="relative overflow-hidden border border-line bg-coal">
          <div className="relative hidden border-b border-dashed border-line p-5 lg:block">
            <span className="anim-twinkle absolute right-5 top-4 text-lg text-rose-hi" aria-hidden>
              ✦
            </span>
            <span className="anim-twinkle absolute right-11 top-10 text-xs text-balkan-hi [animation-delay:0.8s]" aria-hidden>
              ✦
            </span>
            <span className="anim-twinkle absolute right-7 top-14 text-[0.6rem] text-paper/60 [animation-delay:1.6s]" aria-hidden>
              ✦
            </span>
            <Glyph kind="hex" className="size-3.5" />
            <div className="mt-4 flex items-center gap-3">
              {avatar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" className="size-12 shrink-0 rounded-full object-cover ring-2 ring-rose/40 ring-offset-2 ring-offset-coal" />
              )}
              <div className="min-w-0">
                <div className="heading-slam break-words text-xl leading-tight">
                  {t.admin.hello}, {name}!
                </div>
                {roleLabels.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {roleLabels.map((role) => <Tag key={role} tone="balkan">{role}</Tag>)}
                  </div>
                )}
              </div>
            </div>
          </div>
          <AdminNav items={items} />
          {viewer.roles.includes("host") && <EditionSwitch edition={siteEdition()} />}
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
