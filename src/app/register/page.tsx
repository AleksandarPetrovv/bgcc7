import { Check, ImagePlus, UserPlus } from "lucide-react";
import { Container, PageTitle, SlantButton, Tag } from "@/components/site/page";
import { Barcode, Shevitsa } from "@/components/site/graphics";
import { Input } from "@/components/ui/input";
import { signups, flagUrl, fmtNum } from "@/lib/data";

const STEPS = [
  { t: "Log in with osu!", d: "The captain signs in. We read your rank and country from osu!." },
  { t: "Name your team", d: "Pick a name and upload a banner. Both can change until qualifiers." },
  { t: "Invite teammates", d: "Send invites to 2–3 players. They accept from their own account." },
  { t: "Book a qualifier lobby", d: "Choose a lobby time on 28 or 29 Nov." },
];

export default function Register() {
  const [cap, ...rest] = signups.slice(3, 6);
  return (
    <Container>
      <PageTitle accent="Registration" right={<Tag tone="balkan" className="text-xs">Open · closes 22 Nov 23:59 EET</Tag>}>
        BGCC7
      </PageTitle>

      <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <ol className="space-y-5">
          {STEPS.map((s, i) => (
            <li key={s.t} className="flex gap-4">
              <span className={`num flex size-11 shrink-0 items-center justify-center text-2xl ${i < 1 ? "bg-balkan text-white" : "border border-line text-ash"}`}>
                {i < 1 ? <Check className="size-5" /> : i + 1}
              </span>
              <div>
                <div className="font-black uppercase">{s.t}</div>
                <p className="text-sm text-ash">{s.d}</p>
              </div>
            </li>
          ))}
          <li className="!mt-10 border border-rose/40 bg-rose/10 p-4 text-sm">
            <div className="mb-1 font-black uppercase text-rose">Who can play</div>
            Players whose osu! country is Bulgaria, any rank. Restricted accounts and players with an active tournament ban can&apos;t register.
          </li>
        </ol>

        <div className="bg-paper text-ink">
          <div className="flex items-center justify-between bg-ink px-5 py-3 text-paper">
            <span className="text-sm font-black uppercase tracking-wide">Your team</span>
            <Barcode value="team-draft" className="h-5 w-32 text-line" />
          </div>
          <div className="space-y-6 p-5 sm:p-7">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-rose">Team name</span>
              <Input defaultValue="Rakia Rush" className="mt-1.5 h-11 rounded-none border-ink/20 bg-white text-lg font-bold text-ink" />
            </label>

            <div>
              <span className="text-xs font-black uppercase tracking-wide text-rose">Banner</span>
              <div className="mt-1.5 flex h-28 items-center justify-center gap-3 border-2 border-dashed border-ink/25 text-sm font-bold text-ink/50">
                <ImagePlus className="size-5" /> Drop a 1200×300 image or click to upload
              </div>
            </div>

            <div>
              <span className="text-xs font-black uppercase tracking-wide text-rose">Roster</span>
              <div className="mt-2 space-y-2">
                {[{ p: cap, state: "Captain" }, ...rest.map((p) => ({ p, state: "Invited" }))].map(({ p, state }) => (
                  <div key={p.userId} className="flex items-center gap-3 border border-ink/10 bg-white p-2 pr-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.avatar} alt="" className="size-10" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={flagUrl(p.country)} alt="" className="h-3" />
                    <span className="font-bold">{p.username}</span>
                    <span className="num ml-auto text-ink/60">#{fmtNum(p.rank)}</span>
                    <Tag tone={state === "Captain" ? "rose" : "ink"}>{state}</Tag>
                  </div>
                ))}
                <button className="flex w-full items-center justify-center gap-2 border-2 border-dashed border-ink/20 p-3 text-sm font-black uppercase text-ink/50 transition hover:border-balkan hover:text-balkan">
                  <UserPlus className="size-4" /> Invite a substitute
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-ink/10 pt-5">
              <SlantButton tone="balkan">Save team</SlantButton>
              <span className="text-sm text-ink/60">2 of 3 players still need to accept.</span>
              <Shevitsa size={20} className="ml-auto" />
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
