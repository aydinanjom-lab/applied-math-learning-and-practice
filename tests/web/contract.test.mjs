// Contract lint (content.md Q2): every drill, drafts included, follows the format rules on 200 samples.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DRILLS, GROUPS, DRAFT_GROUPS, FAMILIES, DEFINITIONS, familyOf, familyFromKey, isCorrect, parseAnswerFor, makeRng } from "../../web/drills.js";
import { promptUnit } from "../../web/core.js";

const SAMPLES = 200;
// The answer line closes the prompt; one short sign note may follow it ("Negative if it loses.").
const ENDS_WITH_ANSWER_LINE = /Answer [^.]*(\.\d[^.]*)*\.( (Negative|Positive) if [^.]*\.)?$/;
const setDrills = [...new Set([...Object.values(GROUPS).flat(), ...Object.values(DRAFT_GROUPS).flat()])];

test("every drill in a set is registered, and every registered drill is in a set", () => {
  for (const d of setDrills) assert.equal(typeof DRILLS[d], "function", d);
  const later = ["duration_price_change", "put_call_parity_number", "delta_hedge_shares"];
  for (const d of Object.keys(DRILLS)) assert.ok(setDrills.includes(d) || later.includes(d), `${d} is in no set`);
});

test("contract: prompt, answer, explanation, family, key", () => {
  const rng = makeRng(2026);
  for (const [d, fn] of Object.entries(DRILLS)) {
    const prompts = new Map();
    for (let k = 0; k < SAMPLES; k++) {
      const it = fn(rng);
      const where = `${d}: ${it.prompt}`;
      assert.equal(it.drill, d, where);
      assert.ok(it.prompt.length < 300, `${where} is ${it.prompt.length} characters`);
      if (it.choices) {
        assert.ok(Array.isArray(it.choices) && it.choices.length >= 2, where);
        assert.ok(Number.isInteger(it.answer) && it.answer >= 0 && it.answer < it.choices.length, `${where}: answer index`);
      } else {
        assert.match(it.prompt, ENDS_WITH_ANSWER_LINE, `${where}: must end with its answer line`);
        assert.ok(Number.isFinite(it.answer), `${where}: answer ${it.answer}`);
        assert.ok(it.rel_tol >= 0 && it.abs_tol >= 0, `${where}: tolerances`);
        assert.ok(isCorrect(it, it.answer), `${where}: its own answer is right`);
      }
      assert.ok(typeof it.explanation === "string" && it.explanation.length >= 20, `${where}: explanation`);
      const fam = familyOf(it);
      assert.ok(FAMILIES[fam]?.name && FAMILIES[fam]?.method, `${where}: no FAMILIES entry for ${fam}`);
      assert.equal(familyFromKey(it.key), fam, `${where}: key implies family ${familyFromKey(it.key)}, item says ${fam}`);
      if (prompts.has(it.key)) assert.equal(prompts.get(it.key), it.prompt, `${d}: key ${it.key} maps to two prompts`);
      prompts.set(it.key, it.prompt);
      if (!it.choices && promptUnit(it.prompt) === 1e6) {
        const shown = Math.round(it.answer * 10) / 10;
        if (isCorrect(it, shown)) assert.ok(isCorrect(it, parseAnswerFor(it, `${shown}M`)), `${where}: "${shown}M" should count`);
      }
    }
  }
});

test("every drill in a set has a one-line definition", () => {
  for (const d of setDrills) assert.ok(DEFINITIONS[d], `${d} has no definition`);
});
