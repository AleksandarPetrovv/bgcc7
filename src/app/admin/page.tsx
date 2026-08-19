import Link from "next/link";
import { CountUp } from "@/components/site/motion";
import { PageTitle, SubHeading } from "@/components/site/page";
import { ArrowUpRight } from "lucide-react";
import { getSettings } from "@/db/settings";
import { getRegistrations } from "@/db/registrations";
import { getLog, getLogCtx, getStaff } from "@/db/admin";
import { ADMINS } from "@/lib/admins";
import { getDict, getLang } from "@/lib/i18n/server";
import { getViewer } from "@/lib/authz";
import { can } from "@/lib/roles";
import { SECTIONS } from "@/lib/sections";
import { LogTable } from "./log/log-table";

export default async function AdminOverview() {
  const [t, lang, settings, regs, staff, log, viewer, ctx] = await Promise.all([
    getDict(),
    getLang(),
    getSettings(),
    getRegistrations(),
    getStaff(),
    getLog(10),
    getViewer(),
    getLogCtx(),
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
      <PageTitle>{t.admin.menu.overview}</PageTitle>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile, i) => {
          const body = (
            <>
              <div className="flex items-center justify-between text-[0.65rem] font-black uppercase tracking-widest text-ash">
                {tile.k}
                {tile.href && <ArrowUpRight className="size-4" />}
              </div>
              {/^\d+$/.test(tile.v) ? (
                <CountUp to={Number(tile.v)} delay={0.3 + i * 0.1} className="num mt-1 block text-4xl text-paper" />
              ) : (
                <div className="in-wipe num mt-1 text-4xl text-paper [--d:0.35s]">{tile.v}</div>
              )}
              {tile.sub && <div className="in-up text-xs text-ash [--d:0.5s]">{tile.sub}</div>}
            </>
          );
          return tile.href ? (
            <Link key={tile.k} href={tile.href} className="in-flip border border-line bg-coal p-4 transition-colors hover:border-rose" style={{ "--i": i, "--s": "0.09s", "--d": "0.1s" } as React.CSSProperties}>
              {body}
            </Link>
          ) : (
            <div key={tile.k} className="in-flip border border-line bg-coal p-4" style={{ "--i": i, "--s": "0.09s", "--d": "0.1s" } as React.CSSProperties}>
              {body}
            </div>
          );
        })}
      </div>
      {can(viewer?.role, "log") && (
        <section className="mt-8">
          <div className="in-left [--d:0.45s]">
            <SubHeading>{t.admin.recent}</SubHeading>
          </div>
          <LogTable rows={log} ctx={ctx} lang={lang} t={t} empty={t.admin.noLog} />
        </section>
      )}
    </>
  );
}
