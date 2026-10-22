import type { Dict, Lang } from "./dict";

// bgcc6 text where it differs from the default (bgcc7) dictionaries in ./en and ./bg

type Deep<T> = { [K in keyof T]?: T[K] extends (...a: never[]) => unknown ? T[K] : T[K] extends readonly unknown[] ? T[K] : T[K] extends object ? Deep<T[K]> : T[K] };

const en: Deep<Dict> = {
  meta: {
    title: "BGCC6 · Bulgarian Community Cup 6",
    description: "The sixth Bulgarian Community Cup, a 3v3 osu! team tournament for players from Bulgaria.",
  },
  nav: { homeLabel: "BGCC6 home" },
  me: { notIn: "You're not signed up for BGCC6." },
  timeline: { qual: "Qualifiers" },
  rounds: { "Losers Round 3": "Losers playoff" },
  home: {
    headline: "{{Bulgaria's}} 3v3 osu! cup is back for a [[sixth]] time.",
    headlineDone: "[[BGCC6]] is over. Here's how it went.",
    intro: "Any rank can enter, and you sign up on your own before %regClose%. Qualifiers run %qual%, and the top %qualify% get split into teams of three by seed.",
    bracketSub: "Fills in once qualifiers end",
    introBy: {
      screening: "Signups are closed and we're screening everyone now. Qualifiers run %qual%, and the top %qualify% get split into teams of three by seed.",
      qualifiers: "Qualifiers run %qual%. Book a lobby, play the pool once, and the top %qualify% get split into teams of three by seed.",
      seeding: "Qualifiers are done and the %teams% teams are set. The bracket runs %play%.",
      playoffs: "%teams% teams, one double elimination bracket, every match streamed with Bulgarian commentary.",
      finished: "Thanks to everyone who played, reffed, mappooled, streamed and watched. See you at the next one.",
    },
    cta: {
      screening: "See the players",
      qualifiers: "Book a lobby",
      seeding: "See the teams",
      playoffs: "Matches",
      finished: "Final results",
    },
  },
  info: {
    prizeRows: [
      { place: "1st", reward: "60% of the prize pool", extra: "Winner profile badge (pending approval)" },
      { place: "2nd", reward: "30% of the prize pool", extra: "Custom forum title" },
      { place: "3rd", reward: "10% of the prize pool", extra: "Custom forum title" },
    ],
    procItems: [
      "Each team gets [[one warmup]] under 4 minutes",
      "Captains roll, and the winner decides whether to pick or ban first",
      "The [[tiebreaker]] is played only when both teams reach match point",
      "A player who disconnects in the first [[30 seconds]] may replay the map once per match",
      "Referee calls during a match are final. Anything you want to dispute afterwards goes to the host team",
    ],
    intro: "BGCC6 is the sixth Bulgarian Community Cup, a 3v3 team tournament open to players of any rank from Bulgaria. The top %qualify% players out of qualifiers are split into %teams% teams by seed, those teams play a double elimination bracket, and we stream every match with Bulgarian commentary.",
    generalItems: [
      "BGCC6 is a [[3v3]], [[open rank]] tournament for players with {{Bulgaria}} as their osu! country",
      "Everyone signs up [[solo]]. Teams of [[three]] are put together from the qualifier seeds, so there's no team to register",
      "All matches use [[Team VS]] and [[ScoreV2]]",
      "All times are in [[EET / EEST (UTC+2 / UTC+3)]]",
      "Matches are played between [[Saturday 12:00]] and [[Sunday 23:00]] of their week",
      "Reschedules must be requested before [[Thursday 23:59]] of that week",
      "Streamers, commentators and designers can also play. Referees and playtesters can only help out once they're knocked out, and every other staff role can't play at all",
    ],
    regItems: [
      "Registrations run from [[%regOpen%]] to [[%regCloseTime%]]",
      "Sign up by logging in with osu! on the registration page. That's the whole form",
      "Every player is [[screened]] by the {{osu! account support team}} before qualifiers. We only turn someone away if they fail that screening or break a sign-up rule, and we'll tell you if it happens",
      "Teams are [[announced]] once qualifiers end",
    ],
    qualTitle: "Qualifiers",
    qualItems: [
      "Every player books a qualifier lobby run by a referee",
      "The pool has [[11 maps]] ([[4 NM / 2 HD / 2 HR / 3 DT]]), each played [[once]]",
      "Seeding works map by map. Your score is compared to everyone else's on that map (how far above or below the average it is), that becomes a {{percentile}}, and your percentiles are added up across the pool. Highest total is seed 1, and a tie goes to the higher average score",
      "The top [[%qualify% players]] qualify and are split into [[%teams% teams]] in snake order: seed 1 plays with seeds %teams2% and %teams2p%, seed 2 with %teams2m% and %teams2p2%, and so on",
      "Nobody's seed is ever changed by hand. The seeding code is public, so anyone can check the result",
    ],
    formatRows: [
      { stage: "Qualifiers", format: "11 maps, played once", when: "%qual%" },
      { stage: "Quarterfinals", format: "Best of %bo.quarterfinals% · 1 ban", when: "" },
      { stage: "Semifinals", format: "Best of %bo.semifinals% · 2 bans", when: "" },
      { stage: "Finals", format: "Best of %bo.finals% · 2 bans", when: "" },
      { stage: "Grand finals", format: "Best of %bo.grand-finals% · 2 bans", when: "" },
    ],
    facts: [
      ["Format", "3v3 Team VS · ScoreV2"],
      ["Eligibility", "Bulgaria, open rank"],
      ["Team size", "3 players"],
      ["Teams", "%teams%, built from qualifier seeds"],
      ["Bracket", "Double elimination"],
      ["Time zone", "EET / EEST (UTC+2 / UTC+3)"],
      ["Registrations", "%reg%"],
      ["Qualifiers", "%qual%"],
      ["Playoffs", "%play%"],
    ],
  },
  qual: { noResults: "Qualifier results aren't in yet." },
  admin: { seedLocked: "Seeds come from qualifiers and can't be changed by hand." },
};

