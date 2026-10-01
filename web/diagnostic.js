// First-run and periodic diagnostic: a fixed typed form, 8 items per priority set, up to 3 sets.
import { GROUPS, DRILLS } from "./drills.js";

export const ANCHORS = {
  quick: ["percent_of", "fraction_to_decimal", "multiply_shortcuts", "growth_rate", "back_of_envelope", "divide_shortcuts", "reverse_percent", "near_100"],
  banking: ["ev_from_equity", "multiple_to_yield", "pe_ratio", "after_tax_debt", "wacc", "perpetuity", "lbo_return", "accretion"],
};
export const PER_SET = 8;
export const MAX_SETS = 3;
export const ITEM_SECONDS = 20;
export const REDIAG_DAYS = 28;

export function buildDiagnostic(sets, rng) {
  const chosen = sets.slice(0, MAX_SETS);
  const perSet = chosen.map((set) => {
    const drills = ANCHORS[set] ?? GROUPS[set].slice(0, PER_SET);
    const items = [], seen = new Set();
    let i = 0, tries = 0;
    while (items.length < PER_SET && tries < 100) {
      const d = drills[i % drills.length]; i++; tries++;
      const it = DRILLS[d](rng);
      if (seen.has(it.key)) continue;
      seen.add(it.key); items.push({ ...it, set });
    }
    return items;
  });
  const out = [];
  for (let k = 0; k < PER_SET; k++) for (const list of perSet) if (list[k]) out.push(list[k]);
  return out;
}

// From "right of total" per set to a starting rung, never above 3.
export function placeFromResults(results) {
  const out = {};
  for (const [set, r] of Object.entries(results)) {
    const share = r.total ? r.right / r.total : 0;
    const rung = r.total === 0 ? 0 : share >= 0.75 ? 3 : share >= 0.35 ? 2 : 1;
    out[set] = { rung, label: `${r.right} of ${r.total}` };
  }
  return out;
}

export function diagnosticDue(history, now = Date.now() / 1000) {
  if (!history.length) return true;
  const last = Math.max(...history.map((h) => h.ts));
  return now - last >= REDIAG_DAYS * 86400;
}
