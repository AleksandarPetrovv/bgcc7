import Link from "next/link";
import { ArrowUpRight, Radio } from "lucide-react";
import { Barcode, CheckerStitch, Shevitsa, SpeedLines, Tricolor } from "@/components/site/graphics";
import { SlantButton } from "@/components/site/page";
import { allMatches, staff, teams, timeline, teamById } from "@/lib/data";
import { cn } from "@/lib/utils";

const CURRENT = "reg";

function HeroLockup() {
  return (
    <div className="relative select-none">
      <div className="font-display text-[clamp(5rem,15vw,13.5rem)] font-black lowercase leading-[0.8] tracking-[-0.05em] text-paper">
        bgcc
      </div>
      <div className="relative -mt-[0.1em] flex items-end pr-3">
        <div className="relative mb-[0.9em] mr-3 h-[clamp(2.4rem,6vw,5rem)] flex-1 text-[clamp(0.9rem,2vw,1.4rem)]">
          <SpeedLines className="absolute inset-0 h-full w-full text-paper" count={12} />
          <div className="absolute left-0 top-1/2 flex -translate-y-1/2 gap-2">
            {["bg-paper", "bg-balkan", "bg-rose"].map((c, i) => (
              <span
                key={c}
                className={cn("anim-stripe block h-[clamp(2.4rem,6vw,5rem)] w-[clamp(1.2rem,3vw,2.6rem)] -skew-x-[18deg]", c)}
                style={{ animation: `stripe-in 0.6s ${0.15 + i * 0.1}s cubic-bezier(.2,.8,.2,1) both` }}
              />
            ))}
          </div>
        </div>
        <div className="font-display text-[clamp(4.5rem,15vw,14rem)] font-black italic leading-[0.72] tracking-[-0.06em] text-rose">7</div>
      </div>
    </div>
  );
}

