import { Container, PageTitle, SectionHeading, Tag } from "@/components/site/page";
import { getDict, getLang } from "@/lib/i18n/server";
import { requireSection } from "@/lib/authz";
import { currentOsuId } from "@/auth";
import { getLobbies } from "@/db/lobbies";
import { getRegistration } from "@/db/registrations";
import { getSettings } from "@/db/settings";
import { fmtSofia, fmtSofiaDay, fmtSofiaTime, windowState } from "@/lib/time";
import { cn } from "@/lib/utils";
import { LobbyButton } from "./lobby-button";

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
    <Container className="max-w-5xl">
      <PageTitle right={tag}>{t.qual.title}</PageTitle>
      {hint && <p className="-mt-4 mb-8 text-sm text-ash">{hint}</p>}
      {lobbies.length === 0 && <p className="py-10 text-center text-ash">{t.qual.noLobbies}</p>}
      {[...byDay.entries()].map(([day, list]) => (
        <section key={day} className="mt-12 first-of-type:mt-0">
          <SectionHeading>{day}</SectionHeading>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {list.map((l) => {
              const mine = l.id === mineId;
              const full = l.players.length >= l.capacity;
              return (
                <article key={l.id} className={cn("group flex border bg-coal transition-colors", mine ? "border-balkan" : "border-line hover:border-rose/60")}>
                  <div className={cn("flex w-24 shrink-0 flex-col items-center justify-center py-4 text-white sm:w-28", mine ? "bg-balkan text-ink" : "bg-rose")}>
                    <span className="num text-4xl leading-none">{fmtSofiaTime(l.startsAt)}</span>
                    <span className="mt-1 text-[0.65rem] font-black uppercase tracking-widest">{t.common.eet}</span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 border-l-2 border-dashed border-ink px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="heading-slam truncate text-2xl">{l.name}</h3>
                      <span className={cn("num shrink-0 text-sm", full ? "text-rose-hi" : "text-ash")}>
                        {l.players.length}/{l.capacity}
                      </span>
                    </div>
                    <div className="flex min-h-8 -space-x-2">
                      {l.players.slice(0, 8).map((p) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={p.osuId} src={p.avatarUrl ?? ""} alt={p.username} title={p.username} className="size-8 border-2 border-coal object-cover" />
                      ))}
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <div className="text-xs font-bold uppercase text-ash">
                        {mine && <span className="mr-2 text-balkan">{t.qual.yours}</span>}
                        {l.referee && t.qual.refereeBy(l.referee)}
                      </div>
                      {canBook && <LobbyButton lobbyId={l.id} mine={mine} full={full} hasBooking={mineId !== null} />}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </Container>
  );
}
