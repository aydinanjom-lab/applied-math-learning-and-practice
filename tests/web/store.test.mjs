import { test } from "node:test";
import assert from "node:assert/strict";
import { Store } from "../../web/store.js";

const fakeStorage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const item = (key = "pot_odds:30:10") => ({ key, drill: "pot_odds", prompt: "Pot is $30 and it's $10 to call. Break-even equity (%)?", answer: 25, explanation: "e", rel_tol: 0, abs_tol: 0.6 });
const attempt = (correct, key = "pot_odds:30:10") => ({ key, drill: "pot_odds", correct, seconds: 3.2, mode: "type", ts: 0 });

test("miss stars, two clean reps clear, a miss resets", () => {
  const s = new Store(fakeStorage());
  s.record(item(), attempt(false));
  assert.deepEqual(s.starredItems().map((i) => i.key), ["pot_odds:30:10"]);
  s.record(item(), attempt(true));
  assert.equal(s.starredItems().length, 1);
  s.record(item(), attempt(false));
  s.record(item(), attempt(true));
  assert.equal(s.starredItems().length, 1, "streak reset");
  s.record(item(), attempt(true));
  assert.equal(s.starredItems().length, 0);
});

test("correct on unstarred item only logs", () => {
  const s = new Store(fakeStorage());
  s.record(item(), attempt(true));
  assert.equal(s.stars.size ?? Object.keys(s.stars).length, 0);
  assert.equal(s.attempts.length, 1);
});

test("saves and reloads, survives corrupt data", () => {
  const st = fakeStorage();
  const s = new Store(st);
  s.record(item(), attempt(false));
  s.markIntroShown("pot_odds");
  s.save();
  const s2 = new Store(st);
  assert.deepEqual(s2.starredItems().map((i) => i.key), ["pot_odds:30:10"]);
  assert.equal(s2.attempts[0].correct, false);
  assert.deepEqual(s2.introShown, ["pot_odds"]);
  st.setItem("applied_math_progress", "{not json");
  const s3 = new Store(st);
  assert.equal(s3.attempts.length, 0);
});

test("stats per drill", () => {
  const s = new Store(fakeStorage());
  s.record(item(), { ...attempt(true), seconds: 2 });
  s.record(item(), { ...attempt(false), seconds: 4 });
  assert.deepEqual(s.statsByDrill(), [{ drill: "pot_odds", attempts: 2, accuracy: 50, avgSeconds: 3 }]);
});

test("progress extras: days, weekly history, bests, overrides round-trip", () => {
  const st = fakeStorage();
  const s = new Store(st);
  s.markDay("2026-09-29"); s.markDay("2026-09-29");
  s.addWeekly({ week: "2026-09-27", score: 8, total: 10, ts: 1 });
  assert.equal(s.recordBest("poker", 55), true, "first time is a best");
  assert.equal(s.recordBest("poker", 60), false, "slower is not");
  assert.equal(s.recordBest("poker", 50), true);
  s.unlock("betting");
  s.save();
  const s2 = new Store(st);
  assert.deepEqual(s2.days, ["2026-09-29"]);
  assert.deepEqual(s2.weekly, [{ week: "2026-09-27", score: 8, total: 10, ts: 1 }]);
  assert.deepEqual(s2.bests, { poker: 50 });
  assert.deepEqual(s2.unlocked, ["betting"]);
  assert.deepEqual(s2.starredKeys(), []);
});

test("goal, session count, and feedback round-trip", () => {
  const st = fakeStorage();
  const s = new Store(st);
  assert.equal(s.sessions, 0);
  s.goal = "poker"; s.sessions += 1; s.feedback = "y";
  s.save();
  const s2 = new Store(st);
  assert.equal(s2.goal, "poker");
  assert.equal(s2.sessions, 1);
  assert.equal(s2.feedback, "y");
});
