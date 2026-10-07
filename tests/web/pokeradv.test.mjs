import { test } from "node:test";
import assert from "node:assert/strict";
import { DRILLS, GROUPS, UNLOCK_AFTER, FAMILIES, familyOf, familyFromKey, isCorrect, makeRng } from "../../web/drills.js";
import { LESSON_BY_FAMILY } from "../../web/lessons.js";

const items = (name, n = 600, seed = 21, opts) => { const rng = makeRng(seed); return Array.from({ length: n }, () => DRILLS[name](rng, opts)); };
const parts = (it) => it.key.split(":");
const BET = { third: 1 / 3, half: 1 / 2, twothirds: 2 / 3, pot: 1, over: 1.5 };

test("set is registered, gated behind poker, and every family has a note and a lesson", () => {
  assert.equal(GROUPS.pokeradv.length, 8);
  assert.equal(UNLOCK_AFTER.pokeradv, "poker");
  for (const d of GROUPS.pokeradv) for (const it of items(d, 80)) {
    const f = familyOf(it);
    assert.ok(FAMILIES[f], f); assert.ok(LESSON_BY_FAMILY[f], `no lesson for ${f}`); assert.equal(familyFromKey(it.key), f);
  }
});

test("defense and bluff frequencies match the anchors", () => {
  const want = { third: [75, 20], half: [66.67, 25], twothirds: [60, 28.57], pot: [50, 33.33], over: [40, 37.5] };
  for (const it of items("mdf")) { const [, k, pot] = parts(it); const bet = Number(pot) * BET[k]; assert.ok(isCorrect(it, (100 * Number(pot)) / (Number(pot) + bet))); assert.ok(isCorrect(it, want[k][0])); }
  for (const it of items("bluff_ratio")) { const [, k] = parts(it); assert.ok(isCorrect(it, want[k][1]), it.key); }
});

test("SPR uses the smaller stack; geometric sizing really gets the stacks in", () => {
  for (const it of items("spr")) { const [, pot, a, b] = parts(it).map(Number); assert.ok(isCorrect(it, Math.min(a, b) / pot)); }
  for (const it of items("geo_sizing")) {
    const [, pot, s, n] = parts(it).map(Number);
    let p = pot, inEach = 0;
    for (let k = 0; k < n; k++) { const b = it.answer * p; inEach += b; p += 2 * b; }
    assert.ok(Math.abs(inEach - s * pot) < 1e-6, `${it.key}: put in ${inEach}, stack ${s * pot}`);
  }
});

test("board combos count only unseen cards", () => {
  for (const it of items("board_combos")) {
    const p = parts(it);
    if (p[1] === "pair") { const left = 4 - Number(p[3]); assert.ok(isCorrect(it, (left * (left - 1)) / 2)); }
    else assert.ok(isCorrect(it, (4 - Number(p[4])) * (4 - Number(p[5]))));
  }
});

test("semi-bluff value agrees with the second formula; break-even folds give zero value", () => {
  for (const it of items("semibluff_ev")) {
    const [, pot, bet, fold, eq] = parts(it).map(Number); const f = fold / 100, e = eq / 100;
    assert.ok(isCorrect(it, f * pot + (1 - f) * (e * (pot + bet) - (1 - e) * bet)), it.key);
  }
  const ex = items("semibluff_ev", 3000).find((it) => it.key === "semibluff_ev:100:50:40:30");
  assert.ok(ex && isCorrect(ex, 46), "the lesson's worked example is 46");
  for (const it of items("semibluff_breakeven")) {
    const [, pot, bet, eq] = parts(it).map(Number); const f = it.answer / 100, e = eq / 100;
    assert.ok(Math.abs(f * pot + (1 - f) * (e * (pot + 2 * bet) - bet)) < 1e-6, it.key);
    if (eq === 0) assert.ok(isCorrect(it, (100 * bet) / (pot + bet)));
  }
});

test("preflop anchors accept the round number and the simulated value", () => {
  const sims = { aa_kk: [82, 82.1], pair_vs_lower: [80, 80.7], pair_vs_overs: [55, 55.7], dominated: [74, 74.0], overs_vs_unders: [60, 61.3], pair_vs_one_over: [70, 71.1] };
  for (const it of items("preflop_anchor", 200)) { const [, k] = parts(it); for (const v of sims[k]) assert.ok(isCorrect(it, v), `${k} rejects ${v}`); }
});
