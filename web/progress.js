// Game logic, all pure functions over the attempt log. Nothing here touches the screen or storage.
import { GROUPS, UNLOCK_AFTER } from "./drills.js";

export const LEVELS = ["New", "Learning", "Solid", "Fast", "Cold"];
const WINDOW = 20;

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// Level 0-4 for one drill. Typed attempts only, last 20. Stars in that drill block Cold.
export function masteryLevel(attempts, drill, starredKeys) {
  const rows = attempts.filter((a) => a.drill === drill && a.mode === "type").slice(-WINDOW);
  if (rows.length < 10) return 0;
  const acc = rows.filter((r) => r.correct).length / rows.length;
  const med = median(rows.map((r) => r.seconds));
  const starred = starredKeys.some((k) => k.startsWith(drill + ":"));
  if (acc >= 0.95 && med < 8 && !starred) return 4;
  if (acc >= 0.9 && med < 12) return 3;
  if (acc >= 0.8) return 2;
  return 1;
}

export function groupLevel(attempts, drills, starredKeys) {
  return Math.min(...drills.map((d) => masteryLevel(attempts, d, starredKeys)));
}

// Local calendar day as YYYY-MM-DD.
export function dayKey(date) {
  const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, "0"), d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };

// Consecutive days with a completed session, ending today or yesterday. One missed day forgiven per seven days.
export function streak(days, today = new Date()) {
  const have = new Set(days);
  let cursor = have.has(dayKey(today)) ? today : addDays(today, -1);
  if (!have.has(dayKey(cursor))) return 0;
  let count = 0;
  let lastSkip = null; // Date of the most recent forgiven day
  for (;;) {
    if (have.has(dayKey(cursor))) { count += 1; cursor = addDays(cursor, -1); continue; }
    const skipOk = lastSkip === null || (lastSkip - cursor) / 86400000 >= 7;
    if (!skipOk) break;
    lastSkip = cursor;
    cursor = addDays(cursor, -1);
    if (!have.has(dayKey(cursor))) break; // a skip must be followed by a real day
  }
  return count;
}

// The Sunday that starts this week, as a key.
export function weekKey(date) {
  return dayKey(addDays(date, -date.getDay()));
}

export function weeklyCheckDue(today, history) {
  if (today.getDay() !== 0) return false;
  return !history.some((h) => h.week === weekKey(today));
}

export function isUnlocked(group, attempts, starredKeys, overrides) {
  const needs = UNLOCK_AFTER[group];
  if (!needs) return true;
  if (overrides.includes(group)) return true;
  return groupLevel(attempts, GROUPS[needs], starredKeys) >= 2;
}

// Total seconds for a typed session of 10+ items at 90%+, else null.
export function sessionBest(results) {
  if (results.length < 10 || results.some((r) => r.mode !== "type")) return null;
  const acc = results.filter((r) => r.correct).length / results.length;
  if (acc < 0.9) return null;
  return Math.round(results.reduce((s, r) => s + r.seconds, 0) * 10) / 10;
}

// First-run goal -> default set.
export function defaultGroupForGoal(goal) {
  return { interviews: "interview", poker: "poker", general: "quick" }[goal] ?? "interview";
}

// One question, once, after the tenth completed session.
export function shouldAskFeedback(store) {
  return store.sessions >= 10 && !store.feedback;
}
