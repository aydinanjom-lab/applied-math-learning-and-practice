// Progress in the browser. Mirrors applied_math/store.py. Same JSON shape, same star rule.
export const STORAGE_KEY = "applied_math_progress";
export const CLEAR_AFTER = 2;

export class Store {
  constructor(storage) {
    this.storage = storage;
    this.attempts = [];
    this.stars = {};
    this.introShown = [];
    this.days = [];
    this.weekly = [];
    this.bests = {};
    this.unlocked = [];
    this.goal = null;
    this.sessions = 0;
    this.feedback = null;
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        this.attempts = data.attempts ?? [];
        this.stars = data.stars ?? {};
        this.introShown = data.intro_shown ?? [];
        this.days = data.days ?? [];
        this.weekly = data.weekly ?? [];
        this.bests = data.bests ?? {};
        this.unlocked = data.unlocked ?? [];
        this.goal = data.goal ?? null;
        this.sessions = data.sessions ?? 0;
        this.feedback = data.feedback ?? null;
      }
    } catch {
      // corrupt or blocked storage: start fresh, never crash a session
    }
  }

  record(item, attempt) {
    this.attempts.push(attempt);
    if (!attempt.correct) {
      this.stars[item.key] = { item, streak: 0 };
    } else if (this.stars[item.key]) {
      this.stars[item.key].streak += 1;
      if (this.stars[item.key].streak >= CLEAR_AFTER) delete this.stars[item.key];
    }
  }

  starredItems() { return Object.values(this.stars).map((s) => s.item); }
  starredKeys() { return Object.keys(this.stars); }
  markDay(key) { if (!this.days.includes(key)) this.days.push(key); }
  addWeekly(entry) { this.weekly.push(entry); }
  recordBest(group, seconds) {
    if (this.bests[group] !== undefined && this.bests[group] <= seconds) return false;
    this.bests[group] = seconds;
    return true;
  }
  unlock(group) { if (!this.unlocked.includes(group)) this.unlocked.push(group); }
  isStarred(key) { return Boolean(this.stars[key]); }
  markIntroShown(drill) { if (!this.introShown.includes(drill)) this.introShown.push(drill); }

  save() {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify({ attempts: this.attempts, stars: this.stars, intro_shown: this.introShown, days: this.days, weekly: this.weekly, bests: this.bests, unlocked: this.unlocked, goal: this.goal, sessions: this.sessions, feedback: this.feedback }));
    } catch {
      // private mode or full storage: the session still runs, it just won't persist
    }
  }

  statsByDrill() {
    const by = {};
    for (const a of this.attempts) (by[a.drill] ??= []).push(a);
    return Object.keys(by).sort().map((drill) => {
      const rows = by[drill];
      const acc = (100 * rows.filter((r) => r.correct).length) / rows.length;
      const avg = rows.reduce((s, r) => s + r.seconds, 0) / rows.length;
      return { drill, attempts: rows.length, accuracy: Math.round(acc), avgSeconds: Math.round(avg * 10) / 10 };
    });
  }
}
