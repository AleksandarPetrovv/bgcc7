import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const libUrl = new URL("../src/lib/", import.meta.url).href;
registerHooks({
  resolve(specifier, context, next) {
    const bare = specifier.startsWith(".") && !/\.\w+$/.test(specifier) && context.parentURL?.startsWith(libUrl);
    return next(bare ? `${specifier}.ts` : specifier, context);
  },
});
const { poolWindows, poolAccess } = await import("../src/lib/pool-window.ts");
const { toSofiaInput } = await import("../src/lib/time.ts");

// bgcc7 rounds → pools, and the 2027 test weeks
const r = (stage, week) => ({ name: stage, stage, week });
const rounds = {
  "winners-round-of-16": r("round-of-16", 1), "winners-quarterfinals": r("quarterfinals", 2), "winners-semifinals": r("semifinals", 4),
  "winners-final": r("finals", 6), "losers-round-1": r("quarterfinals", 2), "losers-round-2": r("quarterfinals", 3), "losers-round-3": r("semifinals", 4),
  "losers-round-4": r("semifinals", 5), "losers-round-5": r("finals", 6), "losers-final": r("finals", 7), "grand-final": r("grand-finals", 8),
};
const weeks = { 1: "2027-09-13", 2: "2027-09-20", 3: "2027-09-27", 4: "2027-10-04", 5: "2027-10-11", 6: "2027-10-18", 7: "2027-10-25", 8: "2027-11-01" };
const ws = poolWindows(rounds, weeks);
const show = (d) => (d ? toSofiaInput(d) : null);
assert.deepEqual(
  ws.map((w) => [w.stage, show(w.opens), show(w.closes)]),
  [
    ["round-of-16", "2027-09-07T00:00", "2027-09-12T23:59"],
    ["quarterfinals", "2027-09-14T00:00", "2027-09-19T23:59"],
    ["semifinals", "2027-09-21T00:00", "2027-10-03T23:59"],
    ["finals", "2027-10-05T00:00", "2027-10-17T23:59"],
    ["grand-finals", "2027-10-19T00:00", "2027-10-31T23:59"],
  ],
);
console.log("ok: windows match the agreed dates (31 Oct is the dst night, still 23:59 sofia)");

const at = (s) => new Date(s).getTime();
assert.equal(poolAccess(ws, new Set(), at("2027-09-01T12:00Z")).next?.stage, "round-of-16");
assert.equal(poolAccess(ws, new Set(), at("2027-09-08T12:00Z")).open?.stage, "round-of-16");
assert.equal(poolAccess(ws, new Set(["round-of-16"]), at("2027-09-13T12:00Z")).open, null, "monday gap");
assert.equal(poolAccess(ws, new Set(["round-of-16"]), at("2027-09-13T12:00Z")).next?.stage, "quarterfinals");
assert.equal(poolAccess(ws, new Set(["round-of-16", "quarterfinals"]), at("2027-09-28T12:00Z")).open?.stage, "semifinals");
assert.equal(poolAccess(ws, new Set(ws.map((w) => w.stage)), at("2027-11-02T12:00Z")).done, true);
console.log("ok: access opens a week before each pool's own week, one stage at a time, monday gap, done after gf");
