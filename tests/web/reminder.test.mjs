import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { REMINDERS, REMINDER_FILES, reminderFor, reminderIcs } from "../../web/reminder.js";

test("each calendar file in web/ matches the generator", () => {
  for (const [name, hhmm] of Object.entries(REMINDER_FILES)) {
    const file = readFileSync(new URL(`../../web/reminder-${name}.ics`, import.meta.url), "utf8");
    assert.equal(file, reminderIcs(name, hhmm), `web/reminder-${name}.ics is stale`);
  }
});

test("calendar files are valid enough for phones: CRLF, short lines, daily, ten minutes", () => {
  const ics = reminderIcs("classes", "1215");
  assert.ok(ics.split("\r\n").every((l) => l.length <= 75), "lines must be 75 characters or fewer");
  assert.ok(!/[^\r]\n/.test(ics), "every line ends in CRLF");
  assert.match(ics, /DTSTART:20261014T121500\r\n/);
  assert.match(ics, /DTEND:20261014T122500\r\n/);
  assert.match(ics, /RRULE:FREQ=DAILY\r\n/);
});

test("every moment points at a file that exists, and no moment falls back to the evening", () => {
  const files = new Set(Object.keys(REMINDER_FILES).map((n) => `reminder-${n}.ics`));
  for (const r of Object.values(REMINDERS)) assert.ok(files.has(r.file), r.file);
  assert.equal(reminderFor(null).file, "reminder-evening.ics");
  assert.equal(reminderFor("before bed").time, "9:30 pm");
});
