import "server-only";
import { asteriskCensorStrategy, DataSet, englishDataset, englishRecommendedTransformers, RegExpMatcher, TextCensor } from "obscenity";
import type { ChatLine } from "./lobby-chat";

// slurs, hate and self-harm only. plain swearing passes: twitch allows it, it bans hate speech

// obscenity's n-word patterns also find it inside other words ("urnigger"); its other entries are swearing or
// collide with real words (fagioli, schinken, kikker, дво), so those slurs live in our lists below instead
const EN_SLURS = new Set(["abeed", "africoon", "arabush", "boonga", "chingchong", "nigger", "spastic", "tranny"]);
const built = new DataSet<{ originalWord: string }>()
  .addAll(englishDataset)
  .removePhrasesIf((p) => !EN_SLURS.has(p.metadata?.originalWord ?? ""))
  .build();
const matcher = new RegExpMatcher({ ...built, ...englishRecommendedTransformers });
const text = new TextCensor().setStrategy(asteriskCensorStrategy());

// our own lists, any language. START = any word beginning with it, WORD = that exact word (plus a trailing z, or s/z when 4+ letters).
// left out on purpose, checked against 50k-word lists in 14 languages because they're normal words or names too:
// nigar, negar, negri, nig/niq, pedal/педал/pedał, мангал, циган, cigan, peder, daun/даун ("сървъра е даун"), дауни (Downey), педи (Paddy),
// хач/хачи (Hutch, Hachi), troon (dutch "throne"), mong, hymie, lesbo (Lesbos), gypo, marica, bicha, puto, joto, veado, macaco,
// хохол, петух, чурбан, sambo (самбо), poof, mongo, fidschi, nègre/negre, pédé/pede, jid, умри
const START = [
  "nigger", "niggu", "niglet", "nignog", "negrata", "czarnuch", "kaffir", "jigaboo", "jiggaboo", "wetback", "zipperhead", "towelhead", "raghead", "golliwog", "slanteye", "gyppo",
  "faggot", "shemale", "trannie", "maricon", "schwuchtel", "pederas", "pidor", "pidar", "pider", "chifut", "mongoloid", "mongolico", "retard", "libtard", "spastic", "spacker", "oligofren",
  "sudaca", "kummelturk", "bougnoule", "tarlouze", "ricchione", "siptar", "crncuga",
  "ниггер", "нигър", "негър", "черномаз", "черножоп", "мангасар", "педерас", "пидор", "пидар", "пидер", "пидр", "чифут", "жидов", "жидяр", "ретард", "узкоглаз", "олигофрен", "шиптър",
];
const WORD = [
  "nigga", "niggas", "niggaz", "niggah", "neger", "negers", "negern", "negerin", "negur", "nigur", "negro", "negroes", "niger", "nigers", "darkie", "darky", "coon", "spic", "spick", "beaner", "gook", "paki", "chink", "chinky", "kike", "jap", "japs", "yid", "heeb", "pikey",
  "fag", "fags", "fagg", "faggy", "fgt", "fagot", "poofter", "tranny", "trannies", "dyke", "viado", "frocio", "ibne", "ciota", "flikker", "youpin", "kanake", "spast", "tard", "spaz", "sperg", "kys",
  "нига", "ниги", "нигга", "нигги", "нигер", "нигери", "нигера", "негр", "негри", "негрите", "негра", "негров", "негры", "негро", "негрото", "педер", "педери", "жид", "жиди", "хачик", "чурка", "чурки", "кацап", "кацапи", "даунче",
];
const HARM = ["kill", "neck", "hang", "rope", "unalive", "shoot"].flatMap((v) => ["yourself", "urself", "ur self", "your self", "yoself", "yaself"].map((o) => `${v} ${o}`));
const PHRASES = [
  ...HARM, "an hero", "sieg heil", "heil hitler", "gas the jews", "white power", "hitler did nothing wrong", "porch monkey", "jungle bunny", "slant eye", "slant eyes", "ching chong", "sand nigger",
  "убий се", "убии се", "самоубий се", "обеси се", "застреляй се", "ubii se", "ubij se", "obesi se",
];
const DIGITS = ["1488"];

