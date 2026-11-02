// every name an admin log row can carry, with the log group it shows under; old rows keep their legacy names (refapp.*, draft.pick …)
const GROUPS = {
  phase: ["phase.dates", "phase.dismiss", "phase.sections", "phase.set", "phase.timeline"],
  screening: ["screening.add", "screening.approveAll", "screening.decide", "screening.refreshStats", "screening.remove"],
  players: ["lobby.book", "lobby.leave", "register.signup", "register.withdraw", "reschedule.accepted", "reschedule.cancelled", "reschedule.declined", "reschedule.request"],
  lobbies: [
    "draft.ban", "draft.choice", "draft.close", "draft.end", "draft.hold", "draft.open", "draft.pause", "draft.pick", "draft.redo", "draft.reset", "draft.resume", "draft.roll",
    "draft.timeoutAccept", "draft.timeoutDecline", "draft.timeoutRequest", "draft.undo", "draft.winner",
    "lobby.abort", "lobby.aborttimer", "lobby.chat", "lobby.close", "lobby.cmd", "lobby.create", "lobby.delete", "lobby.invite", "lobby.kick", "lobby.make", "lobby.move",
    "lobby.place", "lobby.refresh", "lobby.spare", "lobby.start", "lobby.team", "lobby.unbook", "lobby.update",
  ],
  qualifiers: ["qual.clearPlayer", "qual.deleteScore", "qual.import", "qual.importAll", "qual.setScore"],
  mappools: ["map.add", "map.delete", "map.move", "pack.delete", "pack.generate", "pack.upload", "pool.force", "pool.pick", "pool.suggest", "pool.unsuggest", "pool.vote", "stage.blueprint", "stage.refreshMaps", "stage.rename", "stage.update"],
  teams: ["team.create", "team.delete", "team.placeMember", "team.removeMember", "team.update", "teams.badges", "teams.draw", "teams.generate", "teams.seed"],
  matches: ["match.clearCache", "match.fillSeeds", "match.resetAll", "match.retryFinish", "match.save", "match.score.remove", "match.score.save", "match.score.undo", "reschedule.approve", "reschedule.deny"],
  staff: ["staff.add", "staff.remove", "staff.reorder", "staff.update"],
  site: [
    "discord.channels", "discord.cleanup", "discord.sync", "edition.clear", "edition.seed", "edition.switch", "format.reset", "format.save", "helper.link", "helper.unlink", "info.edit",
    "overlay.link", "overlay.unlink", "refapp.link", "refapp.unlink", "schedule.set", "schedule.week", "settings.draft", "settings.pickems", "settings.qualify", "settings.rounds",
    "site.links", "site.wipeTestData", "sponsor.add", "sponsor.delete", "sponsor.reorder", "sponsor.update", "stream.scene",
  ],
} as const;

export type LogGroup = keyof typeof GROUPS;
export type ActionName = (typeof GROUPS)[LogGroup][number];

const GROUP_OF = new Map<string, LogGroup>(Object.entries(GROUPS).flatMap(([g, names]) => names.map((n) => [n, g as LogGroup])));
export const groupOf = (action: string): LogGroup => GROUP_OF.get(action) ?? "site";
