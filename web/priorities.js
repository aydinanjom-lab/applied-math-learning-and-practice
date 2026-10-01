// Priorities: five plain-language areas over the nine sets, and the "Today" session they drive.
import { GROUPS, DRILLS } from "./drills.js";
import { masteryLevel } from "./progress.js";

export const AREAS = {
  finance: { title: "Finance interview numbers", sub: "Valuation, cost of capital, buyouts, the three statements, deal math.", sets: ["banking", "accounting", "valuation", "walks", "deals"] },
  poker: { title: "Poker as an interview answer", sub: "Pot odds, outs, bet sizing, call or fold.", sets: ["interview", "poker"] },
  quick: { title: "Fast mental math", sub: "Percent tricks, fast multiplying and dividing, fractions.", sets: ["quick"] },
  business: { title: "My business numbers", sub: "Margins, payback, break-even, pipeline.", sets: ["moose", "novyx"] },
  energyodds: { title: "Energy and odds", sub: "Barrels and netbacks; odds formats and fair chance, math only.", sets: ["energy", "betting"] },
  markets: { title: "Markets and quant", sub: "Bonds, options, dice and coins, Bayes, volatility, Sharpe, market sizing.", sets: ["prob", "rates"] },
};
export const AREA_ORDER = ["finance", "poker", "quick", "business", "markets", "energyodds"];
const INTERVIEW_SETS = new Set(["banking", "accounting", "interview", "valuation", "walks"]);

export function setsForAreas(areas) {
  const sets = (areas ?? []).flatMap((a) => AREAS[a]?.sets ?? []);
  return sets.length ? sets : ["interview"];
}

export function daysUntil(dateStr, today = new Date()) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target - base) / 86400000);
}

export function urgency(set, interviewDate, today = new Date()) {
  const days = daysUntil(interviewDate, today);
  return days !== null && days >= 0 && days <= 14 && INTERVIEW_SETS.has(set) ? 1 : 0;
}

// weakness = share of the set's drills below "Solid" by the per-drill mastery rule
export function weightsFor(store, sets, interviewDate, today = new Date()) {
  const out = {};
  const keys = store.starredKeys();
  for (const set of sets) {
    const drills = GROUPS[set];
    const weak = drills.filter((d) => masteryLevel(store.attempts, d, keys) < 2).length / drills.length;
    out[set] = 1 + 2 * weak + urgency(set, interviewDate, today);
  }
  return out;
}

export function todayQueue(store, sets, n, weights, rng) {
  const wanted = new Set(sets);
  const queue = [];
  const seen = new Set();
  const count = {};
  const setOf = (drill) => sets.find((s) => GROUPS[s].includes(drill));
  for (const star of store.starredItems()) {
    if (queue.length >= n || !DRILLS[star.drill]) continue;
    const set = setOf(star.drill);
    if (!set) continue;
    for (let t = 0; t < 20; t++) {
      const it = DRILLS[star.drill](rng, { family: star.family });
      if (!seen.has(it.key)) { seen.add(it.key); queue.push(it); count[set] = (count[set] ?? 0) + 1; break; }
    }
  }
  const cap = Math.max(1, Math.ceil(n * 0.6));
  let tries = 0;
  while (queue.length < n && tries < n * 60) {
    tries++;
    const open = sets.filter((s) => (count[s] ?? 0) < cap);
    if (!open.length) break;
    const total = open.reduce((a, s) => a + (weights[s] ?? 1), 0);
    let r = rng.random() * total, set = open[0];
    for (const s of open) { r -= weights[s] ?? 1; if (r <= 0) { set = s; break; } }
    const drill = rng.choice(GROUPS[set]);
    const it = DRILLS[drill](rng);
    if (seen.has(it.key)) continue;
    seen.add(it.key); queue.push(it); count[set] = (count[set] ?? 0) + 1;
  }
  return queue;
}
