import { test } from "node:test";
import assert from "node:assert/strict";
import { RUNGS, setRung, rungDetail, SPEED, checkRequirement, decayRung, buildLevelCheck, gradeLevelCheck } from "../../web/levels.js";
import { GROUPS, makeRng } from "../../web/drills.js";

const now = 1_800_000_000; // seconds
const att = (drill, correct, seconds, ago = 0, mode = "type") => ({ key: `${drill}:x`, drill, family: drill, correct, seconds, mode, ts: now - ago });
const spread = (set, n, correct = true, seconds = 5, ago = 0) => Array.from({ length: n }, (_, i) => att(GROUPS[set][i % GROUPS[set].length], correct, seconds, ago + i));

test("rungs 0-3 come from breadth and accuracy of typed attempts in the last 90 days", () => {
  assert.equal(RUNGS.length, 8);
  assert.equal(setRung([], "quick", {}, [], now), 0);
  assert.equal(setRung([att("percent_of", true, 5)], "quick", {}, [], now), 1);
  assert.equal(setRung(spread("quick", 10), "quick", {}, [], now), 2, "10 attempts across at least half the drills");
  assert.equal(setRung(spread("quick", 20, true), "quick", {}, [], now), 3, "20 attempts at 70%+");
  assert.equal(setRung(spread("quick", 20, false), "quick", {}, [], now), 2, "20 attempts but low accuracy stays at Learning");
  assert.equal(setRung(spread("quick", 20, true, 5, 100 * 86400), "quick", {}, [], now), 0, "older than 90 days does not count");
  assert.equal(setRung(spread("quick", 20, true, 5, 0).map((a) => ({ ...a, mode: "say" })), "quick", {}, [], now), 0, "say mode never counts");
  assert.equal(setRung(spread("quick", 8).map((a) => ({ ...a, mode: "diag" })), "quick", {}, [], now), 1, "diagnostic attempts count as typed");
});

test("rungs 4-7 need a stamped level check plus current proof", () => {
  const good = spread("quick", 30, true, 4);
  assert.equal(setRung(good, "quick", {}, [], now), 3, "no stamp, capped at 3");
  assert.equal(setRung(good, "quick", { quick: { rung: 4, ts: now } }, [], now), 4);
  assert.equal(setRung(good, "quick", { quick: { rung: 6, ts: now } }, [], now), 6);
  assert.equal(setRung(good, "quick", { quick: { rung: 7, ts: now } }, ["percent_of"], now), 6, "a star in the set blocks Cold");
  const slow = spread("quick", 30, true, 9);
  assert.equal(setRung(slow, "quick", { quick: { rung: 6, ts: now } }, [], now), 4, "too slow for Quick (quick set: median under 8s) falls back to Solid");
});

test("decay: stale at 14 days, drop one rung at 28, two at 56, floor 2", () => {
  assert.deepEqual(decayRung(6, 0), { rung: 6, stale: false });
  assert.deepEqual(decayRung(6, 15), { rung: 6, stale: true });
  assert.deepEqual(decayRung(6, 30), { rung: 5, stale: true });
  assert.deepEqual(decayRung(6, 60), { rung: 4, stale: true });
  assert.deepEqual(decayRung(3, 60), { rung: 2, stale: true });
  assert.deepEqual(decayRung(1, 60), { rung: 1, stale: true }, "floor only applies above 2");
});

test("speed thresholds are per set", () => {
  assert.deepEqual(SPEED.quick, { quick: 8, fast: 5 });
  assert.deepEqual(SPEED.banking, { quick: 20, fast: 12 });
  assert.deepEqual(SPEED.interview, { quick: 12, fast: 8 });
});

test("level check: 10 items from the set, weakest drills first, pass rule by target rung", () => {
  const attempts = [...spread("quick", 30, true, 4), att("percent_chain", false, 5), att("percent_chain", false, 5), att("percent_chain", false, 5)];
  const items = buildLevelCheck(attempts, "quick", makeRng(2));
  assert.equal(items.length, 10);
  assert.equal(new Set(items.map((i) => i.key)).size, 10);
  assert.equal(items[0].drill, "percent_chain", "weakest drill comes first");
  assert.deepEqual(checkRequirement(4), { need: 9 });
  assert.deepEqual(checkRequirement(6), { need: 10 });
  assert.equal(gradeLevelCheck(9, 4), true);
  assert.equal(gradeLevelCheck(9, 6), false);
});

test("rungDetail explains the next step", () => {
  const d = rungDetail(spread("quick", 30, true, 4), "quick", {}, [], now);
  assert.equal(d.rung, 3);
  assert.equal(d.canCheck, 4, "eligible to sit the check for Solid");
  assert.match(d.next, /level check/i);
});
