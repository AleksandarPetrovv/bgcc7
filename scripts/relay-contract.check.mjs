import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const c = await import("../src/lib/relay-contract.ts");
const f = JSON.parse(readFileSync(new URL("../helper/contract/fixture.json", import.meta.url), "utf8"));

assert.deepEqual(f.errors, c.RELAY_ERR);
assert.deepEqual(f.liveRejects, c.LIVE_REJECTS);
assert.deepEqual(f.alertKinds, c.HELPER_ALERT_KINDS);
for (const [error, status] of Object.entries(f.errors)) assert.equal(c.relayError(error).status, status, error);
const reject = c.relayError(f.score.reject.error, { match: f.score.reject.match });
assert.equal(reject.status, 409);
assert.deepEqual(await reject.json(), f.score.reject);
console.log("ok: error codes, statuses and live rejects");

const L = f.limits;
const want = {
  linkTtlMs: c.LINK_TTL, claimPollMs: c.CLAIM_POLL_MS, claimPolls: c.CLAIM_POLLS, mePollMs: c.ME_POLL_MS, meRetryMs: c.ME_RETRY_MS, appSeenMs: c.APP_SEEN_MS,
  siteDownAfterMs: c.SITE_DOWN_AFTER, relayInMax: c.RELAY_IN_MAX, relayInBatch: c.RELAY_IN_BATCH, relayLineMax: c.RELAY_LINE_MAX,
  liveStaleMs: c.LIVE_STALE_MS, scoreKeepaliveMs: c.SCORE_KEEPALIVE_MS, ipcPlaying: c.IPC_PLAYING,
};
for (const [k, v] of Object.entries(want)) assert.equal(L[k], v, k);
assert.deepEqual(L.score, c.SCORE_LIMITS);
assert.ok(c.RELAY_IN_BATCH <= c.RELAY_IN_MAX);
assert.equal(c.CLAIM_POLL_MS * c.CLAIM_POLLS, c.LINK_TTL);
assert.ok(2 * c.ME_POLL_MS < c.APP_SEEN_MS, "two missed /me polls still count as running");
assert.ok(3 * c.SCORE_KEEPALIVE_MS < c.LIVE_STALE_MS);
assert.ok(c.ME_RETRY_MS < c.ME_POLL_MS);
console.log("ok: limits and timings");

const state = f.start.req.state;
assert.equal(state.length, Math.ceil((L.stateBytes * 4) / 3));
assert.ok(c.validState(state) && c.validState(f.claim.req.state));
assert.deepEqual(c.startRes(f.start.res.code), f.start.res);
assert.deepEqual(c.claimRes(f.claim.res.token, f.claim.res.name), f.claim.res);
assert.deepEqual(c.CLAIM_PENDING, f.claim.pending);
console.log("ok: pairing");

const alerts = [...f.me.alerts, ...f.stream.at(-1).alerts];
assert.ok(alerts.every(c.isAlert));
assert.deepEqual(new Set(alerts.map((a) => a.kind)), new Set(c.ALERT_KINDS), "one example of every site alert kind");
assert.ok(c.isAlertOf(c.HELPER_ALERT_KINDS)(f.siteDown) && !c.isAlert(f.siteDown));
assert.deepEqual(c.relayMe(f.me.id, f.me.name, f.me, f.me.alerts), f.me);
console.log("ok: /me and alerts");

const [hello, open, line, close, alertFrame] = f.stream;
assert.deepEqual([c.frame.hello(hello.name, hello.id), c.frame.open(), c.frame.line(line.l), c.frame.close(), c.frame.alerts(alertFrame.alerts)], f.stream);
// installed helpers split on "\n\n" and read "data: " lines; the alerts frame was a string concat before
assert.equal(c.sseFrame(c.frame.alerts(alertFrame.alerts)), `data: {"t":"alerts","alerts":${JSON.stringify(alertFrame.alerts)}}\n\n`);
console.log("ok: stream frames");

assert.ok(f.in.ev.every(c.validEv));
assert.equal(c.validEv({ t: "line", l: "x".repeat(c.RELAY_LINE_MAX + 1) }), false);
assert.deepEqual(c.parseScore(f.score.req), f.score.req);
assert.deepEqual(c.scoreOk(f.score.ok.match), f.score.ok);
assert.equal(c.parseScore({ ...f.score.req, clients: [{ ...f.score.req.clients[0], mods: ["hd"] }] }), null);
assert.ok(f.modFormat.valid.every(c.validMod) && !f.modFormat.invalid.some(c.validMod));
const over = { ...f.score.req.clients[0], accuracy: L.score.accuracyMax + 0.01 };
assert.equal(c.parseScore({ ...f.score.req, clients: [over] }), null);
assert.ok(c.parseScore({ ...f.score.req, clients: [{ ...over, accuracy: L.score.accuracyMax }] }));
console.log("ok: /in events and score packets");
