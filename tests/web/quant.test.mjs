import { test } from "node:test";
import assert from "node:assert/strict";
import { DRILLS, GROUPS, LATER, UNLOCK_AFTER, FAMILIES, familyOf, familyFromKey, isCorrect, makeRng } from "../../web/drills.js";
import { LESSONS, LESSON_BY_FAMILY } from "../../web/lessons.js";
import { SPEED } from "../../web/levels.js";
import { AREAS } from "../../web/priorities.js";

const items = (name, n = 300, seed = 11, opts) => { const rng = makeRng(seed); return Array.from({ length: n }, () => DRILLS[name](rng, opts)); };
const nums = (it) => it.key.split(":").map((x) => (x === "" ? NaN : Number(x)));
const NEW_SETS = ["valuation", "walks", "deals", "rates", "prob"];

test("five new sets exist, are labelled, have speed targets, sit in an area, and gate as planned", () => {
  for (const s of NEW_SETS) { assert.ok(GROUPS[s].length >= 3, s); assert.ok(SPEED[s], s); }
  assert.deepEqual(LATER.rates, ["duration_price_change", "put_call_parity_number", "delta_hedge_shares"]);
  for (const d of LATER.rates) { assert.ok(DRILLS[d]); assert.ok(!GROUPS.rates.includes(d)); }
  assert.equal(UNLOCK_AFTER.deals, "banking"); assert.equal(UNLOCK_AFTER.rates, "deals");
  assert.ok(!UNLOCK_AFTER.valuation && !UNLOCK_AFTER.walks && !UNLOCK_AFTER.prob);
  const covered = Object.values(AREAS).flatMap((a) => a.sets);
  for (const s of NEW_SETS) assert.ok(covered.includes(s), s);
  // 39 planned drills, counting the three "later" ones
  assert.equal(NEW_SETS.flatMap((s) => GROUPS[s]).length + LATER.rates.length, 39);
});

test("every new family has a FAMILIES entry and a lesson", () => {
  for (const d of [...NEW_SETS.flatMap((s) => GROUPS[s]), ...LATER.rates]) {
    for (const it of items(d, 60)) {
      const f = familyOf(it);
      assert.ok(FAMILIES[f], `${d}: ${f}`);
      assert.ok(LESSON_BY_FAMILY[f], `no lesson for ${f}`);
      assert.equal(familyFromKey(it.key), f, `familyFromKey ${it.key}`);
    }
  }
});

test("valuation pieces compute from the stated inputs", () => {
  for (const it of items("ufcf")) { const [, ebit, t, da, capex, nwc] = nums(it); assert.ok(isCorrect(it, ebit * (1 - t / 100) + da - capex - nwc)); }
  for (const it of items("tv_exit_multiple")) { const [, e, m] = nums(it); assert.ok(isCorrect(it, e * m)); }
  for (const it of items("tv_perpetuity_vs_exit")) {
    const [, fcf, r, g, exit] = nums(it); const perp = (fcf * (1 + g / 100)) / ((r - g) / 100);
    assert.equal(it.answer, exit > perp ? 0 : 1); assert.ok(Math.abs(exit - perp) >= 0.08 * perp, "not a coin flip");
  }
  for (const it of items("implied_growth")) { const [, tv, fcf, r] = nums(it); const g = ((tv * r) / 100 - fcf) / (tv + fcf) * 100; assert.ok(isCorrect(it, g)); assert.ok(g > 0 && g <= 7); }
  assert.equal(new Set(items("mid_year_direction").map(familyOf)).size, 3);
  for (const it of items("comps_implied_ev")) { const [, m, e, d, sh] = nums(it); assert.ok(isCorrect(it, (m * e - d) / sh)); assert.ok(it.answer > 0); }
  for (const it of items("multiple_translate")) { const [, evr, mg] = nums(it); assert.ok(isCorrect(it, evr / (mg / 100))); }
  for (const it of items("pe_from_ev_ebitda")) { const [, m, e, d, ni] = nums(it); assert.ok(isCorrect(it, (m * e - d) / ni)); assert.ok(it.answer >= 5 && it.answer <= 40); }
});

test("accounting walks: the classic answers", () => {
  const dep = items("walk_depreciation_cash", 500).find((it) => it.key === "walk_depreciation_cash:10:40");
  assert.ok(dep && isCorrect(dep, 4));
  for (const it of items("walk_inventory_writedown", 400)) { const [, , w, t] = it.key.split(":"); const kind = it.key.split(":")[1]; const cash = (Number(w) * Number(t)) / 100; assert.ok(isCorrect(it, kind === "cash" ? cash : -(Number(w) - cash)), it.key); }
  for (const it of items("walk_sell_inventory", 400)) { const [, kind, rev, cogs, t] = it.key.split(":"); const pbt = Number(rev) - Number(cogs); assert.ok(isCorrect(it, kind === "ni" ? pbt * (1 - Number(t) / 100) : Number(rev) - (pbt * Number(t)) / 100), it.key); }
  for (const it of items("walk_capex_cash", 400)) { const [, kind, capex, life, t] = it.key.split(":"); const dep = Number(capex) / Number(life); const shield = (dep * Number(t)) / 100; assert.ok(isCorrect(it, kind === "cash" ? -Number(capex) + shield : -(dep - shield)), it.key); }
  for (const it of items("walk_debt_raise")) { const [, d, r, t] = nums(it); assert.ok(isCorrect(it, d - (d * r / 100) * (1 - t / 100))); }
  const bb = items("walk_buyback", 100);
  assert.deepEqual([...new Set(bb.map((it) => it.answer))].sort((a, b) => a - b), [-50, 0]);
});