function WordCard({
  word,
  title,
  sub,
  href,
  tone,
}: {
  word: string;
  title: string;
  sub: string;
  href: string;
  tone: "rose" | "paper" | "balkan";
}) {
  const t = {
    rose: "bg-rose text-ink",
    paper: "bg-paper text-rose",
    balkan: "bg-balkan text-ink",
  }[tone];
  return (
    <Link href={href} className={cn("group relative block h-32 overflow-hidden", t)}>
      <span className="heading-slam pointer-events-none absolute -left-3 -top-1 whitespace-nowrap text-[5.2rem] leading-[0.8] transition-transform duration-500 group-hover:-translate-x-6">
        {word}
        <br />
        <span className="ml-16 opacity-60">{word}</span>
      </span>
      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent p-4 pt-10 text-white">
        <span>
          <span className="block text-lg font-black uppercase">{title}</span>
          <span className="text-sm font-medium opacity-90">{sub}</span>
        </span>
        <ArrowUpRight className="size-6 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

export default function Home() {
  const featured = allMatches.filter((m) => m.winner).slice(0, 3);
  return (
    <>
      <section className="grain relative overflow-hidden border-b border-line">
        <div
          className="pointer-events-none absolute -right-32 -top-24 font-display text-[44rem] font-black italic leading-none text-white/[0.025]"
          aria-hidden
        >
          7
        </div>
        <div className="relative mx-auto grid max-w-[1400px] gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pt-14">
          <div className="anim-rise">
            <HeroLockup />
          </div>

          <div className="anim-rise flex flex-col justify-center" style={{ animationDelay: "0.15s" }}>
            <div className="flex items-stretch border border-paper">
              <div className="min-w-0 flex-1 px-3 py-2 font-display text-[clamp(0.95rem,2.4vw,2rem)] font-black lowercase leading-none tracking-tight sm:px-4">
                bulgarian community cup
              </div>
              <div className="flex items-center bg-paper px-2.5 font-display text-[clamp(1rem,2.4vw,2rem)] font-black italic text-rose sm:px-4">2026</div>
            </div>
            <p className="mt-7 text-[clamp(1.6rem,3vw,2.6rem)] font-black leading-[1.02] tracking-tight">
              Eight teams. Three players each.
              <br />
              <span className="text-balkan">One</span> cup for <span className="text-rose">Bulgaria&apos;s</span> best.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <SlantButton href="/register" tone="balkan">Register your team</SlantButton>
              <SlantButton href="/info" tone="outline">Read the rules</SlantButton>
            </div>
            <div className="mt-9 flex items-end gap-6">
              <Barcode value="BGCC7" className="h-12 w-72 text-paper" />
              <div className="num pb-0.5 text-xs uppercase leading-tight tracking-widest text-ash">
                3v3 · teamvs · scorev2
                <br />
                double elimination · bg only
              </div>
            </div>
          </div>
        </div>
        <Tricolor className="h-2.5" vertical />
      </section>

      <section className="mx-auto grid max-w-[1400px] gap-12 px-4 pt-14 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)]">
        <div>
          <h2 className="border-b border-rose pb-2 text-2xl font-light uppercase tracking-[0.35em]">Timeline</h2>
          <ul className="mt-5 space-y-3.5">
            {timeline.map((t) => {
              const current = t.key === CURRENT;
              return (
                <li key={t.key} className={cn("flex items-end text-[0.95rem] uppercase", current ? "font-black text-balkan" : "text-paper")}>
                  <span className="flex items-center gap-2">
                    {current && <Shevitsa size={14} />}
                    {t.label}
                  </span>
                  <span className="leader" />
                  <span className="num whitespace-nowrap text-base normal-case">{t.dates}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-8 border border-balkan/50 bg-balkan/10 p-4">
            <div className="text-[0.65rem] font-black uppercase tracking-widest text-balkan">Registrations close in</div>
            <div className="num mt-1 text-5xl text-paper">
              12<span className="text-2xl text-ash">d</span> 07<span className="text-2xl text-ash">h</span> 41<span className="text-2xl text-ash">m</span>
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <WordCard word="registration" title="Registration" sub="Open until 22 Nov at 23:59 EET" href="/register" tone="rose" />
          <WordCard word="mappool" title="Qualifier mappool" sub="11 maps · download and statistics" href="/mappool" tone="paper" />
          <WordCard word="teams" title="Teams" sub={`${teams.length} teams registered · ${teams.length * 3} players`} href="/teams" tone="balkan" />
          <Link href="/schedule/bracket" className="group relative flex h-32 items-center justify-center overflow-hidden border border-rose">
            <CheckerStitch className="absolute bottom-0 right-0 h-20 w-52 text-white/10" />
            <span className="relative text-center">
              <span className="block text-sm font-black uppercase tracking-wide text-rose">Bracket</span>
              <span className="block text-xs font-bold uppercase tracking-widest text-ash">Unlocks after qualifiers</span>
            </span>
          </Link>

          <div className="sm:col-span-2">
            <div className="mt-4 border-b border-rose pb-1.5 text-center text-sm font-semibold uppercase tracking-wide">
              BGCC7 is presented by
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {staff.sponsors.map((s) => (
                <div key={s.username} className="flex items-center gap-2.5 opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.avatar} alt="" className="size-9 rounded-full" />
                  <span className="font-display text-lg font-bold lowercase">{s.username}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 pt-20 sm:px-6">
        <div className="flex items-end justify-between border-b border-line pb-3">
          <h2 className="heading-slam text-4xl">Previously on bgcc</h2>
          <Link href="/schedule" className="text-sm font-black uppercase text-rose hover:text-paper">Full schedule →</Link>
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {featured.map((m) => {
            const a = teamById(m.team1.id);
            const b = teamById(m.team2.id);
            return (
              <div key={m.id} className="group relative overflow-hidden bg-paper text-ink">
                <div className="flex items-center justify-between bg-ink px-4 py-2 text-xs font-black uppercase text-ash">
                  <span className="text-rose">{m.round}</span>
                  <span className="num text-sm">{m.datetime}</span>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-4">
                  {[a, b].map((t, i) => (
                    <div key={i} className={cn("flex min-w-0 items-center gap-3", i === 1 && "order-3 flex-row-reverse text-right")}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={t?.image} alt="" className="size-12 shrink-0 object-cover" />
                      <span className={cn("line-clamp-2 min-w-0 break-words text-sm font-black leading-tight", m.winner === i + 1 ? "text-ink" : "text-ink/45")}>{t?.name}</span>
                    </div>
                  ))}
                  <div className="order-2 -skew-x-12 bg-rose px-3 py-1.5">
                    <span className="num block skew-x-12 text-2xl text-white">
                      {m.team1.score}-{m.team2.score}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col items-start gap-4 border border-line bg-coal p-5 sm:flex-row sm:items-center">
          <span className="flex items-center gap-2 bg-rose px-2 py-1 text-xs font-black uppercase text-white">
            <Radio className="size-3.5 animate-pulse" /> Offline
          </span>
          <p className="text-sm text-ash">
            Every BGCC7 match is streamed with Bulgarian commentary. The next broadcast is the qualifier showcase on 28 Nov.
          </p>
          <SlantButton href="/streams" tone="paper" className="sm:ml-auto">Stream schedule</SlantButton>
        </div>
      </section>
    </>
  );
}
