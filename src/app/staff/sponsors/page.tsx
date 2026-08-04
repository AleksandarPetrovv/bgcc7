import { Container, PageTitle, SlantButton } from "@/components/site/page";
import { Shevitsa } from "@/components/site/graphics";
import { staff } from "@/lib/data";

export default function Sponsors() {
  return (
    <Container className="max-w-5xl">
      <PageTitle>Sponsors</PageTitle>
      <div className="grid gap-5 sm:grid-cols-2">
        {staff.sponsors.map((s, i) => (
          <div key={s.username} className="flex items-center gap-5 border border-line bg-coal p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.avatar} alt="" className="size-20" />
            <div>
              <div className="font-display text-2xl font-bold lowercase">{s.username}</div>
              <div className="text-sm text-ash">Prize pool donor</div>
            </div>
            <span className={`num ml-auto text-4xl ${i % 2 ? "text-balkan" : "text-rose"}`}>#{i + 1}</span>
          </div>
        ))}
      </div>
      <div className="mt-10 flex flex-col items-center gap-4 bg-paper p-8 text-center text-ink">
        <Shevitsa size={32} />
        <div className="heading-slam text-3xl">Back the cup</div>
        <p className="max-w-md text-sm text-ink/70">Every donation goes straight into the prize pool. Donors are listed here and thanked on stream.</p>
        <SlantButton tone="rose">Donate to the prize pool</SlantButton>
      </div>
    </Container>
  );
}
