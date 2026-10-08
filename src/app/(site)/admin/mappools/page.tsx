import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Eye, LayoutGrid, ListChecks, PencilRuler } from "lucide-react";
import { PageTitle } from "@/components/site/page";
import { getPoolStages } from "@/db/mappools";
import { getEdition } from "@/db/edition";
import { getSheet } from "@/db/pool-sheet";
import { getViewer } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { cn } from "@/lib/utils";

export default async function MappoolsHub() {
  const [t, viewer, stages] = await Promise.all([getDict(), getViewer(), getPoolStages()]);
  if (!viewer || !can(viewer.roles, "mappools")) notFound();
  const sheets = await Promise.all(stages.map((s) => getSheet(s.id, viewer.osuId, s.blueprint)));
  const edit = can(viewer.roles, "poolEdit");
  const host = can(viewer.roles, "phase");
  const vote = can(viewer.roles, "poolVote");
  const owed = vote ? sheets.reduce((n, s) => n + s.owed, 0) : 0;
  const mapCount = stages.reduce((n, s) => n + s.pools.reduce((k, p) => k + p.maps.length, 0), 0);
  const tiles = [
    {
      href: "/admin/mappools/sheet",
      Icon: ListChecks,
      title: t.admin.poolSheet,
      sub: vote ? t.admin.owedVotes(owed) : t.admin.slotsOpen(sheets.reduce((n, s) => n + s.slots.filter((x) => !x.picked).length, 0)),
      hot: owed > 0,
    },
    { href: "/admin/mappools/edit", Icon: edit ? PencilRuler : Eye, title: edit ? t.admin.poolEdit : t.admin.poolView, sub: t.admin.mapsInPools(mapCount), hot: false },
    ...(host && getEdition() !== "bgcc7" ? [{ href: "/admin/mappools/create", Icon: LayoutGrid, title: t.admin.poolCreate, sub: t.admin.poolCreateSub, hot: false }] : []),
  ];
  return (
    <>
      <PageTitle>{t.admin.menu.mappools}</PageTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        {tiles.map(({ href, Icon, title, sub, hot }, i) => (
          <div
            key={href}
            style={{ "--i": i, "--s": "0.12s", "--d": "0.15s" } as React.CSSProperties}
            className={cn("in-flip", i === 2 && "sm:col-span-2 sm:mx-auto sm:w-[calc(50%-0.5rem)]")}
          >
            <Link
              href={href}
              className="group relative flex h-full min-h-48 flex-col justify-between overflow-hidden border border-line bg-coal p-6 transition-[border-color,box-shadow,transform,translate,scale,rotate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform hover:-translate-x-1 hover:-translate-y-1 hover:border-rose hover:shadow-[6px_6px_0_0_var(--color-rose-deep)] sm:min-h-60 sm:p-8"
            >
              <Icon
                className="pointer-events-none absolute -bottom-6 -right-6 size-44 text-paper/[0.04] transition-[color,transform,translate,scale,rotate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-rotate-6 group-hover:scale-110 group-hover:text-rose/10"
                strokeWidth={1.25}
                aria-hidden
              />
              <span className="flex items-start justify-between gap-4">
                <span className="grid size-14 -skew-x-12 place-items-center border border-rose bg-rose text-white shadow-[3px_3px_0_0_var(--color-rose-deep)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105">
                  <Icon className="size-7 skew-x-12" strokeWidth={2} />
                </span>
                <ArrowUpRight className="size-6 text-ash transition-[color,transform,translate,scale,rotate] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-rose-hi" />
              </span>
              <span className="relative">
                <span className="heading-slam block text-4xl sm:text-5xl">{title}</span>
                <span className={hot ? "mt-2 block text-sm font-black uppercase tracking-wide text-rose-hi" : "mt-2 block text-sm font-bold uppercase tracking-wide text-ash"}>
                  {sub}
                </span>
              </span>
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}
