import { test } from "node:test";
import assert from "node:assert/strict";
import { CONTENT, isLive, draftSets } from "../../web/content.js";
import { GROUPS, DRAFT_GROUPS, DRILLS, makeRng } from "../../web/drills.js";
import { AREAS, setsForAreas, weightsFor, todayQueue } from "../../web/priorities.js";
import { PACKS, cleanSets } from "../../web/clubs.js";
import { buildDiagnostic } from "../../web/diagnostic.js";
import { LESSONS } from "../../web/lessons.js";
import { Store } from "../../web/store.js";

const fakeStorage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test("a live set has an explained date and, when it needs one, a reviewer", () => {
  for (const [set, c] of Object.entries(CONTENT)) {
    assert.ok(Number.isInteger(c.v) && c.v >= 1, `${set} has a version`);
    if (c.status === "live") {
      assert.match(c.explained ?? "", /^\d{4}-\d{2}-\d{2}$/, `${set} is live without an explained date`);
      if (c.needsReviewer) assert.ok(c.reviewer, `${set} is live without its reviewer`);
    }
  }
  assert.equal(isLive("mna", { mna: { v: 1, status: "live", explained: null } }), false, "no date, not live");
  assert.equal(isLive("mna", { mna: { v: 1, status: "live", explained: "2026-10-20" } }), true);
  assert.equal(isLive("energy2", { energy2: { v: 1, status: "live", explained: "2026-10-20", needsReviewer: true, reviewer: null } }), false, "needs its reviewer");
  assert.equal(isLive("banking"), true, "sets from before the gate count as live");
});

test("a draft set stays out of Today, Practice, placement, club packs and the Lessons list", () => {
  assert.deepEqual(draftSets(), Object.keys(DRAFT_GROUPS));
  for (const set of draftSets()) {
    assert.ok(!GROUPS[set] && !GROUPS.all.some((d) => DRAFT_GROUPS[set].includes(d)), `${set} in GROUPS`);
    const everyArea = setsForAreas(Object.keys(AREAS));
    assert.ok(!everyArea.includes(set), `${set} in priorities`);
    for (const p of Object.values(PACKS)) assert.ok(!p.sets.includes(set), `${set} in a club pack`);
    assert.deepEqual(cleanSets([set, "banking"], Object.keys(GROUPS)), ["banking"]);
    const diag = buildDiagnostic(everyArea, makeRng(1));
    assert.ok(!diag.some((it) => DRAFT_GROUPS[set].includes(it.drill)), `${set} in the placement test`);
    const store = new Store(fakeStorage()); store.load({ attempts: [], stars: {} });
    for (let s = 0; s < 20; s++) {
      const q = todayQueue(store, everyArea, 20, weightsFor(store, everyArea, null), makeRng(s));
      assert.ok(!q.some((it) => DRAFT_GROUPS[set].includes(it.drill)), `${set} in Today`);
    }
    assert.ok(!LESSONS.filter((l) => !l.set || GROUPS[l.set]).some((l) => l.set === set), `${set} lessons listed`);
  }
});

test("a draft still plays: its drills are registered and its lessons exist", () => {
  for (const [set, drills] of Object.entries(DRAFT_GROUPS)) {
    for (const d of drills) assert.equal(typeof DRILLS[d], "function", `${set}: ${d}`);
    assert.ok(LESSONS.some((l) => l.set === set), `${set} has a lesson`);
  }
});
