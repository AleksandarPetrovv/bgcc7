import { Container, PageTitle } from "@/components/site/page";

const FACTS = [
  ["Format", "3v3 Team VS · ScoreV2"],
  ["Eligibility", "Bulgaria, open rank"],
  ["Team size", "3 – 4 players"],
  ["Teams", "8 qualify"],
  ["Bracket", "Double elimination"],
  ["Time zone", "EET (UTC+2)"],
  ["Registrations", "2 – 22 Nov"],
  ["Qualifiers", "28 – 29 Nov"],
  ["Grand finals", "27 Dec"],
];

export default function Condensed() {
  return (
    <Container className="max-w-5xl">
      <PageTitle>Condensed info</PageTitle>
      <div className="grid gap-px bg-line sm:grid-cols-3">
        {FACTS.map(([k, v]) => (
          <div key={k} className="bg-ink p-5">
            <div className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-rose">{k}</div>
            <div className="heading-slam mt-2 text-2xl normal-case">{v}</div>
          </div>
        ))}
      </div>
    </Container>
  );
}
