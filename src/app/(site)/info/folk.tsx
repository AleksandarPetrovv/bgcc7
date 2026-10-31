import Image from "next/image";
import { Star } from "lucide-react";
import { SlantButton } from "@/components/site/page";
import { Letters } from "@/components/site/rich";
import { InView } from "@/components/site/in-view";
import type { Dict } from "@/lib/i18n/dict";
import { DISCORD_URL } from "@/lib/links";
import { fmtRange, sofiaDate } from "@/lib/dates";
import { weekOf } from "@/lib/schedule";
import { roundStats, skillOf, type Plan } from "@/lib/format-plan";
import type { Match } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Editable } from "./editable";
import { avatarPath } from "@/lib/avatar";
import { osuUser } from "@/lib/links";

export type FolkProps = {
  t: Dict;
  f: (s: string) => string;
  raw: (path: string, fallback: string) => string;
  on: boolean;
  locale: string;
  plan: Plan;
  matches: Match[];
  weeks?: Record<string, string | null>;
  hosts?: { osuId: number; username: string; avatarUrl: string | null; roles: string[] }[];
  timer?: number;
};

// every visible text starts typing at the same moment, the boxes around it arrive one by one
const T = 0;
const dv = (d: number) => ({ "--d": `${d}s` }) as React.CSSProperties;

const MOD_HEX: Record<string, string> = { NM: "var(--mod-nm)", HD: "var(--mod-hd)", HR: "var(--mod-hr)", DT: "var(--mod-dt)", TB: "var(--mod-tb)" };
const PLACE = ["text-gold-hi", "text-silver-deep", "text-bronze-hi"];

