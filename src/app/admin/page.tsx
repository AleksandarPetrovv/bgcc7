import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getSettings } from "@/db/settings";
import { getRegistrations } from "@/db/registrations";
import { getLog, getStaff } from "@/db/admin";
import { ADMINS } from "@/lib/admins";
import { getDict, getLang } from "@/lib/i18n/server";
import { getViewer } from "@/lib/authz";
import { can } from "@/lib/roles";
import { SECTIONS } from "@/lib/sections";
import { LogTable } from "./log/log-table";

export default async function AdminOverview() {
  const [t, lang, settings, regs, staff, log, viewer] = await Promise.all([
    getDict(),
    getLang(),
    getSettings(),
    getRegistrations(),
    getStaff(),
    getLog(8),
    getViewer(),
  ]);
  const staffCount = new Set([...ADMINS, ...staff.filter((s) => s.permRole).map((s) => s.osuId)]).size;
  const visible = SECTIONS.filter((s) => settings.sections[s]).length;
  const tiles = [
    { k: t.admin.phaseNow, v: t.admin.phases[settings.phase], sub: t.admin.visiblePages(visible), href: can(viewer?.role, "phase") ? "/admin/phase" : null },
    { k: t.admin.registered, v: String(regs.length), sub: null, href: can(viewer?.role, "screening") ? "/admin/screening" : null },
    {
      k: t.admin.pendingReview,
      v: String(regs.filter((r) => r.status === "pending").length),
      sub: null,
      href: can(viewer?.role, "screening") ? "/admin/screening?status=pending" : null,
    },
    { k: t.admin.staffCount, v: String(staffCount), sub: null, href: can(viewer?.role, "staff") ? "/admin/staff" : null },
  ];
  return (
    <>
      <h1 className="heading-slam text-4xl sm:text-5xl">{t.admin.menu.overview}</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => {
          const body = (
            <>
              <div className="flex items-center justify-between text-[0.65rem] font-black uppercase tracking-widest text-ash">
                {tile.k}
                {tile.href && <ArrowUpRight className="size-4" />}
              </div>
              <div className="num mt-1 text-4xl text-paper">{tile.v}</div>
              {tile.sub && <div className="text-xs text-ash">{tile.sub}</div>}
            </>
          );
          return tile.href ? (
            <Link key={tile.k} href={tile.href} className="border border-line bg-coal p-4 transition-colors hover:border-rose">
              {body}
            </Link>
          ) : (
            <div key={tile.k} className="border border-line bg-coal p-4">
              {body}
            </div>
          );
        })}
      </div>
      {can(viewer?.role, "log") && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide">{t.admin.recent}</h2>
          <LogTable rows={log} lang={lang} empty={t.admin.noLog} head={[t.admin.when, t.admin.who, t.admin.what]} />
        </section>
      )}
    </>
  );
}
