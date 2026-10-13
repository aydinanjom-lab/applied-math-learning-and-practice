import { test } from "node:test";
import assert from "node:assert/strict";
import * as mna from "../../web/mna.js";
import { isCorrect, parseAnswerFor, makeRng, FAMILIES, DEFINITIONS, DRAFT_GROUPS } from "../../web/drills.js";
import { LESSON_BY_FAMILY } from "../../web/lessons.js";

// Plays back fixed choices, so a sample can be pinned to exact numbers.
const scripted = (...vals) => ({ choice(arr) { const v = vals.shift(); assert.ok(arr.includes(v), `${v} not offered in ${arr}`); return v; }, randint() { throw new Error("unused"); } });
const nums = (prompt) => prompt.match(/-?\d[\d,]*\.?\d*/g).map((x) => Number(x.replace(/,/g, "")));

test("the three pinned samples from content.md", () => {
  const gw = mna.mna_goodwill(scripted(25, 40, 30, 0.55, 100));
  assert.match(gw.prompt, /40M shares at \$25.*30% premium.*\$600M on the books, \$700M at fair value\. Ignore deferred taxes/);
  assert.equal(gw.answer, 600);
  assert.ok(!isCorrect(gw, 700), "price minus book value is the trap");
  const own = mna.mna_ownership(scripted(50, 100, 1000));
  assert.ok(Math.abs(own.answer - 16.667) < 0.01);
  assert.ok(isCorrect(own, 16.7) && !isCorrect(own, 20), "new / old shares is the trap");
  const acc = mna.mna_accretion_cash(scripted(200, 100, 60, 20, 6, 25));
  assert.ok(Math.abs(acc.answer - 3) < 1e-9);
  assert.match(acc.prompt, /Tax rate 25%.*paid in cash borrowed at 6%|paid in cash borrowed at 6%.*Tax rate 25%/);
});

test("each drill matches an independent calculation from its own prompt", () => {
  const rng = makeRng(7);
  for (let k = 0; k < 300; k++) {
    { const it = mna.mna_offer_value(rng); const [p, s, prem] = nums(it.prompt); assert.ok(Math.abs(it.answer - s * p * (1 + prem / 100)) < 1e-6); }
    { const it = mna.mna_goodwill(rng); const [s, p, prem, book, fair] = nums(it.prompt); assert.ok(Math.abs(it.answer - (s * p * (1 + prem / 100) - fair)) < 1e-6); assert.ok(it.answer > 0 && fair > book); }
    { const it = mna.mna_ownership(rng); const [bp, bs, v] = nums(it.prompt); const n = v / bp; assert.ok(Math.abs(it.answer - (100 * n) / (bs + n)) < 1e-6); }
    { const it = mna.mna_accretion_cash(rng); const [ni, sh, t, price, r, tax] = nums(it.prompt);
      const before = ni / sh, after = (ni + t - price * (r / 100) * (1 - tax / 100)) / sh;
      assert.ok(Math.abs(it.answer - 100 * (after / before - 1)) < 1e-6); }
    { const it = mna.mna_accretion_stock(rng); const [ni, sh, bp, t, price] = nums(it.prompt);
      assert.ok(Math.abs(it.answer - 100 * (((ni + t) / (sh + price / bp)) / (ni / sh) - 1)) < 1e-6); }
    { const it = mna.mna_eps_synergies(rng); const [ni, sh, bp, t, price, , tax] = nums(it.prompt);
      // Solve directly: (ni + t + s(1 - tax)) / (sh + price / bp) = ni / sh
      const s = ((ni / sh) * (sh + price / bp) - ni - t) / (1 - tax / 100);
      assert.ok(Math.abs(it.answer - s) < 1e-6 && s > 0);
      assert.ok(!isCorrect(it, s * (1 - tax / 100)), "after-tax synergies are the trap"); }
    { const it = mna.mna_max_cash_price(rng); const [t, r, tax] = nums(it.prompt);
      // At the answer, after-tax interest equals target earnings.
      assert.ok(Math.abs(it.answer * (r / 100) * (1 - tax / 100) - t) < 1e-6);
      assert.ok(!isCorrect(it, t / (r / 100)), "pre-tax cost of debt is the trap"); }
  }
});

test("accretion answers accept a rounded percent and the sign matters", () => {
  const rng = makeRng(11);
  for (let k = 0; k < 200; k++) {
    for (const d of [mna.mna_accretion_cash, mna.mna_accretion_stock]) {
      const it = d(rng);
      assert.ok(isCorrect(it, Math.round(it.answer * 10) / 10));
      assert.ok(!isCorrect(it, -it.answer), it.prompt);
    }
  }
});

test("$M answers typed with an M still count", () => {
  const rng = makeRng(3);
  for (const d of [mna.mna_offer_value, mna.mna_goodwill, mna.mna_eps_synergies, mna.mna_max_cash_price]) {
    const it = d(rng);
    assert.ok(isCorrect(it, parseAnswerFor(it, `${Math.round(it.answer * 10) / 10}M`)), it.prompt);
  }
});

test("every M&A drill has a family, a lesson and a definition", () => {
  for (const d of DRAFT_GROUPS.mna) {
    assert.ok(FAMILIES[d]?.name && FAMILIES[d]?.method, `family for ${d}`);
    assert.ok(LESSON_BY_FAMILY[d], `lesson for ${d}`);
    assert.ok(DEFINITIONS[d], `definition for ${d}`);
  }
});
