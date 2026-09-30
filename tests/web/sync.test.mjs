import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeProgress, rebuildStars } from "../../web/sync.js";

const it = (key, drill = "pot_odds") => ({ key, drill, prompt: "?", answer: 1, explanation: "e", rel_tol: 0, abs_tol: 0.5 });
const att = (key, correct, ts, mode = "type") => ({ key, drill: "pot_odds", correct, seconds: 3, mode, ts });

test("stars are rebuilt from the attempt log with the two-clean-reps rule", () => {
  const items = { "a": it("a"), "b": it("b") };
  const stars = rebuildStars([att("a", false, 1), att("a", true, 2), att("b", false, 3), att("a", true, 4)], items);
  assert.deepEqual(Object.keys(stars), ["b"]);
  assert.equal(stars.b.streak, 0);
});

test("merge takes the union of attempts, dedupes by key and time, and sorts by time", () => {
  const local = { attempts: [att("a", true, 1), att("b", false, 3)], stars: {}, days: ["2026-09-29"], weekly: [], bests: {}, unlocked: [], intro_shown: ["pot_odds"], goal: "poker", sessions: 3, feedback: null };
  const remote = { attempts: [att("a", true, 1), att("c", true, 2)], stars: {}, days: ["2026-09-28"], weekly: [{ week: "2026-09-27", score: 8, total: 10, ts: 5 }], bests: { poker: 50 }, unlocked: ["betting"], intro_shown: ["combos"], goal: null, sessions: 2, feedback: "y" };
  const m = mergeProgress(local, remote);
  assert.deepEqual(m.attempts.map((a) => a.key), ["a", "c", "b"]);
  assert.deepEqual(m.days, ["2026-09-28", "2026-09-29"]);
  assert.deepEqual(m.weekly, remote.weekly);
  assert.deepEqual(m.bests, { poker: 50 });
  assert.deepEqual(m.unlocked, ["betting"]);
  assert.deepEqual(m.intro_shown.sort(), ["combos", "pot_odds"]);
  assert.equal(m.goal, "poker", "local goal wins when remote has none");
  assert.equal(m.sessions, 3, "sessions is the max, not the sum");
  assert.equal(m.feedback, "y");
});

test("merge recomputes stars from the merged log, keeping item text from either side", () => {
  const local = { attempts: [att("a", false, 1)], stars: { a: { item: it("a"), streak: 0 } } };
  const remote = { attempts: [att("a", true, 2), att("a", true, 3)], stars: {} };
  const m = mergeProgress(local, remote);
  assert.deepEqual(m.stars, {}, "two later clean reps on the other device clear the star");
  const m2 = mergeProgress({ attempts: [att("z", false, 9)], stars: { z: { item: it("z"), streak: 0 } } }, { attempts: [], stars: {} });
  assert.equal(m2.stars.z.item.key, "z");
});

test("bests keep the fastest, weekly dedupes by week", () => {
  const m = mergeProgress({ attempts: [], stars: {}, bests: { poker: 40, quick: 90 }, weekly: [{ week: "w1", score: 7, total: 10, ts: 1 }] },
                          { attempts: [], stars: {}, bests: { poker: 45, banking: 60 }, weekly: [{ week: "w1", score: 7, total: 10, ts: 1 }, { week: "w2", score: 9, total: 10, ts: 2 }] });
  assert.deepEqual(m.bests, { poker: 40, quick: 90, banking: 60 });
  assert.deepEqual(m.weekly.map((w) => w.week), ["w1", "w2"]);
});
