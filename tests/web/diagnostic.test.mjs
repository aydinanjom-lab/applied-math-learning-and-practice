import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDiagnostic, placeFromResults, ANCHORS, diagnosticDue } from "../../web/diagnostic.js";
import { GROUPS, makeRng } from "../../web/drills.js";

test("diagnostic: 8 typed items per set, up to 3 sets, interleaved, one per drill", () => {
  const items = buildDiagnostic(["interview", "quick", "banking", "energy"], makeRng(1));
  assert.equal(items.length, 24, "three sets max");
  for (const set of ["interview", "quick", "banking"]) {
    const mine = items.filter((i) => i.set === set);
    assert.equal(mine.length, 8, set);
    assert.equal(new Set(mine.map((i) => i.drill)).size, Math.min(8, GROUPS[set].length), "one per drill where the set has eight or more");
  }
  assert.notEqual(items[0].set, items[1].set, "interleaved");
  assert.ok(ANCHORS.banking.length === 8 && ANCHORS.banking.every((d) => GROUPS.banking.includes(d)));
  assert.ok(ANCHORS.quick.length === 8);
});

test("small sets pad to 8 with a second item from a different drill", () => {
  const items = buildDiagnostic(["energy"], makeRng(3));
  assert.equal(items.length, 8);
  assert.equal(new Set(items.map((i) => i.key)).size, 8);
});

test("placement never exceeds rung 3 and reports counts, not percentages", () => {
  const p = placeFromResults({ quick: { right: 8, total: 8 }, banking: { right: 3, total: 8 }, energy: { right: 0, total: 4 } });
  assert.equal(p.quick.rung, 3);
  assert.equal(p.banking.rung, 2);
  assert.equal(p.energy.rung, 1);
  assert.equal(p.quick.label, "8 of 8");
});

test("re-diagnostic is due after 28 days or when never done", () => {
  const now = 1_800_000_000;
  assert.equal(diagnosticDue([], now), true);
  assert.equal(diagnosticDue([{ ts: now - 10 * 86400 }], now), false);
  assert.equal(diagnosticDue([{ ts: now - 29 * 86400 }], now), true);
});
