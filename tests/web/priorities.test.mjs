import { test } from "node:test";
import assert from "node:assert/strict";
import { AREAS, setsForAreas, urgency, weightsFor, todayQueue, daysUntil } from "../../web/priorities.js";
import { Store } from "../../web/store.js";
import { makeRng, GROUPS } from "../../web/drills.js";

const fakeStorage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test("six areas cover every set exactly once except 'all'", () => {
  const covered = Object.values(AREAS).flatMap((a) => a.sets);
  const expected = Object.keys(GROUPS).filter((g) => g !== "all");
  assert.deepEqual([...covered].sort(), expected.sort());
  assert.equal(Object.keys(AREAS).length, 6);
  for (const a of Object.values(AREAS)) assert.ok(a.title && a.sub);
});

test("setsForAreas keeps area order and falls back to interview", () => {
  assert.deepEqual(setsForAreas(["finance", "poker"]), ["banking", "accounting", "valuation", "walks", "deals", "interview", "poker", "pokeradv"]);
  assert.deepEqual(setsForAreas([]), ["interview"]);
});

test("urgency: 1 inside 14 days for interview-facing sets, else 0", () => {
  const today = new Date(2026, 9, 1);
  assert.equal(daysUntil("2026-10-10", today), 9);
  assert.equal(urgency("banking", "2026-10-10", today), 1);
  assert.equal(urgency("quick", "2026-10-10", today), 0);
  assert.equal(urgency("banking", "2026-12-01", today), 0);
  assert.equal(urgency("banking", null, today), 0);
});

test("weights: 1 + 2*weakness + urgency, weakness from share of drills below rung 'Solid'-ish", () => {
  const s = new Store(fakeStorage());
  const w = weightsFor(s, ["quick", "banking"], null, new Date(2026, 9, 1));
  assert.equal(w.quick, 3, "all drills weak -> 1 + 2*1");
  assert.equal(w.banking, 3);
  const w2 = weightsFor(s, ["banking"], "2026-10-05", new Date(2026, 9, 1));
  assert.equal(w2.banking, 4);
});

test("todayQueue: starred first, then weighted draws, no set above 60%, no duplicate keys", () => {
  const s = new Store(fakeStorage());
  const rng = makeRng(4);
  const q = todayQueue(s, ["quick", "banking"], 10, { quick: 10, banking: 1 }, rng);
  assert.equal(q.length, 10);
  assert.equal(new Set(q.map((i) => i.key)).size, 10);
  const quick = q.filter((i) => GROUPS.quick.includes(i.drill)).length;
  assert.ok(quick <= 6, `cap at 60%: got ${quick}`);
  assert.ok(quick >= 4, "weighted toward the heavy set");
});
