import "server-only";
import { DataSet, englishDataset, englishRecommendedTransformers, parseRawPattern, pattern, RegExpMatcher } from "obscenity";

const extra = new DataSet<{ originalWord: string }>()
  .addAll(englishDataset)
  .addPhrase((p) => p.setMetadata({ originalWord: "kys" }).addPattern(pattern`|kys|`))
  .addPhrase((p) =>
    p
      .setMetadata({ originalWord: "kill yourself" })
      .addPattern(pattern`kill yourself`)
      .addPattern(pattern`kill urself`)
      .addPattern(pattern`kill your self`)
      .addPattern(pattern`neck yourself`)
      .addPattern(pattern`hang yourself`),
  )
  .addPhrase((p) =>
    p
      .setMetadata({ originalWord: "bg" })
      .addPattern(pattern`kurva`)
      .addPattern(pattern`putka`)
      .addPattern(pattern`pederas`)
      .addPattern(pattern`|eba ti|`)
      .addPattern(pattern`|ebi se|`)
      .addPattern(pattern`|ebah|`)
      .addPattern(pattern`mamka ti`)
      .addPattern(pattern`shiban`)
      .addPattern(parseRawPattern("|huj|")),
  );

const matcher = new RegExpMatcher({ ...extra.build(), ...englishRecommendedTransformers });

const LOOK: Record<string, string> = { a: "а", e: "е", o: "о", p: "р", c: "с", x: "х", y: "у", k: "к", m: "м", t: "т", h: "н", b: "в", "3": "з", "0": "о", "4": "ч", "6": "б" };
const CYR = ["курв", "путк", "педерас", "ебах", "ебан", "ебат", "шибан", "хуй", "мамкати", "мамкаму", "копеле", "майнат", "духач", "задник"];

const squash = (s: string) => s.replace(/(?:\b\w\b[\s._*-]*){3,}/g, (m) => m.replace(/[\s._*-]/g, ""));
const cyr = (s: string) =>
  s
    .toLowerCase()
    .replace(/[a-z0-9]/g, (c) => LOOK[c] ?? c)
    .replace(/[^а-я]/g, "")
    .replace(/(.)\1+/g, "$1");

export function blocked(text: string) {
  if (matcher.hasMatch(text) || matcher.hasMatch(squash(text))) return true;
  if (!/[а-яА-Я]/.test(text)) return false;
  const flat = cyr(text);
  return CYR.some((w) => flat.includes(w.replace(/(.)\1+/g, "$1")));
}
