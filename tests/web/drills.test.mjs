import { test } from "node:test";
import assert from "node:assert/strict";
import { DRILLS, GROUPS, DEFINITIONS, EXPLANATIONS, resolve, isCorrect, parseAnswer, fmt, makeRng } from "../../web/drills.js";

const items = (name, n = 300, seed = 1) => {
  const rng = makeRng(seed);
  return Array.from({ length: n }, () => DRILLS[name](rng));
};
const comb2 = (n) => (n * (n - 1)) / 2;
const nums = (it) => it.key.split(":").slice(1).map(Number);

test("registry: groups, definitions, answer-format line on every prompt", () => {
  assert.ok(["pot_odds", "outs_equity", "ev_call", "implied_odds", "combos"].every((d) => GROUPS.poker.includes(d)));
  assert.ok(["pot_odds", "outs_equity", "pot_odds_bet", "bluff_break_even", "pot_odds_decision"].every((d) => GROUPS.interview.includes(d)));
  assert.ok(["percent_of", "fraction_to_decimal", "multiply_shortcuts", "growth_rate", "back_of_envelope"].every((d) => GROUPS.quick.includes(d)));
  for (const g of ["banking", "moose", "novyx", "betting", "energy"]) assert.ok(GROUPS[g].length >= 5, g);
  for (const name of Object.keys(DRILLS)) {
    assert.ok(DEFINITIONS[name] && !DEFINITIONS[name].includes("\n"), name);
    for (const it of items(name, 20)) {
      if (!it.choices) assert.match(it.prompt, /Answer (in|with)|Call or fold/, `${name}: ${it.prompt}`);
      else assert.ok(it.choices.length >= 2 && Number.isInteger(it.answer) && it.answer < it.choices.length, `${name}: ${it.prompt}`);
      if (GROUPS.poker.includes(name)) assert.ok(!/equity|\bEV\b/i.test(it.prompt), `jargon in ${name}: ${it.prompt}`);
    }
  }
  assert.deepEqual(resolve("pot_odds"), ["pot_odds"]);
  assert.throws(() => resolve("nope"));
  assert.ok(EXPLANATIONS.card.includes("25%") && EXPLANATIONS.pot_odds.includes("$10"));
});

test("seeded rng is deterministic", () => {
  assert.deepEqual(items("pot_odds", 5, 7), items("pot_odds", 5, 7));
});

test("pot odds: call over pot plus call, clean ratios, brief example, new wording", () => {
  let saw30_10 = false;
  for (const it of items("pot_odds", 2000)) {
    const [pot, call] = nums(it);
    assert.ok(isCorrect(it, (call / (pot + call)) * 100));
    assert.ok(isCorrect(it, Math.round((call / (pot + call)) * 100)));
    assert.equal((pot * 12) % call, 0);
    assert.equal(call % 5, 0);
    assert.match(it.prompt, /^There is \$[\d,]+ in the pot\. It costs you \$[\d,]+ to call\./);
    if (it.key === "pot_odds:30:10") { saw30_10 = true; assert.equal(it.answer, 25); }
  }
  assert.ok(saw30_10);
});

test("outs: exact and rule of 4 and 2 both accepted, draws named, plain wording", () => {
  let names = "";
  for (const it of items("outs_equity", 1000)) {
    const [outs, cards] = nums(it);
    const exact = cards === 1 ? (outs / 46) * 100 : (1 - comb2(47 - outs) / comb2(47)) * 100;
    assert.ok(isCorrect(it, exact), it.prompt);
    assert.ok(isCorrect(it, outs * (cards === 2 ? 4 : 2)), it.prompt);
    assert.ok(/exact/i.test(it.explanation));
    names += it.prompt.toLowerCase();
    if (it.key === "outs_equity:9:2") assert.ok(Math.abs(it.answer - 34.97) < 0.01);
  }
  assert.ok(names.includes("flush draw") && names.includes("gutshot") && names.includes("one card to come") && names.includes("two cards to come"));
});

