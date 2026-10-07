import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCode, suggestCode, shortCode, newSeed, clubSessionItems, clubSessionLink, joinLink, summaryRows, holdJoin, takeJoin } from "../../web/clubs.js";
import { makeRng, GROUPS } from "../../web/drills.js";

test("codes normalise to uppercase letters, digits and dashes, 4 to 20 long", () => {
  assert.equal(normalizeCode(" kelley fir f26 "), "KELLEY-FIR-F26");
  assert.equal(normalizeCode("a b"), null);
  assert.equal(normalizeCode("x".repeat(21)), null);
  assert.equal(normalizeCode("--IU--"), null, "too short once dashes are trimmed");
  assert.equal(suggestCode("Kelley Finance & Investment Research"), "KELLEY-FINANCE");
  assert.equal(suggestCode("Investment Banking Workshop"), "INVESTMENT-BANKING");
  assert.equal(suggestCode(""), null);
});

test("short codes are four unambiguous characters; seeds are positive ints", () => {
  const rng = makeRng(3);
  for (let i = 0; i < 200; i++) assert.match(shortCode(rng), /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
  const s = newSeed(makeRng(4)); assert.ok(Number.isInteger(s) && s > 0);
});

test("a club session is the same ten questions for the same seed, different for another", () => {
  const a = clubSessionItems("banking", 12345), b = clubSessionItems("banking", 12345), c = clubSessionItems("banking", 12346);
  assert.equal(a.length, 10);
  assert.deepEqual(a.map((x) => x.key), b.map((x) => x.key));
  assert.notDeepEqual(a.map((x) => x.key), c.map((x) => x.key));
  assert.equal(new Set(a.map((x) => x.key)).size, 10, "no repeats");
  for (const it of a) assert.ok(GROUPS.banking.includes(it.drill));
  assert.throws(() => clubSessionItems("nope", 1));
});

test("links and pending-join storage", () => {
  assert.equal(clubSessionLink("MXQ7"), "https://napkinprep.com/#/s/MXQ7");
  assert.equal(joinLink("KELLEY-FIR"), "https://napkinprep.com/#/join/KELLEY-FIR");
  const m = new Map(); const st = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
  holdJoin(st, "KELLEY-FIR"); assert.equal(takeJoin(st), "KELLEY-FIR"); assert.equal(takeJoin(st), null);
});

test("summary rows: the floor hides everything but the member count", () => {
  assert.deepEqual(summaryRows({ members: 3, floor: true })[0], ["Members", "3"]);
  assert.equal(summaryRows({ members: 3, floor: true }).length, 2);
  const rows = summaryRows({ members: 12, active_7d: 7, attempts_7d: 310, typed_accuracy_7d: 74, returned_5_days: 2, top_missed: [{ drill: "wacc", misses: 9, tries: 20 }], club_session_done: 5, avg_level_by_set: { banking: 2.5 }, floor: false });
  assert.equal(rows.length, 8);
  assert.deepEqual(rows[5], ["Most missed", "wacc (9 of 20)"]);
  assert.deepEqual(rows[7], ["Average placed level", "Banking interview numbers 2.5"]);
});

import { PACKS, MAX_CLUB_SETS, cleanSets, mergeClubSets, clubSetIds, boostClubWeights } from "../../web/clubs.js";

test("packs only name sets that exist, and fit the database limit", () => {
  for (const [id, p] of Object.entries(PACKS)) {
    assert.ok(p.title && p.sets.length && p.sets.length <= MAX_CLUB_SETS, id);
    for (const s of p.sets) { assert.ok(GROUPS[s], `${id}: ${s}`); assert.match(s, /^[a-z0-9]+$/); }
  }
  assert.deepEqual(PACKS.poker.sets.slice(0, 2), ["pokeradv", "poker"]);
});

test("cleanSets drops unknown ids and repeats, keeps order, caps at eight", () => {
  assert.deepEqual(cleanSets(["poker", "nope", "poker", "prob"], Object.keys(GROUPS)), ["poker", "prob"]);
  assert.equal(cleanSets(Object.keys(GROUPS), Object.keys(GROUPS)).length, MAX_CLUB_SETS);
  assert.deepEqual(cleanSets(null, ["a"]), []);
});

test("club sets lead for the first two weeks, then follow personal priorities", () => {
  const now = Date.parse("2026-10-07T12:00:00Z");
  const club = (days) => [{ sets: ["pokeradv", "poker"], joined_at: new Date(now - days * 86400000).toISOString() }];
  assert.deepEqual(mergeClubSets(["banking", "poker"], club(3), now), ["pokeradv", "poker", "banking"]);
  assert.deepEqual(mergeClubSets(["banking", "poker"], club(20), now), ["banking", "poker", "pokeradv"]);
  assert.deepEqual(mergeClubSets(["banking"], [{ sets: [] }], now), ["banking"]);
  assert.deepEqual(mergeClubSets(["banking"], [], now), ["banking"]);
  assert.ok(clubSetIds(club(1)).has("pokeradv"));
});

test("club sets count double in the Today mix for the first two weeks only", () => {
  const now = Date.parse("2026-10-07T12:00:00Z");
  const w = { pokeradv: 3, banking: 3 };
  const at = (days) => [{ sets: ["pokeradv"], joined_at: new Date(now - days * 86400000).toISOString() }];
  assert.deepEqual(boostClubWeights(w, at(2), now), { pokeradv: 6, banking: 3 });
  assert.deepEqual(boostClubWeights(w, at(30), now), w);
  assert.deepEqual(boostClubWeights(w, [], now), w);
});
