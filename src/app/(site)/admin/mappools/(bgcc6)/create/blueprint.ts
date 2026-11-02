import { isBracketStage } from "@/lib/format";
import { MOD_ORDER } from "@/lib/mods";

/** mods whose slot count is editable: qualifiers have no FreeMod, Tiebreaker is never editable (brackets get exactly one) */
export const blueprintMods = (slug: string) => MOD_ORDER.filter((m) => m !== "Tiebreaker" && !(!isBracketStage(slug) && m === "FreeMod"));

export function readBlueprint(slug: string, fd: FormData) {
  const blueprint: Record<string, number> = {};
  for (const mod of blueprintMods(slug)) {
    const n = Math.floor(Number(fd.get(mod) ?? 0));
    if (Number.isFinite(n) && n > 0) blueprint[mod] = Math.min(n, 99);
  }
  if (isBracketStage(slug)) blueprint.Tiebreaker = 1;
  return blueprint;
}
