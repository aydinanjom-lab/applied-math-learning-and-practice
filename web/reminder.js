// Daily calendar reminder: one static .ics file per moment, so the phone's calendar opens it like any invite.
// A calendar event needs no server and no push permission. Deleting it in the calendar stops it.
export const REMINDERS = {
  "after breakfast": { file: "reminder-breakfast.ics", time: "8:30 am" },
  "between classes": { file: "reminder-classes.ics", time: "12:15 pm" },
  "before bed": { file: "reminder-bed.ics", time: "9:30 pm" },
};
const NO_MOMENT = { file: "reminder-evening.ics", time: "7:00 pm" };
export const reminderFor = (when) => REMINDERS[when] ?? NO_MOMENT;

// The text of each file. tests/web/reminder.test.mjs checks the files in web/ match this.
export function reminderIcs(name, hhmm) {
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Napkin//Daily reminder//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:napkin-reminder-${name}@napkinprep.com`,
    "DTSTAMP:20261013T120000Z",
    `DTSTART:20261014T${hhmm}00`,
    `DTEND:20261014T${addMinutes(hhmm, 10)}00`,
    "RRULE:FREQ=DAILY",
    "SUMMARY:Napkin: today's questions",
    "DESCRIPTION:Ten questions\\, about five minutes. https://napkinprep.com",
    "URL:https://napkinprep.com/",
    "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Napkin", "TRIGGER:PT0M", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n");
}
function addMinutes(hhmm, m) {
  const t = Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(2)) + m;
  return String(Math.floor(t / 60) % 24).padStart(2, "0") + String(t % 60).padStart(2, "0");
}
export const REMINDER_FILES = { breakfast: "0830", classes: "1215", bed: "2130", evening: "1900" };
