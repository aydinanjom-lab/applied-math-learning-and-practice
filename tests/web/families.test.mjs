import { test } from "node:test";
import assert from "node:assert/strict";
import { DRILLS, GROUPS, FAMILIES, familyOf, familyFromKey, buildQueue, makeRng } from "../../web/drills.js";
import { Store } from "../../web/store.js";

const fakeStorage = (init) => { const m = new Map(init ? [["applied_math_progress", JSON.stringify(init)]] : []); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const items = (name, n = 200, seed = 3, opts) => { const rng = makeRng(seed); return Array.from({ length: n }, () => DRILLS[name](rng, opts)); };

test("every item carries a family; kinded drills have several, others one", () => {
  for (const name of Object.keys(DRILLS)) {
    const fams = new Set(items(name).map(familyOf));
    assert.ok(fams.size >= 1, name);
    for (const f of fams) { assert.ok(f.startsWith(name), `${name} family ${f}`); assert.ok(FAMILIES[f], `missing FAMILIES entry for ${f}`); assert.ok(FAMILIES[f].name && FAMILIES[f].method, f); }
  }
  assert.equal(new Set(items("multiply_shortcuts").map(familyOf)).size, 3);
  assert.equal(new Set(items("pot_odds_bet", 500).map(familyOf)).size, 5, "split by bet size");
  assert.equal(new Set(items("statement_direction", 500).map(familyOf)).size, 14);
  assert.equal(new Set(items("pot_odds").map(familyOf)).size, 1);
});

test("a generator can be forced to a family", () => {
  for (const f of ["multiply_shortcuts:sq5", "combos:pair_blocked", "outs_equity:1", "pot_odds_bet:half", "back_of_envelope:mktcap", "growth_rate:double", "statement_direction:3"]) {
    const drill = f.split(":")[0];
    for (const it of items(drill, 30, 4, { family: f })) assert.equal(familyOf(it), f, f);
  }
});

test("familyFromKey maps old exact-item keys to families", () => {
  assert.equal(familyFromKey("pot_odds:30:10"), "pot_odds");
  assert.equal(familyFromKey("multiply_shortcuts:x11:47:11"), "multiply_shortcuts:x11");
  assert.equal(familyFromKey("statement_direction:3"), "statement_direction:3");
  assert.equal(familyFromKey("contribution_margin:45:12:6:3:pct"), "contribution_margin:pct");
  assert.equal(familyFromKey("contribution_margin:45:12:6:3"), "contribution_margin");
});

test("store stars families, clears after two clean reps, resets on a miss", () => {
  const s = new Store(fakeStorage());
  const a = items("multiply_shortcuts", 1, 5, { family: "multiply_shortcuts:x11" })[0];
  const b = items("multiply_shortcuts", 1, 6, { family: "multiply_shortcuts:x11" })[0];
  assert.notEqual(a.key, b.key);
  s.record(a, { key: a.key, drill: a.drill, family: familyOf(a), correct: false, seconds: 1, mode: "type", ts: 1 });
  assert.deepEqual(Object.keys(s.stars), ["multiply_shortcuts:x11"]);
  assert.equal(s.stars["multiply_shortcuts:x11"].example, a.prompt);
  assert.ok(s.isStarred(b), "a different item in the same family counts as starred");
  s.record(b, { key: b.key, drill: b.drill, family: familyOf(b), correct: true, seconds: 1, mode: "type", ts: 2 });
  s.record(a, { key: a.key, drill: a.drill, family: familyOf(a), correct: false, seconds: 1, mode: "type", ts: 3 });
  assert.equal(s.stars["multiply_shortcuts:x11"].streak, 0);
  s.record(a, { key: a.key, drill: a.drill, family: familyOf(a), correct: true, seconds: 1, mode: "type", ts: 4 });
  s.record(b, { key: b.key, drill: b.drill, family: familyOf(b), correct: true, seconds: 1, mode: "type", ts: 5 });
  assert.deepEqual(s.stars, {});
});

test("old exact-item stars migrate to family stars on load", () => {
  const old = { attempts: [], stars: { "multiply_shortcuts:x11:47:11": { item: { key: "multiply_shortcuts:x11:47:11", drill: "multiply_shortcuts", prompt: "What is 47 x 11?", answer: 517, explanation: "e", rel_tol: 0, abs_tol: 0.005 }, streak: 1 } } };
  const s = new Store(fakeStorage(old));
  assert.deepEqual(Object.keys(s.stars), ["multiply_shortcuts:x11"]);
  assert.equal(s.stars["multiply_shortcuts:x11"].streak, 1);
  assert.equal(s.stars["multiply_shortcuts:x11"].example, "What is 47 x 11?");
});

test("queue puts starred families first with fresh numbers", () => {
  const s = new Store(fakeStorage());
  const a = items("multiply_shortcuts", 1, 5, { family: "multiply_shortcuts:sq5" })[0];
  s.record(a, { key: a.key, drill: a.drill, family: familyOf(a), correct: false, seconds: 1, mode: "type", ts: 1 });
  const q = buildQueue(s, GROUPS.quick, 10, makeRng(11));
  assert.equal(familyOf(q[0]), "multiply_shortcuts:sq5");
  assert.equal(q.length, 10);
  assert.equal(new Set(q.map((i) => i.key)).size, 10);
  const q2 = buildQueue(s, ["pot_odds"], 3, makeRng(1));
  assert.ok(q2.every((i) => i.drill === "pot_odds"), "stars from other drills are left out");
});
