import { Container, PageTitle, Tag } from "@/components/site/page";
import { qualifierLobbies } from "@/lib/data";

export default function Lobbies() {
  const byDay = new Map<string, typeof qualifierLobbies>();
  for (const l of qualifierLobbies) {
    const day = l.slot.split(" · ")[0];
    byDay.set(day, [...(byDay.get(day) ?? []), l]);
  }
  return (
    <Container className="max-w-5xl">
      <PageTitle right={<Tag tone="balkan" className="text-xs">Lobby booking opens 23 Nov</Tag>}>Qualifiers</PageTitle>
      <div className="space-y-5">
        {[...byDay.entries()].map(([day, lobbies]) => (
          <section key={day}>
            <h2 className="heading-slam bg-rose px-5 py-2.5 text-3xl text-ink">{day}</h2>
            <div className="mt-4 space-y-3">
              {lobbies.map((l) => (
                <div key={l.name} className="group grid grid-cols-[88px_1fr] items-stretch sm:grid-cols-[110px_220px_1fr]">
                  <div className="flex flex-col items-center justify-center">
                    <span className="num text-4xl leading-none">{l.slot.split(" · ")[1]}</span>
                    <span className="text-[0.6rem] font-black uppercase text-rose">EET</span>
                  </div>
                  <div className="hidden overflow-hidden sm:flex">
                    {l.players.slice(0, 4).map((p) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={p.id} src={p.avatar} alt="" className="h-[76px] w-[55px] object-cover grayscale transition group-hover:grayscale-0" />
                    ))}
                  </div>
                  <div className="flex items-center gap-5 bg-gradient-to-r from-rose via-rose/60 to-transparent px-6 py-3 sm:max-w-xl">
                    <div>
                      <div className="text-2xl font-black">{l.name}</div>
                      <div className="text-xs font-bold uppercase text-white/80">
                        Referee · {l.referee} &nbsp;/&nbsp; {l.players.length} players
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Container>
  );
}
