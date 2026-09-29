import { test } from "node:test";
import assert from "node:assert/strict";
import { masteryLevel, LEVELS, groupLevel, streak, dayKey, weekKey, weeklyCheckDue, isUnlocked, sessionBest } from "../../web/progress.js";

const typed = (n, correct, secs = 5, drill = "pot_odds") => Array.from({ length: n }, (_, i) => ({ drill, correct: i < correct, seconds: secs, mode: "type" }));
const said = (n, drill = "pot_odds") => Array.from({ length: n }, () => ({ drill, correct: true, seconds: 1, mode: "say" }));

test("mastery: say mode never counts; levels follow accuracy, speed, stars", () => {
  assert.equal(masteryLevel(said(50), "pot_odds", []), 0);
  assert.equal(LEVELS[masteryLevel(typed(9, 9), "pot_odds", [])], "New");
  assert.equal(LEVELS[masteryLevel(typed(10, 7), "pot_odds", [])], "Learning");
  assert.equal(LEVELS[masteryLevel(typed(10, 8, 20), "pot_odds", [])], "Solid");
  assert.equal(LEVELS[masteryLevel(typed(10, 9, 11), "pot_odds", [])], "Fast");
  assert.equal(LEVELS[masteryLevel(typed(20, 19, 7), "pot_odds", [])], "Cold");
  assert.equal(LEVELS[masteryLevel(typed(20, 19, 7), "pot_odds", ["pot_odds:30:10"])], "Fast", "a starred item in the drill blocks Cold");
  assert.equal(LEVELS[masteryLevel(typed(20, 19, 7), "pot_odds", ["combos:pair:A:K"])], "Cold", "stars in other drills do not");
});

test("mastery uses only the last 20 typed attempts", () => {
  const old = typed(20, 0);            // all wrong, long ago
  const recent = typed(20, 20, 5);     // all right, recent
  assert.equal(LEVELS[masteryLevel([...old, ...recent], "pot_odds", [])], "Cold");
  assert.equal(LEVELS[masteryLevel([...recent, ...old], "pot_odds", [])], "Learning");
});

test("group level is the weakest drill in the group", () => {
  const attempts = [...typed(20, 20, 5, "pot_odds"), ...typed(20, 20, 5, "outs_equity")];
  assert.equal(LEVELS[groupLevel(attempts, ["pot_odds", "outs_equity"], [])], "Cold");
  assert.equal(LEVELS[groupLevel(attempts, ["pot_odds", "combos"], [])], "New");
});

test("streak counts consecutive days with one free skip per seven days", () => {
  const today = new Date(2026, 8, 29); // Sep 29 2026, local
  const d = (offset) => dayKey(new Date(2026, 8, 29 - offset));
  assert.equal(streak([], today), 0);
  assert.equal(streak([d(0)], today), 1);
  assert.equal(streak([d(1)], today), 1, "yesterday keeps the streak alive today");
  assert.equal(streak([d(2)], today), 0, "two days ago with nothing since: streak is gone");
  assert.equal(streak([d(0), d(1), d(2)], today), 3);
  assert.equal(streak([d(0), d(2), d(3)], today), 3, "one missed day is forgiven");
  assert.equal(streak([d(0), d(2), d(4)], today), 2, "two skips inside seven days is not: streak stops at the second gap");
  assert.equal(streak([d(0), d(2), d(3), d(4), d(5), d(6), d(7), d(8), d(10), d(11)], today), 10, "a second skip is fine once seven days have passed");
});

test("weekly check is due on Sundays until done that week", () => {
  const sunday = new Date(2026, 9, 4);   // Oct 4 2026 is a Sunday
  const monday = new Date(2026, 9, 5);
  assert.equal(weekKey(sunday), "2026-10-04");
  assert.equal(weekKey(new Date(2026, 9, 10)), "2026-10-04", "the following Saturday belongs to the same week");
  assert.equal(weeklyCheckDue(sunday, []), true);
  assert.equal(weeklyCheckDue(monday, []), false);
  assert.equal(weeklyCheckDue(sunday, [{ week: "2026-10-04", score: 8, total: 10 }]), false);
  assert.equal(weeklyCheckDue(sunday, [{ week: "2026-09-27", score: 8, total: 10 }]), true);
});

test("unlocks: betting needs poker Solid; everything else is open; override wins", () => {
  const weak = typed(5, 5);
  assert.equal(isUnlocked("betting", weak, [], []), false);
  assert.equal(isUnlocked("banking", weak, [], []), true);
  const solidPoker = ["pot_odds", "outs_equity", "ev_call", "implied_odds", "combos"].flatMap((d) => typed(10, 9, 10, d));
  assert.equal(isUnlocked("betting", solidPoker, [], []), true);
  assert.equal(isUnlocked("betting", weak, [], ["betting"]), true);
});

test("session best: typed, ten or more items, ninety percent or better", () => {
  assert.equal(sessionBest(typed(10, 9, 4)), 40, "total seconds");
  assert.equal(sessionBest(typed(10, 8, 4)), null);
  assert.equal(sessionBest(typed(5, 5, 4)), null);
  assert.equal(sessionBest(said(10)), null);
});
