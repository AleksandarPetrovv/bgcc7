import { Container, PageTitle, Tag } from "@/components/site/page";
import { SpeedLines, SpeedMark, Tricolor, Wordmark } from "@/components/site/graphics";
import { getDict } from "@/lib/i18n/server";
import { stages, teams, MODS } from "@/lib/data";

function Frame({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-black uppercase">{title}</span>
        <span className="text-xs text-ash">{note}</span>
      </div>
      <div className="relative aspect-video overflow-hidden border border-line bg-ink">{children}</div>
    </div>
  );
}

export default async function Overlays() {
  const d = await getDict();
  const [a, b] = [teams[0], teams[4]];
  const map = stages[2].pools[2].maps[0];
  return (
    <Container className="max-w-[1400px]">
      <PageTitle right={<Tag tone="balkan" className="text-xs">{d.streams.sources}</Tag>}>{d.streams.overlays}</PageTitle>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Frame title={d.streams.gameplay} note={d.streams.gameplayNote}>
          <div className="absolute inset-x-0 top-0 flex h-[16%] items-stretch bg-ink">
            <div className="flex flex-1 items-center gap-3 bg-rose px-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.image} alt="" className="size-10 object-cover" />
              <span className="truncate text-lg font-black">{a.name}</span>
              <span className="ml-auto flex gap-1">
                {[1, 1, 1, 0, 0].map((f, i) => <span key={i} className={`size-3 rotate-45 ${f ? "bg-white" : "border border-white/60"}`} />)}
              </span>
            </div>
            <div className="flex w-[22%] flex-col items-center justify-center">
              <Wordmark size="sm" />
              <span className="num text-xs text-ash">{d.rounds.Semifinals} · BO11</span>
            </div>
            <div className="flex flex-1 flex-row-reverse items-center gap-3 bg-balkan px-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.image} alt="" className="size-10 object-cover" />
              <span className="truncate text-lg font-black">{b.name}</span>
              <span className="mr-auto flex gap-1">
                {[1, 1, 0, 0, 0].map((f, i) => <span key={i} className={`size-3 rotate-45 ${f ? "bg-white" : "border border-white/60"}`} />)}
              </span>
            </div>
          </div>
          <div className="num absolute inset-x-0 top-[16%] flex justify-between px-6 pt-2 text-3xl">
            <span>842,113</span>
            <span className="text-rose-hi">+ 64,020</span>
            <span>778,093</span>
          </div>
          <div className="absolute inset-x-[12%] top-[34%] bottom-[18%] border border-dashed border-line" />
          <div className="absolute inset-x-0 bottom-0 flex h-[14%] items-center gap-4 bg-ink/90 px-4">
            <span className="heading-slam text-2xl" style={{ color: MODS.HardRock.color }}>HR1</span>
            <span className="truncate font-black">{map.title} [{map.version}]</span>
            <span className="num ml-auto text-lg">{map.sr.toFixed(2)}★ · {Math.round(map.bpm)} BPM</span>
          </div>
        </Frame>

        <Frame title={d.streams.versus} note={d.streams.versusNote}>
          <div className="absolute inset-0 grid grid-cols-2">
            {[a, b].map((t, i) => (
              <div key={t.id} className={`relative flex flex-col items-center justify-center gap-3 ${i ? "bg-balkan" : "bg-rose"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.image} alt="" className="size-24 border-4 border-white object-cover" />
                <span className="heading-slam max-w-[90%] text-center text-2xl text-white">{t.name}</span>
                <span className="num text-sm text-white/80">{d.common.seed} {t.seed}</span>
              </div>
            ))}
          </div>
          <div className="absolute left-1/2 top-1/2 flex size-20 -translate-x-1/2 -translate-y-1/2 -skew-x-12 items-center justify-center bg-ink">
            <span className="heading-slam skew-x-12 text-4xl">VS</span>
          </div>
          <Tricolor className="absolute inset-x-0 bottom-0 h-2" vertical />
        </Frame>

        <Frame title={d.streams.soon} note={d.streams.soonNote}>
          <SpeedLines className="absolute inset-x-0 top-1/3 h-28 w-full text-paper/15" count={16} />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <SpeedMark className="h-14 w-40" />
              <Wordmark size="md" className="text-6xl" />
            </div>
            <span className="heading-slam text-3xl text-rose-hi">{d.streams.soon}</span>
            <span className="num text-5xl">04:59</span>
          </div>
        </Frame>

        <Frame title={d.streams.showcase} note={d.streams.showcaseNote}>
          <div className="absolute inset-0 grid grid-cols-2 gap-1.5 p-4">
            {stages[2].pools.flatMap((p) => p.maps.map((m) => ({ ...m, color: MODS[p.category].color }))).slice(0, 10).map((m) => (
              <div key={m.slot} className="relative flex items-center overflow-hidden bg-coal">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.cover} alt="" className="absolute inset-0 size-full object-cover opacity-30" />
                <span className="heading-slam relative w-12 text-center text-base" style={{ color: m.color }}>{m.slot}</span>
                <span className="relative truncate pr-2 text-xs font-bold">{m.title}</span>
              </div>
            ))}
          </div>
        </Frame>
      </div>
    </Container>
  );
}
