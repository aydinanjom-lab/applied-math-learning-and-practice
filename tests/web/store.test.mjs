import { test } from "node:test";
import assert from "node:assert/strict";
import { DRILLS, makeRng } from "../../web/drills.js";
import { Store } from "../../web/store.js";

const fakeStorage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const item = (key = "pot_odds:30:10") => ({ key, drill: "pot_odds", prompt: "Pot is $30 and it's $10 to call. Break-even equity (%)?", answer: 25, explanation: "e", rel_tol: 0, abs_tol: 0.6 });
const attempt = (correct, key = "pot_odds:30:10") => ({ key, drill: "pot_odds", correct, seconds: 3.2, mode: "type", ts: 0 });

test("miss stars, two clean reps clear, a miss resets", () => {
  const s = new Store(fakeStorage());
  s.record(item(), attempt(false));
  assert.deepEqual(s.starredItems().map((i) => i.family), ["pot_odds"]);
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
  assert.deepEqual(s2.starredItems().map((i) => i.family), ["pot_odds"]);
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

test("snapshot and load round-trip, and save fires onSave", () => {
  const s = new Store(fakeStorage());
  let fired = 0; s.onSave = () => fired++;
  s.record(item(), attempt(false)); s.markDay("2026-09-30"); s.save();
  const snap = s.snapshot();
  const s2 = new Store(fakeStorage()); s2.load(snap);
  assert.deepEqual(s2.snapshot(), snap);
  assert.equal(fired, 1);
});

test("glossary notes are stored per drill with a timestamp and round-trip", () => {
  const st = fakeStorage();
  const s = new Store(st);
  s.setNote("pot_odds", "call over pot plus call", 100);
  s.setNote("pot_odds", "", 200);
  assert.equal(s.notes.pot_odds, undefined, "empty text removes the note");
  s.setNote("pot_odds", "  call / (pot + call)  ", 300);
  s.save();
  const s2 = new Store(st);
  assert.deepEqual(s2.notes, { pot_odds: { text: "call / (pot + call)", ts: 300 } });
});

test("don't-know flags a family to learn, clears on two clean reps or by hand, and round-trips", () => {
  const st = fakeStorage();
  const s = new Store(st);
  const rng = makeRng(2);
  const a = DRILLS.ufcf(rng), b = DRILLS.ufcf(rng), c = DRILLS.ufcf(rng);
  s.flagToLearn(a, "ufcf_build", 100);
  assert.deepEqual(s.toLearnItems().map((x) => [x.family, x.lesson]), [["ufcf", "ufcf_build"]]);
  s.record(a, { key: a.key, drill: a.drill, correct: false, seconds: 9, mode: "type", ts: 100 });
  s.save();
  assert.ok(new Store(st).toLearn.ufcf, "persists");
  s.record(b, { key: b.key, drill: b.drill, correct: true, seconds: 9, mode: "type", ts: 101 });
  assert.ok(s.toLearn.ufcf, "one clean rep is not enough");
  s.record(c, { key: c.key, drill: c.drill, correct: true, seconds: 9, mode: "type", ts: 102 });
  assert.equal(s.toLearn.ufcf, undefined, "two clean reps clear it with the star");
  s.flagToLearn(a, null, 200); s.clearToLearn("ufcf");
  assert.deepEqual(s.toLearn, {});
});

test("priorities, stamps, diagnostics, and check locks round-trip", () => {
  const st = fakeStorage();
  const s = new Store(st);
  s.priorities = { areas: ["finance", "poker"], interviewDate: "2026-10-10", minutes: 10, when: "after breakfast" };
  s.stamp("quick", 4, 100);
  s.addDiagnostic({ ts: 100, results: { quick: { right: 6, total: 8 } } });
  s.lockCheck("quick", 200);
  s.save();
  const s2 = new Store(st);
  assert.deepEqual(s2.priorities, s.priorities);
  assert.deepEqual(s2.stamps, { quick: { rung: 4, ts: 100 } });
  assert.equal(s2.diagnostics.length, 1);
  assert.deepEqual(s2.checkLocks, { quick: 200 });
  s2.stamp("quick", 3, 300);
  assert.equal(s2.stamps.quick.rung, 4, "a stamp never lowers the rung");
});
