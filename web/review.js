// Spaced review: a kind of question that was starred and then cleared comes back after 3, 7, then 21 days,
// so "cleared" means remembered next week, not just right twice in one sitting.
// Worked out from the attempt log alone, so sync needs nothing new.
import { CLEAR_AFTER } from "./store.js";

export const REVIEW_GAPS = [3, 7, 21];
export const MAX_REVIEWS = 3;
const DAY = 86400;

// With an interview coming, no gap is longer than 30% of the days left (at least one day).
function gapSeconds(stage, ts, interviewTs) {
  let days = REVIEW_GAPS[stage];
  if (interviewTs && interviewTs > ts) days = Math.min(days, Math.max(1, Math.floor((0.3 * (interviewTs - ts)) / DAY)));
  return days * DAY;
}

// family -> { stage, due, drill } for every kind waiting on a review. Starred and graduated kinds are left out.
export function reviewState(attempts, { interviewTs = null } = {}) {
  const st = {};
  for (const x of [...attempts].sort((p, q) => p.ts - q.ts)) {
    const f = x.family ?? x.drill;
    const s = (st[f] ??= { starred: false, streak: 0, stage: null, due: null, drill: x.drill });
    s.drill = x.drill;
    if (!x.correct) { s.starred = true; s.streak = 0; s.stage = null; s.due = null; continue; }
    if (s.starred) {
      s.streak += 1;
      if (s.streak >= CLEAR_AFTER) { s.starred = false; s.stage = 0; s.due = x.ts + gapSeconds(0, x.ts, interviewTs); }
    } else if (s.stage !== null && x.ts >= s.due) {
      s.stage += 1;
      if (s.stage >= REVIEW_GAPS.length) { s.stage = null; s.due = null; }
      else s.due = x.ts + gapSeconds(s.stage, x.ts, interviewTs);
    }
  }
  const out = {};
  for (const [f, s] of Object.entries(st)) if (!s.starred && s.stage !== null) out[f] = { stage: s.stage, due: s.due, drill: s.drill };
  return out;
}

// Kinds due now, oldest first, at most MAX_REVIEWS.
export function dueReviews(attempts, now = Date.now() / 1000, opts = {}, max = MAX_REVIEWS) {
  return Object.entries(reviewState(attempts, opts)).filter(([, s]) => s.due <= now)
    .sort((p, q) => p[1].due - q[1].due).slice(0, max).map(([family, s]) => ({ family, drill: s.drill, due: s.due }));
}

// Every kind waiting, soonest first, with whole days until it comes back (0 = due now).
export function upcomingReviews(attempts, now = Date.now() / 1000, opts = {}) {
  return Object.entries(reviewState(attempts, opts)).sort((p, q) => p[1].due - q[1].due)
    .map(([family, s]) => ({ family, drill: s.drill, due: s.due, inDays: Math.max(0, Math.ceil((s.due - now) / DAY)) }));
}
