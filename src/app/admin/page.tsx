import { Check, ClipboardList, Gauge, Layers, ListChecks, Shield, Swords, Users, X } from "lucide-react";
import { SubHeading, Tag } from "@/components/site/page";
import { SpeedMark } from "@/components/site/graphics";
import { signups, teams, fmtNum, flagUrl } from "@/lib/data";

const MENU = [
  { icon: Gauge, label: "Overview", active: true },
  { icon: ClipboardList, label: "Registrations" },
  { icon: Users, label: "Teams" },
  { icon: Layers, label: "Mappools" },
  { icon: Swords, label: "Matches & bracket" },
  { icon: ListChecks, label: "Qualifier results" },
  { icon: Shield, label: "Staff & permissions" },
];

const ROLES = [
  { role: "Host", perms: [1, 1, 1, 1, 1, 1] },
  { role: "Mappooler", perms: [0, 0, 1, 0, 0, 0] },
  { role: "Referee", perms: [0, 0, 0, 1, 1, 0] },
  { role: "Streamer", perms: [0, 0, 0, 0, 1, 0] },
  { role: "Developer", perms: [0, 0, 0, 0, 0, 1] },
];
const PERM_COLS = ["Rules", "Screening", "Mappool", "Schedule", "Results", "Site"];

const PHASES = ["Registrations", "Screening", "Qualifiers", "Bracket", "Finished"];

export default function Admin() {
  const queue = signups.slice(8, 14);
  return (
    <div className="flex min-h-[calc(100vh-72px)]">
      <aside className="hidden w-60 shrink-0 border-r border-line bg-coal lg:block">
        <div className="flex items-center gap-2 border-b border-line p-4">
          <SpeedMark className="h-6 w-16" />
          <span className="text-xs font-black uppercase tracking-widest text-ash">Admin</span>
        </div>
        <nav className="p-2">
          {MENU.map((m) => (
            <a key={m.label} href="#" className={`flex items-center gap-3 px-3 py-2.5 text-sm font-bold ${m.active ? "bg-rose text-white" : "text-paper/80 hover:bg-slate"}`}>
              <m.icon className="size-4" /> {m.label}
            </a>
          ))}
        </nav>
        <div className="m-3 border border-line p-3 text-xs text-ash">
          Signed in as <span className="font-bold text-paper">Raregendary</span>
          <div className="mt-1"><Tag tone="balkan">Host</Tag></div>
        </div>
      </aside>

      <div className="flex-1 p-4 sm:p-8">
        <h1 className="heading-slam text-5xl">Overview</h1>

        <div className="mt-6 flex overflow-x-auto border border-line">
          {PHASES.map((p, i) => (
            <div key={p} className={`flex min-w-36 flex-1 items-center gap-2 border-r border-line px-4 py-3 last:border-r-0 ${i === 0 ? "bg-balkan text-ink" : i < 0 ? "" : "text-ash"}`}>
              <span className="num text-xl">{i + 1}</span>
              <span className="text-sm font-black uppercase">{p}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          {[
            ["Signups", signups.length, "text-paper"],
            ["Pending review", 6, "text-rose-hi"],
            ["Teams", teams.length, "text-balkan"],
            ["Staff", 5, "text-paper"],
          ].map(([k, v, c]) => (
            <div key={k as string} className="border border-line bg-coal p-4">
              <div className="text-[0.65rem] font-black uppercase tracking-widest text-ash">{k}</div>
              <div className={`num text-5xl ${c}`}>{v}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
          <section>
            <SubHeading>Screening queue</SubHeading>
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
                    <button className="flex items-center gap-1 bg-balkan px-2 py-1 text-xs font-black uppercase text-ink"><Check className="size-3.5" /> Approve</button>
                    <button className="flex items-center gap-1 border border-rose px-2 py-1 text-xs font-black uppercase text-rose-hi"><X className="size-3.5" /> Deny</button>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SubHeading>Role permissions</SubHeading>
            <div className="overflow-x-auto border border-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate text-[0.65rem] font-black uppercase text-ash">
                    <th className="px-3 py-2 text-left">Role</th>
                    {PERM_COLS.map((c) => <th key={c} className="px-2 py-2">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {ROLES.map((r) => (
                    <tr key={r.role} className="border-t border-line">
                      <td className="px-3 py-2 font-bold">{r.role}</td>
                      {r.perms.map((p, i) => (
                        <td key={i} className="px-2 py-2 text-center">
                          {p ? <Check className="mx-auto size-4 text-balkan" /> : <span className="text-line" aria-label="no access">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-ash">Players on staff can only hold roles with no say over results.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
