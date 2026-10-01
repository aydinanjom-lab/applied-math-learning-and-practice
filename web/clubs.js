// Clubs: codes, shared sessions from a seed, and the leader summary's wording. Pure logic; the network lives in sync.js.
import { GROUPS, DRILLS, GROUP_LABELS, makeRng } from "./drills.js";

export const CLUB_SESSION_SIZE = 10;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

// Club codes: uppercase letters, digits, dashes, 4 to 20 characters. "Kelley FIR f26" -> "KELLEY-FIR-F26".
export function normalizeCode(text) {
  const c = String(text ?? "").trim().toUpperCase().replace(/[\s_]+/g, "-").replace(/[^A-Z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return c.length >= 4 && c.length <= 20 ? c : null;
}
export function suggestCode(name) {
  const words = String(name ?? "").trim().toUpperCase().replace(/[^A-Z0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 3);
  let out = "";
  for (const w of words) { const next = out ? `${out}-${w}` : w; if (next.length > 20) break; out = next; }
  return normalizeCode(out) ?? normalizeCode(words.join("").slice(0, 20)) ?? null;
}
export function shortCode(rng = makeRng()) {
  let s = "";
  for (let i = 0; i < 4; i++) s += CODE_CHARS[Math.floor(rng.random() * CODE_CHARS.length)];
  return s;
}
export const newSeed = (rng = makeRng()) => Math.floor(rng.random() * 2147483647);

// The same seed and set give the same ten questions on every phone. No stars, no store: deterministic.
export function clubSessionItems(setId, seed, n = CLUB_SESSION_SIZE) {
  const names = GROUPS[setId];
  if (!names) throw new Error(`Unknown set: ${setId}`);
  const rng = makeRng(seed);
  const items = [], seen = new Set();
  let i = 0, tries = 0;
  while (items.length < n && tries < n * 50) {
    const it = DRILLS[names[i % names.length]](rng); i++; tries++;
    if (seen.has(it.key)) continue;
    seen.add(it.key); items.push(it);
  }
  return items;
}

export const clubSessionLink = (short, base = "https://napkinprep.com/") => `${base}#/s/${short}`;
export const joinLink = (code, base = "https://napkinprep.com/") => `${base}#/join/${code}`;

// Seven numbers for the leader page, in plain words. `floor` means fewer than five active members: nothing but the count is shown.
export function summaryRows(s) {
  if (!s) return [];
  if (s.floor) return [["Members", String(s.members)], ["Everything else", "Shows once five or more members have practised. This protects members from being singled out."]];
  const sets = Object.entries(s.avg_level_by_set ?? {}).map(([k, v]) => `${GROUP_LABELS[k]?.[0] ?? k} ${Number(v).toFixed(1)}`).join(" · ");
  return [
    ["Members", String(s.members)],
    ["Active this week", String(s.active_7d)],
    ["Answers this week", String(s.attempts_7d)],
    ["Typed accuracy this week", s.typed_accuracy_7d === null ? "–" : `${s.typed_accuracy_7d}%`],
    ["Practised 5+ days", String(s.returned_5_days)],
    ["Most missed", (s.top_missed ?? []).map((t) => `${t.drill.replace(/_/g, " ")} (${t.misses} of ${t.tries})`).join(", ") || "–"],
    ["Did a club session", String(s.club_session_done)],
    ["Average placed level", sets || "–"],
  ];
}

// A join code captured from a link before sign-in is held locally until the account exists.
export const PENDING_KEY = "napkin_join";
export function holdJoin(storage, code) { try { storage.setItem(PENDING_KEY, code); } catch {} }
export function takeJoin(storage) { try { const c = storage.getItem(PENDING_KEY); if (c) storage.removeItem(PENDING_KEY); return c; } catch { return null; } }
