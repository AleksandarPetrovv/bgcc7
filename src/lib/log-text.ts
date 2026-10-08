export type LogCtx = {
  user: Map<number, string>;
  lobby: Map<number, string>;
  team: Map<string, string>;
  stage: Map<number, string>;
  map: Map<number, string>;
  beatmap: Map<number, string>;
  match: Map<string, [string | null, string | null]>;
};

export type LogHelpers = {
  lang: string;
  phase: (p: string) => string;
  round: (s: string) => string;
  role: (r: string) => string;
  date: (d: string) => string;
  match: (id: string) => string;
};

type P = Record<string, unknown>;

const b = (s: unknown) => `**${String(s ?? "?")}**`;
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;

export function describe(action: string, payload: unknown, c: LogCtx, h: LogHelpers): string {
  const p = (payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {}) as P;
  const bg = h.lang === "bg";
  const text = (v: unknown) => typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : undefined;
  const unknownPlayer = bg ? "неизвестен играч" : "unknown player";
  const unknownTeam = bg ? "неизвестен отбор" : "unknown team";
  const ref = (v: unknown, fallback: string) => (text(v) ? `#${text(v)}` : fallback);
  const user = (k = "osuId") => b((text(p[k]) ? c.user.get(num(p[k])) : undefined) ?? text(p.username) ?? ref(p[k], unknownPlayer));
  const lobby = (k = "lobbyId") => b((k === "id" ? text(p.name) : undefined) ?? c.lobby.get(num(p[k])) ?? ref(p[k], bg ? "неизвестно лоби" : "unknown lobby"));
  const team = (k = "teamId") => b(c.team.get(text(p[k]) ?? "") ?? text(p.name) ?? text(p[k]) ?? unknownTeam);
  const stage = (k = "stageId") => b(h.round(text(p.stage) ?? c.stage.get(num(p[k])) ?? ref(p[k], bg ? "неизвестен етап" : "unknown stage")));
  const map = () => b(text(p.title) ? `${text(p.title)}${text(p.version) ? ` [${text(p.version)}]` : ""}` : (c.map.get(num(p.id)) ?? ref(p.id, bg ? "неизвестен мап" : "unknown map")));
  const beatmap = () => b(c.beatmap.get(num(p.beatmapId)) ?? ref(p.beatmapId, bg ? "неизвестен мап" : "unknown map"));
  const match = (k = "matchId") => {
    const id = text(p[k]) ?? text(p.id);
    if (!id) return b(bg ? "неизвестен мач" : "unknown match");
    const [x, y] = c.match.get(id) ?? [null, null];
    return x || y ? `${b(`${x ?? unknownTeam} vs ${y ?? unknownTeam}`)} (${h.match(id)})` : b(h.match(id));
  };
  const side = (value: unknown = p.side ?? p.team) => {
    if (value !== 1 && value !== 2) return b(unknownTeam);
    const names = c.match.get(text(p.matchId) ?? text(p.id) ?? "");
    return b(names?.[value - 1] ?? (bg ? `отбор ${value}` : `team ${value}`));
  };
  const slot = (k = "slot") => {
    const v = p[k];
    return b(typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 15 ? v + 1 : bg ? "неизвестно място" : "unknown seat");
  };
  const draftMap = () => b(text(p.slot) ?? (bg ? "неизвестен мап" : "unknown map"));
  const when = () => (typeof p.proposedAt === "string" ? h.date(p.proposedAt) : "?");

  switch (action) {
    case "phase.set":
      return bg ? `смени фазата на ${b(h.phase(String(p.phase)))}` : `switched the phase to ${b(h.phase(String(p.phase)))}`;
    case "phase.sections": {
      const n = Array.isArray(p.shown) ? p.shown.length : 0;
      return bg ? `промени кои страници са публични (${n} видими)` : `changed which pages are public (${n} shown)`;
    }
    case "phase.dates":
      return bg ? "обнови датите за записване и лобита" : "updated the registration and lobby booking dates";
    case "phase.dismiss":
      return bg ? `отложи смяната на етапа към ${b(h.phase(String(p.phase)))}` : `put off switching the stage to ${b(h.phase(String(p.phase)))}`;
    case "settings.pickems":
      return p.pickemsOpen ? (bg ? "отвори прогнозите" : "opened pick'ems") : bg ? "затвори прогнозите" : "closed pick'ems";
    case "settings.draft":
      return bg
        ? `смени баните на ${b(p.bans)} на отбор, ред ${b(String(p.banOrder).toUpperCase())}, ${b(`${p.banSecs ?? 90}с`)} за бан, ${b(`${p.pickSecs ?? 120}с`)} за пик, таймаут ${b(`${p.timeoutSecs ?? 180}с`)}`
        : `set bans to ${b(p.bans)} per team, order ${b(String(p.banOrder).toUpperCase())}, ${b(`${p.banSecs ?? 90}s`)} per ban, ${b(`${p.pickSecs ?? 120}s`)} per pick, timeout ${b(`${p.timeoutSecs ?? 180}s`)}`;
    case "draft.open":
      return bg ? `отвори пик и бан за ${match()} с пула ${stage()}` : `opened pick and ban for ${match()} with the ${stage()} pool`;
    case "draft.close":
      return bg ? `затвори пик и бан за ${match()}` : `closed pick and ban for ${match()}`;
    case "draft.pause":
      return bg ? `пусна таймаут в ${match()}` : `called a timeout in ${match()}`;
    case "draft.resume":
      return bg ? `прекрати таймаута в ${match()}` : `ended the timeout in ${match()}`;
    case "draft.end":
      return bg ? `затвори окончателно пик и бан за ${match()}` : `closed pick and ban for ${match()} for good`;
    case "draft.reset":
      return bg ? `рестартира пик и бан за ${match()}` : `reset pick and ban for ${match()}`;
    case "draft.undo":
      return bg ? `върна последната стъпка (${b(p.step)}) в ${match()}` : `undid the last step (${b(p.step)}) in ${match()}`;
    case "draft.redo":
      return bg ? `повтори стъпка (${b(p.step)}) в ${match()}` : `redid a step (${b(p.step)}) in ${match()}`;
    case "draft.pick":
      return bg ? `избра ${draftMap()} за ${side()} в ${match()}` : `picked ${draftMap()} for ${side()} in ${match()}`;
    case "draft.ban":
      return bg ? `банна ${draftMap()} за ${side()} в ${match()}` : `banned ${draftMap()} for ${side()} in ${match()}`;
    case "draft.roll":
      return bg ? `хвърли зар за ${side()} в ${match()}` : `rolled for ${side()} in ${match()}`;
    case "draft.choice": {
      const choice = p.value ?? p.choice;
      if (choice === "pick") return bg ? `избра първи пик за ${side()} в ${match()}` : `chose first pick for ${side()} in ${match()}`;
      if (choice === "ban") return bg ? `избра първи бан за ${side()} в ${match()}` : `chose first ban for ${side()} in ${match()}`;
      return bg ? `промени избора за реда на пик и бан в ${match()}` : `changed the pick and ban order choice in ${match()}`;
    }
    case "draft.winner":
      if (p.winner === null) return bg ? `изчисти победителя на ${draftMap()} в ${match()}` : `cleared the winner of ${draftMap()} in ${match()}`;
      if (p.winner === 1 || p.winner === 2) return bg ? `отбеляза победа за ${side(p.winner)} на ${draftMap()} в ${match()}` : `recorded a win for ${side(p.winner)} on ${draftMap()} in ${match()}`;
      return bg ? `обнови победителя на ${draftMap()} в ${match()}` : `updated the winner of ${draftMap()} in ${match()}`;
    case "settings.qualify":
      return bg ? `смени колко играчи се класират на ${b(p.qualifyCount)}` : `set qualifying players to ${b(p.qualifyCount)}`;
    case "settings.rounds":
      return bg ? "обнови до колко точки се играе всеки рунд" : "updated how many points each round is played to";
    case "phase.timeline":
      return bg ? "обнови датите в графика" : "updated the timeline dates";

    case "register.signup":
      return bg ? "се записа за турнира" : "signed up for the tournament";
    case "register.withdraw":
      return bg ? "оттегли записването си" : "withdrew their sign-up";
    case "screening.decide": {
      const note = p.note ? (bg ? ` (бележка: „${p.note}")` : ` (note: "${p.note}")`) : "";
      if (p.status === "approved") return (bg ? `одобри ${user()}` : `approved ${user()}`) + note;
      if (p.status === "denied") return (bg ? `отказа ${user()}` : `denied ${user()}`) + note;
      return (bg ? `върна ${user()} в чакащи` : `moved ${user()} back to pending`) + note;
    }
    case "screening.approveAll":
      return bg ? `одобри всички чакащи (${num(p.approved)})` : `approved every pending player (${num(p.approved)})`;
    case "screening.refreshStats":
      return bg ? `обнови osu! статистиката на ${num(p.updated)} играчи` : `refreshed osu! stats for ${num(p.updated)} players`;
    case "screening.add":
      return bg ? `добави ${user()} като одобрен играч` : `added ${user()} as an approved player`;
    case "screening.remove":
      return bg ? `махна записването на ${user()}` : `removed ${user()}'s sign-up`;

    case "lobby.create":
      return bg ? `създаде лоби ${b(p.name)}` : `created lobby ${b(p.name)}`;
    case "lobby.update":
      return bg ? `промени лоби ${b(p.name ?? c.lobby.get(num(p.id)))}` : `edited lobby ${b(p.name ?? c.lobby.get(num(p.id)))}`;
    case "lobby.delete":
      return bg ? `изтри лоби ${lobby("id")}` : `deleted lobby ${lobby("id")}`;
    case "lobby.place":
      return bg ? `сложи ${user()} в лоби ${lobby()}` : `put ${user()} in lobby ${lobby()}`;
    case "lobby.unbook":
      return bg ? `извади ${user()} от лобито му` : `took ${user()} out of their lobby`;
    case "lobby.book":
      return bg ? `си запази място в лоби ${lobby()}` : `booked a spot in lobby ${lobby()}`;
    case "lobby.leave":
      return bg ? "напусна лобито си" : "left their lobby";
    case "lobby.make":
      return bg ? `създаде osu! лоби за ${match()}` : `created an osu! lobby for ${match()}`;
    case "lobby.invite":
      return bg ? `покани липсващите играчи в лобито за ${match()}` : `invited the missing players to the lobby for ${match()}`;
    case "lobby.refresh":
      return bg ? `обнови състоянието на лобито за ${match()}` : `refreshed the lobby state for ${match()}`;
    case "lobby.start": {
      const secs = typeof p.secs === "number" && Number.isInteger(p.secs) ? Math.min(300, Math.max(0, p.secs)) : null;
      if (secs === 0) return bg ? `стартира играта в лобито за ${match()}` : `started play in the lobby for ${match()}`;
      if (secs !== null) return bg ? `насрочи старт след ${b(secs)} секунди в лобито за ${match()}` : `scheduled play to start in ${b(secs)} seconds in the lobby for ${match()}`;
      return bg ? `подаде команда за старт в лобито за ${match()}` : `requested play to start in the lobby for ${match()}`;
    }
    case "lobby.abort":
      return bg ? `прекрати текущата игра в лобито за ${match()}` : `aborted the current game in the lobby for ${match()}`;
    case "lobby.aborttimer":
      return bg ? `спря обратното броене в лобито за ${match()}` : `stopped the countdown in the lobby for ${match()}`;
    case "lobby.close":
      return bg ? `затвори osu! лобито за ${match()}` : `closed the osu! lobby for ${match()}`;
    case "lobby.chat":
      return bg ? `изпрати съобщение или команда в лобито за ${match()}` : `sent a message or command in the lobby for ${match()}`;
    case "lobby.cmd":
      return bg ? `изпрати команда в лобито за ${match()}` : `sent a command in the lobby for ${match()}`;
    case "lobby.kick":
      return bg ? `изгони играча от място ${slot()} в лобито за ${match()}` : `kicked the player in seat ${slot()} from the lobby for ${match()}`;
    case "lobby.move":
      return bg ? `премести играча от място ${slot()} на място ${slot("to")} в лобито за ${match()}` : `moved the player from seat ${slot()} to seat ${slot("to")} in the lobby for ${match()}`;
    case "lobby.spare":
      if (typeof p.open !== "boolean") return bg ? `промени резервното място в лобито за ${match()}` : `changed the spare seat in the lobby for ${match()}`;
      return p.open
        ? bg ? `отвори резервното място в лобито за ${match()}` : `opened the spare seat in the lobby for ${match()}`
        : bg ? `затвори резервното място в лобито за ${match()}` : `closed the spare seat in the lobby for ${match()}`;
    case "lobby.team": {
      const color = p.team === "red" ? (bg ? "червения" : "red") : p.team === "blue" ? (bg ? "синия" : "blue") : null;
      return color
        ? bg ? `премести играча от място ${slot()} в ${color} отбор в лобито за ${match()}` : `moved the player in seat ${slot()} to the ${color} team in the lobby for ${match()}`
        : bg ? `смени отбора на играча от място ${slot()} в лобито за ${match()}` : `changed the team of the player in seat ${slot()} in the lobby for ${match()}`;
    }

    case "refapp.link":
      return bg ? "свърза приложението за съдии" : "linked the referee app";
    case "refapp.unlink":
      return bg ? "прекъсна връзката с приложението за съдии" : "unlinked the referee app";
    case "overlay.link":
      return bg ? "свърза помощното приложение за стрийм оувърлея" : "linked the stream overlay helper";
    case "overlay.unlink":
      return bg ? "прекъсна връзката с помощното приложение за стрийм оувърлея" : "unlinked the stream overlay helper";
    case "stream.scene": {
      if (p.scene === null) return bg ? `включи автоматичната смяна на стрийм сцената за ${match()}` : `enabled automatic stream scenes for ${match()}`;
      const scenes: Record<string, string> = bg
        ? { soon: "Започваме скоро", intro: "Отбори", mappool: "Мапове", gameplay: "Игра", winner: "Победител", brb: "Връщаме се", end: "Благодарим" }
        : { soon: "Starting soon", intro: "Teams", mappool: "Mappool", gameplay: "Gameplay", winner: "Winner", brb: "Be right back", end: "Thanks for watching" };
      const key = text(p.scene) ?? "";
      const scene = Object.hasOwn(scenes, key) ? scenes[key] : undefined;
      return scene
        ? bg ? `смени стрийм сцената за ${match()} на ${b(scene)}` : `changed the stream scene for ${match()} to ${b(scene)}`
        : bg ? `смени стрийм сцената за ${match()}` : `changed the stream scene for ${match()}`;
    }

    case "qual.import":
      return bg ? `вкара ${num(p.scores)} резултата от лоби ${lobby()}` : `imported ${num(p.scores)} scores from lobby ${lobby()}`;
    case "qual.importAll":
      return bg ? `вкара ${num(p.scores)} резултата от всички лобита` : `imported ${num(p.scores)} scores from every lobby`;
    case "qual.setScore":
      return bg
        ? `сложи резултат ${num(p.score).toLocaleString("en-US")} на ${user()} за ${beatmap()}`
        : `set ${user()}'s score on ${beatmap()} to ${num(p.score).toLocaleString("en-US")}`;
    case "qual.deleteScore":
      return bg ? `изтри резултата на ${user()} за ${beatmap()}` : `deleted ${user()}'s score on ${beatmap()}`;
    case "qual.clearPlayer":
      return bg ? `изчисти всички квалификационни резултати на ${user()}` : `cleared all of ${user()}'s qualifier scores`;

    case "stage.update": {
      const pool = p.poolReleased ? (bg ? "пуснат" : "released") : bg ? "скрит" : "hidden";
      const ft = p.firstTo ? (bg ? `, до ${p.firstTo}` : `, first to ${p.firstTo}`) : "";
      return bg ? `обнови ${stage("id")} (мапове: ${pool}${ft})` : `updated ${stage("id")} (pool ${pool}${ft})`;
    }
    case "stage.blueprint": {
      const bp = (p.blueprint ?? {}) as Record<string, number>;
      const list = Object.entries(bp).map(([k, n]) => `${n} ${k}`).join(", ");
      return bg ? `смени структурата на пула за ${stage()} (${list})` : `set the pool layout for ${stage()} (${list})`;
    }
    case "stage.rename":
      return bg ? `преименува етап на ${b(p.title)}` : `renamed a stage to ${b(p.title)}`;
    case "map.add": {
      const as = `${p.mod}${p.slot ? ` #${p.slot}` : ""}`;
      return bg ? `добави ${b(p.title)} към мапуула за ${stage()} като ${as}` : `added ${b(p.title)} to the ${stage()} pool as ${as}`;
    }
    case "pool.suggest":
      return bg ? `предложи ${map()} за ${p.mod} #${p.slot}` : `suggested ${map()} for ${p.mod} #${p.slot}`;
    case "pool.vote":
      return bg ? `даде ${b(p.score)}/10 на ${map()}` : `scored ${map()} ${b(p.score)}/10`;
    case "pool.unsuggest":
      return bg ? `махна предложението ${map()}` : `removed the suggestion ${map()}`;
    case "pool.pick":
      return bg ? `${map()} спечели ${p.mod} #${p.slot} в ${stage()}` : `${map()} won ${p.mod} #${p.slot} in ${stage()}`;
    case "pool.force":
      return bg ? `избра водещия за ${p.mod} #${p.slot} в ${stage()}` : `picked the leader for ${p.mod} #${p.slot} in ${stage()}`;
    case "map.move":
      return bg ? `премести ${map()} ${num(p.dir) < 0 ? "нагоре" : "надолу"}` : `moved ${map()} ${num(p.dir) < 0 ? "up" : "down"}`;
    case "map.delete":
      return bg ? `махна ${map()} от мапуула` : `removed ${map()} from the pool`;
    case "stage.refreshMaps":
      return bg ? `обнови данните за маповете на ${stage()} (${num(p.updated)})` : `refreshed map data for ${stage()} (${num(p.updated)} maps)`;
    case "pack.upload":
      return bg ? `качи нов пак с мапове за ${stage()} (${mb(num(p.size))})` : `uploaded a new map pack for ${stage()} (${mb(num(p.size))})`;
    case "pack.generate":
      return bg
        ? `генерира пак с мапове за ${stage()} (${num(p.maps)} мапа, ${mb(num(p.size))})`
        : `generated the map pack for ${stage()} (${num(p.maps)} maps, ${mb(num(p.size))})`;
    case "pack.delete":
      return bg ? `махна пака с мапове за ${stage()}` : `removed the map pack for ${stage()}`;

    case "teams.generate":
      return bg ? `направи ${num(p.teams)} отбора по номерата от квалификациите` : `generated ${num(p.teams)} teams from the qualifier seeds`;
    case "teams.seed":
      return bg ? `подреди схемата: ${String(p.teams ?? "")}` : `seeded the bracket: ${String(p.teams ?? "")}`;
    case "teams.draw":
      return bg ? `изтегли отборите: ${String(p.teams ?? "")}` : `drew the teams: ${String(p.teams ?? "")}`;
    case "teams.badges":
      return p.badges === null ? (bg ? `върна значките на ${user()} от профила` : `reset ${user()}'s badges to their profile count`) : bg ? `смени значките на ${user()} на ${b(p.badges)}` : `set ${user()}'s badges to ${b(p.badges)}`;
    case "format.save":
      return bg ? "обнови плана на формата" : "updated the format plan";
    case "format.reset":
      return bg ? "върна плана на формата по подразбиране" : "reset the format plan to the default";
    case "edition.switch":
      return bg ? `превключи сайта на ${b(String(p.edition).toUpperCase())}` : `switched the site to ${b(String(p.edition).toUpperCase())}`;
    case "edition.seed":
      return bg ? "напълни BGCC7 с тестови данни" : "filled BGCC7 with test data";
    case "edition.clear":
      return bg ? "изчисти тестовите данни от BGCC7" : "cleared the BGCC7 test data";
    case "team.create":
      return bg ? `създаде отбор ${b(p.name)}` : `created team ${b(p.name)}`;
    case "team.update":
      return bg ? `промени отбор ${b(p.name)}` : `edited team ${b(p.name)}`;
    case "team.delete":
      return bg ? `изтри отбор ${team("id")}` : `deleted team ${team("id")}`;
    case "team.placeMember":
      return bg ? `премести ${user()} в ${team()}` : `moved ${user()} to ${team()}`;
    case "team.removeMember":
      return bg ? `извади ${user()} от отбора му` : `took ${user()} off their team`;

    case "match.save": {
      const score = p.score1 != null && p.score2 != null ? ` ${p.score1}-${p.score2}` : "";
      return bg ? `обнови мача ${match("id")}${score}` : `updated match ${match("id")}${score}`;
    }
    case "match.score.save": {
      const score = num(p.score).toLocaleString("en-US");
      const acc = p.acc != null ? ` · ${num(p.acc).toFixed(2)}%` : "";
      return bg ? `сложи резултат ${b(score + acc)} на ${user()} в ${match()}` : `set ${user()}'s score in ${match()} to ${b(score + acc)}`;
    }
    case "match.score.remove":
      return bg ? `махна резултата на ${user()} от ${match()}` : `removed ${user()}'s score from ${match()}`;
    case "match.score.undo":
      return bg ? `върна оригиналния резултат на ${user()} в ${match()}` : `undid the score edit for ${user()} in ${match()}`;
    case "match.fillSeeds":
      return bg ? "попълни първия кръг по номерата" : "filled the first round from the seeds";
    case "match.resetAll":
      return bg ? "нулира всички резултати от мачове" : "reset every match result";
    case "match.clearCache":
      return bg ? `изчисти запазения резултат за ${match("id")}` : `cleared the saved scoreboard for ${match("id")}`;

    case "reschedule.request":
      return bg ? `поиска ${match()} да се премести за ${b(when())}` : `asked to move ${match()} to ${b(when())}`;
    case "reschedule.accepted":
      return bg ? `прие смяната на часа за ${match()}` : `agreed to the new time for ${match()}`;
    case "reschedule.declined":
      return bg ? `отказа смяната на часа за ${match()}` : `turned down the new time for ${match()}`;
    case "reschedule.cancelled":
      return bg ? `оттегли молбата за смяна на часа за ${match()}` : `cancelled their reschedule request for ${match()}`;
    case "reschedule.approve":
      return bg ? `одобри ${match()} да се играе на ${b(when())}` : `approved moving ${match()} to ${b(when())}`;
    case "reschedule.deny":
      return bg ? `отказа смяната на часа за ${match()}` : `denied the reschedule for ${match()}`;

    case "site.links":
      return bg ? "обнови линковете в сайта" : "updated the site links";
    case "sponsor.add":
      return bg ? `добави спонсор ${b(p.name)}` : `added sponsor ${b(p.name)}`;
    case "sponsor.update":
      return p.from && p.from !== p.name
        ? bg
          ? `смени спонсор ${b(p.from)} с ${b(p.name)}`
          : `swapped sponsor ${b(p.from)} for ${b(p.name)}`
        : bg
          ? `обнови спонсор ${b(p.name)}`
          : `refreshed sponsor ${b(p.name)}`;
    case "sponsor.reorder":
      return bg ? "пренареди спонсорите" : "reordered the sponsors";
    case "sponsor.delete":
      return bg ? `махна спонсор ${b(p.name ?? `#${p.id}`)}` : `removed sponsor ${b(p.name ?? `#${p.id}`)}`;
    case "site.wipeTestData":
      return bg ? `изтри тестовите данни (${num(p.users)} тестови играчи)` : `wiped the test data (${num(p.users)} test players)`;

    case "staff.add":
      return bg ? `добави ${user()} в екипа` : `added ${user()} to the staff`;
    case "staff.reorder":
      return bg ? "пренареди екипа" : "reordered the staff";
    case "staff.update": {
      const list: string[] = Array.isArray(p.permRoles) ? p.permRoles.map(String) : p.permRole ? [String(p.permRole)] : [];
      const role = list.length ? list.map((r) => b(h.role(r))).join(" + ") : bg ? "без достъп" : "no access";
      return bg ? `смени правата на ${user()} на ${role}` : `set ${user()}'s access to ${role}`;
    }
    case "staff.remove":
      return bg ? `махна ${user()} от екипа` : `removed ${user()} from the staff`;
  }
  return bg ? "извърши неразпознато действие" : "performed an unrecognized action";
}

const VARYING: Record<string, string[]> = { "stream.scene": ["scene"] };

export function summarize(action: string, payload: unknown, c: LogCtx, h: LogHelpers): string {
  const p = payload && typeof payload === "object" && !Array.isArray(payload) ? { ...(payload as P) } : {};
  for (const k of VARYING[action] ?? []) delete p[k];
  return describe(action, p, c, h);
}
