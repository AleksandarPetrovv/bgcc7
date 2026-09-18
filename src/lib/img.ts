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
