import { Container, PageTitle, SectionHeading, Tag } from "@/components/site/page";
import { Letters, Words } from "@/components/site/rich";
import { InView } from "@/components/site/in-view";
import { getDict, getLang } from "@/lib/i18n/server";
import { requireSection } from "@/lib/authz";
import { currentOsuId } from "@/auth";
import { getLobbies } from "@/db/lobbies";
import { getRegistration } from "@/db/registrations";
import { getSettings } from "@/db/settings";
import { fmtSofia, fmtSofiaDay, fmtSofiaTime, windowState } from "@/lib/time";
import { cn } from "@/lib/utils";
import { LobbyButton } from "./lobby-button";
import { meP } from "@/components/site/me";

export default async function Lobbies() {
  await requireSection("lobbies");
  const [t, lang, lobbies, settings, osuId] = await Promise.all([getDict(), getLang(), getLobbies(), getSettings(), currentOsuId()]);
  const locale = lang === "bg" ? "bg-BG" : "en-GB";
  const status = osuId ? await getRegistration(osuId) : null;
  const state = windowState(settings.bookingOpensAt, settings.bookingClosesAt);
  const mineId = osuId ? (lobbies.find((l) => l.players.some((p) => p.osuId === osuId))?.id ?? null) : null;
  const canBook = state === "open" && status === "approved";
  const fmt = (d: Date | null) => (d ? `${fmtSofia(d, locale)} EET` : "");

  const byDay = new Map<string, typeof lobbies>();
  for (const l of lobbies) {
    const day = fmtSofiaDay(l.startsAt, locale);
    byDay.set(day, [...(byDay.get(day) ?? []), l]);
  }

  const tag =
    state === "open" ? (
      <Tag tone="balkan" className="text-xs">{t.qual.bookingOpen(fmt(settings.bookingClosesAt))}</Tag>
    ) : state === "soon" ? (
      <Tag tone="paper" className="text-xs">{t.qual.bookingSoon(fmt(settings.bookingOpensAt))}</Tag>
    ) : (
      <Tag tone="rose" className="text-xs">{t.qual.bookingClosed}</Tag>
    );
  const hint = !osuId ? t.qual.hintLogin : status !== "approved" ? t.qual.hintApproved : state === "open" ? (mineId ? t.qual.hintSwitch : t.qual.hintPick) : null;

  return (
    <Container plain>
      <PageTitle mark="streaks" right={tag}>{t.qual.title}</PageTitle>
      {hint && (
        <p className="-mt-4 mb-8 text-sm text-ash">
          <Words text={hint} d={0.2} s={0.025} />
        </p>
      )}
      {lobbies.length === 0 && <p className="py-10 text-center text-ash">{t.qual.noLobbies}</p>}
      {[...byDay.entries()].map(([day, list]) => (
        <InView as="section" key={day} className="mt-12 first-of-type:mt-0">
          <SectionHeading>{day}</SectionHeading>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {list.map((l, n) => {
              const mine = l.id === mineId;
              const full = l.players.length >= l.capacity;
              const base = 0.1 + n * 0.12;
              const faces = base + 0.35 + l.name.length * 0.035;
              const dv = (d: number) => ({ "--d": `${d}s` }) as React.CSSProperties;
              return (
                <article key={l.id} style={dv(base)} className={cn("in-up lift group flex border bg-coal", mine ? "border-balkan [--lift:var(--color-balkan)]" : "border-line hover:border-rose/60")}>
                  <div style={dv(base + 0.1)} className={cn("in-drop flex w-24 shrink-0 flex-col items-center justify-center py-4 text-white sm:w-28", mine ? "bg-balkan text-ink" : "bg-rose")}>
                    <span className="in-pop num text-4xl leading-none" style={dv(base + 0.25)}>{fmtSofiaTime(l.startsAt)}</span>
                    <span className="mt-1 text-[0.65rem] font-black uppercase tracking-[0.14em]">{t.common.eet}</span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 border-l-2 border-dashed border-ink px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="heading-slam min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-2xl">
                        <Letters text={l.name} d={base + 0.3} />
                      </h3>
                      <span className={cn("in-pop num shrink-0 text-sm", full ? "text-rose-hi" : "text-ash")} style={dv(faces)}>
                        {l.players.length}/{l.capacity}
                      </span>
                    </div>
                    <div className="flex min-h-8 -space-x-2">
                      {l.players.slice(0, 8).map((p, k) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={p.osuId} {...meP(p.osuId)} src={p.avatarUrl ?? ""} alt={p.username} title={p.username} style={{ "--i": k, "--s": "0.09s", "--d": `${faces}s` } as React.CSSProperties} className="me-av in-pop size-8 rounded-full border-2 border-coal object-cover transition-transform duration-300 hover:z-10 hover:-translate-y-1 hover:scale-110" />
                      ))}
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <div className="text-xs font-bold uppercase text-ash">
                        {mine && <span className="mr-2 text-balkan">{t.qual.yours}</span>}
                        {l.referee && t.qual.refereeBy(l.referee)}
                      </div>
                      {canBook && (
                        <span className="in-right" style={dv(faces + 0.2)}>
                          <LobbyButton lobbyId={l.id} mine={mine} full={full} hasBooking={mineId !== null} />
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </InView>
      ))}
    </Container>
  );
}
