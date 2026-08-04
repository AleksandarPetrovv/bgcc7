import { Check, ClipboardList, Gauge, Layers, ListChecks, Shield, Swords, Users, X } from "lucide-react";
import { SubHeading, Tag } from "@/components/site/page";
import { SpeedMark } from "@/components/site/graphics";
import { getDict } from "@/lib/i18n/server";
import { signups, teams, fmtNum, flagUrl } from "@/lib/data";

const MENU = [Gauge, ClipboardList, Users, Layers, Swords, ListChecks, Shield];

const ROLES = [
  { role: "Host", perms: [1, 1, 1, 1, 1, 1] },
  { role: "Mappooler", perms: [0, 0, 1, 0, 0, 0] },
  { role: "Referee", perms: [0, 0, 0, 1, 1, 0] },
  { role: "Streamer", perms: [0, 0, 0, 0, 1, 0] },
  { role: "Developer", perms: [0, 0, 0, 0, 0, 1] },
];

export default async function Admin() {
  const t = await getDict();
  const queue = signups.slice(8, 14);
  return (
    <div className="flex min-h-[calc(100vh-72px)]">
      <aside className="hidden w-60 shrink-0 border-r border-line bg-coal lg:block">
        <div className="flex items-center gap-2 border-b border-line p-4">
          <SpeedMark className="h-6 w-16" />
          <span className="text-xs font-black uppercase tracking-widest text-ash">{t.nav.admin}</span>
        </div>
        <nav className="p-2">
          {MENU.map((Icon, i) => (
            <a key={i} href="#" className={`flex items-center gap-3 px-3 py-2.5 text-sm font-bold ${i === 0 ? "bg-rose text-white" : "text-paper/80 hover:bg-slate"}`}>
              <Icon className="size-4" /> {t.admin.menu[i]}
            </a>
          ))}
        </nav>
        <div className="m-3 border border-line p-3 text-xs text-ash">
          {t.admin.signedIn} <span className="font-bold text-paper">Raregendary</span>
          <div className="mt-1"><Tag tone="balkan">{t.staff.roles.Host}</Tag></div>
        </div>
      </aside>

      <div className="flex-1 p-4 sm:p-8">
        <h1 className="heading-slam text-5xl">{t.admin.overview}</h1>

        <div className="mt-6 flex overflow-x-auto border border-line">
          {t.admin.phases.map((p, i) => (
            <div key={p} className={`flex min-w-36 flex-1 items-center gap-2 border-r border-line px-4 py-3 last:border-r-0 ${i === 0 ? "bg-balkan text-ink" : i < 0 ? "" : "text-ash"}`}>
              <span className="num text-xl">{i + 1}</span>
              <span className="text-sm font-black uppercase">{p}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          {[
            [t.admin.kpis[0], signups.length, "text-paper"],
            [t.admin.kpis[1], 6, "text-rose-hi"],
            [t.admin.kpis[2], teams.length, "text-balkan"],
            [t.admin.kpis[3], 5, "text-paper"],
          ].map(([k, v, c]) => (
            <div key={k as string} className="border border-line bg-coal p-4">
              <div className="text-[0.65rem] font-black uppercase tracking-widest text-ash">{k}</div>
              <div className={`num text-5xl ${c}`}>{v}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
          <section>
            <SubHeading>{t.admin.queue}</SubHeading>
            <div className="divide-y divide-line border border-line">
              {queue.map((p) => (
                <div key={p.userId} className="flex items-center gap-3 px-3 py-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.avatar} alt="" className="size-9" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={flagUrl(p.country)} alt="" className="h-2.5" />
                  <span className="font-bold">{p.username}</span>
                  <span className="num text-ash">#{fmtNum(p.rank)}</span>
                  <span className="ml-auto flex gap-1.5">
                    <button type="button" className="flex items-center gap-1 bg-balkan px-2 py-1 text-xs font-black uppercase text-ink"><Check className="size-3.5" /> {t.admin.approve}</button>
                    <button type="button" className="flex items-center gap-1 border border-rose px-2 py-1 text-xs font-black uppercase text-rose-hi"><X className="size-3.5" /> {t.admin.deny}</button>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SubHeading>{t.admin.perms}</SubHeading>
            <div className="overflow-x-auto border border-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate text-[0.65rem] font-black uppercase text-ash">
                    <th className="px-3 py-2 text-left">{t.admin.role}</th>
                    {t.admin.permCols.map((c) => <th key={c} className="px-2 py-2">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {ROLES.map((r) => (
                    <tr key={r.role} className="border-t border-line">
                      <td className="px-3 py-2 font-bold">{t.staff.roles[r.role] ?? r.role}</td>
                      {r.perms.map((p, i) => (
                        <td key={i} className="px-2 py-2 text-center">
                          {p ? <Check className="mx-auto size-4 text-balkan" /> : <span className="text-line" aria-label={t.admin.noAccess}>—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-ash">{t.admin.permNote}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