test("deal math: paper-LBO pieces", () => {
  for (const it of items("sources_uses_equity")) { const [, m, e, lev, fees] = nums(it); assert.ok(isCorrect(it, m * e + fees - lev * e)); }
  for (const it of items("leverage_turns", 400)) {
    const [, kind, e, sr, sub, srR, subR] = it.key.split(":").map((x, i) => (i === 1 ? x : Number(x)));
    const senior = sr * e, junior = sub * e;
    assert.ok(isCorrect(it, kind === "total" ? senior + junior : (senior * srR + junior * subR) / (senior + junior)), it.key);
  }
  for (const it of items("cash_sweep_year")) { const [, d, f, s] = nums(it); assert.ok(isCorrect(it, d - (f * s) / 100)); }
  const m = items("moic_from_irr", 500).find((it) => it.key === "moic_from_irr:20:5"); assert.ok(m && isCorrect(m, 2.49) && isCorrect(m, 2.5));
  for (const it of items("exit_multiple_breakeven")) { const [, m, e0, e1] = nums(it); assert.ok(isCorrect(it, (m * e0) / e1)); }
  assert.equal(new Set(items("irr_sensitivity_direction").map(familyOf)).size, 5);
  for (const it of items("value_creation_split")) { const [, eqIn, eqOut, g, p] = nums(it); assert.ok(isCorrect(it, eqOut - eqIn - g - p)); }
});

test("rates and options", () => {
  assert.equal(new Set(items("price_yield_direction").map(familyOf)).size, 4);
  for (const it of items("current_yield", 400)) {
    const [, kind, c, p] = it.key.split(":").map((x, i) => (i === 1 ? x : Number(x)));
    if (kind === "yield") assert.ok(isCorrect(it, (c / p) * 100)); else assert.equal(it.answer, p < 100 ? 0 : 1);
  }
  for (const it of items("duration_price_change")) { const [, d, bp] = nums(it); assert.ok(isCorrect(it, (-d * bp) / 100)); }
  for (const it of items("call_payoff", 600)) {
    const [, kind, k, prem, s] = it.key.split(":").map((x, i) => (i === 1 ? x : Number(x)));
    const want = kind === "breakeven" ? k + prem : kind === "call" ? Math.max(s - k, 0) - prem : Math.max(k - s, 0) - prem;
    assert.ok(isCorrect(it, want), it.key);
  }
  for (const it of items("put_call_parity_number", 300)) {
    const [, kind, s, rate] = it.key.split(":").map((x, i) => (i === 1 ? x : Number(x)));
    if (kind === "pvk") assert.ok(isCorrect(it, s / (1 + rate / 100))); else assert.ok(isCorrect(it, rate));
  }
  for (const it of items("delta_hedge_shares")) { const [, n, d] = nums(it); assert.ok(isCorrect(it, n * 100 * d)); }
});

test("probability and statistics", () => {
  const dice = Object.fromEntries(items("dice_ev", 200).map((it) => [it.key.split(":")[1], it.answer]));
  assert.deepEqual(dice, { one: 3.5, two_sum: 7, two_product: 12.25, max: 4.47 });
  assert.ok(isCorrect(items("dice_ev", 200).find((it) => it.key === "dice_ev:max"), 161 / 36));
  for (const it of items("flips_to_first_heads")) { const p = Number(it.key.split(":")[2]); assert.ok(isCorrect(it, 1 / p)); }
  for (const it of items("make_a_market", 300)) { const [, kind, n, w] = it.key.split(":"); assert.ok(isCorrect(it, kind === "fair" ? 3.5 * Number(n) : 3.5 * Number(n) - Number(w) / 2)); }
  const cond = items("conditional_small", 200).find((it) => it.key === "conditional_small:0"); assert.ok(isCorrect(cond, 40));
  const b = items("bayes_100", 800).find((it) => it.key === "bayes_100:1:90:10"); assert.ok(b && isCorrect(b, 8.3));
  for (const it of items("mean_variance_quick", 400)) {
    const parts = it.key.split(":"); const xs = parts.slice(2).map(Number); const mean = xs.reduce((a, b) => a + b, 0) / 4;
    const v = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / 4;
    assert.ok(isCorrect(it, parts[1] === "mean" ? mean : v), it.key);
  }
  for (const it of items("standard_error", 400)) { const [, kind, sd, n, mean] = it.key.split(":").map((x, i) => (i === 1 ? x : Number(x))); const se = sd / Math.sqrt(n); assert.ok(isCorrect(it, kind === "se" ? se : mean / se), it.key); }
  for (const it of items("vol_sqrt_time")) { const [, kind, v] = it.key.split(":"); assert.ok(isCorrect(it, Number(v) * Math.sqrt(kind === "daily" ? 252 : 12))); }
  const sh = items("sharpe_quick", 600).find((it) => it.key === "sharpe_quick:annual:12:4:16"); assert.ok(sh && isCorrect(sh, 0.5));
  for (const it of items("z_score", 400)) { const [, kind, mean, sd, obs] = it.key.split(":").map((x, i) => (i === 1 ? x : Number(x))); const z = (obs - mean) / sd; if (kind === "z") assert.ok(isCorrect(it, z)); else assert.ok(it.answer > 0 && it.answer <= 16); }
  for (const it of items("correlation_sign", 400)) {
    const parts = it.key.split(":");
    if (parts[1] === "sign") { const pct = Number(parts[2]); assert.equal(it.answer, pct > 50 ? 0 : pct < 50 ? 1 : 2); }
    else { const [vol, rho] = parts.slice(2).map(Number); assert.ok(isCorrect(it, vol * Math.sqrt((1 + rho) / 2))); }
  }
  const ms = items("market_size_steps", 400).find((it) => it.key === "market_size_steps:330:2.5:60:12"); assert.ok(ms && isCorrect(ms, 6.6));
});
