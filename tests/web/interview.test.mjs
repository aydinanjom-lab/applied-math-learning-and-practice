import { test } from "node:test";
import assert from "node:assert/strict";
import { DRILLS, GROUPS, DEFINITIONS, isCorrect, makeRng } from "../../web/drills.js";

const items = (name, n = 300, seed = 2) => { const rng = makeRng(seed); return Array.from({ length: n }, () => DRILLS[name](rng)); };
const nums = (it) => it.key.split(":").slice(1).map(Number);
const comb2 = (n) => (n * (n - 1)) / 2;

test("groups: interview grows, accounting exists, all drills have definitions and an answer line", () => {
  assert.deepEqual(GROUPS.interview, ["pot_odds", "outs_equity", "pot_odds_bet", "bluff_break_even", "pot_odds_decision"]);
  assert.ok(GROUPS.banking.length >= 14);
  assert.ok(GROUPS.accounting.length >= 6);
  for (const name of [...GROUPS.interview, ...GROUPS.banking, ...GROUPS.accounting]) {
    assert.ok(DRILLS[name], name);
    assert.ok(DEFINITIONS[name], name);
    for (const it of items(name, 20)) assert.match(it.prompt, /Answer (in|with)|Call or fold|Accretive or dilutive|no change\?/i, `${name}: ${it.prompt}`);
  }
  assert.equal(new Set(GROUPS.all).size, GROUPS.all.length);
});

test("pot odds with the bet stated separately: bet / (pot + 2 x bet)", () => {
  for (const it of items("pot_odds_bet")) {
    const [pot, bet] = nums(it);
    assert.ok(isCorrect(it, (bet / (pot + 2 * bet)) * 100), it.prompt);
    assert.match(it.prompt, /before your opponent bets/);
  }
  const half = items("pot_odds_bet", 2000).find((it) => nums(it)[0] === 100 && nums(it)[1] === 50);
  assert.ok(half && Math.abs(half.answer - 25) < 0.01, "half-pot bet needs 25%");
});

test("bluff break-even: bet / (pot + bet)", () => {
  for (const it of items("bluff_break_even")) {
    const [pot, bet] = nums(it);
    assert.ok(isCorrect(it, (bet / (pot + bet)) * 100), it.prompt);
  }
});

test("call or fold decision compares chance to hit with the pot-odds number", () => {
  const seen = new Set();
  for (const it of items("pot_odds_decision", 400)) {
    const [pot, call, outs, cards] = nums(it);
    const need = call / (pot + call);
    const hit = cards === 1 ? outs / 46 : 1 - comb2(47 - outs) / comb2(47);
    assert.deepEqual(it.choices, ["Call", "Fold"]);
    assert.equal(it.answer, hit >= need ? 0 : 1, it.prompt);
    seen.add(it.answer);
    assert.ok(Math.abs(hit - need) > 0.02, "no coin-flip cases");
  }
  assert.equal(seen.size, 2, "both answers occur");
});

test("banking additions", () => {
  for (const it of items("ev_from_equity")) { const [cap, debt, cash] = nums(it); assert.ok(isCorrect(it, cap + debt - cash)); }
  for (const it of items("pe_ratio")) { const [price, eps] = nums(it); assert.ok(isCorrect(it, price / eps), it.prompt); }
  for (const it of items("wacc")) { const [e, ke, kd, t] = nums(it); assert.ok(isCorrect(it, (e / 100) * ke + (1 - e / 100) * kd * (1 - t / 100)), it.prompt); }
  for (const it of items("capm")) { const [rf, beta, prem] = nums(it); assert.ok(isCorrect(it, rf + beta * prem), it.prompt); }
  for (const it of items("perpetuity")) { const [cf, r, g] = nums(it); assert.ok(isCorrect(it, cf / ((r - g) / 100)), it.prompt); }
  for (const it of items("discount_one_year")) { const [fv, r] = nums(it); assert.ok(isCorrect(it, fv / (1 + r / 100)), it.prompt); }
  for (const it of items("lbo_moic")) { const [ev, debt, exitEv, exitDebt] = nums(it); assert.ok(isCorrect(it, (exitEv - exitDebt) / (ev - debt)), it.prompt); }
  for (const it of items("bank_spread")) { const [loans, lend, pay] = nums(it); assert.ok(isCorrect(it, (loans * (lend - pay)) / 100), it.prompt); }
  for (const it of items("dividend_yield")) { const [div, price] = nums(it); assert.ok(isCorrect(it, (div / price) * 100), it.prompt); }
});

test("accounting set", () => {
  for (const it of items("eps")) { const [ni, sh] = nums(it); assert.ok(isCorrect(it, ni / sh), it.prompt); }
  for (const it of items("dep_net_income")) { const [d, t] = nums(it); assert.ok(isCorrect(it, -d * (1 - t / 100)), it.prompt); assert.ok(it.answer < 0); }
  for (const it of items("dep_cash")) { const [d, t] = nums(it); assert.ok(isCorrect(it, (d * t) / 100), it.prompt); assert.ok(it.answer > 0); }
  for (const it of items("working_capital")) { const [ca, cl] = nums(it); assert.ok(isCorrect(it, ca - cl)); }
  for (const it of items("net_income_from_ebit")) { const [ebit, i, t] = nums(it); assert.ok(isCorrect(it, (ebit - i) * (1 - t / 100)), it.prompt); }
  for (const it of items("balance_sheet")) { const [a, l] = nums(it); assert.ok(isCorrect(it, a - l)); }
  for (const it of items("statement_direction", 200)) {
    assert.deepEqual(it.choices, ["Up", "Down", "No change"]);
    assert.ok([0, 1, 2].includes(it.answer));
  }
});