// lookalike letters (cyrillic, greek, fullwidth via NFKD) and leetspeak, so "nіgg3r" and "негъp" still match
const TO_LAT: Record<string, string> = {
  а: "a", в: "b", г: "r", е: "e", к: "k", м: "m", н: "h", о: "o", р: "p", с: "c", т: "t", у: "y", х: "x", і: "i", ј: "j", ѕ: "s", һ: "h", ԁ: "d", ո: "n",
  α: "a", ε: "e", η: "n", ι: "i", κ: "k", ν: "v", ο: "o", ρ: "p", τ: "t", υ: "u", χ: "x", ɡ: "g", ƒ: "f",
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "9": "g", "@": "a", $: "s", "!": "i", "|": "i", q: "g",
};
const TO_CYR: Record<string, string> = { a: "а", b: "в", c: "с", e: "е", h: "н", k: "к", m: "м", o: "о", p: "р", t: "т", x: "х", y: "у", "3": "з", "0": "о", "4": "ч", "6": "б" };

type Script = "lat" | "cyr";
const EDGE = /^[.,!?;:"'()[\]…*~_@#-]+|[.,!?;:"'()[\]…*~_-]+$/g;
const trim = (s: string) => s.replace(EDGE, "");
const flat = (s: string) => trim(s).normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
const lat = (s: string) => [...flat(s)].map((c) => TO_LAT[c] ?? c).join("").replace(/[^\p{L}]/gu, "").replace(/ph/g, "f");
const cyr = (s: string) => [...flat(s)].map((c) => TO_CYR[c] ?? c).join("").replace(/[^\p{L}]/gu, "");
const digits = (s: string) => (/\p{L}/u.test(s) ? "" : s.replace(/\D/g, ""));
// "ffaagg": a word made only of doubled letters is read with each pair as one letter
const undouble = (s: string) => (/^(?:(.)\1)+$/u.test(s) ? s.replace(/(.)\1/gu, "$1") : s);

// a single letter may be stretched to 3+ ("niiigggaaa") but not doubled, so "japp", "jaap" and "pa4ki" (paaki) stay clean;
// a doubled letter stays required, so "niger" isn't "nigger"
const stretch = (s: string) => (s.match(/(.)\1*/g) ?? []).map((run) => (run.length > 1 ? `${run[0]}{${run.length},}` : `${run}(?:${run}${run}+)?`)).join("");

// START matches the beginning of a word; latin words may be glued to "ur"/"your" ("urfag").
// split: the entry with one extra break ("nig ger", "ret arded"), no glued prefix, and only a grammar ending after it,
// so "ship turn" (shiptur + n) and "не гърба" stay clean
const ENDINGS: Record<Script, string> = { lat: "s|z|es|ed|er|ers|i|a|e|ta|ite|che|ae", cyr: "и|а|е|та|ите|че|ът|ове" };
type Rule = { script: Script; start: RegExp; exact: RegExp; split: RegExp; words: number; len: number };
const rule = (entry: string, whole: boolean): Rule => {
  const script: Script = /[а-я]/.test(entry) ? "cyr" : "lat";
  const s = entry.split(" ").map(script === "lat" ? lat : cyr).join("");
  const glue = script === "lat" ? "(?:ur|your|you)?" : "";
  const tail = s.length >= 4 ? "[sz]?" : script === "lat" ? "z?" : "";
  const exact = new RegExp(`^${glue}${stretch(s)}${tail}$`);
  return { script, start: whole ? exact : new RegExp(`^${glue}${stretch(s)}`), exact, split: new RegExp(`^${stretch(s)}(?:${ENDINGS[script]})?$`), words: entry.split(" ").length, len: s.length };
};
// every cyrillic entry also gets the usual ways of typing bulgarian in latin letters ("chifut", "4ifut", "zhid", "xid", "ubiy se")
const BG_LAT: Record<string, string[]> = {
  а: ["a"], б: ["b"], в: ["v", "w"], г: ["g"], д: ["d"], е: ["e"], ж: ["j", "zh", "x"], з: ["z"], и: ["i"], й: ["i", "y", "j"], к: ["k"], л: ["l"], м: ["m"], н: ["n"], о: ["o"], п: ["p"],
  р: ["r"], с: ["s"], т: ["t"], у: ["u"], ф: ["f"], х: ["h", "x"], ц: ["c", "ts"], ч: ["ch", "4"], ш: ["sh", "6", "w"], щ: ["sht", "6t", "wt"], ъ: ["u", "a", "y"], ь: [""], ю: ["iu", "yu", "u"], я: ["q", "ya", "ia"],
};
const spellings = (entry: string) =>
  [...entry].reduce<string[]>((acc, c) => (BG_LAT[c] ?? [c]).flatMap((t) => acc.map((a) => a + t)), [""]);
const withLatin = (list: string[]) => [...new Set(list.flatMap((e) => (/[а-я]/.test(e) ? [e, ...spellings(e)] : [e])))];
const RULES = [...withLatin(START).map((e) => rule(e, false)), ...withLatin(WORD).map((e) => rule(e, true)), ...withLatin(PHRASES).map((e) => rule(e, true))];
const MAX_WORDS = Math.max(...RULES.map((r) => r.words)) + 1;

// only entries this long, split into pieces of 2+ letters, are checked with an extra break, so "s pick" and "go ok" stay clean
const SPLIT_MIN = 5;

type Word = { idx: number[]; raw: string; single: boolean };

/** chat is never changed: a flagged line shows on the site in red and never on stream. commands and BanchoBot are never flagged */
export const flagChat = (lines: ChatLine[]): ChatLine[] =>
  lines.map((l) => (l.from !== "BanchoBot" && !l.text.startsWith("!") && censor(l.text) !== l.text ? { ...l, flagged: true } : l));

function censor(raw: string) {
  const out = text.applyTo(raw, matcher.getAllMatches(raw));
  const parts = out.split(/(\s+)/);
  const words: Word[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    if (!parts[i]) continue;
    const single = trim(parts[i]).length === 1;
    const last = words.at(-1);
    // "n i g g e r": letters typed one by one count as one word
    if (single && last?.single) {
      last.idx.push(i);
      last.raw += trim(parts[i]);
    } else words.push({ idx: [i], raw: parts[i], single });
  }
  const hit = new Set<number>();
  for (let j = 0; j < words.length; j++) {
    for (let n = 1; n <= MAX_WORDS && j + n <= words.length; n++) {
      const win = words.slice(j, j + n);
      const forms = { lat: win.map((w) => undouble(lat(w.raw))), cyr: win.map((w) => undouble(cyr(w.raw))) };
      const num = win.map((w) => digits(w.raw)).join("");
      const bad =
        (n <= 2 && win.every((w) => digits(w.raw)) && DIGITS.includes(num)) ||
        RULES.some((r) => {
          const f = forms[r.script];
          const joined = f.join("");
          if (n === r.words) return r.start.test(joined);
          // fewer words than the phrase: letters typed one by one ("k i l l   y o u r s e l f")
          if (n < r.words) return r.exact.test(joined);
          // the last word must carry 2+ letters of the entry itself, so "dark yes" isn't darky + es
          return n === r.words + 1 && r.len >= SPLIT_MIN && f.every((p) => p.length >= 2) && f.slice(0, -1).join("").length <= r.len - 2 && r.split.test(joined);
        });
      if (bad) win.forEach((w) => w.idx.forEach((i) => hit.add(i)));
    }
  }
  return parts.map((p, i) => (hit.has(i) ? p.replace(/\S/g, "*") : p)).join("");
}
