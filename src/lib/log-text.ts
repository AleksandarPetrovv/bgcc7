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
};

type P = Record<string, unknown>;

const b = (s: unknown) => `**${String(s ?? "?")}**`;
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;

export function describe(action: string, payload: unknown, c: LogCtx, h: LogHelpers): string {
  const p = (payload && typeof payload === "object" ? payload : {}) as P;
  const bg = h.lang === "bg";
  const user = (k = "osuId") => b(c.user.get(num(p[k])) ?? p.username ?? `#${p[k]}`);
  const lobby = (k = "lobbyId") => b(p.name && k === "id" ? p.name : (c.lobby.get(num(p[k])) ?? `#${p[k]}`));
  const team = (k = "teamId") => b(c.team.get(String(p[k])) ?? p.name ?? p[k]);
  const stage = (k = "stageId") => b(h.round(typeof p.stage === "string" ? p.stage : (c.stage.get(num(p[k])) ?? `#${p[k]}`)));
  const map = () => b(p.title ? `${p.title}${p.version ? ` [${p.version}]` : ""}` : (c.map.get(num(p.id)) ?? `#${p.id}`));
  const beatmap = () => b(c.beatmap.get(num(p.beatmapId)) ?? `#${p.beatmapId}`);
  const match = (k = "matchId") => {
    const id = String(p[k] ?? p.id ?? "?");
    const [x, y] = c.match.get(id) ?? [null, null];
    return x && y ? `${b(`${x} vs ${y}`)} (${id})` : b(id);
  };
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
    case "settings.scoring":
      return bg ? `смени EZ множителя на ${b("×" + p.ezMult)}` : `set the EZ multiplier to ${b("×" + p.ezMult)}`;
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
    case "map.add":
      return bg ? `добави ${b(p.title)} към мапуула за ${stage()} като ${p.mod}` : `added ${b(p.title)} to the ${stage()} pool as ${p.mod}`;
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
    case "staff.update": {
      const role = p.permRole ? b(h.role(String(p.permRole))) : bg ? "без достъп" : "no access";
      return bg ? `смени правата на ${user()} на ${role}` : `set ${user()}'s access to ${role}`;
    }
    case "staff.remove":
      return bg ? `махна ${user()} от екипа` : `removed ${user()} from the staff`;
  }
  return action;
}
