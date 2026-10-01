import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRoute, TABS, tabFor } from "../../web/router.js";

test("routes parse with params and map to tabs", () => {
  assert.deepEqual(parseRoute(""), { name: "today", params: {}, tab: "today" });
  assert.deepEqual(parseRoute("#/"), { name: "today", params: {}, tab: "today" });
  assert.deepEqual(parseRoute("#/practice/"), { name: "practice", params: {}, tab: "practice" });
  assert.deepEqual(parseRoute("#/set/banking"), { name: "set", params: { id: "banking" }, tab: "practice" });
  assert.deepEqual(parseRoute("#/lesson/ufcf_build"), { name: "lesson", params: { id: "ufcf_build" }, tab: "lessons" });
  assert.deepEqual(parseRoute("#/join/KELLEY-FIR"), { name: "join", params: { code: "KELLEY-FIR" }, tab: "you" });
  assert.deepEqual(parseRoute("#/s/MXQ7"), { name: "clubSession", params: { short: "MXQ7" }, tab: "practice" });
  assert.equal(parseRoute("#/session").name, "session");
  assert.equal(parseRoute("#/explain/pot%20odds").params.name, "pot odds");
});

test("unknown routes fall back to today and say so", () => {
  const r = parseRoute("#/nope/what");
  assert.equal(r.name, "today"); assert.ok(r.unknown);
  assert.equal(parseRoute("#/set").name, "today", "missing param is not a set route");
});

test("five tabs, each with a path that parses back to itself", () => {
  assert.equal(TABS.length, 5);
  for (const t of TABS) assert.equal(parseRoute(t.path).tab, t.id);
  assert.equal(tabFor("account"), "you");
});
