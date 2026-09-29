import { test } from "node:test";
import assert from "node:assert/strict";
import { DRILLS, GROUPS, DEFINITIONS, EXPLANATIONS, resolve, isCorrect, parseAnswer, fmt, makeRng } from "../../web/drills.js";

const items = (name, n = 300, seed = 1) => {
  const rng = makeRng(seed);
  return Array.from({ length: n }, () => DRILLS[name](rng));
};
const comb2 = (n) => (n * (n - 1)) / 2;

test("registry has both sets and one-line definitions", () => {
  assert.deepEqual(GROUPS.poker, ["pot_odds", "outs_equity", "ev_call", "implied_odds", "combos"]);
  assert.deepEqual(GROUPS.interview, ["pot_odds", "outs_equity"]);
  assert.deepEqual(GROUPS.quick, ["percent_of", "fraction_to_decimal", "multiply_shortcuts", "growth_rate", "back_of_envelope"]);
  for (const name of Object.keys(DRILLS)) assert.ok(DEFINITIONS[name] && !DEFINITIONS[name].includes("\n"), name);
  assert.deepEqual(resolve("pot_odds"), ["pot_odds"]);
  assert.throws(() => resolve("nope"));
  assert.ok(EXPLANATIONS.card.includes("25%") && EXPLANATIONS.pot_odds.includes("$10"));
});

test("seeded rng is deterministic", () => {
  assert.deepEqual(items("pot_odds", 5, 7), items("pot_odds", 5, 7));
});

test("pot odds: call over pot plus call, clean ratios, brief example", () => {
  let saw30_10 = false;
  for (const it of items("pot_odds", 2000)) {
    const [pot, call] = it.key.split(":").slice(1).map(Number);
    assert.ok(isCorrect(it, (call / (pot + call)) * 100));
    assert.ok(isCorrect(it, Math.round((call / (pot + call)) * 100)));
    assert.equal((pot * 12) % call, 0);
    assert.equal(call % 5, 0);
    if (it.key === "pot_odds:30:10") { saw30_10 = true; assert.equal(it.answer, 25); }
  }
  assert.ok(saw30_10);
});

test("outs equity: exact and rule of 4 and 2 both accepted, draws named", () => {
  let names = "";
  for (const it of items("outs_equity", 1000)) {
    const [outs, cards] = it.key.split(":").slice(1).map(Number);
    const exact = cards === 1 ? (outs / 46) * 100 : (1 - comb2(47 - outs) / comb2(47)) * 100;
    assert.ok(isCorrect(it, exact), it.prompt);
    assert.ok(isCorrect(it, outs * (cards === 2 ? 4 : 2)), it.prompt);
    assert.ok(it.explanation.includes("exact"));
    names += it.prompt.toLowerCase();
    if (it.key === "outs_equity:9:2") assert.ok(Math.abs(it.answer - 34.97) < 0.01);
  }
  assert.ok(names.includes("flush draw") && names.includes("gutshot") && names.includes("on the turn"));
});

test("ev, implied odds, combos", () => {
  for (const it of items("ev_call")) {
    const [pot, call, eq] = it.key.split(":").slice(1).map(Number);
    assert.ok(isCorrect(it, (eq / 100) * pot - (1 - eq / 100) * call));
  }
  for (const it of items("implied_odds")) {
    const [pot, call, eq] = it.key.split(":").slice(1).map(Number);
    assert.ok(it.answer > 0);
    assert.ok(isCorrect(it, call / (eq / 100) - pot - call));
  }
  const expected = { pair: 6, suited: 4, offsuit: 12, any: 16, pair_blocked: 3, any_blocked: 12 };
  const seen = new Set();
  for (const it of items("combos", 600)) {
    const kind = it.key.split(":")[1];
    seen.add(kind);
    assert.equal(it.answer, expected[kind]);
  }
  assert.equal(seen.size, 6);
});

test("quick math drills match their prompts", () => {
  for (const it of items("percent_of")) {
    const [pct, base] = it.key.split(":").slice(1).map(Number);
    assert.ok(isCorrect(it, (pct * base) / 100));
  }
  for (const it of items("fraction_to_decimal")) {
    const [n, d] = it.key.split(":").slice(1).map(Number);
    assert.ok(isCorrect(it, Math.round((n / d) * 100) / 100));
    assert.ok(!isCorrect(it, n / d + 0.02));
  }
  const kinds = new Set();
  for (const it of items("multiply_shortcuts")) {
    const [kind, a, b] = it.key.split(":").slice(1);
    kinds.add(kind);
    assert.ok(isCorrect(it, Number(a) * Number(b)));
  }
  assert.deepEqual([...kinds].sort(), ["sq5", "x11", "x25"]);
  for (const it of items("growth_rate")) {
    const parts = it.key.split(":");
    if (parts[1] === "double") assert.ok(isCorrect(it, 72 / Number(parts[2])));
    else {
      const a = Number(parts[2]), b = Number(parts[3]);
      assert.ok(isCorrect(it, ((b - a) / a) * 100), it.prompt);
    }
  }
  const boe = new Set();
  for (const it of items("back_of_envelope", 400)) {
    boe.add(it.key.split(":")[1]);
    assert.equal(it.rel_tol, 0.05);
    assert.ok(isCorrect(it, it.answer * 1.04) && !isCorrect(it, it.answer * 1.06));
  }
  assert.equal(boe.size, 4);
});

test("parse and format", () => {
  assert.equal(parseAnswer(" 1,200 "), 1200);
  assert.equal(parseAnswer("$45.5"), 45.5);
  assert.equal(parseAnswer("25%"), 25);
  assert.equal(parseAnswer("1.2k"), 1200);
  assert.equal(parseAnswer("3M"), 3_000_000);
  assert.equal(parseAnswer("twelve"), null);
  assert.equal(parseAnswer(""), null);
  assert.equal(fmt(12), "12");
  assert.equal(fmt(0.375), "0.375");
  assert.equal(fmt(1234567), "1,234,567");
  assert.equal(fmt(33.333333), "33.333");
});