test("ev, implied odds, combos", () => {
  for (const it of items("ev_call")) {
    const [pot, call, eq] = nums(it);
    assert.ok(isCorrect(it, (eq / 100) * pot - (1 - eq / 100) * call));
  }
  for (const it of items("implied_odds")) {
    const [pot, call, eq] = nums(it);
    assert.ok(it.answer > 0);
    assert.ok(isCorrect(it, call / (eq / 100) - pot - call));
  }
  const expected = { pair: 6, suited: 4, offsuit: 12, any: 16, pair_blocked: 3, any_blocked: 12 };
  const seen = new Set();
  const order = "AKQJT98";
  for (const it of items("combos", 600)) {
    const [kind, r1, r2] = it.key.split(":").slice(1);
    seen.add(kind);
    assert.equal(it.answer, expected[kind]);
    if (kind !== "pair" && kind !== "pair_blocked") assert.ok(order.indexOf(r1) < order.indexOf(r2), `higher rank first: ${it.prompt}`);
  }
  assert.equal(seen.size, 6);
});

test("quick math drills match their prompts; no reducible fractions", () => {
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  for (const it of items("percent_of")) { const [pct, base] = nums(it); assert.ok(isCorrect(it, (pct * base) / 100)); }
  for (const it of items("fraction_to_decimal")) {
    const [n, d] = nums(it);
    assert.equal(gcd(n, d), 1, it.prompt);
    assert.ok(isCorrect(it, Math.round((n / d) * 100) / 100));
  }
  const kinds = new Set();
  for (const it of items("multiply_shortcuts")) { const [kind, a, b] = it.key.split(":").slice(1); kinds.add(kind); assert.ok(isCorrect(it, Number(a) * Number(b))); }
  assert.deepEqual([...kinds].sort(), ["sq5", "x11", "x25"]);
  for (const it of items("growth_rate")) {
    const parts = it.key.split(":");
    if (parts[1] === "double") assert.ok(isCorrect(it, 72 / Number(parts[2])));
    else { const a = Number(parts[2]), b = Number(parts[3]); assert.ok(isCorrect(it, ((b - a) / a) * 100)); }
  }
  const boe = new Set();
  for (const it of items("back_of_envelope", 400)) { boe.add(it.key.split(":")[1]); assert.equal(it.rel_tol, 0.05); }
  assert.equal(boe.size, 4);
});

test("banking pack", () => {
  for (const it of items("equity_value")) { const [ev, debt, cash] = nums(it); assert.ok(isCorrect(it, ev - debt + cash)); }
  for (const it of items("multiple_to_yield")) { const [x] = nums(it); assert.ok(isCorrect(it, 100 / x)); }
  for (const it of items("after_tax_debt")) { const [r, t] = nums(it); assert.ok(isCorrect(it, r * (1 - t / 100))); }
  for (const it of items("lbo_return")) {
    const [moic, years] = nums(it);
    assert.ok(isCorrect(it, (Math.pow(moic, 1 / years) - 1) * 100), it.prompt);
    assert.ok(/exact/i.test(it.explanation));
  }
  for (const it of items("accretion")) {
    const [a, b] = nums(it);
    assert.deepEqual(it.choices, ["Accretive", "Dilutive"]);
    assert.equal(it.answer, a > b ? 0 : 1);
    assert.ok(isCorrect(it, it.answer) && !isCorrect(it, 1 - it.answer));
  }
  for (const it of items("interest_coverage")) { const [e, i] = nums(it); assert.ok(isCorrect(it, e / i)); }
});

