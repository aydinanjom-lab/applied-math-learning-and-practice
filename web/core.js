// Shared helpers for drill generators. No drill content lives here.
export function makeRng(seed = Date.now()) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    random: next,
    choice: (arr) => arr[Math.floor(next() * arr.length)],
    randint: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    sample2: (arr) => { const i = Math.floor(next() * arr.length); let j = Math.floor(next() * (arr.length - 1)); if (j >= i) j += 1; return [arr[i], arr[j]]; },
  };
}

export function fmt(x) {
  if (Math.abs(x - Math.round(x)) < 1e-9) return Math.round(x).toLocaleString("en-US");
  return x.toLocaleString("en-US", { maximumFractionDigits: 3 });
}
export const r2 = (x) => Math.round(x * 100) / 100;

export function parseAnswer(text) {
  let t = String(text).trim().replace(/,/g, "").replace(/\$/g, "").replace(/%$/, "").replace(/x$/i, "").trim();
  if (!t) return null;
  const suffix = { k: 1e3, m: 1e6, b: 1e9 };
  let mult = 1;
  const last = t.slice(-1).toLowerCase();
  if (suffix[last]) { mult = suffix[last]; t = t.slice(0, -1); }
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
  return Number(t) * mult;
}

export function isCorrect(item, given) {
  if (item.choices) return given === item.answer;
  const diff = Math.abs(given - item.answer);
  return diff <= Math.max(item.rel_tol * Math.max(Math.abs(given), Math.abs(item.answer)), item.abs_tol);
}

export const item = (o) => ({ rel_tol: 0, abs_tol: 0.005, ...o });
export const comb2 = (n) => (n * (n - 1)) / 2;
export const NUM = "Answer with a number.";
export const PCT = "Answer in %.";
export const USD = "Answer in $.";
export const USDM = "Answer in $M.";

export const POTS = [20, 30, 40, 50, 60, 75, 80, 100, 120, 150, 200, 300];
const CALL_FRACTIONS = [[1, 4], [1, 3], [1, 2], [2, 3], [3, 4], [1, 1]];
export function potAndCall(rng) {
  for (;;) {
    const pot = rng.choice(POTS);
    const [num, den] = rng.choice(CALL_FRACTIONS);
    if ((pot * num) % den === 0 && ((pot * num) / den) % 5 === 0) return [pot, (pot * num) / den];
  }
}
export const exactEquity = (outs, cards) => (cards === 1 ? (outs / 46) * 100 : (1 - comb2(47 - outs) / comb2(47)) * 100);
export const DRAW_NAMES = { 2: "a pocket pair hoping for a set", 4: "a gutshot straight draw", 6: "two overcards", 8: "an open-ended straight draw", 9: "a flush draw", 12: "a flush draw plus a gutshot", 15: "a flush draw plus an open-ended straight draw" };
