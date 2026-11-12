import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const libUrl = new URL("../src/lib/", import.meta.url).href;
registerHooks({
  resolve(specifier, context, next) {
    const bare = specifier.startsWith(".") && !/\.\w+$/.test(specifier) && context.parentURL?.startsWith(libUrl);
    return next(bare ? `${specifier}.ts` : specifier, context);
  },
});
const { fromSofiaInput, toSofiaInput, tzLabel, windowState } = await import("../src/lib/time.ts");
const { weekOf } = await import("../src/lib/schedule.ts");

assert.equal(tzLabel(new Date("2026-01-15T12:00Z")), "EET");
assert.equal(tzLabel(new Date("2026-07-15T12:00Z")), "EEST");
console.log("ok: january EET, july EEST");

const cases = [
  ["2026-10-24T19:00", "2026-10-24T16:00:00.000Z"],
  ["2026-10-25T20:00", "2026-10-25T18:00:00.000Z"],
  ["2026-10-25T03:30", "2026-10-25T00:30:00.000Z"],
  ["2026-03-29T02:59", "2026-03-29T00:59:00.000Z"],
  ["2026-03-29T04:00", "2026-03-29T01:00:00.000Z"],
];
for (const [local, utc] of cases) {
  assert.equal(fromSofiaInput(local)?.toISOString(), utc);
  assert.equal(toSofiaInput(new Date(utc)), local);
}
for (const utc of ["2026-03-29T01:00Z", "2026-10-25T00:59Z"]) assert.equal(tzLabel(new Date(utc)), "EEST");
for (const utc of ["2026-03-29T00:59Z", "2026-10-25T01:00Z"]) assert.equal(tzLabel(new Date(utc)), "EET");
assert.equal(fromSofiaInput("2026-03-29T03:30"), null);
assert.equal(fromSofiaInput("2026-02-30T12:00"), null);
assert.equal(fromSofiaInput("invalid"), null);
console.log("ok: march/october transitions, spring gap rejected, autumn repeat uses earlier instant");

const week = weekOf("2026-10-19");
assert.equal(week.from.toISOString(), "2026-10-23T15:00:00.000Z");
assert.equal(week.to.toISOString(), "2026-10-25T19:00:00.000Z");
assert.equal(week.deadline.toISOString(), "2026-10-21T20:59:59.999Z");
// a host-picked closing day keeps the time of day
assert.equal(weekOf("2026-10-19", "2026-10-22").deadline.toISOString(), "2026-10-22T20:59:59.999Z");
console.log("ok: week of 2026-10-19 window and wednesday deadline");

const realNow = Date.now;
try {
  const opens = new Date("2026-10-20T10:00Z");
  const closes = new Date("2026-10-20T11:00Z");
  for (const [now, state] of [[opens.getTime() - 1, "soon"], [opens.getTime(), "open"], [closes.getTime() - 1, "open"], [closes.getTime(), "closed"]]) {
    Date.now = () => now;
    assert.equal(windowState(opens, closes), state);
  }
} finally {
  Date.now = realNow;
}
console.log("ok: registration opens inclusive, closes exclusive");
