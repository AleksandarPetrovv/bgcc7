const HOSTS = [/^a\.ppy\.sh$/, /^assets\.ppy\.sh$/, /(^|\.)s-ul\.eu$/];

export function optImg(src: string, w = 384) {
  try {
    const u = new URL(src);
    if (u.protocol !== "https:" || !HOSTS.some((h) => h.test(u.hostname))) return src;
    return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75`;
  } catch {
    return src;
  }
}

/** s-ul.eu links die without notice, so /api/img checks them and falls back */
export const isSulImg = (src: string) => /^https:\/\/([\w-]+\.)?s-ul\.eu\//.test(src);

/** a team's picture, else its first player's avatar */
export const teamImg = (image: string | null, avatar = "") =>
  image && isSulImg(image) ? `/api/img?u=${encodeURIComponent(image)}&f=${encodeURIComponent(avatar)}` : optImg(image || avatar);
