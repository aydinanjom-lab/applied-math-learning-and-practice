// Progress in the browser. Stars are per family (a kind of question), not per exact numbers.
import { familyOf, familyFromKey } from "./core.js";
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
    this.lessonsRead = [];
    this.notes = {};
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        this.attempts = data.attempts ?? [];
        this.stars = migrateStars(data.stars ?? {});
        this.introShown = data.intro_shown ?? [];
        this.days = data.days ?? [];
        this.weekly = data.weekly ?? [];
        this.bests = data.bests ?? {};
        this.unlocked = data.unlocked ?? [];
        this.goal = data.goal ?? null;
        this.sessions = data.sessions ?? 0;
        this.feedback = data.feedback ?? null;
        this.lessonsRead = data.lessons_read ?? [];
        this.notes = data.notes ?? {};
      }
    } catch {
      // corrupt or blocked storage: start fresh, never crash a session
    }
  }

  record(item, attempt) {
    const family = attempt.family ?? familyOf(item);
    this.attempts.push({ ...attempt, family });
    if (!attempt.correct) {
      this.stars[family] = { family, drill: item.drill, example: item.prompt, streak: 0 };
    } else if (this.stars[family]) {
      this.stars[family].streak += 1;
      if (this.stars[family].streak >= CLEAR_AFTER) delete this.stars[family];
    }
  }

  starredItems() { return Object.values(this.stars); }
  starredKeys() { return Object.keys(this.stars); }
  markDay(key) { if (!this.days.includes(key)) this.days.push(key); }
  addWeekly(entry) { this.weekly.push(entry); }
  recordBest(group, seconds) {
    if (this.bests[group] !== undefined && this.bests[group] <= seconds) return false;
    this.bests[group] = seconds;
    return true;
  }
  setNote(drill, text, ts = Date.now() / 1000) {
    const clean = String(text ?? "").trim();
    if (!clean) delete this.notes[drill]; else this.notes[drill] = { text: clean, ts };
  }
  markLessonRead(id) { if (!this.lessonsRead.includes(id)) this.lessonsRead.push(id); }
  unlock(group) { if (!this.unlocked.includes(group)) this.unlocked.push(group); }
  isStarred(item) { return Boolean(this.stars[familyOf(item)]); }
  markIntroShown(drill) { if (!this.introShown.includes(drill)) this.introShown.push(drill); }

  snapshot() {
    return { attempts: this.attempts, stars: this.stars, intro_shown: this.introShown, days: this.days, weekly: this.weekly, bests: this.bests, unlocked: this.unlocked, goal: this.goal, sessions: this.sessions, feedback: this.feedback, lessons_read: this.lessonsRead, notes: this.notes };
  }
  load(data) {
    this.attempts = data.attempts ?? []; this.stars = migrateStars(data.stars ?? {}); this.introShown = data.intro_shown ?? [];
    this.days = data.days ?? []; this.weekly = data.weekly ?? []; this.bests = data.bests ?? {}; this.unlocked = data.unlocked ?? [];
    this.goal = data.goal ?? null; this.sessions = data.sessions ?? 0; this.feedback = data.feedback ?? null; this.lessonsRead = data.lessons_read ?? []; this.notes = data.notes ?? {};
  }

  save() {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.snapshot()));
      this.onSave?.();
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

// Old stars were keyed by exact item; new ones by family. Convert on read.
export function migrateStars(stars) {
  const out = {};
  for (const [key, entry] of Object.entries(stars)) {
    if (entry.item) {
      const family = familyFromKey(entry.item.key);
      const prev = out[family];
      out[family] = { family, drill: entry.item.drill, example: entry.item.prompt, streak: prev ? Math.min(prev.streak, entry.streak) : entry.streak };
    } else out[key] = entry;
  }
  return out;
}
