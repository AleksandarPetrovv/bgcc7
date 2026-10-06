export type OsuBadge = { awarded_at: string; description: string; image_url: string; url?: string };

const NOT_TOURNEY =
  /contribut|nominat|assessment|moderat|spotlight|mapp(er|ing)|aspire|monthly|exemplary|outstanding|longstanding|idol|pending|\bgmt\b|\bnat\b|trivium|elite|fan ?art|skinn|voice|streamer|community|loved|featured|beatmap|newsletter|wiki|translat|support|develop|alumni|playtest|pick'?em|art contest|taiko|catch|\bctb\b|fruits|mania|\b\dk\b/i;

export const tourneyBadges = (list: OsuBadge[]) => list.filter((b) => !NOT_TOURNEY.test(b.description)).length;

export const bws = (rank: number, badges: number) => Math.round(rank ** (0.9937 ** (badges * badges)));

export type BwsIn = { osuId: number; rank: number | null; badges: number | null; badgeOverride: number | null };

export const badgesOf = (p: BwsIn) => p.badgeOverride ?? p.badges ?? 0;

export function rankBws<T extends BwsIn>(rows: T[]) {
  return rows
    .map((p) => ({ ...p, badgeCount: badgesOf(p), bws: p.rank && p.rank > 0 ? bws(p.rank, badgesOf(p)) : null }))
    .sort((a, b) => (a.bws ?? Infinity) - (b.bws ?? Infinity) || (a.rank ?? Infinity) - (b.rank ?? Infinity) || a.osuId - b.osuId);
}
