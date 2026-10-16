import { dicts, type Dict, type Lang } from "./dict";
import type { Edition } from "@/lib/format";

type Deep<T> = { [K in keyof T]?: T[K] extends (...a: never[]) => unknown ? T[K] : T[K] extends readonly unknown[] ? T[K] : T[K] extends object ? Deep<T[K]> : T[K] };

const en: Deep<Dict> = {
  meta: { title: "BGCC7 · Bulgarian Community Cup 7", description: "The seventh Bulgarian Community Cup, a %vs% osu! team tournament for players from Bulgaria." },
  nav: { homeLabel: "BGCC7 home" },
  me: { notIn: "You're not signed up for BGCC7." },
  timeline: { qual: "Team draw" },
  rounds: { "Losers Round 3": "Losers round 3" },
  home: {
    headline: "{{Bulgaria's}} %vs% osu! cup is back for a [[seventh]] time.",
    headlineDone: "[[BGCC7]] is over. Here's how it went.",
    intro: "Any rank can enter, and you sign up on your own before %regClose%. The top %players% by BWS make it in, and every team is a random pair from the top and bottom half.",
    bracketSub: "Fills in once the teams are drawn",
    introBy: {
      screening: "Signups are closed and we're screening everyone now. The top %players% by BWS get drawn into random pairs.",
      qualifiers: "Signups are closed and we're screening everyone now. The top %players% by BWS get drawn into random pairs.",
      seeding: "The %teams% teams are drawn. The bracket runs %play%.",
      playoffs: "%teams% teams of two, one double elimination bracket, every match streamed with Bulgarian commentary.",
      finished: "Thanks to everyone who played, reffed, mappooled, streamed and watched. See you at the next one.",
    },
    cta: { screening: "See the players", qualifiers: "See the players", seeding: "See the teams", playoffs: "Matches", finished: "Final results" },
  },
  info: {
    intro:
      "%name% is the seventh Bulgarian Community Cup, a %vs% team tournament open to players of any rank from Bulgaria. The top %players% players by BWS are drawn into %teams% random pairs, those teams play a double elimination bracket, and we stream every match with Bulgarian commentary.",
    generalItems: [
      "%name% is a [[%vs%]], [[open rank]] tournament for players with {{Bulgaria}} as their osu! country",
      "Everyone signs up [[solo]]. Teams of [[two]] are drawn at random, so there's no team to register",
      "All matches use [[Team VS]] and [[ScoreV2]]",
      "All times are in [[EET (UTC+2)]]",
      "Matches are played between [[Saturday 12:00]] and [[Sunday 23:00 EET]] of their week",
      "Reschedules must be requested before [[Thursday 23:59 EET]] of that week",
      "Streamers, commentators and designers can also play. Referees and playtesters can only help out once they're knocked out, and every other staff role can't play at all",
    ],
    regItems: [
      "Registrations run from [[%regOpen%]] to [[%regCloseTime%]]",
      "Sign up by logging in with osu! on the registration page. That's the whole form",
      "Every player is [[screened]] by the {{osu! account support team}} before the draw. We only turn someone away if they fail that screening or break a sign-up rule, and we'll tell you if it happens",
      "Teams are [[announced]] right after the draw",
    ],
    qualTitle: "Seeding and teams",
    qualItems: [
      "Everyone is ranked by {{BWS}}: your global rank to the power of 0.9937^(badges²). Only osu! standard tournament badges count",
      "The top [[%players% players]] make it in. Ranks are taken when signups close",
      "Places 1 to %teams% are tier A and %tierB% to %players% are tier B. Every tier A player is drawn with a [[random]] tier B player",
      "A team's seed comes from the [[average BWS seed]] of its two players (BWS #3 and #20 average 11.5), lowest is seed 1. The bracket starts 1 v %teams%, %half% v %half1% and so on",
      "Nobody's seed is ever changed by hand. The seeding code is public, so anyone can check the result",
    ],
    formatRows: [
      { stage: "Round of 16", format: "Best of %bo.round-of-16% · %bans.round-of-16%", when: "" },
      { stage: "Quarterfinals", format: "Best of %bo.quarterfinals% · %bans.quarterfinals%", when: "" },
      { stage: "Semifinals", format: "Best of %bo.semifinals% · %bans.semifinals%", when: "" },
      { stage: "Finals", format: "Best of %bo.finals% · %bans.finals%", when: "" },
      { stage: "Grand finals", format: "Best of %bo.grand-finals% · %bans.grand-finals%", when: "" },
    ],
    facts: [
      ["Format", "%vs% Team VS · ScoreV2"],
      ["Eligibility", "Bulgaria, open rank"],
      ["Team size", "%teamSize% players"],
      ["Teams", "%teams%, drawn at random by BWS tier"],
      ["Bracket", "Double elimination, round of 16"],
      ["Time zone", "EET (UTC+2)"],
      ["Registrations", "%reg%"],
      ["Team draw", "%qual%"],
      ["Playoffs", "%play%"],
    ],
  },
  qual: { noResults: "No results yet." },
  admin: { seedLocked: "Seeds come from the players' average BWS seed and can't be changed by hand." },
};

