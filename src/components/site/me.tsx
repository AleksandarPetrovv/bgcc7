import { cn } from "@/lib/utils";

export const meP = (id: number | string | null | undefined) => (id == null || id === "" ? {} : { "data-p": String(id) });
export const meT = (id: string | null | undefined) => (id ? { "data-t": id } : {});

export function MeTag({ p, t, corner, className }: { p?: number | string | null; t?: string | null; corner?: boolean; className?: string }) {
  return <span {...meP(p)} {...meT(t)} className={cn(corner ? "me-corner" : "me-tag", className)} aria-hidden />;
}

export function meStyle(osuId: number | null, teamId: string | null, you: string, team: string) {
  if (!osuId && !teamId) return "";
  const q = (s: string) => JSON.stringify(s);
  const p = osuId ? `[data-p="${osuId}"]` : "";
  const t = teamId ? `[data-t=${q(teamId)}]` : "";
  const any = [p, t].filter(Boolean).join(",");
  const rules = [
    `:root{--me-you:${q(you)};--me-team:${q(team)}}`,
    `.me-hl:is(${any}){background-image:linear-gradient(90deg,color-mix(in srgb, var(--balkan) 20%, transparent),color-mix(in srgb, var(--balkan) 5%, transparent) 70%,transparent)}`,
    `:is(.me-hl,.me-ring):is(${any}){box-shadow:inset 3px 0 0 var(--balkan),inset 0 0 0 1px color-mix(in srgb, var(--balkan) 50%, transparent)}`,
    `.me-av:is(${any}){outline:2px solid var(--balkan);outline-offset:1px;position:relative;z-index:5}`,
  ];
  if (t) rules.push(`.me-tag${t}::after,.me-corner${t}::after{content:var(--me-team)}`);
  if (p) rules.push(`.me-tag${p}::after,.me-corner${p}::after{content:var(--me-you)}`);
  return rules.join("");
}
