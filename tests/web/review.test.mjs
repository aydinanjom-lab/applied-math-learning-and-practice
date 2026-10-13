import { test } from "node:test";
import assert from "node:assert/strict";
import { REVIEW_GAPS, MAX_REVIEWS, reviewState, dueReviews, upcomingReviews } from "../../web/review.js";

const DAY = 86400;
const t0 = 1_800_000_000;
const a = (family, correct, dayOffset, drill = family.split(":")[0]) => ({ key: `${family}:${dayOffset}:${correct}`, drill, family, correct, seconds: 5, mode: "type", ts: t0 + dayOffset * DAY });

test("gaps are 3, 7 and 21 days, and at most three come back per session", () => {
  assert.deepEqual(REVIEW_GAPS, [3, 7, 21]);
  assert.equal(MAX_REVIEWS, 3);
});

test("a kind cleared after two clean reps is due 3 days later, then 7, then 21, then done", () => {
  const log = [a("pot_odds", false, 0), a("pot_odds", true, 0.01), a("pot_odds", true, 0.02)];
  let s = reviewState(log);
  assert.equal(s.pot_odds.stage, 0);
  assert.equal(Math.round((s.pot_odds.due - t0) / DAY), 3);
  assert.equal(dueReviews(log, t0 + 2 * DAY).length, 0, "not due yet");
  assert.equal(dueReviews(log, t0 + 3.1 * DAY).length, 1);
  const log2 = [...log, a("pot_odds", true, 3.1)];
  s = reviewState(log2);
  assert.equal(s.pot_odds.stage, 1);
  assert.equal(Math.round((s.pot_odds.due - (t0 + 3.1 * DAY)) / DAY), 7);
  const log3 = [...log2, a("pot_odds", true, 10.2), a("pot_odds", true, 31.3)];
  assert.equal(reviewState(log3).pot_odds, undefined, "after the 21-day review it graduates");
});

test("a right answer before it is due changes nothing; a miss stars it again and resets", () => {
  const log = [a("ev_call", false, 0), a("ev_call", true, 0), a("ev_call", true, 0), a("ev_call", true, 1)];
  assert.equal(reviewState(log).ev_call.stage, 0, "early right answer does not advance");
  const missed = [...log, a("ev_call", false, 4)];
  assert.equal(reviewState(missed).ev_call, undefined, "starred again: the star list handles it, not reviews");
  assert.equal(dueReviews(missed, t0 + 30 * DAY).length, 0);
});

test("kinds never starred are never reviewed", () => {
  assert.deepEqual(reviewState([a("combos:pair", true, 0), a("combos:pair", true, 1)]), {});
});

test("an interview date shortens the gaps to at most 30% of the days left", () => {
  const log = [a("pot_odds", false, 0), a("pot_odds", true, 0), a("pot_odds", true, 0)];
  const s = reviewState(log, { interviewTs: t0 + 5 * DAY });
  assert.equal(Math.round((s.pot_odds.due - t0) / DAY), 1, "30% of 5 days, rounded down, at least 1");
  const past = reviewState(log, { interviewTs: t0 - DAY });
  assert.equal(Math.round((past.pot_odds.due - t0) / DAY), 3, "a passed interview does not cap");
});

test("due list is oldest first and capped; upcoming list says how many days", () => {
  const fams = ["a1", "a2", "a3", "a4"];
  const log = fams.flatMap((f, i) => [a(f, false, i * 0.1), a(f, true, i * 0.1), a(f, true, i * 0.1)]);
  const due = dueReviews(log, t0 + 10 * DAY);
  assert.equal(due.length, 3);
  assert.deepEqual(due.map((d) => d.family), ["a1", "a2", "a3"]);
  const up = upcomingReviews(log, t0 + DAY);
  assert.equal(up.length, 4);
  assert.equal(up[0].inDays, 2);
});