const STAR = Array.from({ length: 16 }, (_, i) => {
  const a = (i * Math.PI) / 8 - Math.PI / 2;
  const r = i % 2 ? 19 : 48;
  return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`;
}).join(" ");

function FolkStar({ className, points = 1 }: { className?: string; points?: number }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <polygon points={STAR} className="fill-current" />
      <polygon points={STAR} fill="var(--well)" transform="translate(50 50) scale(0.42) translate(-50 -50)" />
      {Array.from({ length: points }, (_, i) => (
        <circle key={i} cx={50 + (i - (points - 1) / 2) * 7} cy={50} r={3.2} className="fill-current" />
      ))}
    </svg>
  );
}

function Sheet({ children }: { children: React.ReactNode }) {
  return (
    <div className="folk-panel grid grid-cols-1 gap-x-12 bg-[radial-gradient(ellipse_at_90%_0%,color-mix(in_srgb,var(--balkan)_8%,transparent),transparent_45%),radial-gradient(ellipse_at_0%_100%,color-mix(in_srgb,var(--rose)_7%,transparent),transparent_40%)] px-6 pt-1 sm:px-10 lg:grid-cols-12 lg:px-14">
      <Flag />
      <div className="folk-dots pointer-events-none absolute inset-0 -z-10 opacity-50" aria-hidden />
      {children}
    </div>
  );
}

function Tile({ className, d = 0, children }: { className?: string; d?: number; children: React.ReactNode }) {
  return (
    <InView as="section" self className={cn("in-up in-slow relative border-t border-dashed border-paper/10 py-9 lg:py-12", className)} style={dv(d)}>
      {children}
    </InView>
  );
}

const SOFT = "radial-gradient(ellipse 70% 72% at 50% 50%, black 52%, transparent 100%)";

function Art({ src, className, position = "center", d = 0 }: { src: string; className?: string; position?: string; d?: number }) {
  return (
    <InView self className={cn("in-right-far in-slow relative min-h-64", className)} style={{ maskImage: SOFT, WebkitMaskImage: SOFT, ...dv(d) }}>
      <Image src={src} alt="" fill sizes="(min-width: 1024px) 34vw, 100vw" className="object-cover opacity-90" style={{ objectPosition: position }} />
    </InView>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return <h2 className="heading-slam mb-5 text-[clamp(1.5rem,4.5vw,2.25rem)] leading-[1.05]">{children}</h2>;
}

function Stitch() {
  return <span className="mt-[0.7em] block h-[2px] w-2.5 shrink-0 bg-rose" aria-hidden />;
}

// locked items follow admin settings, so hosts can't edit them
function Ledger({ path, items, p, plain, locked = [] }: { path: string; items: string[]; p: FolkProps; plain?: boolean; locked?: number[] }) {
  return (
    <ul className="divide-y divide-dashed divide-paper/10">
      {items.map((item, i) => {
        const lock = locked.includes(i);
        const text = lock ? item.replace("%timer%", String(p.timer ?? 90)) : p.raw(`${path}.${i}`, item);
        return (
          <li key={i} className="flex gap-3.5 py-2.5 text-[0.97rem] leading-relaxed text-paper/75 first:pt-0 last:pb-0">
            <Stitch />
            <span className="min-w-0">
              <Editable path={`${path}.${i}`} raw={text} on={p.on && !lock}>
                <Letters text={plain ? text : p.f(text)} plain d={T} s={0.008} />
              </Editable>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function E({ p, path, value, fill = true, s = 0.03 }: { p: FolkProps; path: string; value: string; fill?: boolean; s?: number }) {
  const text = p.raw(path, value);
  return (
    <Editable path={path} raw={text} on={p.on}>
      <Letters text={fill ? p.f(text) : text} d={T} s={s} />
    </Editable>
  );
}

function stageRows(p: FolkProps) {
  return p.plan.rounds.map((r) => {
    const s = roundStats(r);
    const wk = weekOf(p.weeks?.[r.slug]);
    const days = wk ? [wk.min.slice(0, 10), wk.max.slice(0, 10)] : p.matches.filter((m) => m.stage === r.slug && m.datetime).map((m) => sofiaDate(new Date(m.datetime!))).sort();
    return {
      slug: r.slug,
      name: p.t.rounds[r.name] ?? r.name,
      when: days.length ? fmtRange(p.locale, days[0], days.at(-1)!) : "",
      sr: r.sr ?? null,
      mods: [...r.cats.filter((c) => c.maps.length).map((c) => [skillOf(c).abbr, c.maps.length, skillOf(c).color] as const), ["TB", 1, MOD_HEX.TB] as const],
      bo: s.bestOf,
      bans: r.bans,
    };
  });
}

const COLS = "md:grid-cols-[minmax(9rem,1.3fr)_6.5rem_4.5rem_minmax(13rem,2fr)_3rem_4.5rem]";

function StageTable({ p }: { p: FolkProps }) {
  const rows = stageRows(p);
  return (
    <div>
      <div className={cn("hidden gap-4 border-b border-paper/10 pb-2.5 text-[0.65rem] font-display font-bold text-ash md:grid", COLS)}>
        <Letters text={p.t.info.stageCol} d={T} />
        <Letters text={p.t.info.datesCol} d={T} />
        <Letters text="SR" d={T} />
        <Letters text={p.t.info.poolCol} d={T} />
        <Letters text="BO" d={T} className="text-right" />
        <Letters text={p.t.info.bansCol} d={T} className="text-right" />
      </div>
      {rows.map((r) => (
        <div key={r.slug} className={cn("grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-b border-dashed border-paper/10 py-3.5 last:border-b-0 last:pb-0", COLS)}>
          <Letters text={r.name} d={T} className="heading-slam text-lg leading-none md:text-xl" />
          <Letters text={r.when || "TBA"} d={T} s={0.02} className="num text-right text-sm text-paper/70 md:text-left md:text-base" />
          <span className={cn("num flex items-center gap-1 text-base md:text-lg", r.sr ? "text-gold-hi" : "text-ash")}>
            <Star className="size-3.5 fill-current" />
            <Letters text={String(r.sr ?? "TBA")} d={T} />
          </span>
          <span className="col-span-2 flex flex-wrap gap-1.5 md:col-span-1">
            {r.mods.map(([mod, n, color]) => (
              <span key={mod} className="num -skew-x-12 border px-1.5 py-0.5 text-xs font-display font-black leading-none" style={{ background: color, borderColor: color, color: "var(--white)" }}>
                <Letters text={`${n} ${mod}`} d={T} className="inline-block skew-x-12" />
              </span>
            ))}
          </span>
          <span className="num text-base md:text-right md:text-lg">
            <span className="mr-1 text-ash md:hidden">BO</span>
            <Letters text={String(r.bo)} d={T} />
          </span>
          <Letters text={p.t.info.bansN(r.bans)} d={T} className="num text-right text-sm text-paper/70 md:text-base" />
        </div>
      ))}
    </div>
  );
}

function Hosts({ p, compact, d = 0 }: { p: FolkProps; compact?: boolean; d?: number }) {
  const hosts = p.hosts ?? [];
  if (!hosts.length) return <div className="hidden lg:col-span-6 lg:block" aria-hidden />;
  return (
    <InView className={cn("relative flex items-center border-t border-dashed border-paper/10 py-9 lg:col-span-6 lg:border-l lg:border-t-0 lg:pl-12", compact ? "lg:py-10" : "lg:py-0")}>
      <div className={cn("mx-auto grid w-full grid-cols-2 gap-6 sm:gap-10", compact ? "lg:max-w-md" : "lg:absolute lg:inset-y-7 lg:left-12 lg:right-0 lg:w-auto lg:grid-cols-[auto_auto] lg:justify-center lg:gap-6 lg:grid-rows-[minmax(0,1fr)] xl:inset-y-9")}>
        {hosts.slice(0, 2).map((h, i) => (
          <a key={h.osuId} href={osuUser(h.osuId)} target="_blank" rel="noreferrer" className={cn("group flex min-w-0 flex-col", !compact && "lg:grid lg:min-h-0 lg:grid-rows-[minmax(0,1fr)_auto_auto]")}>
            <span className={cn("in-up in-slow relative aspect-square overflow-hidden", !compact && "lg:h-full lg:max-w-full lg:justify-self-center")} style={dv(d + i * 0.15)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={h.avatarUrl ? avatarPath(h.osuId, true) : ""} alt="" className="absolute inset-0 size-full object-cover grayscale-[.3] transition duration-500 group-hover:scale-[1.03] group-hover:grayscale-0" />
              <span className="absolute inset-0 bg-gradient-to-t from-well/45 via-transparent to-transparent" aria-hidden />
              <span className={cn("in-grow absolute inset-x-0 top-0 h-1", i === 0 ? "bg-rose" : "bg-balkan")} style={dv(d + i * 0.15 + 0.35)} aria-hidden />
            </span>
            <span className="mt-4 block truncate font-display text-[clamp(1.4rem,2vw,2.4rem)] font-black leading-none tracking-[-0.03em] text-paper transition-colors group-hover:text-rose-hi">
              <Letters text={h.username} d={T} s={0.05} />
            </span>
            <span className="mt-2 block text-xs font-display font-bold text-ash">
              <Letters text={p.t.info.hostRoles[Math.min(i, 1)]} d={T} />
            </span>
          </a>
        ))}
      </div>
    </InView>
  );
}

function Prize({ p, i, small, d = 0 }: { p: FolkProps; i: number; small?: boolean; d?: number }) {
  const row = p.t.info.prizeRows[i];
  return (
    <div className={cn("flex gap-4", small ? "items-center" : "items-center sm:flex-col sm:items-start", i === 0 && "max-sm:order-first")}>
      <span className="in-spin in-slow shrink-0" style={dv(d)}>
        <FolkStar points={i + 1} className={cn("block", PLACE[i], small ? "size-12" : "size-20 sm:size-32")} />
      </span>
      <div className="min-w-0">
        <div className={cn("font-display font-black leading-none", PLACE[i], small ? "text-2xl" : "text-5xl sm:mt-2 sm:text-6xl")}>
          <E p={p} path={`info.prizeRows.${i}.place`} value={row.place} fill={false} />
        </div>
        <div className={cn(i === 0 ? "font-display font-black text-paper" : "font-display font-semibold text-paper/85", small ? "mt-1 text-sm" : "mt-5 text-lg leading-snug")}>
          <E p={p} path={`info.prizeRows.${i}.reward`} value={row.reward} fill={false} />
        </div>
        {!small && row.extra && (
          <div className="mt-2 text-base text-ash">
            <E p={p} path={`info.prizeRows.${i}.extra`} value={row.extra} fill={false} />
          </div>
        )}
      </div>
    </div>
  );
}

function Flag() {
  return (
    <span className="absolute inset-x-0 top-0 flex h-1" aria-hidden>
      <span className="flex-1 bg-paper" />
      <span className="flex-1 bg-balkan" />
      <span className="flex-1 bg-rose" />
    </span>
  );
}

function Headline({ children }: { children: React.ReactNode }) {
  return <h1 className="font-display text-[clamp(2.4rem,9vw,6rem)] font-black uppercase leading-[0.88] tracking-[-0.04em] text-paper">{children}</h1>;
}

export function InfoFolk(p: FolkProps) {
  const { t } = p;
  const intro = p.raw("info.intro", t.info.intro);
  return (
    <div className="pb-10">
      <Sheet>
        <Tile className="border-t-0 lg:col-span-6 xl:py-16" d={0.05}>
          <Headline>
            <E p={p} path="info.heroWord" value={t.info.heroWord} fill={false} s={0.07} />
          </Headline>
          <p className="mt-6 text-base leading-relaxed text-paper/80 sm:text-lg">
            <Editable path="info.intro" raw={intro} on={p.on}>
              <Letters text={p.f(intro)} d={T} s={0.0035} />
            </Editable>
          </p>
          <div className="mt-8">
            <span className="in-pop inline-flex" style={dv(1.05)}>
              <SlantButton tone="balkan" href={DISCORD_URL}>
                {t.common.discord}
              </SlantButton>
            </span>
          </div>
        </Tile>
        <Hosts p={p} d={0.65} />

        <Tile className="lg:col-span-8 lg:row-span-2" d={0.25}>
          <Title>
            <E p={p} path="info.general" value={t.info.general} />
          </Title>
          <Ledger path="info.generalItems" items={t.info.generalItems} p={p} />
        </Tile>
        <Art src="/info/tiles/ink/flower.png" className="aspect-[4/3] lg:col-span-4 lg:aspect-auto" d={0.45} />
        <Art src="/info/tiles/ink/sun-peak.png" className="aspect-[4/3] lg:col-span-4 lg:aspect-auto" position="60% 40%" d={0.6} />

        <Tile className="lg:col-span-5" d={0.9}>
          <Title>
            <E p={p} path="info.regTitle" value={t.info.regTitle} />
          </Title>
          <Ledger path="info.regItems" items={t.info.regItems} p={p} />
        </Tile>
        <Art src="/info/tiles/ink/checker-wire.png" className="hidden lg:col-span-2 lg:block" d={1} />
        <Tile className="lg:col-span-5" d={1.1}>
          <Title>
            <E p={p} path="info.qualTitle" value={t.info.qualTitle} />
          </Title>
          <Ledger path="info.qualItems" items={t.info.qualItems} p={p} />
        </Tile>

        <Tile className="lg:col-span-9" d={1.2}>
          <Title>
            <E p={p} path="info.structure" value={t.info.structure} />
          </Title>
          <StageTable p={p} />
        </Tile>
        <Art src="/info/tiles/ink/peak-road.png" className="hidden lg:col-span-3 lg:block" position="50% 30%" d={1.3} />

        <Tile className="lg:col-span-5" d={1.4}>
          <Title>
            <E p={p} path="info.prizes" value={t.info.prizes} />
          </Title>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-5">
            {[1, 0, 2].map((i, k) => (
              <Prize key={i} p={p} i={i} d={1.6 + k * 0.12} />
            ))}
          </div>
        </Tile>
        <Tile className="lg:col-span-7" d={1.5}>
          <Title>
            <E p={p} path="info.procedure" value={t.info.procedure} fill={false} />
          </Title>
          <Ledger path="info.procItems" items={t.info.procItems} p={p} plain locked={[3]} />
        </Tile>
      </Sheet>
    </div>
  );
}

function Facts({ p }: { p: FolkProps }) {
  return (
    <dl className="grid grid-cols-1 gap-x-12 sm:grid-cols-2">
      {p.t.info.facts.map(([k0, v0], i) => {
        const k = p.raw(`info.facts.${i}.0`, k0);
        const v = p.raw(`info.facts.${i}.1`, v0);
        return (
          <div key={i} className="border-b border-dashed border-paper/10 py-4">
            <dt className="flex items-center gap-2.5 text-[0.65rem] font-display font-bold text-ash">
              <Stitch />
              <Editable path={`info.facts.${i}.0`} raw={k} on={p.on}>
                <Letters text={k} d={T} />
              </Editable>
            </dt>
            <dd className="heading-slam mt-2 text-xl normal-case xl:text-2xl">
              <Editable path={`info.facts.${i}.1`} raw={v} on={p.on}>
                <Letters text={p.f(v)} d={T} s={0.025} />
              </Editable>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export function CondensedFolk(p: FolkProps) {
  const { t } = p;
  return (
    <div className="pb-10">
      <Sheet>
        <Tile className="flex flex-col justify-center border-t-0 lg:col-span-6 xl:py-16" d={0.05}>
          <Headline>
            <E p={p} path="info.shortWord" value={t.info.shortWord} fill={false} s={0.07} />
          </Headline>
          <div className="mt-8">
            <span className="in-pop inline-flex" style={dv(0.85)}>
              <SlantButton tone="balkan" href={DISCORD_URL}>
                {t.common.discord}
              </SlantButton>
            </span>
          </div>
        </Tile>
        <Hosts p={p} compact d={0.45} />

        <Art src="/info/tiles/ink/flower.png" className="aspect-[4/3] lg:col-span-4 lg:aspect-auto" d={0.3} />
        <Tile className="lg:col-span-8 lg:row-span-2 lg:pl-4" d={0.2}>
          <Facts p={p} />
        </Tile>
        <Art src="/info/tiles/ink/sun-peak.png" className="aspect-[4/3] lg:col-span-4 lg:aspect-auto" position="60% 40%" d={0.5} />

        <Tile className="lg:col-span-9" d={1}>
          <StageTable p={p} />
        </Tile>
        <Art src="/info/tiles/ink/peak-road.png" className="hidden lg:col-span-3 lg:block" position="50% 30%" d={1.1} />

        <Tile className="lg:col-span-12" d={1.2}>
          <div className="flex flex-col gap-8 sm:flex-row sm:justify-center sm:gap-20 xl:gap-32">
            {[1, 0, 2].map((i, k) => (
              <Prize key={i} p={p} i={i} d={1.35 + k * 0.12} />
            ))}
          </div>
        </Tile>
      </Sheet>
    </div>
  );
}