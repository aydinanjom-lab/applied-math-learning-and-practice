// Eight-rung level ladder per set. Lower rungs come from breadth and accuracy; upper rungs need a passed level check.
import { GROUPS, DRILLS } from "./drills.js";

export const RUNGS = ["Unplaced", "Started", "Learning", "Mostly right", "Solid", "Quick", "Fast", "Cold"];
export const SPEED = {
  quick: { quick: 8, fast: 5 }, interview: { quick: 12, fast: 8 }, poker: { quick: 12, fast: 8 }, betting: { quick: 15, fast: 10 },
  banking: { quick: 20, fast: 12 }, accounting: { quick: 20, fast: 12 }, moose: { quick: 20, fast: 12 }, novyx: { quick: 20, fast: 12 }, energy: { quick: 20, fast: 12 },
};
const PROOF_MODES = new Set(["type", "diag", "check"]);
const WINDOW_DAYS = 90;
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : Infinity; };

function recentTyped(attempts, set, now) {
  const drills = new Set(GROUPS[set]);
  const cutoff = now - WINDOW_DAYS * 86400;
  return attempts.filter((a) => drills.has(a.drill) && PROOF_MODES.has(a.mode) && a.ts >= cutoff);
}

export function decayRung(rung, daysSince) {
  if (rung <= 2) return { rung, stale: daysSince >= 14 };
  let r = rung;
  if (daysSince >= 56) r -= 2; else if (daysSince >= 28) r -= 1;
  return { rung: Math.max(2, r), stale: daysSince >= 14 };
}

function dataRung(rows, set) {
  if (!rows.length) return 0;
  const breadth = new Set(rows.map((a) => a.drill)).size / GROUPS[set].length;
  const last30 = rows.slice(-30);
  const acc = last30.filter((a) => a.correct).length / last30.length;
  if (rows.length >= 20 && breadth >= 0.5 && acc >= 0.7) return 3;
  if (rows.length >= 10 && breadth >= 0.5) return 2;
  return 1;
}

// What the current proof supports for rungs 4-7, independent of the stamp.
function proofRung(rows, set, starredKeys) {
  const last30 = rows.slice(-30);
  if (last30.length < 20) return 3;
  const acc = last30.filter((a) => a.correct).length / last30.length;
  const med = median(last30.map((a) => a.seconds));
  const starred = GROUPS[set].some((d) => starredKeys.some((k) => k === d || k.startsWith(d + ":")));
  const sp = SPEED[set];
  if (acc >= 0.95 && med < sp.fast && !starred) return 7;
  if (acc >= 0.9 && med < sp.fast) return 6;
  if (acc >= 0.85 && med < sp.quick) return 5;
  if (acc >= 0.8) return 4;
  return 3;
}

export function rungDetail(attempts, set, stamps, starredKeys, now = Date.now() / 1000) {
  const rows = recentTyped(attempts, set, now).sort((a, b) => a.ts - b.ts);
  let data = dataRung(rows, set);
  const placement = stamps[set];
  if (placement && placement.rung < 4 && now - placement.ts < 28 * 86400) data = Math.max(data, placement.rung);
  const lastTs = rows.length ? rows[rows.length - 1].ts : null;
  const daysSince = lastTs ? (now - lastTs) / 86400 : 0;
  const stamp = stamps[set];
  let rung = data, stale = false;
  if (stamp && stamp.rung >= 4) {
    const supported = proofRung(rows, set, starredKeys);
    const decayed = decayRung(Math.min(stamp.rung, Math.max(4, supported)), daysSince);
    rung = Math.max(data, Math.min(decayed.rung, supported >= 4 ? Math.min(stamp.rung, supported) : 3));
    if (supported < 4) rung = Math.max(data, decayed.rung >= 4 ? 3 : decayed.rung);
    stale = decayed.stale;
  } else {
    const d = decayRung(data, daysSince); rung = d.rung; stale = d.stale;
  }
  const supported = proofRung(rows, set, starredKeys);
  const canCheck = rung >= 3 && rung < 7 && supported > rung ? rung + 1 : null;
  let next;
  if (rung === 0) next = "Do a typed session to get started.";
  else if (rung === 1) next = "Try every drill in the set, typed, to reach Learning.";
  else if (rung === 2) next = "Twenty typed answers at 70% or better reaches Mostly right.";
  else if (canCheck) next = `Ready for the ${RUNGS[canCheck]} level check: ten typed questions, ${checkRequirement(canCheck).need} right.`;
  else if (rung === 7) next = "Cold. Keep it that way with a typed session every two weeks.";
  else next = rung >= 4 ? `Hold ${RUNGS[rung]}; faster and cleaner typed sessions unlock the next check.` : "More typed accuracy and speed before the next check.";
  return { rung, name: RUNGS[rung], stale, canCheck, next, supported, attempts: rows.length };
}

export function setRung(attempts, set, stamps, starredKeys, now = Date.now() / 1000) {
  return rungDetail(attempts, set, stamps, starredKeys, now).rung;
}

export function checkRequirement(targetRung) { return { need: targetRung >= 6 ? 10 : 9 }; }
export function gradeLevelCheck(right, targetRung) { return right >= checkRequirement(targetRung).need; }

// Ten items from the set, weakest drills (by recent accuracy) first.
export function buildLevelCheck(attempts, set, rng) {
  const acc = {};
  for (const d of GROUPS[set]) {
    const rows = attempts.filter((a) => a.drill === d && PROOF_MODES.has(a.mode)).slice(-10);
    acc[d] = rows.length ? rows.filter((a) => a.correct).length / rows.length : 0.5;
  }
  const order = [...GROUPS[set]].sort((a, b) => acc[a] - acc[b]);
  const items = [], seen = new Set();
  let i = 0, tries = 0;
  while (items.length < 10 && tries < 200) {
    const it = DRILLS[order[i % order.length]](rng); i++; tries++;
    if (!seen.has(it.key)) { seen.add(it.key); items.push(it); }
  }
  return items;
}
