import { test } from "node:test";
import assert from "node:assert/strict";
import { DRILLS, isCorrect, makeRng } from "../../web/drills.js";
import { RUNS } from "../../web/runs.js";
import { LESSONS } from "../../web/lessons.js";
import { exactEquity, ruleEquity } from "../../web/core.js";

const items = (name, n = 2000, seed = 9) => { const rng = makeRng(seed); return Array.from({ length: n }, () => DRILLS[name](rng)); };
const nums = (it) => it.key.split(":").slice(1).map(Number);

test("outs to chance: the plain rule, the corrected rule, and the exact number are all correct", () => {
  for (const it of items("outs_equity")) {
    const [outs, cards] = nums(it);
    for (const v of [ruleEquity(outs, cards), ruleEquity(outs, cards, true), exactEquity(outs, cards) / 100]) assert.ok(isCorrect(it, v * 100), `${it.key} rejects ${v * 100}`);
  }
});

test("call or fold never depends on rule versus exact", () => {
  for (const it of items("pot_odds_decision")) {
    const [pot, call, outs, cards] = nums(it);
    const need = call / (pot + call);
    const want = it.answer === 0;
    for (const v of [ruleEquity(outs, cards), ruleEquity(outs, cards, true), exactEquity(outs, cards) / 100]) assert.equal(v >= need, want, `${it.key} at ${v}`);
  }
});

test("pricing out a draw accepts the rule-of-4 bet and the exact bet", () => {
  for (const it of items("price_out_draw", 500)) {
    const [pot, outs] = nums(it);
    for (const h of [ruleEquity(outs, 2), exactEquity(outs, 2) / 100]) assert.ok(isCorrect(it, (h * pot) / (1 - 2 * h)), `${it.key} at ${h}`);
  }
});

test("the FIR poker run accepts 18% (rule of 2) and 19.6% (exact) for the flush draw", () => {
  for (let s = 0; s < 50; s++) {
    const [, flush] = RUNS.poker.build(makeRng(s));
    assert.ok(isCorrect(flush, 18) && isCorrect(flush, 19.6) && isCorrect(flush, 20));
  }
});

test("rule-of-72 and buyout anchors are accepted where the explanation offers them", () => {
  for (const it of items("lbo_return", 500)) {
    const [moic, years] = nums(it);
    if (moic === 2) assert.ok(isCorrect(it, 72 / years), it.key);
    const anchors = { "2:5": 15, "3:5": 25, "2:3": 26, "2.5:5": 20 };
    if (anchors[`${moic}:${years}`]) assert.ok(isCorrect(it, anchors[`${moic}:${years}`]), it.key);
  }
});

test("every rule of thumb named in an explanation is taught in a lesson", () => {
  const text = LESSONS.map((l) => [l.method, ...l.examples, l.when, l.trap].join(" ")).join(" ").toLowerCase();
  const rules = ["outs x 4", "72", "2x in 5 years is about 15%", "bet / (pot + 2 x bet)", "37.5%", "below about 2x", "0.09", "$365M a year is $1M a day",
    "most of the total", "about a quarter pot", "0.85 pot", "more than the pot", "chance it finishes in the money", "6 flips", "68-95-99.7",
    "Two standard errors", "Sharpe bands", "about 30%", "daily x 16", "sqrt((1 + correlation) / 2)", "1 / p", "about 5%", "convexity", "16%"];
  for (const r of rules) assert.ok(text.includes(r.toLowerCase()), `no lesson teaches: ${r}`);
});
