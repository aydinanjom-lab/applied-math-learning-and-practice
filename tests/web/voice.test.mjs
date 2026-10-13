import { test } from "node:test";
import assert from "node:assert/strict";
import { spokenNumber } from "../../web/voice.js";

test("spoken answers: digits and words both read as numbers", () => {
  const cases = [
    ["33.3", 33.3], ["1,250", 1250], ["$1,250", 1250], ["72%", 72], ["0.85", 0.85],
    ["thirty three point three", 33.3], ["thirty-three point three", 33.3], ["twenty five", 25],
    ["seventy two percent", 72], ["zero point eight five", 0.85], ["point five", 0.5],
    ["one thousand two hundred fifty", 1250], ["a hundred and twenty", 120], ["negative twelve", -12],
    ["minus 4", -4], ["4.5 million", 4.5e6], ["six hundred", 600], ["Twenty five.", 25], ["three to one", 3], ["twelve fifty", 1250], ["12:50", 1250], ["nineteen ninety nine", 1999], ["one hundred twenty", 120], ["seventy two", 72],
  ];
  for (const [said, want] of cases) assert.ok(Math.abs(spokenNumber(said) - want) < 1e-9, `${said} -> ${spokenNumber(said)}, want ${want}`);
});

test("spoken answers: anything unclear is null, so it falls back to self-grading", () => {
  for (const said of ["", "um", "three to two", "about thirty", "point", "thirty three point"]) assert.equal(spokenNumber(said), null, said);
});
