import Image from "next/image";
import { Star } from "lucide-react";
import { SlantButton } from "@/components/site/page";
import { Rich, Words } from "@/components/site/rich";
import type { Dict } from "@/lib/i18n/dict";
import { DISCORD_URL } from "@/lib/links";
import { fmtRange, sofiaDate } from "@/lib/dates";
import { weekOf } from "@/lib/schedule";
import { roundStats, type Plan } from "@/lib/format-plan";
import type { Match } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Editable } from "./editable";
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
};

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

function Tile({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("relative border-t border-dashed border-paper/10 py-9 lg:py-12", className)}>{children}</section>;
}

const SOFT = "radial-gradient(ellipse 70% 72% at 50% 50%, black 52%, transparent 100%)";

function Art({ src, className, position = "center" }: { src: string; className?: string; position?: string }) {
  return (
    <div className={cn("relative min-h-64", className)} style={{ maskImage: SOFT, WebkitMaskImage: SOFT }} aria-hidden>
      <Image src={src} alt="" fill sizes="(min-width: 1024px) 34vw, 100vw" className="object-cover opacity-90" style={{ objectPosition: position }} />
    </div>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return <h2 className="heading-slam mb-5 text-[clamp(1.5rem,4.5vw,2.25rem)] leading-[1.05]">{children}</h2>;
}

function Stitch() {
  return <span className="mt-[0.7em] block h-[2px] w-2.5 shrink-0 bg-rose" aria-hidden />;
}

function Ledger({ path, items, p, plain }: { path: string; items: string[]; p: FolkProps; plain?: boolean }) {
  return (
    <ul className="divide-y divide-dashed divide-paper/10">
      {items.map((item, i) => {
        const text = p.raw(`${path}.${i}`, item);
        return (
          <li key={i} className="flex gap-3.5 py-2.5 text-[0.97rem] leading-relaxed text-paper/75 first:pt-0 last:pb-0">
            <Stitch />
            <span className="min-w-0">
              <Editable path={`${path}.${i}`} raw={text} on={p.on}>
                <Rich text={plain ? text : p.f(text)} plain />
              </Editable>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function E({ p, path, value, fill = true }: { p: FolkProps; path: string; value: string; fill?: boolean }) {
  const text = p.raw(path, value);
  return (
    <Editable path={path} raw={text} on={p.on}>
      {fill ? p.f(text) : text}
    </Editable>
  );
}

function stageRows(p: FolkProps) {
  return p.plan.rounds.map((r) => {
    const s = roundStats(r);
    const days = p.matches.filter((m) => m.stage === r.slug && m.datetime).map((m) => sofiaDate(new Date(m.datetime!))).sort();
    const wk = weekOf(p.weeks?.[r.slug]);
    if (!days.length && wk) days.push(wk.min.slice(0, 10), wk.max.slice(0, 10));
    return {
      slug: r.slug,
      name: p.t.rounds[r.name] ?? r.name,
      when: days.length ? fmtRange(p.locale, days[0], days.at(-1)!) : "",
      sr: r.sr ?? null,
      mods: [...(Object.entries(s.tally) as [string, number][]).filter(([, n]) => n > 0), ["TB", 1] as [string, number]],
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
        <span>{p.t.info.stageCol}</span>
        <span>{p.t.info.datesCol}</span>
        <span>SR</span>
        <span>{p.t.info.poolCol}</span>
        <span className="text-right">BO</span>
        <span className="text-right">{p.t.info.bansCol}</span>
      </div>
      {rows.map((r) => (
        <div key={r.slug} className={cn("grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-b border-dashed border-paper/10 py-3.5 last:border-b-0 last:pb-0", COLS)}>
          <span className="heading-slam text-lg leading-none md:text-xl">{r.name}</span>
          <span className="num text-right text-sm text-paper/70 md:text-left md:text-base">{r.when || "TBA"}</span>
          <span className={cn("num flex items-center gap-1 text-base md:text-lg", r.sr ? "text-gold-hi" : "text-ash")}>
            <Star className="size-3.5 fill-current" />
            {r.sr ?? "TBA"}
          </span>
          <span className="col-span-2 flex flex-wrap gap-1.5 md:col-span-1">
            {r.mods.map(([mod, n]) => (
              <span key={mod} className="num -skew-x-12 border px-1.5 py-0.5 text-xs font-display font-black leading-none" style={{ background: MOD_HEX[mod], borderColor: MOD_HEX[mod], color: mod === "HD" ? "var(--on-fill)" : "var(--white)" }}>
                <span className="inline-block skew-x-12">
                  {n} {mod}
                </span>
              </span>
            ))}
          </span>
          <span className="num text-base md:text-right md:text-lg">
            <span className="mr-1 text-ash md:hidden">BO</span>
            {r.bo}
          </span>
          <span className="num text-right text-sm text-paper/70 md:text-base">{p.t.info.bansN(r.bans)}</span>
        </div>
      ))}
    </div>
  );
}

function Hosts({ p, compact }: { p: FolkProps; compact?: boolean }) {
  const hosts = p.hosts ?? [];
  if (!hosts.length) return <div className="hidden lg:col-span-6 lg:block" aria-hidden />;
  return (
    <div className={cn("flex items-center border-t border-dashed border-paper/10 py-9 lg:col-span-6 lg:border-l lg:border-t-0 lg:pl-12", compact ? "lg:py-10" : "lg:py-12")}>
      <div className={cn("mx-auto grid w-full grid-cols-2 gap-6 sm:gap-10", compact && "lg:max-w-md")}>
        {hosts.slice(0, 2).map((h, i) => (
          <a key={h.osuId} href={osuUser(h.osuId)} target="_blank" rel="noreferrer" className="group flex min-w-0 flex-col">
            <span className="relative aspect-square overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={h.avatarUrl ?? ""} alt="" className="absolute inset-0 size-full object-cover grayscale-[.3] transition duration-500 group-hover:scale-[1.03] group-hover:grayscale-0" />
              <span className="absolute inset-0 bg-gradient-to-t from-well/45 via-transparent to-transparent" aria-hidden />
              <span className={cn("absolute inset-x-0 top-0 h-1", i === 0 ? "bg-rose" : "bg-balkan")} aria-hidden />
            </span>
            <span className="mt-4 block truncate font-display text-[clamp(1.4rem,2vw,2.4rem)] font-black leading-none tracking-[-0.03em] text-paper transition-colors group-hover:text-rose-hi">{h.username}</span>
            <span className="mt-2 block text-xs font-display font-bold text-ash">{p.t.info.hostRoles[Math.min(i, 1)]}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function Prize({ p, i, small }: { p: FolkProps; i: number; small?: boolean }) {
  const row = p.t.info.prizeRows[i];
  return (
    <div className={cn("flex gap-4", small ? "items-center" : "items-center sm:flex-col sm:items-start", i === 0 && "max-sm:order-first")}>
      <FolkStar points={i + 1} className={cn("shrink-0", PLACE[i], small ? "size-12" : "size-20 sm:size-32")} />
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
        <Tile className="border-t-0 lg:col-span-6 xl:py-16">
          <Headline>
            <E p={p} path="info.heroWord" value={t.info.heroWord} fill={false} />
          </Headline>
          <p className="mt-6 text-base leading-relaxed text-paper/80 sm:text-lg">
            <Editable path="info.intro" raw={intro} on={p.on}>
              <Words text={p.f(intro)} d={0.2} s={0.012} />
            </Editable>
          </p>
          <div className="mt-8">
            <SlantButton tone="balkan" href={DISCORD_URL}>
              {t.common.discord}
            </SlantButton>
          </div>
        </Tile>
        <Hosts p={p} />

        <Tile className="lg:col-span-8 lg:row-span-2">
          <Title>
            <E p={p} path="info.general" value={t.info.general} />
          </Title>
          <Ledger path="info.generalItems" items={t.info.generalItems} p={p} />
        </Tile>
        <Art src="/info/tiles/ink/flower.png" className="aspect-[4/3] lg:col-span-4 lg:aspect-auto" />
        <Art src="/info/tiles/ink/sun-peak.png" className="aspect-[4/3] lg:col-span-4 lg:aspect-auto" position="60% 40%" />

        <Tile className="lg:col-span-5">
          <Title>
            <E p={p} path="info.regTitle" value={t.info.regTitle} />
          </Title>
          <Ledger path="info.regItems" items={t.info.regItems} p={p} />
        </Tile>
        <Art src="/info/tiles/ink/checker-wire.png" className="hidden lg:col-span-2 lg:block" />
        <Tile className="lg:col-span-5">
          <Title>
            <E p={p} path="info.qualTitle" value={t.info.qualTitle} />
          </Title>
          <Ledger path="info.qualItems" items={t.info.qualItems} p={p} />
        </Tile>

        <Tile className="lg:col-span-9">
          <Title>
            <E p={p} path="info.structure" value={t.info.structure} />
          </Title>
          <StageTable p={p} />
        </Tile>
        <Art src="/info/tiles/ink/peak-road.png" className="hidden lg:col-span-3 lg:block" position="50% 30%" />

        <Tile className="lg:col-span-5">
          <Title>
            <E p={p} path="info.prizes" value={t.info.prizes} />
          </Title>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-5">
            {[1, 0, 2].map((i) => (
              <Prize key={i} p={p} i={i} />
            ))}
          </div>
        </Tile>
        <Tile className="lg:col-span-7">
          <Title>
            <E p={p} path="info.procedure" value={t.info.procedure} fill={false} />
          </Title>
          <Ledger path="info.procItems" items={t.info.procItems} p={p} plain />
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
                {k}
              </Editable>
            </dt>
            <dd className="heading-slam mt-2 text-xl normal-case xl:text-2xl">
              <Editable path={`info.facts.${i}.1`} raw={v} on={p.on}>
                {p.f(v)}
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
        <Tile className="flex flex-col justify-center border-t-0 lg:col-span-6 xl:py-16">
          <Headline>
            <E p={p} path="info.shortWord" value={t.info.shortWord} fill={false} />
          </Headline>
          <div className="mt-8">
            <SlantButton tone="balkan" href={DISCORD_URL}>
              {t.common.discord}
            </SlantButton>
          </div>
        </Tile>
        <Hosts p={p} compact />

        <Art src="/info/tiles/ink/flower.png" className="aspect-[4/3] lg:col-span-4 lg:aspect-auto" />
        <Tile className="lg:col-span-8 lg:row-span-2 lg:pl-4">
          <Facts p={p} />
        </Tile>
        <Art src="/info/tiles/ink/sun-peak.png" className="aspect-[4/3] lg:col-span-4 lg:aspect-auto" position="60% 40%" />

        <Tile className="lg:col-span-9">
          <StageTable p={p} />
        </Tile>
        <Art src="/info/tiles/ink/peak-road.png" className="hidden lg:col-span-3 lg:block" position="50% 30%" />

        <Tile className="lg:col-span-12">
          <div className="flex flex-col gap-8 sm:flex-row sm:justify-center sm:gap-20 xl:gap-32">
            {[1, 0, 2].map((i) => (
              <Prize key={i} p={p} i={i} />
            ))}
          </div>
        </Tile>
      </Sheet>
    </div>
  );
}