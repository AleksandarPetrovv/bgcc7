/** a username as osu! IRC spells it: spaces become underscores */
export const ircName = (name: string) => name.trim().replace(/ /g, "_");
/** the key two spellings of one username share (IRC, chat, urls, streamer lists) */
export const nameKey = (name: string) => ircName(name).toLowerCase();
