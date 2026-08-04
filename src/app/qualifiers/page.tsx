import { Container, PageTitle, SectionHeading, Tag } from "@/components/site/page";
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
      {[...byDay.entries()].map(([day, lobbies]) => (
        <section key={day} className="mt-12 first-of-type:mt-0">
          <SectionHeading>{day}</SectionHeading>
          <div className="grid gap-4 md:grid-cols-2">
            {lobbies.map((l) => (
              <article key={l.name} className="group relative flex bg-paper text-ink">
                <div className="flex w-24 shrink-0 flex-col items-center justify-center bg-rose py-4 text-white sm:w-28">
                  <span className="num text-4xl leading-none">{l.slot.split(" · ")[1]}</span>
                  <span className="mt-1 text-[0.65rem] font-black uppercase tracking-widest">EET</span>
                </div>
                <span className="w-0 border-l-2 border-dashed border-ink/25" aria-hidden />
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="heading-slam text-2xl">{l.name}</h3>
                    <span className="num text-sm text-ink/70">{l.players.length} players</span>
                  </div>
                  <div className="flex -space-x-2">
                    {l.players.slice(0, 7).map((p) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={p.id} src={p.avatar} alt="" className="size-8 border-2 border-paper object-cover grayscale transition group-hover:grayscale-0" />
                    ))}
                  </div>
                  <div className="text-xs font-bold uppercase text-ink/70">Referee: {l.referee}</div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </Container>
  );
}
