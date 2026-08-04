import { Container, SectionHeading, SlantButton } from "@/components/site/page";

const R = ({ children }: { children: React.ReactNode }) => <strong className="font-bold text-rose-hi">{children}</strong>;
const G = ({ children }: { children: React.ReactNode }) => <strong className="font-bold text-balkan">{children}</strong>;

function List({ children }: { children: React.ReactNode }) {
  return <ul className="ml-5 list-disc space-y-2 text-[0.97rem] leading-relaxed marker:text-rose-hi">{children}</ul>;
}

const FORMAT = [
  { stage: "Qualifiers", format: "11 maps, played once", when: "28–29 Nov" },
  { stage: "Quarterfinals", format: "Best of 9 · 1 ban", when: "5–6 Dec" },
  { stage: "Semifinals", format: "Best of 11 · 2 bans", when: "12–13 Dec" },
  { stage: "Finals", format: "Best of 11 · 2 bans", when: "19–20 Dec" },
  { stage: "Grand finals", format: "Best of 13 · 2 bans", when: "27 Dec" },
];

export default function InfoPage() {
  return (
    <Container className="max-w-5xl">
      <div className="border border-line bg-coal px-6 py-8 sm:px-10">
        <p className="mx-auto max-w-3xl text-center leading-relaxed text-paper/90">
          BGCC7 is the seventh Bulgarian Community Cup, a 3v3 team tournament open to players of any rank from Bulgaria.
          The top eight teams out of qualifiers go into a double elimination bracket, and we stream every match with
          Bulgarian commentary.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <SlantButton tone="rose" className="justify-center">Donate to the prize pool</SlantButton>
          <SlantButton tone="balkan" className="justify-center">Join the Discord</SlantButton>
        </div>

        <SectionHeading>General information</SectionHeading>
        <List>
          <li>BGCC7 is a <R>3v3</R>, <R>open rank</R> tournament for players with <G>Bulgaria</G> as their osu! country</li>
          <li>Teams register with <R>3 or 4 players</R>, and three of them play each map</li>
          <li>All matches use <R>Team VS</R> and <R>ScoreV2</R></li>
          <li>All times are in <R>EET (UTC+2)</R></li>
          <li>Matches are played between <R>Saturday 12:00</R> and <R>Sunday 23:00 EET</R> of their week</li>
          <li>Reschedules must be requested before <R>Thursday 23:59 EET</R> of that week</li>
          <li>
            Staff who also play are limited to roles with no influence on results, and every such case is disclosed to
            the osu! tournament committee
          </li>
        </List>

        <SectionHeading>Prizes</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { place: "1st", color: "bg-[#e8c547]", reward: "60% of the prize pool", extra: "Winner profile badge (pending approval)" },
            { place: "2nd", color: "bg-[#c9ccd1]", reward: "30% of the prize pool", extra: "Custom forum title" },
            { place: "3rd", color: "bg-[#c98a4b]", reward: "10% of the prize pool", extra: "Custom forum title" },
          ].map((p) => (
            <div key={p.place} className="bg-paper text-ink">
              <div className={`h-1.5 ${p.color}`} />
              <div className="p-4">
                <div className="heading-slam text-4xl">{p.place}</div>
                <div className="mt-2 font-bold">{p.reward}</div>
                <div className="text-sm text-ink/60">{p.extra}</div>
              </div>
            </div>
          ))}
        </div>

        <SectionHeading>Registration & screening</SectionHeading>
        <List>
          <li>Registrations run from <R>2 Nov</R> to <R>22 Nov at 23:59 EET</R></li>
          <li>The captain registers the team by logging in with osu!, then teammates accept the invite from their own accounts</li>
          <li>The host team <R>screens</R> every player before qualifiers. If a player gets screened out, we remove them and tell their team</li>
          <li>Rosters <R>lock</R> once a team plays its qualifier lobby</li>
        </List>

        <SectionHeading>Qualifiers</SectionHeading>
        <List>
          <li>Teams sign up for a qualifier lobby run by a referee</li>
          <li>The pool has <R>11 maps</R> (<R>4 NM / 2 HD / 2 HR / 3 DT</R>), each played <R>once</R></li>
          <li>Seeding uses the sum of each team&apos;s <G>per-map percentile</G> across all maps</li>
          <li>The top <R>8 teams</R> qualify and go into the upper bracket by seed</li>
        </List>

        <SectionHeading>Tournament structure</SectionHeading>
        <div className="overflow-hidden border border-line">
          {FORMAT.map((f, i) => (
            <div key={f.stage} className={`grid grid-cols-[1.2fr_1.5fr_1fr] items-center px-4 py-3 ${i % 2 ? "bg-slate/60" : ""}`}>
              <span className="font-black uppercase">{f.stage}</span>
              <span className="text-paper/80">{f.format}</span>
              <span className="num text-right text-lg text-rose-hi">{f.when}</span>
            </div>
          ))}
        </div>

        <SectionHeading>Match procedure</SectionHeading>
        <List>
          <li>Each team gets <R>one warmup</R> under 4 minutes</li>
          <li>Captains roll, and the winner decides whether to pick or ban first</li>
          <li>The <R>tiebreaker</R> is played only when both teams reach match point</li>
          <li>A player who disconnects in the first <R>30 seconds</R> may replay the map once per match</li>
          <li>Referee calls during a match are final. Anything you want to dispute afterwards goes to the host team</li>
        </List>

        <div className="mt-12 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-[0.3em] text-ash">
          Last updated 28 Sep 2026
        </div>
      </div>
    </Container>
  );
}
