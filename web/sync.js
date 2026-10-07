// Sync: merge two copies of progress, and talk to Supabase when it is configured.
// The browser copy is always the source of truth during a session; sync is a background merge.
import { CLEAR_AFTER, migrateStars } from "./store.js";
import { familyFromKey } from "./core.js";

const uniqBy = (arr, keyOf) => { const seen = new Set(); return arr.filter((x) => { const k = keyOf(x); if (seen.has(k)) return false; seen.add(k); return true; }); };

// Replay the attempt log through the star rule. `examples` maps family -> { drill, example } from either side's stars.
export function rebuildStars(attempts, examples) {
  const stars = {};
  for (const a of [...attempts].sort((x, y) => x.ts - y.ts)) {
    const family = a.family ?? familyFromKey(a.key);
    if (!a.correct) stars[family] = { family, drill: a.drill, example: examples[family]?.example ?? "", streak: 0 };
    else if (stars[family]) { stars[family].streak += 1; if (stars[family].streak >= CLEAR_AFTER) delete stars[family]; }
  }
  return stars;
}

function mergeNotes(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) if (!out[k] || v.ts > out[k].ts) out[k] = v;
  return out;
}

function mergeStamps(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) if (!out[k] || v.rung > out[k].rung || (v.rung === out[k].rung && v.ts > out[k].ts)) out[k] = v;
  return out;
}
function mergeMax(a, b) { const out = { ...a }; for (const [k, v] of Object.entries(b)) if (!(k in out) || v > out[k]) out[k] = v; return out; }

export function mergeProgress(local, remote) {
  for (const side of [local, remote]) if (side && side.check_locks && !side.checkLocks) side.checkLocks = side.check_locks;
  const L = { attempts: [], stars: {}, days: [], weekly: [], bests: {}, unlocked: [], intro_shown: [], goal: null, sessions: 0, feedback: null, lessons_read: [], notes: {}, priorities: null, stamps: {}, diagnostics: [], checkLocks: {}, to_learn: {}, ...local };
  const R = { attempts: [], stars: {}, days: [], weekly: [], bests: {}, unlocked: [], intro_shown: [], goal: null, sessions: 0, feedback: null, lessons_read: [], notes: {}, priorities: null, stamps: {}, diagnostics: [], checkLocks: {}, to_learn: {}, ...remote };
  const attempts = uniqBy([...L.attempts, ...R.attempts], (a) => `${a.key}|${a.ts}`).sort((a, b) => a.ts - b.ts);
  const examples = {};
  for (const s of Object.values({ ...migrateStars(R.stars), ...migrateStars(L.stars) })) examples[s.family] = s;
  const bests = { ...R.bests };
  for (const [g, s] of Object.entries(L.bests)) if (bests[g] === undefined || s < bests[g]) bests[g] = s;
  return {
    attempts,
    stars: rebuildStars(attempts, examples),
    days: [...new Set([...L.days, ...R.days])].sort(),
    weekly: uniqBy([...L.weekly, ...R.weekly], (w) => w.week).sort((a, b) => a.week.localeCompare(b.week)),
    bests,
    unlocked: [...new Set([...L.unlocked, ...R.unlocked])],
    intro_shown: [...new Set([...L.intro_shown, ...R.intro_shown])],
    goal: L.goal ?? R.goal,
    sessions: Math.max(L.sessions, R.sessions),
    feedback: L.feedback ?? R.feedback,
    lessons_read: [...new Set([...L.lessons_read, ...R.lessons_read])],
    notes: mergeNotes(L.notes, R.notes),
    stamps: mergeStamps(L.stamps, R.stamps),
    diagnostics: uniqBy([...L.diagnostics, ...R.diagnostics], (d) => d.ts).sort((a, b) => a.ts - b.ts),
    priorities: L.priorities ?? R.priorities,
    checkLocks: mergeMax(L.checkLocks, R.checkLocks),
    to_learn: mergeNotes(L.to_learn, R.to_learn),
  };
}

// ---------- Supabase client (only loaded when configured) ----------
export class SyncClient {
  constructor(config, factory) {
    this.config = config;
    this.factory = factory; // (url, key) -> supabase client; injectable for tests
    this.client = null;
  }
  get configured() { return Boolean(this.config?.url && this.config?.anonKey); }
  async init() {
    if (!this.configured) return null;
    if (!this.client) {
      const make = this.factory ?? globalThis.__napkinSyncFactory ?? (await import("https://esm.sh/@supabase/supabase-js@2")).createClient;
      this.client = make(this.config.url, this.config.anonKey);
    }
    return this.client;
  }
  async user() {
    const c = await this.init(); if (!c) return null;
    const { data } = await c.auth.getUser();
    return data?.user ?? null;
  }
  async sendMagicLink(email) {
    const c = await this.init();
    const { error } = await c.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + window.location.pathname } });
    if (error) throw error;
  }
  async signOut() { const c = await this.init(); if (c) await c.auth.signOut(); }
  async load(userId) {
    const c = await this.init();
    const { data, error } = await c.from("progress").select("data").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    return data?.data ?? null;
  }
  // Clubs: every call is a database function, so the privacy rules live in SQL (supabase/clubs.sql).
  async rpc(name, args = {}) {
    const c = await this.init();
    const { data, error } = await c.rpc(name, args);
    if (error) throw error;
    return data;
  }
  myCohorts() { return this.rpc("my_cohorts"); }
  joinCohort(code) { return this.rpc("join_cohort", { p_code: code }).then((r) => (Array.isArray(r) ? r[0] : r)); }
  createCohort(name, code) { return this.rpc("create_cohort", { p_name: name, p_code: code }).then((r) => (Array.isArray(r) ? r[0] : r)); }
  setCohortFlags(id, hideBetting, leaderboard) { return this.rpc("set_cohort_flags", { p_cohort: id, p_hide_betting: hideBetting ?? null, p_leaderboard: leaderboard ?? null }); }
  setCohortSets(id, sets) { return this.rpc("set_cohort_sets", { p_cohort: id, p_sets: sets }); }
  setBoardOptIn(id, optIn, firstName) { return this.rpc("set_board_opt_in", { p_cohort: id, p_opt_in: optIn, p_first_name: firstName ?? null }); }
  leaveCohort(id) { return this.rpc("leave_cohort", { p_cohort: id }); }
  deleteCohort(id) { return this.rpc("delete_cohort", { p_cohort: id }); }
  createClubSession(id, setId, seed, short) { return this.rpc("create_club_session", { p_cohort: id, p_set_id: setId, p_seed: seed, p_short: short }).then((r) => (Array.isArray(r) ? r[0] : r)); }
  clubSessionByCode(short) { return this.rpc("club_session_by_code", { p_short: short }).then((r) => (Array.isArray(r) ? r[0] ?? null : r)); }
  cohortSummary(id) { return this.rpc("cohort_summary", { p_cohort: id }); }
  cohortLeaderboard(id) { return this.rpc("cohort_leaderboard", { p_cohort: id }); }
  async save(userId, data) {
    const c = await this.init();
    const { error } = await c.from("progress").upsert({ user_id: userId, data, updated_at: new Date().toISOString() });
    if (error) throw error;
  }
}