const bg: Deep<Dict> = {
  meta: {
    title: "BGCC6 · Bulgarian Community Cup 6",
    description: "Шестата Bulgarian Community Cup, 3v3 osu! отборен турнир за играчи от България.",
  },
  nav: { homeLabel: "BGCC6 начало" },
  me: { notIn: "Не си записан за BGCC6." },
  timeline: { qual: "Квалификации" },
  rounds: { "Losers Round 3": "Загубили, плейоф" },
  home: {
    headline: "{{Българската}} 3v3 osu! купа се завръща за [[шести]] път.",
    headlineDone: "[[BGCC6]] приключи. Ето как мина.",
    intro: "Може да участва всеки, независимо от ранга, и се записваш сам до %regClose%. Квалификациите са на %qual%, а първите %qualify% се разпределят в отбори по трима според номера си.",
    bracketSub: "Попълва се след квалификациите",
    introBy: {
      screening: "Записването приключи и проверяваме всички играчи. Квалификациите са %qual%, а най-добрите %qualify% се разделят на отбори по трима според поставянето.",
      qualifiers: "Квалификациите са %qual%. Запиши се за лоби, изиграй пула веднъж, а най-добрите %qualify% се разделят на отбори по трима според поставянето.",
      seeding: "Квалификациите приключиха и %teams%-те отбора са ясни. Схемата се играе %play%.",
      playoffs: "%teams% отбора, една схема с двойна елиминация и всеки мач на живо с българско коментаторство.",
      finished: "Благодарим на всички, които играха, съдийстваха, правиха мапове, стриймваха и гледаха. До следващия.",
    },
    cta: {
      screening: "Виж играчите",
      qualifiers: "Запиши се за лоби",
      seeding: "Виж отборите",
      playoffs: "Мачове",
      finished: "Крайни резултати",
    },
  },
  info: {
    prizeRows: [
      { place: "1-во", reward: "60% от наградния фонд", extra: "Значка в профила (чака одобрение)" },
      { place: "2-ро", reward: "30% от наградния фонд", extra: "Собствена титла във форума" },
      { place: "3-то", reward: "10% от наградния фонд", extra: "Собствена титла във форума" },
    ],
    procItems: [
      "Всеки отбор има [[една загрявка]] под 4 минути",
      "Капитаните хвърлят roll, а победителят избира дали да пикне или банне първи",
      "[[Тайбрейкърът]] се играе само ако двата отбора стигнат мачбол",
      "Играч, който се disconnect-не в първите [[30 секунди]], може да изиграе мапа отново веднъж на мач",
      "Решенията на рефера по време на мача са окончателни. Спорове след това се решават от организаторите",
    ],
    intro: "BGCC6 е шестото издание на Bulgarian Community Cup, 3v3 отборен турнир за играчи от България от всякакъв ранг. Първите %qualify% играчи от квалификациите се разпределят в %teams% отбора според номера си, отборите играят схема с двойна елиминация, а всеки мач се стриймва с коментар на български.",
    generalItems: [
      "BGCC6 е [[3v3]] турнир [[без ограничение на ранга]] за играчи с {{България}} като държава в osu!",
      "Всеки се записва [[сам]]. Отборите по [[трима]] се съставят по номерата от квалификациите, така че няма отбор за записване",
      "Всички мачове са [[Team VS]] и [[ScoreV2]]",
      "Всички часове са по [[EET / EEST (UTC+2 / UTC+3)]]",
      "Мачовете се играят между [[събота 12:00]] и [[неделя 23:00]] в съответната седмица",
      "Смяна на часа се иска до [[четвъртък 23:59]] същата седмица",
      "Стриймърите, коментаторите и дизайнерите могат и да играят. Съдиите и тестерите могат да помагат само след като отпаднат, а всички други роли в екипа не могат да играят",
    ],
    regItems: [
      "Записването е от [[%regOpen%]] до [[%regCloseTime%]]",
      "Записваш се с вход през osu! на страницата за записване. Това е цялата форма",
      "Всеки играч се [[проверява]] от {{екипа за поддръжка на акаунти на osu!}} преди квалификациите. Отказваме участие само ако някой не мине тази проверка или наруши правило за записване, и ще ти кажем, ако това стане",
      "Отборите се [[обявяват]] след края на квалификациите",
    ],
    qualTitle: "Квалификации",
    qualItems: [
      "Всеки играч си запазва квалификационно лоби с рефер",
      "Пулът има [[11 мапа]] ([[4 NM / 2 HD / 2 HR / 3 DT]]), всеки се играе [[веднъж]]",
      "Поставянето се смята мап по мап. Резултатът ти се сравнява с тези на всички останали на същия мап (колко е над или под средното), това става {{перцентил}}, а перцентилите ти се събират за целия пул. Най-високият сбор е номер 1, а при равенство печели по-високият среден резултат",
      "Първите [[%qualify% играчи]] се класират и се разпределят в [[%teams% отбора]] по змийката: номер 1 играе с номера %teams2% и %teams2p%, номер 2 с %teams2m% и %teams2p2% и т.н.",
      "Ничий номер не се променя ръчно. Кодът за поставянето е публичен, така че всеки може да провери резултата",
    ],
    formatRows: [
      { stage: "Квалификации", format: "11 мапа, по веднъж", when: "%qual%" },
      { stage: "Четвъртфинали", format: "Best of %bo.quarterfinals% · 1 бан", when: "" },
      { stage: "Полуфинали", format: "Best of %bo.semifinals% · 2 бана", when: "" },
      { stage: "Финали", format: "Best of %bo.finals% · 2 бана", when: "" },
      { stage: "Голям финал", format: "Best of %bo.grand-finals% · 2 бана", when: "" },
    ],
    facts: [
      ["Формат", "3v3 Team VS · ScoreV2"],
      ["Кой може", "България, всеки ранг"],
      ["Състав", "3 играчи"],
      ["Отбори", "8, по номерата от квалификациите"],
      ["Схема", "Двойна елиминация"],
      ["Часова зона", "EET / EEST (UTC+2 / UTC+3)"],
      ["Записване", "%reg%"],
      ["Квалификации", "%qual%"],
      ["Плейофи", "%play%"],
    ],
  },
  qual: { noResults: "Резултатите от квалификациите още ги няма." },
  admin: { seedLocked: "Номерата идват от квалификациите и не се променят ръчно." },
};

function merge<T>(base: T, over: unknown): T {
  if (!over || typeof over !== "object" || Array.isArray(over) || typeof base !== "object" || base === null || Array.isArray(base)) return (over ?? base) as T;
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(over)) out[k] = merge((base as Record<string, unknown>)[k], v);
  return out as T;
}

export const dictsBGCC6 = (dicts: Record<Lang, Dict>): Record<Lang, Dict> => ({ en: merge(dicts.en, en), bg: merge(dicts.bg, bg) });
