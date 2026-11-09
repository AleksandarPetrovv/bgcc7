export const DISCORD_URL = "https://discord.gg/fw8h2TuVz4";
export const TWITCH_CHANNEL = "osubulgaria";
export const TWITCH_URL = `https://www.twitch.tv/${TWITCH_CHANNEL}`;
export const osuUser = (id: number | string) => `https://osu.ppy.sh/users/${id}`;
export const osuMap = (id: number) => `https://osu.ppy.sh/b/${id}`;
export const osuMatch = (id: number | string) => `https://osu.ppy.sh/community/matches/${id}`;
export const osuMp = (id: number | string) => `https://osu.ppy.sh/mp/${id}`;
/** set by the proxy on page requests: the lowercased path without the query */
export const PATH_HEADER = "x-bgcc-path";
export const siteUrl = () => (process.env.AUTH_URL ?? process.env.PUBLIC_URL ?? "").replace(/\/$/, "");
export const overlayUrl = (key: string) => `${siteUrl()}/overlay/${key}`;