const bg: Deep<Dict> = {
  meta: { title: "BGCC7 · Bulgarian Community Cup 7", description: "Седмата Bulgarian Community Cup, %vs% osu! отборен турнир за играчи от България." },
  nav: { homeLabel: "BGCC7 начало" },
  me: { notIn: "Не си записан за BGCC7." },
  timeline: { qual: "Теглене" },
  rounds: { "Losers Round 3": "Загубили, кръг 3" },
  home: {
    headline: "{{Българската}} %vs% osu! купа се завръща за [[седми]] път.",
    headlineDone: "[[BGCC7]] приключи. Ето как мина.",
    intro: "Може да участва всеки, независимо от ранга, и се записваш сам до %regClose%. Първите %players% по BWS влизат, а всеки отбор е случайна двойка от горната и долната половина.",
    bracketSub: "Попълва се след тегленето на отборите",
    introBy: {
      screening: "Записването приключи и проверяваме всички играчи. Първите %players% по BWS се теглят на случайни двойки.",
      qualifiers: "Записването приключи и проверяваме всички играчи. Първите %players% по BWS се теглят на случайни двойки.",
      seeding: "%teams%-те отбора са изтеглени. Схемата се играе %play%.",
      playoffs: "%teams% отбора по двама, една схема с двойна елиминация и всеки мач на живо с българско коментаторство.",
      finished: "Благодарим на всички, които играха, съдийстваха, правиха мапове, стриймваха и гледаха. До следващия.",
    },
    cta: { screening: "Виж играчите", qualifiers: "Виж играчите", seeding: "Виж отборите", playoffs: "Мачове", finished: "Крайни резултати" },
  },
  info: {
    intro:
      "%name% е седмото издание на Bulgarian Community Cup, %vs% отборен турнир за играчи от България от всякакъв ранг. Първите %players% играчи по BWS се теглят в %teams% случайни двойки, отборите играят схема с двойна елиминация, а всеки мач се стриймва с коментар на български.",
    generalItems: [
      "%name% е [[%vs%]] турнир [[без ограничение на ранга]] за играчи с {{България}} като държава в osu!",
      "Всеки се записва [[сам]]. Отборите по [[двама]] се теглят на случаен принцип, така че няма отбор за записване",
      "Всички мачове са [[Team VS]] и [[ScoreV2]]",
      "Всички часове са по [[EET (UTC+2)]]",
      "Мачовете се играят между [[събота 12:00]] и [[неделя 23:00 EET]] в съответната седмица",
      "Смяна на часа се иска до [[четвъртък 23:59 EET]] същата седмица",
      "Стриймърите, коментаторите и дизайнерите могат и да играят. Съдиите и тестерите могат да помагат само след като отпаднат, а всички други роли в екипа не могат да играят",
    ],
    regItems: [
      "Записването е от [[%regOpen%]] до [[%regCloseTime%]]",
      "Записваш се с вход през osu! на страницата за записване. Това е цялата форма",
      "Всеки играч се [[проверява]] от {{екипа за поддръжка на акаунти на osu!}} преди тегленето. Отказваме участие само ако някой не мине тази проверка или наруши правило за записване, и ще ти кажем, ако това стане",
      "Отборите се [[обявяват]] веднага след тегленето",
    ],
    qualTitle: "Поставяне и отбори",
    qualItems: [
      "Всички се подреждат по {{BWS}}: глобалният ти ранг на степен 0.9937^(значки²). Броят се само турнирни значки за osu! standard",
      "Първите [[%players% играчи]] влизат. Ранговете се взимат при затваряне на записването",
      "Местата от 1 до %teams% са ниво A, а от %tierB% до %players% ниво B. Всеки от ниво A се тегли със [[случаен]] играч от ниво B",
      "Номерът на отбора идва от [[средния BWS номер]] на двамата (BWS #3 и #20 правят 11.5), най-ниският е номер 1. Схемата започва с 1 срещу %teams%, %half% срещу %half1% и т.н.",
      "Ничий номер не се променя ръчно. Кодът за поставянето е публичен, така че всеки може да провери резултата",
    ],
    formatRows: [
      { stage: "Осминафинали", format: "Best of %bo.round-of-16% · %bans.round-of-16%", when: "" },
      { stage: "Четвъртфинали", format: "Best of %bo.quarterfinals% · %bans.quarterfinals%", when: "" },
      { stage: "Полуфинали", format: "Best of %bo.semifinals% · %bans.semifinals%", when: "" },
      { stage: "Финали", format: "Best of %bo.finals% · %bans.finals%", when: "" },
      { stage: "Голям финал", format: "Best of %bo.grand-finals% · %bans.grand-finals%", when: "" },
    ],
    facts: [
      ["Формат", "%vs% Team VS · ScoreV2"],
      ["Кой може", "България, всеки ранг"],
      ["Състав", "%teamSize% играчи"],
      ["Отбори", "%teams%, теглени по BWS нива"],
      ["Схема", "Двойна елиминация, от осминафинали"],
      ["Часова зона", "EET (UTC+2)"],
      ["Записване", "%reg%"],
      ["Теглене", "%qual%"],
      ["Плейофи", "%play%"],
    ],
  },
  qual: { noResults: "Още няма резултати." },
  admin: { seedLocked: "Номерата идват от средния BWS номер на играчите и не се променят ръчно." },
};

function merge<T>(base: T, over: unknown): T {
  if (!over || typeof over !== "object" || Array.isArray(over) || typeof base !== "object" || base === null || Array.isArray(base)) return (over ?? base) as T;
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(over)) out[k] = merge((base as Record<string, unknown>)[k], v);
  return out as T;
}

const seventh: Record<Lang, Dict> = { en: merge(dicts.en, en), bg: merge(dicts.bg, bg) };

export const dictFor = (lang: Lang, edition: Edition) => (edition === "bgcc7" ? seventh[lang] : dicts[lang]);
