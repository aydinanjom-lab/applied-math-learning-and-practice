import { test } from "node:test";
import assert from "node:assert/strict";
import { DRILLS, GROUPS, FAMILIES, familyOf, isCorrect, makeRng } from "../../web/drills.js";
import { LESSONS } from "../../web/lessons.js";

const items = (name, n = 300, seed = 5, opts) => { const rng = makeRng(seed); return Array.from({ length: n }, () => DRILLS[name](rng, opts)); };
const nums = (it) => it.key.split(":").slice(1).map(Number);
const comb2 = (n) => (n * (n - 1)) / 2;

test("every lesson family has a drill that can produce it", () => {
  for (const l of LESSONS) for (const f of l.families) {
    const drill = f.split(":")[0];
    assert.ok(DRILLS[drill], `${l.id}: no drill for ${f}`);
    assert.ok(FAMILIES[f], `${l.id}: no FAMILIES entry for ${f}`);
    for (const it of items(drill, 10, 1, { family: f })) assert.equal(familyOf(it), f, `${drill} cannot be forced to ${f}`);
  }
});

test("quick math additions", () => {
  for (const it of items("near_100")) { const [a, b] = nums(it); assert.ok(a >= 88 && a <= 99 && b >= 88 && b <= 99); assert.ok(isCorrect(it, a * b), it.prompt); }
  for (const it of items("halve_double")) { const [a, b] = nums(it); assert.equal(a % 2, 0); assert.ok(isCorrect(it, a * b), it.prompt); }
  for (const it of items("split_multiply")) { const [a, b] = nums(it); assert.ok(isCorrect(it, a * b)); }
  const kinds = new Set();
  for (const it of items("divide_shortcuts", 500)) { const [d, n] = nums(it); kinds.add(familyOf(it)); assert.ok(isCorrect(it, n / d), it.prompt); assert.ok([4, 5, 8, 25, 50].includes(d)); }
  assert.equal(kinds.size, 5);
  for (const it of items("round_adjust")) { const [a, b] = nums(it); assert.ok(isCorrect(it, a * b)); assert.ok([1, 2, 8, 9].includes(a % 10)); }
  for (const it of items("reverse_percent")) { const [part, pct] = nums(it); assert.ok(isCorrect(it, part / (pct / 100)), it.prompt); }
  for (const it of items("percent_chain")) { const [a, b] = nums(it); assert.ok(isCorrect(it, ((1 + a / 100) * (1 + b / 100) - 1) * 100), it.prompt); }
  const uk = new Set();
  for (const it of items("unit_juggle", 400)) { uk.add(it.key.split(":")[1]); assert.ok(it.prompt.includes("Answer")); assert.ok(Number.isFinite(it.answer)); }
  assert.ok(uk.size >= 3);
});

test("poker additions", () => {
  const seen = new Set();
  for (const it of items("count_outs", 400)) {
    seen.add(it.key);
    assert.ok([2, 4, 6, 8, 9, 12, 15].includes(it.answer), it.prompt);
    assert.ok(isCorrect(it, it.answer) && !isCorrect(it, it.answer + 1));
  }
  assert.ok(seen.size >= 6);
  for (const it of items("pot_odds_ratio")) { const [pot, call] = nums(it); assert.ok(isCorrect(it, pot / call), it.prompt); assert.match(it.prompt, /to 1/); }
  for (const it of items("price_out_draw")) {
    const [pot, outs] = nums(it);
    const hit = 1 - comb2(47 - outs) / comb2(47);
    // smallest bet b such that b / (pot + 2b) > hit  =>  b > hit*pot / (1 - 2*hit)
    const minBet = (hit * pot) / (1 - 2 * hit);
    assert.ok(isCorrect(it, minBet), `${it.prompt} -> ${it.answer} vs ${minBet}`);
  }
});

test("finance additions", () => {
  for (const it of items("accretion_mix")) { assert.deepEqual(it.choices, ["Accretive", "Dilutive"]); assert.ok([0, 1].includes(it.answer)); }
  for (const it of items("synergies_breakeven")) { const [premium, mult] = nums(it); assert.ok(isCorrect(it, premium / mult), it.prompt); }
  for (const it of items("dcf_two_year")) { const [c1, c2, tv, r] = nums(it); const pv = c1 / (1 + r / 100) + (c2 + tv) / (1 + r / 100) ** 2; assert.ok(isCorrect(it, pv), `${it.prompt} -> ${it.answer} vs ${pv}`); }
  for (const it of items("debt_paydown")) { const [debt, pay, years] = nums(it); assert.ok(isCorrect(it, debt - pay * years)); assert.ok(it.answer >= 0); }
  for (const it of items("cap_table")) { const [own, raise, pre] = nums(it); assert.ok(isCorrect(it, own * (pre / (pre + raise))), it.prompt); }
});

test("groups updated and runs exist", async () => {
  for (const d of ["near_100", "halve_double", "split_multiply", "divide_shortcuts", "round_adjust", "reverse_percent", "percent_chain", "unit_juggle"]) assert.ok(GROUPS.quick.includes(d), d);
  for (const d of ["count_outs", "pot_odds_ratio", "price_out_draw"]) assert.ok(GROUPS.poker.includes(d), d);
  assert.ok(GROUPS.interview.includes("count_outs"));
  for (const d of ["accretion_mix", "synergies_breakeven", "dcf_two_year", "debt_paydown", "cap_table"]) assert.ok(GROUPS.banking.includes(d), d);
  const { RUNS } = await import("../../web/runs.js");
  assert.deepEqual(Object.keys(RUNS), ["poker", "finance", "accounting"]);
  for (const r of Object.values(RUNS)) { const items = r.build(makeRng(3)); assert.equal(items.length, 3, r.title); assert.ok(r.seconds >= 60); for (const it of items) assert.ok(it.prompt && (it.choices || Number.isFinite(it.answer))); }
});
