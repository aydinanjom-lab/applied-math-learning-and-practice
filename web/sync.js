// Sync: merge two copies of progress, and talk to Supabase when it is configured.
// The browser copy is always the source of truth during a session; sync is a background merge.
import { CLEAR_AFTER } from "./store.js";

const uniqBy = (arr, keyOf) => { const seen = new Set(); return arr.filter((x) => { const k = keyOf(x); if (seen.has(k)) return false; seen.add(k); return true; }); };

// Replay the attempt log through the star rule. `items` maps key -> item text, from either side's stars.
export function rebuildStars(attempts, items) {
  const stars = {};
  for (const a of [...attempts].sort((x, y) => x.ts - y.ts)) {
    if (!a.correct) { if (items[a.key]) stars[a.key] = { item: items[a.key], streak: 0 }; }
    else if (stars[a.key]) { stars[a.key].streak += 1; if (stars[a.key].streak >= CLEAR_AFTER) delete stars[a.key]; }
  }
  return stars;
}

export function mergeProgress(local, remote) {
  const L = { attempts: [], stars: {}, days: [], weekly: [], bests: {}, unlocked: [], intro_shown: [], goal: null, sessions: 0, feedback: null, ...local };
  const R = { attempts: [], stars: {}, days: [], weekly: [], bests: {}, unlocked: [], intro_shown: [], goal: null, sessions: 0, feedback: null, ...remote };
  const attempts = uniqBy([...L.attempts, ...R.attempts], (a) => `${a.key}|${a.ts}`).sort((a, b) => a.ts - b.ts);
  const items = {};
  for (const s of [...Object.values(R.stars), ...Object.values(L.stars)]) if (s?.item?.key) items[s.item.key] = s.item;
  const bests = { ...R.bests };
  for (const [g, s] of Object.entries(L.bests)) if (bests[g] === undefined || s < bests[g]) bests[g] = s;
  return {
    attempts,
    stars: rebuildStars(attempts, items),
    days: [...new Set([...L.days, ...R.days])].sort(),
    weekly: uniqBy([...L.weekly, ...R.weekly], (w) => w.week).sort((a, b) => a.week.localeCompare(b.week)),
    bests,
    unlocked: [...new Set([...L.unlocked, ...R.unlocked])],
    intro_shown: [...new Set([...L.intro_shown, ...R.intro_shown])],
    goal: L.goal ?? R.goal,
    sessions: Math.max(L.sessions, R.sessions),
    feedback: L.feedback ?? R.feedback,
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
  async save(userId, data) {
    const c = await this.init();
    const { error } = await c.from("progress").upsert({ user_id: userId, data, updated_at: new Date().toISOString() });
    if (error) throw error;
  }
}