test("moose and novyx packs", () => {
  for (const it of items("contribution_margin")) {
    const [p, c, s, f] = nums(it);
    const dollars = p - c - s - (p * f) / 100;
    assert.ok(isCorrect(it, it.key.endsWith(":pct") ? (dollars / p) * 100 : dollars), it.prompt);
  }
  for (const it of items("payback_months")) { const [cac, cm, orders] = nums(it); assert.ok(isCorrect(it, cac / (cm * orders)), it.prompt); }
  for (const it of items("break_even_units")) { const [fixed, cm] = nums(it); assert.ok(isCorrect(it, fixed / cm)); }
  for (const it of items("discount_trap")) { const [m, d] = nums(it); assert.ok(isCorrect(it, (m / (m - d) - 1) * 100), it.prompt); }
  for (const it of items("roas_to_return")) { const [r, m] = nums(it); assert.ok(isCorrect(it, (r * (m / 100) - 1) * 100), it.prompt); }
  for (const it of items("customer_value")) { const [cm, orders] = nums(it); assert.ok(isCorrect(it, cm * orders)); }
  for (const it of items("rebooking_revenue")) { const [v, r, t] = nums(it); assert.ok(isCorrect(it, v * (r / 100) * t)); }
  for (const it of items("unrealized_revenue")) { const [v, r, target, t] = nums(it); assert.ok(isCorrect(it, v * ((target - r) / 100) * t)); }
  for (const it of items("rate_card")) { const [h, hours, m] = nums(it); assert.ok(isCorrect(it, (h * hours) / (1 - m / 100)), it.prompt); }
  for (const it of items("pipeline_revenue")) { const [l, c, t] = nums(it); assert.ok(isCorrect(it, l * (c / 100) * t)); }
  for (const it of items("lifetime_value")) { const [t, v, y] = nums(it); assert.ok(isCorrect(it, t * v * y)); }
});

test("betting pack: math only, generated odds", () => {
  for (const it of items("american_to_prob")) {
    const [odds] = nums(it);
    const p = odds > 0 ? 100 / (odds + 100) : -odds / (-odds + 100);
    assert.ok(isCorrect(it, p * 100), it.prompt);
  }
  for (const it of items("decimal_to_prob")) { const [d] = nums(it); assert.ok(isCorrect(it, (100 / d)), it.prompt); }
  for (const it of items("fraction_to_decimal_odds")) { const [n, d] = nums(it); assert.ok(isCorrect(it, n / d + 1)); }
  for (const it of items("remove_vig")) { const [a, b] = nums(it); assert.ok(a + b > 100); assert.ok(isCorrect(it, (a / (a + b)) * 100)); }
  for (const it of items("bet_ev")) { const [stake, d, p] = nums(it); assert.ok(isCorrect(it, (p / 100) * stake * (d - 1) - (1 - p / 100) * stake), it.prompt); }
  for (const it of items("kelly")) {
    const [p, d] = nums(it);
    const f = ((p / 100) * (d - 1) - (1 - p / 100)) / (d - 1);
    assert.ok(f > 0);
    assert.ok(isCorrect(it, f * 100), it.prompt);
    assert.ok(it.explanation.toLowerCase().includes("half"));
  }
  for (const name of GROUPS.betting) for (const it of items(name, 30)) assert.ok(!/bet\s*\$|place|wager/i.test(it.prompt.replace(/a bet/g, "")) || name === "bet_ev");
});

test("energy pack", () => {
  for (const it of items("oil_revenue")) { const [bpd, price] = nums(it); assert.ok(isCorrect(it, (bpd * price * 90) / 1e6), it.prompt); }
  for (const it of items("netback")) { const [p, opex, roy, trans] = nums(it); assert.ok(isCorrect(it, p - opex - roy - trans)); }
  for (const it of items("decline")) { const [bpd, r] = nums(it); assert.ok(isCorrect(it, bpd * (1 - r / 100))); }
  for (const it of items("reserve_life")) { const [mmbbl, bpd] = nums(it); assert.ok(isCorrect(it, (mmbbl * 1e6) / (bpd * 365)), it.prompt); }
  for (const it of items("breakeven_price")) { const [opex, capex, roy] = nums(it); assert.ok(isCorrect(it, (opex + capex) / (1 - roy / 100)), it.prompt); }
});

test("parse and format", () => {
  assert.equal(parseAnswer(" 1,200 "), 1200);
  assert.equal(parseAnswer("$45.5"), 45.5);
  assert.equal(parseAnswer("25%"), 25);
  assert.equal(parseAnswer("-4"), -4);
  assert.equal(parseAnswer("1.2k"), 1200);
  assert.equal(parseAnswer("twelve"), null);
  assert.equal(fmt(12), "12");
  assert.equal(fmt(0.375), "0.375");
  assert.equal(fmt(1234567), "1,234,567");
});
