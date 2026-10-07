// Screens: home -> session -> summary. Also interview run, weekly check, starred, stats, explain.
import { GROUPS, GROUP_LABELS, DEFINITIONS, EXPLANATIONS, DRILLS, UNLOCK_AFTER, LATER, FAMILIES, familyOf, buildQueue, isCorrect, parseAnswer, fmt, makeRng } from "./drills.js";
import { LESSONS, LESSON_BY_ID, LESSON_BY_FAMILY } from "./lessons.js";
import { RUNS } from "./runs.js";
import { AREAS, AREA_ORDER, setsForAreas, daysUntil, weightsFor, todayQueue } from "./priorities.js";
import { RUNGS, rungDetail, setRung, buildLevelCheck, checkRequirement, gradeLevelCheck } from "./levels.js";
import { buildDiagnostic, placeFromResults, diagnosticDue, ITEM_SECONDS } from "./diagnostic.js";
import { Store } from "./store.js";
import { parseRoute, TABS } from "./router.js";
import { normalizeCode, suggestCode, shortCode, newSeed, clubSessionItems, clubSessionLink, joinLink, summaryRows, holdJoin, takeJoin, PACKS, MAX_CLUB_SETS, cleanSets, mergeClubSets, clubSetIds, boostClubWeights } from "./clubs.js";
import { SyncClient, mergeProgress } from "./sync.js";
import { SUPABASE } from "./config.js";
import { LEVELS, groupLevel, masteryLevel, streak, dayKey, weekKey, weeklyCheckDue, isUnlocked, sessionBest, defaultGroupForGoal, shouldAskFeedback } from "./progress.js";

const app = document.getElementById("app");
const bar = document.createElement("div"); bar.className = "actionbar"; bar.hidden = true; document.body.append(bar);
const tabs = document.createElement("nav"); tabs.className = "tabbar"; tabs.setAttribute("aria-label", "Main"); tabs.hidden = true; document.body.append(tabs);
const ICONS = {
  today: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>',
  practice: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  lessons: '<path d="M4 5.5A2 2 0 0 1 6 4h5v15H6a2 2 0 0 0-2 1.5z"/><path d="M20 5.5A2 2 0 0 0 18 4h-5v15h5a2 2 0 0 1 2 1.5z"/>',
  progress: '<path d="M5 19V13"/><path d="M10 19V8"/><path d="M15 19v-4"/><path d="M20 19V5"/>',
  you: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
};
const icon = (id) => { const sv = document.createElementNS("http://www.w3.org/2000/svg", "svg"); sv.setAttribute("viewBox", "0 0 24 24"); sv.setAttribute("aria-hidden", "true"); sv.innerHTML = ICONS[id]; return sv; };
const go = (path) => { if (location.hash === path) dispatch(); else location.hash = path; };
function showTabs(active) {
  tabs.hidden = false;
  tabs.replaceChildren(...TABS.map((t) => el("a", { href: t.path, class: t.id === active ? "on" : "", "aria-current": t.id === active ? "page" : null }, icon(t.id), el("span", {}, t.label))));
}
const MARK = () => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 64 64"); s.setAttribute("aria-hidden", "true");
  s.innerHTML = '<g transform="rotate(-8 32 32)"><path d="M10 10 H40 L54 24 V54 H10 Z" fill="currentColor"/><path d="M40 10 V24 H54 Z" fill="#4f46e5"/></g>'; return s; };
const store = new Store(window.localStorage);
const sync = new SyncClient(SUPABASE);
const syncState = { user: null, last: null, error: null, busy: false, cohorts: [] };
let syncTimer = null;

async function pullAndMerge() {
  if (!syncState.user) return;
  syncState.busy = true;
  try {
    const remote = await sync.load(syncState.user.id);
    if (remote) store.load(mergeProgress(store.snapshot(), remote));
    store.onSave = null; store.save(); store.onSave = scheduleSync;
    await sync.save(syncState.user.id, store.snapshot());
    syncState.last = new Date(); syncState.error = null;
  } catch (e) { syncState.error = e.message ?? String(e); }
  syncState.busy = false;
}
function scheduleSync() {
  if (!syncState.user) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try { await sync.save(syncState.user.id, store.snapshot()); syncState.last = new Date(); syncState.error = null; }
    catch (e) { syncState.error = e.message ?? String(e); }
  }, 1500);
}
async function startSync() {
  if (!sync.configured) return;
  try {
    syncState.user = await sync.user();
    if (syncState.user) {
      store.onSave = scheduleSync; await pullAndMerge();
      const held = takeJoin(localStorage);
      if (held) { try { await sync.joinCohort(held); } catch (e) { syncState.error = e.message ?? String(e); } }
      await loadCohorts();
      if (!session) dispatch();
    }
  } catch (e) { syncState.error = e.message ?? String(e); }
}
// The club list is cached so club sets still shape sessions offline.
const COHORT_CACHE = "napkin_cohorts";
try { syncState.cohorts = JSON.parse(localStorage.getItem(COHORT_CACHE) || "[]"); } catch { syncState.cohorts = []; }
async function loadCohorts() {
  if (!syncState.user) { syncState.cohorts = []; try { localStorage.removeItem(COHORT_CACHE); } catch {} return; }
  try {
    syncState.cohorts = (await sync.myCohorts()) ?? [];
    try { localStorage.setItem(COHORT_CACHE, JSON.stringify(syncState.cohorts)); } catch {}
  } catch (e) { syncState.error = e.message ?? String(e); }
}
// A club can hide the betting set for its members (under-21 members, adviser objections).
const visibleSets = () => (syncState.cohorts.some((c) => c.hide_betting) ? ALL_SETS.filter((g) => g !== "betting") : ALL_SETS);
const saved = (() => { try { return JSON.parse(localStorage.getItem("napkin_state") || "{}"); } catch { return {}; } })();
const state = { group: saved.group ?? "today", mode: saved.mode ?? "say", count: saved.count ?? 10, more: false };
const remember = () => { try { localStorage.setItem("napkin_state", JSON.stringify(state)); } catch {} };
const keysOn = () => { try { return localStorage.getItem("napkin_keys") !== "off"; } catch { return true; } };
const promptEl = (item) => el("div", { class: "prompt" + (item.prompt.length > 60 ? " long" : "") }, item.prompt);
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function countUp(node, target, format = (x) => String(Math.round(x))) {
  if (reduceMotion()) { node.textContent = format(target); return; }
  const t0 = performance.now();
  const step = (now) => { const p = Math.min(1, (now - t0) / 600); node.textContent = format(target * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
const CHECK = () => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); s.innerHTML = '<path d="M4 12.5 L9.5 18 L20 6.5"/>'; return s; };
const FEEDBACK_EMAIL = "aydin@mightymoosenutrition.com";
const SET_NOTES = { betting: "Math practice only. The odds are made up, nothing is ever recorded as a bet, and this is not a betting tool." };
const ALL_SETS = ["interview", "poker", "pokeradv", "quick", "banking", "accounting", "valuation", "walks", "deals", "prob", "rates", "betting", "moose", "novyx", "energy"];
const hideBetting = () => syncState.cohorts.some((c) => c.hide_betting);
const prioritySets = () => mergeClubSets(setsForAreas(store.priorities?.areas ?? []), syncState.cohorts).filter((g) => GROUPS[g] && !(g === "betting" && hideBetting()));
const rungOf = (set) => rungDetail(store.attempts, set, store.stamps, store.starredKeys());
const unlockedSet = (g) => !UNLOCK_AFTER[g] || store.unlocked.includes(g) || clubSetIds(syncState.cohorts).has(g) || rungOf(UNLOCK_AFTER[g]).rung >= 4;
// Sessions and the diagnostic draw only from open sets; a locked set waits for its unlock.
const openPrioritySets = () => prioritySets().filter(unlockedSet);

const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) node.append(c);
  return node;
};
// render redraws in place and keeps the scroll position; screen() is for moving to a new screen.
const render = (...nodes) => { app.replaceChildren(...nodes.flat().filter((n) => n !== null && n !== undefined && n !== false)); };
// Primary actions live in a fixed bottom bar, where the thumb is. setBar(null) hides it; settle=true ignores taps for 200ms
// so a tap meant for the button that was just there cannot land on its replacement.
function setBar(nodes, settle = false, tint = null) {
  const list = (nodes ?? []).flat().filter((n) => n !== null && n !== undefined && n !== false);
  bar.classList.remove("ok", "miss");
  if (!list.length) { bar.hidden = true; bar.replaceChildren(); return; }
  bar.hidden = false;
  if (tint) bar.classList.add(tint);
  bar.replaceChildren(el("div", { class: "inner" }, ...list));
  if (settle) { bar.classList.add("settling"); setTimeout(() => bar.classList.remove("settling"), 200); }
}
const screen = (...nodes) => {
  render(...nodes);
  setBar(null);
  tabs.hidden = true;
  window.scrollTo(0, 0);
  const focus = app.querySelector("[autofocus], h1, .prompt");
  if (focus) { if (!focus.hasAttribute("tabindex") && !focus.matches("button,input")) focus.setAttribute("tabindex", "-1"); focus.focus({ preventScroll: true }); }
};
// A top-level page: tab bar on, action bar off, scrolled to top.
const page = (active, ...nodes) => { screen(...nodes); showTabs(active); };
const back = (path) => el("button", { class: "link", onclick: () => go(path) }, "Back");
const display = (it) => (it.choices ? it.choices[it.answer] : fmt(Math.round(it.answer * 10) / 10));
const nice = (name) => name.replace(/_/g, " ");
// A drill's readable name is the start of its definition ("Minimum defense frequency: ..."), else its id.
const drillTitle = (d) => { const head = (DEFINITIONS[d] ?? "").split(":")[0]; return head && head.length <= 40 ? head : nice(d); };
// Kinded drills file their lessons under "drill:kind"; take the first one found.
// The definition without the name repeated, when the name came from it.
const drillDef = (d) => { const t = DEFINITIONS[d] ?? ""; const i = t.indexOf(":"); return drillTitle(d) !== nice(d) && i > 0 ? t.slice(i + 1).trim().replace(/^./, (c) => c.toUpperCase()) : t; };
const lessonForDrill = (d) => LESSON_BY_FAMILY[d] ?? Object.entries(LESSON_BY_FAMILY).find(([f]) => f.startsWith(d + ":"))?.[1] ?? null;
const levelOf = (group) => LEVELS[groupLevel(store.attempts, GROUPS[group], store.starredKeys())];

// ---------- home ----------
function welcome(existing = null, onDone = null) {
  const draft = { areas: [...(existing?.areas ?? [])], interviewDate: existing?.interviewDate ?? null, minutes: existing?.minutes ?? 10, when: existing?.when ?? null };
  const finish = () => {
    store.priorities = draft;
    store.goal = draft.areas[0] === "poker" ? "poker" : draft.areas[0] === "quick" ? "general" : "interviews";
    state.group = "today"; state.count = draft.minutes === 5 ? 5 : draft.minutes === 20 ? 20 : 10; remember(); store.save();
    if (onDone) return onDone();
    if (existing) return go("#/you");
    diagnosticOffer();
  };
  const step3 = () => {
    const chip = (label) => el("button", { "aria-pressed": String(draft.when === label), onclick: () => { draft.when = draft.when === label ? null : label; step3(); } }, label);
    const mins = (m, sub) => el("button", { "aria-pressed": String(draft.minutes === m), onclick: () => { draft.minutes = m; step3(); } }, el("span", { class: "choice" }, el("span", { class: "title" }, `${m} minutes`), el("span", { class: "muted small" }, sub)));
    screen(
      el("h1", {}, "How long each day?"),
      el("div", { class: "stack" }, mins(5, "a quick hit"), mins(10, "the default"), mins(20, "when you have time")),
      el("h2", {}, "I'll do this (optional)"),
      el("div", { class: "row" }, chip("after breakfast"), chip("between classes"), chip("before bed")),
      el("p", { class: "muted small" }, "Naming a moment roughly doubles the odds you actually do it. You can change all of this later under Priorities.")
    );
    setBar([el("button", { onclick: step2 }, "Back"), el("button", { class: "primary", onclick: finish }, existing ? "Save" : "Start")]);
  };
  const step2 = () => {
    const input = el("input", { type: "date", "aria-label": "interview date", value: draft.interviewDate ?? "" });
    const nextBtn = el("button", { class: "primary", onclick: () => { draft.interviewDate = input.value || null; step3(); } }, draft.interviewDate ? "Next" : "No date yet");
    const sync = () => { draft.interviewDate = input.value || null; nextBtn.textContent = draft.interviewDate ? "Next" : "No date yet"; };
    input.addEventListener("change", sync); input.addEventListener("input", sync);
    screen(
      el("h1", {}, "When is your next interview?"),
      el("p", { class: "muted" }, "Optional. Inside two weeks, the finance sets get more weight and typed mode becomes the default."),
      input,
      el("p", { class: "muted small" }, "Pick a date, then Next. Or skip with No date yet.")
    );
    setBar([el("button", { onclick: step1 }, "Back"), nextBtn]);
  };
  const step1 = () => {
    const box = (id) => el("button", { "aria-pressed": String(draft.areas.includes(id)), onclick: () => { draft.areas = draft.areas.includes(id) ? draft.areas.filter((x) => x !== id) : [...draft.areas, id]; step1(); } },
      el("span", { class: "choice" }, el("span", { class: "titlerow" }, el("span", { class: "title" }, AREAS[id].title), el("span", { class: "badge" }, draft.areas.includes(id) ? "✓" : "")), el("span", { class: "muted small" }, AREAS[id].sub)));
    screen(
      existing ? el("h1", {}, "Priorities") : el("h1", {}, "Napkin"),
      existing ? null : el("p", { style: "font-size:19px" }, "Ten minutes a day on the numbers interviewers ask. Say it out loud, then check."),
      el("h2", {}, "What are you here for? Pick one or more."),
      el("div", { class: "stack" }, AREA_ORDER.map(box)),
      el("p", { class: "muted small" }, "Free. Nothing to install. Your progress stays in this browser unless you sign in.")
    );
    setBar([el("button", { class: "primary", onclick: () => { if (draft.areas.length) step2(); }, disabled: draft.areas.length ? null : "" }, "Next")]);
  };
  step1();
}

function diagnosticOffer() {
  const sets = openPrioritySets().slice(0, 3);
  screen(
    el("h1", {}, "Six-minute check"),
    el("p", {}, `Eight typed questions from each of: ${sets.map((s) => GROUP_LABELS[s][0]).join(", ")}. Twenty seconds each. It places you honestly and stars what you miss, so your first real session goes where it counts.`),
    el("p", { class: "muted small" }, "You can skip it and take it later from the home screen.")
  );
  setBar([el("button", { onclick: () => go("#/") }, "Skip for now"), el("button", { class: "primary", onclick: startDiagnostic }, "Take it")]);
}

const chooser = (key, on, title, sub, after) =>
  el("button", { "aria-pressed": String(state[key] === on), onclick: () => { state[key] = on; remember(); after(); } },
    el("span", { class: "choice" }, el("span", { class: "title" }, title), sub ? el("span", { class: "muted small" }, sub) : null));
const modeCountRows = (after) => [
  el("h2", {}, "How do you answer?"),
  el("div", { class: "row" }, chooser("mode", "say", "Say it", "Reveal, then grade yourself", after), chooser("mode", "type", "Type it", "Counts toward levels", after)),
  el("h2", {}, "How many?"),
  el("div", { class: "row" }, [5, 10, 20].map((n) => chooser("count", n, String(n), n === 5 ? "quick hit" : n === 10 ? "about 5 min" : "long", after))),
];
const rungBadge = (r) => el("span", { class: `badge l${Math.min(4, Math.floor(r.rung / 2))}` }, r.name + (r.stale ? " · stale" : ""));
const noticeCard = (title, text, button) => el("div", { class: "card notice", style: "margin-top:16px" }, el("div", { class: "title" }, title), el("p", { class: "muted small" }, text), button);

// Today: one action, status, and cards only when they matter.
function today() {
  const starred = store.starredItems().length;
  const days = streak(store.days);
  const due = weeklyCheckDue(new Date(), store.weekly);
  const pri = prioritySets();
  const dUntil = daysUntil(store.priorities?.interviewDate ?? null);
  const todayDone = store.days.includes(dayKey(new Date()));
  const diagDue = diagnosticDue(store.diagnostics);
  const toLearn = store.toLearnItems();
  const modeChip = (m, label) => el("button", { class: "chip", "aria-pressed": String(state.mode === m), onclick: () => { state.mode = m; remember(); today(); } }, label);
  const countChip = (n) => el("button", { class: "chip", "aria-pressed": String(state.count === n), onclick: () => { state.count = n; remember(); today(); } }, String(n));
  page("today",
    el("div", { class: "topbar" }, el("div", { class: "brand" }, MARK(), el("h1", {}, "Napkin")), el("span", { class: "muted num" }, days ? `${days}-day streak` : "")),
    el("div", { class: "status num" },
      el("span", {}, todayDone ? "Today: done" : "Today: not yet"),
      el("span", {}, starred ? el("strong", {}, `${starred} starred`) : "Nothing starred"),
      dUntil !== null && dUntil >= 0 ? el("span", { class: dUntil <= 14 ? "star" : "" }, `Interview in ${dUntil} day${dUntil === 1 ? "" : "s"}`) : null,
      due ? el("span", { class: "star" }, "Sunday check due") : null),
    el("button", { class: "primary", onclick: () => startSession("today", state.mode, state.count) }, `Start today's ${state.count} · ${state.mode === "say" ? "Say it" : "Type it"}`),
    el("p", { class: "muted small", style: "margin:8px 0 0" }, `Starred first, then ${clubSetIds(syncState.cohorts).size ? "your club's sets and your priorities" : "your priorities"}: ${pri.filter(unlockedSet).map((s) => GROUP_LABELS[s][0]).join(", ")}.`),
    el("div", { class: "chips" }, modeChip("say", "Say it"), modeChip("type", "Type it"), el("span", { class: "chipgap" }), countChip(5), countChip(10), countChip(20)),
    toLearn.length ? el("button", { class: "card notice action", style: "margin-top:16px", onclick: () => go("#/lessons") },
      el("span", { class: "choice" }, el("span", { class: "title" }, `Lessons · ${toLearn.length} to learn`), el("span", { class: "muted small" }, toLearn.slice(0, 3).map((t) => (FAMILIES[t.family] ?? { name: nice(t.drill) }).name).join(" · ") + (toLearn.length > 3 ? " · more" : "")))) : null,
    dUntil !== null && dUntil < 0 ? noticeCard("Your interview date has passed", "How did it go? Set the next date, or clear it.",
      el("div", { class: "row" }, el("button", { onclick: () => go("#/priorities") }, "Set the next date"), el("button", { onclick: () => { store.priorities = { ...store.priorities, interviewDate: null }; store.save(); today(); } }, "No date for now"))) : null,
    diagDue ? noticeCard(store.diagnostics.length ? "Time for a re-check" : "Six-minute check", store.diagnostics.length ? "It has been four weeks. Eight typed questions per priority set, to see what moved." : "Eight typed questions per priority set. Places you honestly and stars what you miss.", el("button", { class: "primary", onclick: startDiagnostic }, "Take it")) : null,
    due ? noticeCard("Sunday check", "Ten typed questions from what you have started. This is the honest score.", el("button", { class: "primary", onclick: startWeekly }, "Do the weekly check")) : null,
    el("h2", {}, "Your sets"),
    el("div", { class: "stack" }, pri.map((g) => setCard(g))),
    el("button", { class: "link", onclick: () => go("#/practice") }, "All sets and interview runs")
  );
}

function setCard(g) {
  const [title, sub] = GROUP_LABELS[g];
  if (g !== "all" && !unlockedSet(g)) {
    return el("div", { class: "card locked" },
      el("div", { class: "choice" }, el("span", { class: "title" }, title), el("span", { class: "muted small" }, `Locked until ${GROUP_LABELS[UNLOCK_AFTER[g]][0]} reaches Solid.`)),
      el("button", { class: "link small", onclick: () => { store.unlock(g); store.save(); dispatch(); } }, "Unlock anyway"));
  }
  const r = g === "all" ? null : rungOf(g);
  return el("button", { onclick: () => go(`#/set/${g}`) },
    el("span", { class: "choice" }, el("span", { class: "titlerow" }, el("span", { class: "title" }, title), r ? rungBadge(r) : null), el("span", { class: "muted small" }, sub)));
}

// Practice: every set, the pickers, and the interview runs.
function practice() {
  const pri = prioritySets();
  const rest = visibleSets().filter((g) => !pri.includes(g));
  page("practice",
    el("h1", {}, "Practice"),
    el("p", { class: "muted" }, "Pick a set to see where you stand and start it. Your priority sets come first."),
    el("h2", {}, "Your sets"), el("div", { class: "stack" }, pri.map(setCard)),
    el("h2", {}, "Other sets"), el("div", { class: "stack" }, [...rest, "all"].map(setCard)),
    ...modeCountRows(practice),
    el("h2", {}, "Interview runs"),
    el("button", { class: "card action", onclick: () => go("#/runs") },
      el("span", { class: "choice" }, el("span", { class: "title" }, "Poker, finance, or accounting"), el("span", { class: "muted small" }, "Three typed answers against the clock, pass or fail.")))
  );
}

// One set: rung, what is next, level check, best, the drills in it, start.
function setPage(g) {
  if (!GROUP_LABELS[g]) return go("#/practice");
  const [title, sub] = GROUP_LABELS[g];
  const r = g === "all" ? null : rungOf(g);
  const locked = r && store.checkLocks[g] && Date.now() / 1000 - store.checkLocks[g] < 86400;
  const unlocked = g === "all" || unlockedSet(g);
  const drills = GROUPS[g].concat(LATER[g] && r?.rung >= 4 ? LATER[g] : []);
  const stat = (d) => { const rows = store.attempts.filter((a) => a.drill === d); return rows.length ? `${Math.round((100 * rows.filter((a) => a.correct).length) / rows.length)}% of ${rows.length}` : "not yet tried"; };
  screen(
    el("div", { class: "topbar" }, el("h1", {}, title), r ? rungBadge(r) : null),
    el("p", { class: "muted" }, sub),
    SET_NOTES[g] ? el("p", { class: "star small" }, SET_NOTES[g]) : null,
    !unlocked ? el("div", { class: "card locked" }, el("div", { class: "choice" }, el("span", { class: "title" }, "Locked"), el("span", { class: "muted small" }, `Opens when ${GROUP_LABELS[UNLOCK_AFTER[g]][0]} reaches Solid.`)), el("button", { class: "link small", onclick: () => { store.unlock(g); store.save(); setPage(g); } }, "Unlock anyway")) : null,
    r ? el("div", { class: "card" }, el("div", { class: "title" }, `Level: ${r.name}`), el("div", { class: "muted small" }, r.next),
      r.canCheck && !locked ? el("button", { class: "link small", style: "padding:4px 0", onclick: () => startCheck(g, r.canCheck) }, `Sit the ${RUNGS[r.canCheck]} check`) : locked ? el("div", { class: "muted small" }, "Check locked for 24 hours after a miss.") : null) : null,
    store.bests[g] !== undefined ? el("p", { class: "muted small num" }, `Personal best: ${store.bests[g].toFixed(0)}s for a session.`) : null,
    LATER[g] && !(r?.rung >= 4) ? el("p", { class: "muted small" }, `${LATER[g].length} more drills join this set once it is Solid.`) : null,
    ...modeCountRows(() => setPage(g)),
    el("h2", {}, `Drills (${drills.length})`),
    el("div", { class: "stack" }, drills.map((d) => el("div", { class: "card", style: "padding:12px 14px" },
      el("div", { class: "titlerow" }, el("span", { class: "title" }, drillTitle(d)), el("span", { class: "muted small num" }, stat(d))),
      el("div", { class: "small muted", style: "font-weight:400;margin-top:2px" }, drillDef(d)),
      lessonForDrill(d) ? el("button", { class: "link small", style: "padding:4px 0", onclick: () => go(`#/lesson/${lessonForDrill(d)}`) }, "One-minute method") : null))),
    el("div", { style: "height:16px" }),
    back("#/practice")
  );
  if (unlocked) setBar([el("button", { class: "primary", onclick: () => startSession(g, state.mode, state.count) }, `Start · ${state.count} · ${state.mode === "say" ? "Say it" : "Type it"}`)]);
}

// You: account, priorities, club, reference, about.
function you() {
  const row = (title, sub, path) => el("button", { onclick: () => go(path) }, el("span", { class: "choice" }, el("span", { class: "title" }, title), el("span", { class: "muted small" }, sub)));
  const pri = store.priorities;
  page("you",
    el("h1", {}, "You"),
    el("div", { class: "stack" },
      row(syncState.user ? "Account ✓" : "Account", syncState.user ? `Signed in as ${syncState.user.email}. Progress syncs between devices.` : sync.configured ? "Sign in by email link to share progress between devices." : "Sync is not switched on for this copy.", "#/account"),
      row("Priorities", pri ? `${(pri.areas ?? []).map((a) => AREAS[a]?.title ?? a).join(", ")}${pri.interviewDate ? ` · interview ${pri.interviewDate}` : ""} · ${pri.minutes} min` : "Pick what you are here for.", "#/priorities"),
      row("Club", syncState.cohorts.length ? syncState.cohorts.map((c) => c.name).join(", ") : "Join a club with a code, or lead one.", "#/club"),
      row("Poker index card", "The pot-odds answer and its follow-ups, on one card.", "#/card"),
      row("About", "What Napkin is, your data, terms, keyboard shortcuts, feedback.", "#/about"))
  );
}

// ---------- clubs ----------
const copyButton = (text, label = "Copy link") => el("button", { class: "link small", onclick: async (e) => { try { await navigator.clipboard.writeText(text); e.target.textContent = "Copied"; } catch { e.target.textContent = text; } } }, label);

function clubPage(opts = {}) {
  if (!sync.configured) return page("you", el("h1", {}, "Club"), el("p", {}, "Clubs need accounts, and sync is not switched on for this copy of Napkin."), back("#/you"));
  if (!syncState.user) {
    return page("you", el("h1", {}, "Club"),
      el("p", {}, opts.pendingCode ? `You are joining ${opts.pendingCode}. Sign in first; the join finishes on its own once you are back.` : "Join a club with its code, or lead one. Sign in first so the club can count you."),
      el("p", { class: "muted small" }, "A club leader only ever sees aggregate numbers, and nothing at all until five members have practised."),
      el("button", { class: "primary", onclick: () => go("#/account") }, "Sign in"), back("#/you"));
  }
  const status = el("p", { class: "muted small" }, syncState.error ?? "");
  const codeInput = el("input", { type: "text", "aria-label": "club code", placeholder: "CLUB-CODE", autocapitalize: "characters", autocomplete: "off", style: "font-size:18px" });
  const joinNow = async () => {
    const code = normalizeCode(codeInput.value); if (!code) { status.textContent = "A code is 4 to 20 letters, digits, or dashes."; return; }
    status.textContent = "Joining…";
    try { await sync.joinCohort(code); await loadCohorts(); go(`#/club`); } catch (e) { status.textContent = `Could not join: ${e.message ?? e}`; }
  };
  const nameInput = el("input", { type: "text", "aria-label": "club name", placeholder: "Kelley FIR, fall 2026", style: "font-size:18px" });
  const newCode = el("input", { type: "text", "aria-label": "new club code", placeholder: "KELLEY-FIR-F26", autocapitalize: "characters", autocomplete: "off", style: "font-size:18px" });
  nameInput.addEventListener("input", () => { if (!newCode.dataset.touched) newCode.value = suggestCode(nameInput.value) ?? ""; });
  newCode.addEventListener("input", () => { newCode.dataset.touched = "1"; });
  const selectStyle = "font: inherit; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); color: var(--text); width: 100%";
  const packPick = el("select", { "aria-label": "starting question sets", style: selectStyle },
    el("option", { value: "" }, "No club sets: members keep their own priorities"),
    ...Object.entries(PACKS).map(([k, p]) => el("option", { value: k }, `${p.title}: ${p.sub}`)));
  const createNow = async () => {
    const code = normalizeCode(newCode.value); const name = nameInput.value.trim();
    if (name.length < 2 || !code) { status.textContent = "Give the club a name and a code of 4 to 20 letters, digits, or dashes."; return; }
    status.textContent = "Creating…";
    try {
      const made = await sync.createCohort(name, code);
      if (packPick.value && made?.id) await sync.setCohortSets(made.id, PACKS[packPick.value].sets);
      await loadCohorts(); go(made?.id ? `#/club/${made.id}` : "#/club");
    } catch (e) { status.textContent = `Could not create: ${e.message ?? e}`; }
  };
  const mine = syncState.cohorts;
  page("you",
    el("h1", {}, "Club"),
    mine.length ? el("h2", { style: "margin-top:0" }, "Your clubs") : el("p", {}, "You are not in a club yet."),
    ...mine.map((c) => el("button", { onclick: () => go(`#/club/${c.id}`) }, el("span", { class: "choice" }, el("span", { class: "titlerow" }, el("span", { class: "title" }, c.name), el("span", { class: "badge" }, c.is_owner ? "leader" : "member")), el("span", { class: "muted small num" }, `${c.code} · ${c.members} member${c.members === 1 ? "" : "s"}`)))),
    el("h2", {}, "Join a club"),
    el("form", { onsubmit: (e) => { e.preventDefault(); joinNow(); } }, codeInput, el("div", { style: "height:8px" }), el("button", { type: "submit" }, "Join")),
    el("h2", {}, "Lead a club"),
    el("p", { class: "muted small" }, "You get a code to share, a shared ten-question session with a four-letter code, and a page of aggregate numbers. Never anyone's individual score."),
    el("form", { onsubmit: (e) => { e.preventDefault(); createNow(); } }, nameInput, el("div", { style: "height:8px" }), newCode, el("div", { style: "height:8px" }), packPick, el("div", { style: "height:8px" }), el("button", { type: "submit" }, "Create the club")),
    status,
    back("#/you"));
}

function clubDetail(id) {
  const c = syncState.cohorts.find((x) => x.id === id);
  if (!c) return go("#/club");
  const status = el("p", { class: "muted small" }, "");
  const summaryBox = el("div", { class: "stack" });
  const boardBox = el("div", { class: "stack" });
  const sessionBox = el("div", {});
  const refresh = async () => { await loadCohorts(); clubDetail(id); };
  if (c.is_owner) {
    sync.cohortSummary(id).then((sum) => summaryBox.replaceChildren(...summaryRows(sum).map(([k, v]) => (v.length > 40
        ? el("div", { class: "card", style: "padding:10px 14px" }, el("div", { class: "muted small" }, k), el("div", { class: "small", style: "margin-top:4px" }, v))
        : el("div", { class: "card", style: "padding:10px 14px" }, el("div", { class: "titlerow" }, el("span", { class: "muted small" }, k), el("span", { class: "num", style: "font-weight:600;text-align:right" }, v)))))))
      .catch((e) => summaryBox.replaceChildren(el("p", { class: "muted small" }, `Summary unavailable: ${e.message ?? e}`)));
  }
  if (c.leaderboard) {
    sync.cohortLeaderboard(id).then((rows) => boardBox.replaceChildren(rows?.length ? el("ol", { class: "board num" }, ...rows.map((r) => el("li", {}, el("span", {}, r.first_name), el("span", {}, `${r.score} typed right`)))) : el("p", { class: "muted small" }, "Nobody on the board yet this week.")))
      .catch(() => boardBox.replaceChildren(el("p", { class: "muted small" }, "Board unavailable.")));
  }
  const setPick = el("select", { "aria-label": "set for the club session", style: "font: inherit; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); color: var(--text); width: 100%" },
    ...(c.sets?.length ? c.sets : visibleSets()).filter((g) => GROUP_LABELS[g] && (g !== "betting" || !c.hide_betting)).map((g) => el("option", { value: g }, GROUP_LABELS[g][0])));
  // Question sets: a leader starts from a preset or picks sets one by one, in order.
  const draft = [...(c.sets ?? [])];
  const packBox = el("div", {});
  const saveSets = async () => {
    status.textContent = "Saving…";
    try { await sync.setCohortSets(id, cleanSets(draft, ALL_SETS)); await refresh(); } catch (e) { status.textContent = `Could not save: ${e.message ?? e}`; }
  };
  const drawPack = () => packBox.replaceChildren(
    el("p", { class: "muted small" }, `Members get these sets first in their Today session for their first two weeks, then after their own priorities. Locked sets open for members. Up to ${MAX_CLUB_SETS}, in the order you tap them.`),
    el("div", { class: "chips" }, el("span", { class: "muted small" }, "Start from:"), ...Object.entries(PACKS).map(([, p]) => el("button", { class: "chip", onclick: () => { draft.splice(0, draft.length, ...p.sets); drawPack(); } }, p.title)),
      el("button", { class: "chip", onclick: () => { draft.splice(0, draft.length); drawPack(); } }, "None")),
    el("div", { class: "stack", style: "margin-top:8px" }, ...ALL_SETS.filter((g) => g !== "betting" || !c.hide_betting).map((g) => {
      const at = draft.indexOf(g);
      return el("button", { "aria-pressed": String(at >= 0), onclick: () => { if (at >= 0) draft.splice(at, 1); else if (draft.length < MAX_CLUB_SETS) draft.push(g); drawPack(); } },
        el("span", { class: "choice" }, el("span", { class: "titlerow" }, el("span", { class: "title" }, GROUP_LABELS[g][0]), at >= 0 ? el("span", { class: "badge" }, String(at + 1)) : null), el("span", { class: "muted small" }, GROUP_LABELS[g][1])));
    })),
    el("button", { class: "primary", style: "margin-top:8px", onclick: saveSets }, draft.length ? `Save ${draft.length} club set${draft.length === 1 ? "" : "s"}` : "Save with no club sets"));
  drawPack();
  const newSession = async () => {
    status.textContent = "Creating…";
    try {
      const r = await sync.createClubSession(id, setPick.value, newSeed(), shortCode());
      const link = clubSessionLink(r.short_code, location.origin + location.pathname);
      sessionBox.replaceChildren(el("div", { class: "card notice" }, el("div", { class: "title num" }, `Session ${r.short_code}`), el("p", { class: "muted small" }, `${GROUP_LABELS[r.set_id][0]}, ten typed questions, the same on every phone. Share the code or the link.`), el("div", { class: "row" }, copyButton(link), el("button", { class: "link small", onclick: () => go(`#/s/${r.short_code}`) }, "Run it now"))));
      status.textContent = "";
    } catch (e) { status.textContent = `Could not create a session: ${e.message ?? e}`; }
  };
  const nameIn = el("input", { type: "text", "aria-label": "first name for the board", placeholder: "First name", value: c.first_name ?? "", style: "font-size:18px" });
  const optIn = async (on) => { try { await sync.setBoardOptIn(id, on, nameIn.value.trim()); await refresh(); } catch (e) { status.textContent = e.message ?? String(e); } };
  const flag = async (patch) => { try { await sync.setCohortFlags(id, patch.hide_betting ?? null, patch.leaderboard ?? null); await refresh(); } catch (e) { status.textContent = e.message ?? String(e); } };
  screen(
    el("div", { class: "topbar" }, el("h1", {}, c.name), el("span", { class: "badge" }, c.is_owner ? "leader" : "member")),
    el("p", { class: "muted small num" }, `Code ${c.code} · ${c.members} member${c.members === 1 ? "" : "s"} · `, copyButton(joinLink(c.code, location.origin + location.pathname), "Copy join link")),
    c.is_owner ? el("h2", {}, "This week, in aggregate") : null,
    c.is_owner ? summaryBox : null,
    c.sets?.length ? el("p", { class: "small" }, `This club practises: ${c.sets.filter((g) => GROUP_LABELS[g]).map((g) => GROUP_LABELS[g][0]).join(", ")}.`) : null,
    c.is_owner ? el("h2", {}, "Question sets") : null,
    c.is_owner ? packBox : null,
    c.is_owner ? el("h2", {}, "Club session") : null,
    c.is_owner ? el("div", {}, setPick, el("div", { style: "height:8px" }), el("button", { class: "primary", onclick: newSession }, "New club session"), sessionBox) : null,
    c.is_owner ? el("h2", {}, "Settings") : null,
    c.is_owner ? el("div", { class: "row" },
      el("button", { "aria-pressed": String(c.hide_betting), onclick: () => flag({ hide_betting: !c.hide_betting }) }, el("span", { class: "choice" }, el("span", { class: "title" }, c.hide_betting ? "Betting set hidden" : "Betting set shown"), el("span", { class: "muted small" }, "For under-21 members or an adviser's objection."))),
      el("button", { "aria-pressed": String(c.leaderboard), onclick: () => flag({ leaderboard: !c.leaderboard }) }, el("span", { class: "choice" }, el("span", { class: "title" }, c.leaderboard ? "Weekly board on" : "Weekly board off"), el("span", { class: "muted small" }, "Opt-in, first names, typed answers only, top ten.")))) : null,
    c.leaderboard ? el("h2", {}, "This week's board") : null,
    c.leaderboard ? boardBox : null,
    c.leaderboard ? el("div", { class: "card", style: "margin-top:8px" }, el("div", { class: "title" }, c.board_opt_in ? "You are on the board" : "Join the board?"), el("p", { class: "muted small" }, "Your first name and your count of typed correct answers this week. Nothing else. Leave any time."),
      c.board_opt_in ? el("button", { onclick: () => optIn(false) }, "Leave the board") : el("div", {}, nameIn, el("div", { style: "height:8px" }), el("button", { onclick: () => { if (nameIn.value.trim()) optIn(true); else status.textContent = "Add a first name to go on the board."; } }, "Go on the board"))) : null,
    status,
    el("h2", {}, c.is_owner ? "Danger" : "Leave"),
    c.is_owner ? el("button", { class: "link small", onclick: async () => { if (confirm(`Delete ${c.name}? Members keep all their own progress.`)) { await sync.deleteCohort(id); await loadCohorts(); go("#/club"); } } }, "Delete this club")
      : el("button", { class: "link small", onclick: async () => { await sync.leaveCohort(id); await loadCohorts(); go("#/club"); } }, "Leave this club"),
    el("div", { style: "height:16px" }),
    back("#/club"));
}

async function joinRoute(code) {
  const clean = normalizeCode(code);
  if (!clean) return go("#/club");
  if (!syncState.user) { holdJoin(localStorage, clean); return clubPage({ pendingCode: clean }); }
  screen(el("h1", {}, "Joining…"), el("p", { class: "muted" }, clean));
  try { await sync.joinCohort(clean); await loadCohorts(); go("#/club"); }
  catch (e) { screen(el("h1", {}, "Could not join"), el("p", {}, e.message ?? String(e)), back("#/club")); }
}

async function clubSessionRoute(short) {
  if (!sync.configured) return go("#/");
  screen(el("h1", {}, "Club session"), el("p", { class: "muted num" }, short.toUpperCase()));
  let r = null;
  try { r = await sync.clubSessionByCode(short); } catch (e) { return screen(el("h1", {}, "Club session"), el("p", {}, `Could not load it: ${e.message ?? e}`), back("#/")); }
  if (!r) return screen(el("h1", {}, "No session with that code"), el("p", { class: "muted" }, "Check the four letters with whoever shared it."), back("#/"));
  const items = clubSessionItems(r.set_id, r.seed);
  screen(
    el("h1", {}, `${r.club_name}: ${GROUP_LABELS[r.set_id]?.[0] ?? r.set_id}`),
    el("p", {}, "Ten typed questions, the same on every phone. Your answers count toward your own levels and stars, and toward the club's completion count. Nobody sees your individual score."),
    el("p", { class: "muted small num" }, `Session ${r.short_code}`));
  setBar([el("button", { class: "primary", onclick: () => { session = null; startSession(r.set_id, "type", items.length, { items, kind: "drill", club: { short: r.short_code, clubName: r.club_name } }); } }, "Start"), el("button", { onclick: () => go("#/") }, "Not now")]);
}

function account() {
  if (!sync.configured) {
    return screen(
      el("h1", {}, "Account"),
      el("p", {}, "Sync is not switched on for this copy of Napkin. Your progress stays in this browser."),
      el("p", { class: "muted small" }, "To share progress between your laptop and phone, follow docs/setup-sync.md in the repository. About five minutes."),
      back("#/you")
    );
  }
  if (syncState.user) {
    return screen(
      el("h1", {}, "Account"),
      el("div", { class: "card" },
        el("p", {}, `Signed in as ${syncState.user.email}`),
        el("p", { class: "muted small num" }, syncState.error ? `Last sync failed: ${syncState.error}` : syncState.last ? `Last synced ${syncState.last.toLocaleTimeString()}` : "Not synced yet"),
        el("div", { class: "row" },
          el("button", { onclick: async () => { await pullAndMerge(); account(); } }, "Sync now"),
          el("button", { onclick: async () => { await sync.signOut(); syncState.user = null; store.onSave = null; await loadCohorts(); go("#/you"); } }, "Sign out"))),
      el("p", { class: "muted small" }, "Signing out leaves this browser's copy in place. Your account copy is untouched."),
      back("#/you")
    );
  }
  const input = el("input", { type: "email", inputmode: "email", autocomplete: "email", placeholder: "you@iu.edu", "aria-label": "email", required: "" });
  const status = el("p", { class: "muted small" }, "");
  const sendBtn = el("button", { class: "primary", type: "submit" }, "Email me a sign-in link");
  screen(
    el("h1", {}, "Account"),
    el("p", {}, "Sign in to share your progress between devices. No password: you get a link by email."),
    el("form", { onsubmit: async (e) => {
      e.preventDefault();
      if (sendBtn.disabled) return;
      sendBtn.disabled = true; sendBtn.textContent = "Sending…"; status.textContent = "";
      try { await sync.sendMagicLink(input.value.trim()); status.textContent = "Check your email and open the link on this device."; sendBtn.textContent = "Sent"; }
      catch (err) { status.textContent = `Could not send: ${err.message ?? err}`; sendBtn.disabled = false; sendBtn.textContent = "Email me a sign-in link"; }
    } }, input, el("div", { style: "height:12px" }), sendBtn),
    status,
    el("p", { class: "muted small" }, "Progress already in this browser is kept and merged in, not replaced."),
    back("#/you")
  );
  input.focus();
}


function lessonsList() {
  const flagged = store.toLearnItems();
  const flaggedRow = (t) => {
    const fam = FAMILIES[t.family] ?? { name: nice(t.drill), method: null };
    const lessonId = t.lesson ?? LESSON_BY_FAMILY[t.family] ?? null;
    return el("div", { class: "card", style: "margin-bottom:8px" },
      el("div", { class: "titlerow" }, el("span", { class: "title" }, fam.name), el("button", { class: "link small", "aria-label": `got it: ${fam.name}`, onclick: () => { store.clearToLearn(t.family); store.save(); lessonsList(); } }, "Got it")),
      el("div", { class: "muted small" }, t.example),
      fam.method ? el("p", { class: "method", style: "margin:8px 0 0" }, el("strong", {}, "Method: "), fam.method) : null,
      el("div", { class: "row", style: "margin-top:8px" },
        lessonId ? el("button", { class: "primary", onclick: () => go(`#/lesson/${lessonId}`) }, store.lessonsRead.includes(lessonId) ? `Read again: ${LESSON_BY_ID[lessonId].title}` : `Read: ${LESSON_BY_ID[lessonId].title}`) : null,
        el("button", { onclick: () => { const items = []; const rng = makeRng(); for (let k = 0; k < 40 && items.length < 3; k++) { const it = DRILLS[t.drill](rng, { family: t.family }); if (!items.some((x) => x.key === it.key)) items.push(it); } session = null; startSession("today", "type", items.length, { items, kind: "lesson" }); } }, "Try three")));
  };
  page("lessons",
    el("h1", {}, "Lessons"),
    flagged.length ? el("h2", { style: "margin-top:0" }, `To learn (${flagged.length})`) : null,
    flagged.length ? el("p", { class: "muted small" }, "Kinds of question you marked \"I don't know this\". Each clears after two clean typed reps, or tap Got it.") : null,
    ...flagged.map(flaggedRow),
    flagged.length ? el("h2", {}, "All lessons") : null,
    el("p", { class: "muted" }, "One minute each. Standard methods, nothing invented. Read one, then try three."),
    el("div", { class: "stack" }, LESSONS.map((l) => el("button", { onclick: () => go(`#/lesson/${l.id}`) },
      el("span", { class: "choice" }, el("span", { class: "titlerow" }, el("span", { class: "title" }, l.title), store.lessonsRead.includes(l.id) ? el("span", { class: "badge l3" }, "read") : null), el("span", { class: "muted small" }, l.method))))),
    el("h2", {}, "Reference"),
    el("div", { class: "stack" },
      el("button", { onclick: () => go("#/glossary") }, el("span", { class: "choice" }, el("span", { class: "title" }, "Glossary"), el("span", { class: "muted small" }, `Every drill's one-line definition, with a box for your own note. ${Object.keys(store.notes).length} notes so far.`))),
      el("button", { onclick: () => go("#/card") }, el("span", { class: "choice" }, el("span", { class: "title" }, "Poker index card"), el("span", { class: "muted small" }, "The pot-odds answer and its follow-ups."))))
  );
}

function lesson(id, backTo) {
  const l = LESSON_BY_ID[id];
  if (!l) return go("#/lessons");
  store.markLessonRead(id); store.save();
  const tryThree = () => {
    const rng = makeRng();
    const items = [];
    const seen = new Set();
    for (let k = 0; k < 60 && items.length < 3; k++) {
      const f = l.families[k % l.families.length];
      const drill = f.split(":")[0];
      if (!DRILLS[drill]) continue;
      const it = DRILLS[drill](rng, { family: f });
      if (!seen.has(it.key)) { seen.add(it.key); items.push(it); }
    }
    if (!items.length) return;
    session = null;
    startSession("today", "type", items.length, { items, kind: "lesson" });
  };
  screen(
    el("h1", {}, l.title),
    el("p", { style: "font-size:19px" }, l.method),
    el("h2", {}, "Worked examples"),
    ...l.examples.map((x) => el("p", { class: "num" }, x)),
    el("h2", {}, "When it works"), el("p", {}, l.when),
    el("h2", {}, "The trap"), el("p", {}, l.trap),
    el("p", { class: "muted small", style: "margin-top:16px" }, "This is the tool's explanation. Write your own in your notes without looking; if you can't, you don't own it yet."),
    el("button", { class: "link", onclick: backTo ?? (() => go("#/lessons")) }, "Back")
  );
  setBar([el("button", { class: "primary", onclick: tryThree }, "Try three, typed")]);
}

function about() {
  screen(
    el("h1", {}, "About Napkin"),
    el("p", {}, "Napkin is a daily warm-up for the arithmetic that comes up in finance interviews, at a poker table, and in running a small business. Say the answer out loud, reveal, grade yourself. Type mode keeps you honest."),
    el("h2", {}, "Your data"),
    el("p", { class: "small" }, "Everything you do here is saved in this browser only: your answers, times, stars, and streak. Nothing is sent anywhere. No account, no cookies, no trackers. Clearing this site's data in your browser erases it. Use Export on the Stats page to keep a copy."),
    el("h2", {}, "Sports betting set"),
    el("p", { class: "small" }, SET_NOTES.betting + " If you are under 21, it is arithmetic practice and nothing more."),
    el("h2", {}, "Terms"),
    el("p", { class: "small" }, "Free to use, provided as is, with no guarantee that any answer is right. Every drill is tested against an independent calculation, but if you find a wrong one, report it from the result screen and it gets fixed."),
    el("h2", {}, "Keyboard shortcuts"),
    el("p", { class: "small" }, "On a computer: Enter reveals or continues, Y and N grade. ",
      el("button", { class: "link small", onclick: () => { try { localStorage.setItem("napkin_keys", keysOn() ? "off" : "on"); } catch {} about(); } }, keysOn() ? "Turn single-letter shortcuts off" : "Turn shortcuts on")),
    el("h2", {}, "Feedback"),
    el("p", { class: "small" }, "One line is enough. ", el("a", { href: `mailto:${FEEDBACK_EMAIL}?subject=Napkin` }, FEEDBACK_EMAIL)),
    back("#/you")
  );
}

// ---------- session ----------
let session = null;

function startSession(group, mode, count, opts = {}) {
  const pri = openPrioritySets();
  // "Later" drills join a set once it is Solid: they rest on a derivation worth earning first.
  const withLater = (g) => (LATER[g] && rungOf(g).rung >= 4 ? [...GROUPS[g], ...LATER[g]] : GROUPS[g]);
  const names = group === "today" ? pri.flatMap((s) => GROUPS[s]) : withLater(group);
  const urgent = daysUntil(store.priorities?.interviewDate ?? null);
  if (group === "today" && mode === "say" && urgent !== null && urgent >= 0 && urgent <= 3 && !opts.items) mode = "type";
  const items = opts.items ?? (group === "today" ? todayQueue(store, pri, count, boostClubWeights(weightsFor(store, pri, store.priorities?.interviewDate ?? null), syncState.cohorts), makeRng()) : buildQueue(store, names, count, makeRng()));
  const intros = group === "today" ? [] : names.filter((n) => !store.introShown.includes(n));
  if (location.hash !== "#/session") history.pushState(null, "", "#/session");
  session = { group, mode, items, i: 0, results: [], intros, kind: opts.kind ?? "drill", run: opts.run ?? null,
    target: opts.target ?? null, checkSet: opts.checkSet ?? null, diagSets: opts.diagSets ?? null, club: opts.club ?? null,
    starredAtStart: new Set(items.filter((it) => store.isStarred(it)).map((it) => it.key)), starsBefore: new Set(store.starredKeys()), streakBefore: streak(store.days), todayBefore: store.days.includes(dayKey(new Date())) };
  if (intros.length && session.kind === "drill") return introScreen();
  nextItem();
}

function introScreen() {
  screen(
    el("h2", {}, "First time on these drills"),
    el("p", { class: "muted" }, "One line each. This screen shows once, but every definition stays in the Glossary on the home screen whenever you want them."),
    SET_NOTES[session.group] ? el("p", { class: "star small" }, SET_NOTES[session.group]) : null,
    ...session.intros.map((n) => el("div", { class: "definition" }, el("strong", {}, nice(n)), el("br"), DEFINITIONS[n]))
  );
  setBar([el("button", { class: "primary", onclick: () => { session.intros.forEach((n) => store.markIntroShown(n)); store.save(); nextItem(); } }, "Got it, start")]);
}

// A free-text note per drill, saved as you type (and synced if signed in). Your words, not the tool's.
function noteBox(drill) {
  const existing = store.notes[drill]?.text ?? "";
  const ta = el("textarea", { class: "note", rows: existing ? "3" : "1", placeholder: "Your note, in your own words", "aria-label": `your note on ${nice(drill)}` });
  ta.value = existing;
  let timer = null;
  ta.addEventListener("input", () => { ta.rows = Math.min(8, Math.max(ta.rows, ta.value.split("\n").length)); clearTimeout(timer); timer = setTimeout(() => { store.setNote(drill, ta.value); store.save(); saved.textContent = ta.value.trim() ? "Saved" : ""; }, 500); });
  const saved = el("span", { class: "muted small", style: "font-weight:400" }, existing ? "Saved" : "");
  return el("div", { class: "notewrap" }, ta, saved);
}

function glossary() {
  const sets = [...new Set([...prioritySets(), ...ALL_SETS])];
  screen(
    el("h1", {}, "Glossary"),
    el("p", { class: "muted" }, "Every drill's one-line definition, by set. The same lines you see the first time a drill appears. The box under each one is for your own note; it saves as you type."),
    el("p", { class: "muted small" }, `${Object.keys(store.notes).length} note${Object.keys(store.notes).length === 1 ? "" : "s"} so far.`),
    ...sets.flatMap((g) => [
      el("h2", {}, GROUP_LABELS[g][0]),
      SET_NOTES[g] ? el("p", { class: "star small" }, SET_NOTES[g]) : null,
      el("div", { class: "stack" }, GROUPS[g].map((d) => el("div", { class: "card", style: "padding:12px 14px" },
        el("div", { class: "title" }, drillTitle(d)),
        el("div", { class: "small muted", style: "font-weight:400;margin-top:2px" }, drillDef(d)),
        FAMILIES[d]?.method ? el("div", { class: "small muted", style: "font-weight:400;margin-top:4px" }, el("strong", {}, "Method: "), FAMILIES[d].method) : null,
        lessonForDrill(d) ? el("button", { class: "link small", style: "padding:4px 0", onclick: () => go(`#/lesson/${lessonForDrill(d)}`) }, "Read the one-minute method") : null,
        noteBox(d)))),
    ]),
    el("div", { style: "height:16px" }),
    back("#/lessons")
  );
}

function header() {
  const right = session.results.filter((r) => r.correct).length;
  const item = session.items[session.i];
  const label = session.kind === "interview" ? "Interview run" : session.kind === "weekly" ? "Sunday check" : session.kind === "lesson" ? "Try three" : session.kind === "diag" ? "Check" : session.kind === "check" ? `${RUNGS[session.target]} check` : null;
  const segs = session.items.map((it, k) => el("span", { class: (k < session.i ? "done" : k === session.i ? "now" : "") + (session.starredAtStart?.has(it.key) ? " star" : "") }));
  return [el("div", { class: "topbar" },
    el("span", { class: "muted num" }, `${label ? label + " · " : ""}${session.i + 1} / ${session.items.length} · ${right} right`),
    store.isStarred(item) ? el("span", { class: "star small" }, "starred") : el("button", { class: "link small", onclick: finish }, "End early")),
    el("div", { class: "progress", role: "progressbar", "aria-valuenow": String(session.i), "aria-valuemin": "0", "aria-valuemax": String(session.items.length), "aria-label": "session progress" }, ...segs)];
}

const DONT_KNOW = "(don't know)";
function dontKnow(item, secs) {
  store.flagToLearn(item, LESSON_BY_FAMILY[familyOf(item)] ?? null);
  grade(item, false, secs, DONT_KNOW);
}
const dontKnowRow = (item, seconds) => (session.kind === "check" ? null : el("div", { class: "dontknow" }, el("button", { class: "link small", onclick: () => dontKnow(item, seconds()) }, "I don't know this")));

let diagTimer = null;
function nextItem() {
  clearTimeout(diagTimer);
  if (session.i >= session.items.length) return finish();
  const item = session.items[session.i];
  if (session.kind === "diag" && session.skipSets?.has(item.set)) { session.i += 1; return nextItem(); }
  const t0 = performance.now();
  const seconds = () => Math.round((performance.now() - t0) / 100) / 10;
  if (session.kind === "diag") diagTimer = setTimeout(() => { if (session && session.items[session.i] === item && !session.graded) grade(item, false, ITEM_SECONDS, "(time)"); }, ITEM_SECONDS * 1000);

  if (session.mode === "say") {
    const reveal = () => {
      const secs = seconds();
      render(
        header(),
        promptEl(item),
        el("div", { class: "answer num" }, display(item)),
        el("div", { class: "explanation" }, item.explanation.replace(" | ", "\n")),
        el("p", { class: "num" }, el("strong", {}, `${secs.toFixed(1)}s`), el("span", { class: "muted" }, " · Did you have it?"))
      );
      setBar([el("div", { class: "pair" },
        el("button", { class: "ok", onclick: () => grade(item, true, secs) }, "✓ Yes, I had it"),
        el("button", { class: "miss", onclick: () => grade(item, false, secs) }, "✗ No, missed it"))], true);
      keys({ y: () => grade(item, true, secs), n: () => grade(item, false, secs) });
    };
    screen(header(), promptEl(item), el("p", { class: "muted" }, "Say the answer out loud, then reveal."), keysOn() ? el("p", { class: "muted small kbd-hint" }, "Enter to reveal · Y or N to grade") : null, dontKnowRow(item, seconds));
    setBar([el("button", { class: "primary", onclick: reveal, autofocus: "" }, "Reveal")]);
    keys({ Enter: reveal, " ": reveal });
    return;
  }

  if (item.choices) {
    screen(header(), promptEl(item), el("p", { class: "muted" }, "Pick one."), dontKnowRow(item, seconds));
    setBar(item.choices.map((c, idx) => el("button", { class: "primary", onclick: () => grade(item, isCorrect(item, idx), seconds(), c) }, c)));
    keys({});
    return;
  }

  const input = el("input", { type: "text", inputmode: "decimal", autocomplete: "off", autocorrect: "off", spellcheck: "false", enterkeyhint: "done", placeholder: "your answer", "aria-label": "your answer" });
  input.addEventListener("input", () => input.setCustomValidity(""));
  const submit = () => {
    const secs = seconds();
    input.setCustomValidity("");
    const given = parseAnswer(input.value);
    if (given === null) { input.setCustomValidity("Digits only, like 25 or 33.3"); input.reportValidity(); input.classList.remove("shake"); void input.offsetWidth; input.classList.add("shake"); return; }
    grade(item, isCorrect(item, given), secs, input.value);
  };
  const minus = el("button", { type: "button", "aria-label": "toggle negative", onclick: () => { input.value = input.value.startsWith("-") ? input.value.slice(1) : "-" + input.value; input.focus(); } }, "±");
  screen(header(), promptEl(item),
    el("form", { id: "ansform", onsubmit: (e) => { e.preventDefault(); submit(); } }, el("div", { class: "inputrow" }, input, minus)),
    dontKnowRow(item, seconds));
  setBar([el("button", { class: "primary", type: "submit", form: "ansform" }, "Check")]);
  input.focus();
  keys({});
}

function grade(item, correct, secs, typed) {
  keys({});
  clearTimeout(diagTimer);
  if (session.kind === "diag") {
    session.diagRun ??= {}; session.skipSets ??= new Set();
    session.diagRun[item.set] = correct ? 0 : (session.diagRun[item.set] ?? 0) + 1;
    if (session.diagRun[item.set] >= 4) session.skipSets.add(item.set);
  }
  const wasStarred = store.isStarred(item);
  const family = familyOf(item);
  const attempt = { key: item.key, drill: item.drill, family, correct, seconds: secs, mode: session.mode, ts: Date.now() / 1000, ...(session.club ? { club_session: session.club.short } : {}) };
  store.record(item, attempt);
  store.save();
  if (session.kind !== "diag" && session.kind !== "check") session.results.push(attempt);
  const cleared = wasStarred && !store.isStarred(item);
  const fam = FAMILIES[family] ?? { name: nice(item.drill), method: null };
  const lessonId = LESSON_BY_FAMILY[family];
  const status = cleared ? el("p", { class: "star" }, `Star cleared: ${fam.name}. Two clean reps in a row.`)
    : typed === DONT_KNOW ? el("p", { class: "star" }, `Added to Lessons: ${fam.name}. Starred too, so it comes back with new numbers.`)
    : !correct ? el("p", { class: "star" }, `Starred: ${fam.name}. Comes back with new numbers until you get two in a row.`) : null;
  const next = () => { session.i += 1; nextItem(); };
  if (session.kind === "diag" || session.kind === "check") {
    session.results.push(attempt);
    screen(header(), promptEl(item),
      el("div", { class: `mark ${correct ? "ok" : "miss"}` }, correct ? CHECK() : "✗ ", `${correct ? "Correct" : typed === "(time)" ? "Out of time" : typed === DONT_KNOW ? "Don't know" : "Missed"} · ${secs.toFixed(1)}s`),
      typed === DONT_KNOW ? el("p", { class: "star" }, `Added to Lessons: ${(FAMILIES[familyOf(item)] ?? { name: nice(item.drill) }).name}.`) : null,
      el("div", { class: "answer num" }, display(item)),
      el("div", { class: "explanation" }, item.explanation.replace(" | ", "\n")));
    setBar([el("button", { class: "primary", onclick: next, autofocus: "" }, session.i + 1 < session.items.length ? "Next" : "Finish")], true, correct ? "ok" : "miss");
    keys({ Enter: next, " ": next });
    return;
  }
  const tryOne = () => {
    for (let k = 0; k < 20; k++) {
      const fresh = DRILLS[item.drill](makeRng(), { family });
      if (fresh.key !== item.key && !session.items.some((x) => x.key === fresh.key)) { session.items.splice(session.i + 1, 0, fresh); break; }
    }
    next();
  };
  screen(
    header(),
    promptEl(item),
    el("div", { class: `mark ${correct ? "ok" : "miss"}` }, correct ? CHECK() : "✗ ", `${correct ? "Correct" : typed === DONT_KNOW ? "Don't know" : "Missed"} · ${secs.toFixed(1)}s`),
    typed !== undefined && !correct && typed !== DONT_KNOW ? el("p", { class: "muted small" }, `You answered ${typed}.`) : null,
    el("div", { class: "answer num" }, display(item)),
    el("div", { class: "explanation" }, item.explanation.replace(" | ", "\n")),
    fam.method ? el("p", { class: "method" + (correct ? " quiet" : "") }, el("strong", {}, "Method: "), fam.method) : null,
    status,
    !correct && session.kind === "drill" ? el("div", { class: "row", style: "margin-top:8px" },
      el("button", { onclick: tryOne }, "Try one like it now"),
      lessonId ? el("button", { onclick: () => lesson(lessonId, () => grade(item, correct, secs, typed)) }, store.lessonsRead.includes(lessonId) ? "Read the method again" : "Read the one-minute method") : null) : null,
    el("a", { class: "muted small", style: "margin-top:12px", href: `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent("Napkin: wrong answer? " + item.key)}&body=${encodeURIComponent(item.prompt + "\n\nShown answer: " + display(item) + "\n\nWhat I think is right:\n")}` }, "Think this answer is wrong? Report it.")
  );
  setBar([el("button", { class: "primary", onclick: next, autofocus: "" }, session.i + 1 < session.items.length ? "Next" : "Finish")], true, correct ? "ok" : "miss");
  keys({ Enter: next, " ": next });
}

function finish() {
  keys({});
  const r = session.results;
  const right = r.filter((a) => a.correct).length;
  const total = r.reduce((s, a) => s + a.seconds, 0);
  const avg = r.length ? total / r.length : 0;
  if (!session.counted) {
    session.counted = true;
    if (r.length >= 5) { store.markDay(dayKey(new Date())); store.sessions += 1; }
    if (session.kind === "weekly") store.addWeekly({ week: weekKey(new Date()), score: right, total: r.length, ts: Date.now() / 1000 });
  }
  let bestLine = null;
  const best = sessionBest(r);
  if (best !== null && session.kind === "drill") {
    const isNew = store.recordBest(session.group, best);
    const gname = session.group === "today" ? "Today" : GROUP_LABELS[session.group][0];
    bestLine = isNew ? `New personal best for ${gname}: ${best.toFixed(1)}s.` : `Best for this set: ${store.bests[session.group].toFixed(1)}s.`;
  }
  store.save();
  if (session.kind === "interview") return interviewResult(right, total);
  if (session.kind === "diag") return diagnosticResult();
  if (session.kind === "check") return checkResult(right);
  const starred = store.starredItems();
  const acc = r.length ? right / r.length : 0;
  const rank = acc >= 0.9 ? "Excellent" : acc >= 0.6 ? "Great" : "Good";
  const after = new Set(store.starredKeys());
  const newStars = [...after].filter((k) => !session.starsBefore.has(k)).length;
  const cleared = [...session.starsBefore].filter((k) => !after.has(k)).length;
  const streakNow = streak(store.days);
  const tickedToday = !session.todayBefore && store.days.includes(dayKey(new Date()));
  const tile = (value, label, fmtFn) => { const v = el("div", { class: "v num" }, "0"); countUp(v, value, fmtFn); return el("div", { class: "tile" }, v, el("div", { class: "l" }, label)); };
  const changed = [newStars ? `${newStars} new star${newStars === 1 ? "" : "s"}` : null, cleared ? `${cleared} cleared` : null].filter(Boolean).join(" · ") || "No change to stars";
  const goal = starred.length ? `${starred.length} starred left to clear.` : streakNow ? `Day ${((streakNow - 1) % 7) + 1} of 7 this week.` : "Come back tomorrow to start a streak.";
  screen(
    el("h1", {}, session.kind === "weekly" ? "Sunday check done" : session.club ? `Club session ${session.club.short} done` : "Session done"),
    session.club ? el("p", { class: "muted small" }, `${session.club.clubName}: everyone ran these same ten questions. Your answers are tagged for the club count; no one sees them individually.`) : null,
    el("p", { class: "rank" }, rank),
    el("div", { class: "tiles" },
      tile(right, `of ${r.length} correct`, (x) => String(Math.round(x))),
      tile(total, "seconds total", (x) => String(Math.round(x))),
      tile(avg, "avg per item", (x) => x.toFixed(1) + "s")),
    tickedToday && streakNow > 1 ? el("p", { class: "streak-tick num" }, `Streak: ${streakNow} days`) : null,
    el("p", { class: "muted small" }, changed),
    el("p", { class: "small" }, goal),
    bestLine ? el("p", { class: "star" }, bestLine) : null,
    session.kind === "drill" && session.group !== "all" && session.group !== "today" ? el("p", { class: "muted small" }, `${GROUP_LABELS[session.group][0]}: ${rungOf(session.group).name}${session.mode === "say" ? " (say mode does not change levels)" : ""}`) : null,
    starred.length ? el("h2", {}, "Starred for next time") : null,
    ...starred.slice(0, 8).map((st) => el("p", { class: "small" }, el("strong", {}, (FAMILIES[st.family]?.name ?? nice(st.drill)) + ": "), el("span", { class: "muted" }, st.example))),
    starred.length > 8 ? el("p", { class: "muted small" }, `and ${starred.length - 8} more`) : null,
    el("div", { style: "height:24px" })
  );
  setBar([
    session.kind === "drill" ? el("button", { class: "primary", onclick: () => startSession(session.group, session.mode, session.items.length) }, "Again") : null,
    session.kind === "lesson" ? el("button", { class: "primary", onclick: () => go("#/lessons") }, "Back to lessons") : null,
    el("button", { onclick: () => go("#/") }, "Home"),
  ]);
}

// ---------- weekly check ----------
function startWeekly() {
  const started = [...new Set(store.attempts.map((a) => a.drill))].filter((d) => DRILLS[d]);
  const pool = started.length ? started : GROUPS.poker;
  const rng = makeRng();
  const items = [];
  const seen = new Set();
  let tries = 0;
  while (items.length < 10 && tries < 500) { const it = DRILLS[pool[items.length % pool.length]](rng); tries++; if (!seen.has(it.key)) { seen.add(it.key); items.push(it); } }
  session = null;
  startSession("all", "type", 10, { items, kind: "weekly" });
}

// ---------- interview run ----------
// ---------- diagnostic ----------
function startDiagnostic() {
  const sets = openPrioritySets().slice(0, 3);
  const items = buildDiagnostic(sets, makeRng());
  session = null;
  startSession("today", "diag", items.length, { items, kind: "diag", diagSets: sets });
}

function diagnosticResult() {
  const results = {};
  for (const set of session.diagSets) results[set] = { right: 0, total: 0 };
  for (let k = 0; k < session.items.length; k++) {
    const it = session.items[k];
    if (session.skipSets?.has(it.set) && !session.results.find((r) => r.key === it.key)) continue;
    const r = session.results.find((x) => x.key === it.key);
    if (r) { results[it.set].total += 1; if (r.correct) results[it.set].right += 1; }
  }
  const placed = placeFromResults(results);
  const ts = Date.now() / 1000;
  for (const [set, p] of Object.entries(placed)) store.stamp(set, p.rung, ts);
  store.addDiagnostic({ ts, results });
  store.save();
  const prev = store.diagnostics.length > 1 ? store.diagnostics[store.diagnostics.length - 2].results : null;
  screen(
    el("h1", {}, "Where you start"),
    el("p", { class: "muted" }, "Counts, not percentages. Eight questions is enough to place you, not to grade you."),
    ...Object.entries(placed).map(([set, p]) => el("div", { class: "card", style: "margin-bottom:8px" },
      el("div", { class: "titlerow" }, el("span", { class: "title" }, GROUP_LABELS[set][0]), el("span", { class: `badge l${Math.min(4, Math.floor(p.rung / 2))}` }, RUNGS[p.rung])),
      el("div", { class: "muted small num" }, p.label + (prev?.[set] ? ` · last time ${prev[set].right} of ${prev[set].total}` : "") + (session.skipSets?.has(set) ? " · stopped early after four misses" : "")))),
    store.starredItems().length ? el("p", { class: "small star", style: "margin-top:12px" }, `${store.starredItems().length} kinds starred. They come first in your next session.`) : null,
    el("p", { class: "muted small" }, "Levels above Mostly right need a level check, which you can sit from the Levels screen once your typed sessions support it.")
  );
  setBar([el("button", { class: "primary", onclick: () => startSession("today", "type", state.count) }, "Start a typed session"), el("button", { onclick: () => go("#/") }, "Home")]);
}

// ---------- level checks ----------
function startCheck(set, target) {
  const lock = store.checkLocks[set];
  if (lock && Date.now() / 1000 - lock < 86400) return;
  session = null;
  startSession(set, "check", 10, { items: buildLevelCheck(store.attempts, set, makeRng()), kind: "check", target, checkSet: set });
}

function checkResult(right) {
  const pass = gradeLevelCheck(right, session.target);
  const ts = Date.now() / 1000;
  if (pass) store.stamp(session.checkSet, session.target, ts); else store.lockCheck(session.checkSet, ts);
  store.save();
  screen(
    el("h1", {}, pass ? `${RUNGS[session.target]}.` : "Not yet"),
    el("div", { class: "card" },
      el("p", { class: "num", style: "font-size:22px;font-weight:600" }, `${right} / 10 · needed ${checkRequirement(session.target).need}`),
      el("p", { class: "muted" }, pass ? `${GROUP_LABELS[session.checkSet][0]} is now ${RUNGS[session.target]}. It decays if you stop practising typed.` : "Misses are starred. The check unlocks again in 24 hours; drill the starred kinds first."))
  );
  setBar([el("button", { class: "primary", onclick: () => startSession(session.checkSet, "type", 10) }, "Drill this set"), el("button", { onclick: () => go("#/") }, "Home")]);
}

function runsMenu() {
  screen(
    el("h1", {}, "Interview runs"),
    el("p", { class: "muted" }, "Three typed answers, against the clock, no partial credit."),
    el("div", { class: "stack" }, Object.entries(RUNS).map(([id, r]) => el("button", { onclick: () => startInterview(id) },
      el("span", { class: "choice" }, el("span", { class: "title" }, `${r.title} · ${r.seconds}s`), el("span", { class: "muted small" }, r.sub))))),
    el("div", { style: "height:16px" }),
    back("#/practice")
  );
}

function startInterview(id = "poker") {
  const run = RUNS[id];
  session = null;
  startSession("interview", "type", 3, { items: run.build(makeRng()), kind: "interview", run: id });
}

function interviewResult(right, total) {
  const run = RUNS[session.run ?? "poker"];
  const pass = right === 3 && total <= run.seconds;
  screen(
    el("h1", {}, pass ? "Pass" : "Not yet"),
    el("div", { class: "card" },
      el("p", { class: "num", style: "font-size:22px;font-weight:600" }, `${right} / 3 correct in ${total.toFixed(0)}s`),
      el("p", { class: "muted" }, pass ? `${run.title} passed under time. Do it again tomorrow.` : right < 3 ? "One wrong answer is a fail in the room. Read the method, then run it again." : `All correct but over ${run.seconds} seconds. Speed comes from reps. Run it again.`)),
    el("div", { style: "height:24px" }),
    el("button", { class: "link", onclick: () => go("#/runs") }, "Other runs")
  );
  setBar([el("button", { class: "primary", onclick: () => startInterview(session.run ?? "poker") }, "Run it again"), el("button", { onclick: () => go("#/") }, "Home")]);
}

// ---------- other screens ----------
function sparkline(points) {
  if (points.length < 3) return el("span", { class: "muted small" }, "–");
  const w = 72, h = 22, pad = 2;
  const xs = points.map((_, i) => pad + (i * (w - 2 * pad)) / (points.length - 1));
  const ys = points.map((p) => h - pad - (p / 100) * (h - 2 * pad));
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`); svg.setAttribute("class", "spark"); svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `accuracy over the last ${points.length} days: ${points.map((p) => Math.round(p) + "%").join(", ")}`);
  const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  line.setAttribute("points", xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" "));
  svg.append(line);
  const title = document.createElementNS("http://www.w3.org/2000/svg", "title"); title.textContent = svg.getAttribute("aria-label"); svg.prepend(title);
  return svg;
}

function stats() {
  const rows = store.statsByDrill();
  const say = store.attempts.filter((a) => a.mode === "say");
  const type = store.attempts.filter((a) => a.mode === "type");
  const acc = (xs) => (xs.length ? Math.round((100 * xs.filter((a) => a.correct).length) / xs.length) : null);
  const sayAcc = acc(say), typeAcc = acc(type);
  const gap = sayAcc !== null && typeAcc !== null && say.length >= 10 && type.length >= 10 && sayAcc - typeAcc > 10;
  const todayKey = dayKey(new Date());
  const todayRows = store.attempts.filter((a) => dayKey(new Date(a.ts * 1000)) === todayKey);
  const todayAcc = acc(todayRows);
  // per-drill accuracy by day, last 8 days with attempts
  const byDrillDay = {};
  for (const a of store.attempts) { const d = dayKey(new Date(a.ts * 1000)); ((byDrillDay[a.drill] ??= {})[d] ??= []).push(a); }
  const series = (drill) => { const days = Object.keys(byDrillDay[drill] ?? {}).sort().slice(-8); return days.map((d) => acc(byDrillDay[drill][d])); };
  if (!store.attempts.length) {
    page("progress", el("h1", {}, "Progress"), el("div", { class: "empty" }, el("p", {}, "No sessions yet."), el("p", { class: "small" }, "Levels, starred kinds, accuracy, and speed show up here after your first session.")),
      el("button", { class: "primary", onclick: () => startSession("today", state.mode, state.count) }, "Start a session"));
    return;
  }
  const starredList = store.starredItems();
  const setRows = [...new Set([...prioritySets(), ...ALL_SETS])].map((set) => ({ set, d: rungOf(set) })).filter((r) => r.d.rung > 0 || prioritySets().includes(r.set));
  page("progress",
    el("h1", {}, "Progress"),
    el("h2", {}, "Levels"),
    el("div", { class: "stack" }, setRows.map(({ set, d }) => {
      const locked = store.checkLocks[set] && Date.now() / 1000 - store.checkLocks[set] < 86400;
      return el("div", { class: "card" },
        el("div", { class: "titlerow" }, el("button", { class: "link", style: "padding:0;min-height:0;font-weight:600", onclick: () => go(`#/set/${set}`) }, GROUP_LABELS[set][0]), rungBadge(d)),
        el("div", { class: "muted small" }, d.next),
        d.canCheck && !locked ? el("button", { class: "link small", style: "padding:4px 0", onclick: () => startCheck(set, d.canCheck) }, `Sit the ${RUNGS[d.canCheck]} check`) : locked ? el("div", { class: "muted small" }, "Check locked for 24 hours after a miss.") : null);
    })),
    el("h2", {}, `Starred (${starredList.length})`),
    starredList.length ? el("p", { class: "muted small" }, "A star is a kind of question, not one set of numbers. Each clears after two correct answers in a row, and starred kinds come first in every session.") : el("p", { class: "muted small" }, "Nothing starred. Misses land here as kinds of question and come back with new numbers."),
    ...starredList.map((st) => el("div", { class: "card", style: "margin-bottom:8px;padding:12px 14px" }, el("div", { class: "title" }, FAMILIES[st.family]?.name ?? nice(st.drill)), el("div", { class: "muted small" }, st.example), el("div", { class: "muted small num" }, `clean reps so far: ${st.streak} / 2`))),
    el("h2", {}, "Stats"),
    el("div", { class: "tiles" },
      el("div", { class: "tile" }, el("div", { class: "v num" }, todayAcc === null ? "–" : `${todayAcc}%`), el("div", { class: "l" }, "today")),
      el("div", { class: "tile" }, el("div", { class: "v num" }, String(streak(store.days))), el("div", { class: "l" }, "day streak")),
      el("div", { class: "tile" }, el("div", { class: "v num" }, String(store.starredItems().length)), el("div", { class: "l" }, "starred"))),
    el("p", { class: "muted small num" }, `Say mode ${sayAcc ?? "–"}% · Type mode ${typeAcc ?? "–"}%`),
    gap ? el("p", { class: "star" }, "Your say-mode score is more than ten points above your typed score. You are grading yourself softly.") : null,
    store.weekly.length ? el("h2", {}, "Sunday checks") : null,
    ...store.weekly.slice(-8).reverse().map((w) => el("p", { class: "num small" }, `Week of ${w.week}: ${w.score} / ${w.total}`)),
    el("h2", {}, "By drill"),
    el("table", {}, el("thead", {}, el("tr", {}, el("th", {}, "Drill"), el("th", {}, "Level"), el("th", { class: "num" }, "Tries"), el("th", { class: "num" }, "Correct"), el("th", {}, "Trend"))),
      el("tbody", {}, rows.map((s) => el("tr", {}, el("td", {}, nice(s.drill)), el("td", {}, DRILLS[s.drill] ? LEVELS[masteryLevel(store.attempts, s.drill, store.starredKeys())] : "–"), el("td", { class: "num" }, String(s.attempts)), el("td", { class: "num" }, `${s.accuracy}%`), el("td", {}, sparkline(series(s.drill))))))),
    el("p", { class: "muted small", style: "margin-top:16px" }, "Levels use your last 20 typed answers per drill: Learning at 10 answers, Solid at 80%, Fast at 90% and under 12s, Cold at 95%, under 8s and nothing starred. Trend is accuracy per day over the last eight days you practised that drill."),
    el("button", { class: "link", onclick: () => {
      const blob = new Blob([JSON.stringify({ attempts: store.attempts, stars: store.stars, days: store.days, weekly: store.weekly, bests: store.bests }, null, 1)], { type: "application/json" });
      const a = el("a", { href: URL.createObjectURL(blob), download: `napkin-progress-${dayKey(new Date())}.json` }); document.body.append(a); a.click(); a.remove();
    } }, "Export my data"),
    Object.keys(store.bests).length ? el("p", { class: "muted small" }, "Personal bests: " + Object.entries(store.bests).map(([g, s]) => `${g === "today" ? "Today" : GROUP_LABELS[g]?.[0] ?? g} ${s.toFixed(0)}s`).join(" · ")) : null
  );
}

function explain(name) {
  screen(
    el("h1", {}, name === "card" ? "Poker index card" : nice(name)),
    el("pre", {}, EXPLANATIONS[name]),
    name === "card" ? el("div", { class: "row" }, GROUPS.poker.map((n) => el("button", { class: "link", onclick: () => go(`#/explain/${n}`) }, nice(n)))) : null,
    el("p", { class: "muted small" }, "Read it once, then write it in your own words without looking. If you can't, you don't own it yet."),
    el("button", { class: "link", onclick: () => (name === "card" ? go("#/lessons") : go("#/card")) }, "Back")
  );
}

// ---------- keyboard ----------
let keyHandler = null;
function keys(map) {
  if (keyHandler) document.removeEventListener("keydown", keyHandler);
  keyHandler = (e) => {
    if (e.target instanceof HTMLInputElement) return;
    const fn = map[e.key];
    if (!fn) return;
    if (e.key.length === 1 && e.key !== " " && !keysOn()) return; // single-letter shortcuts can be switched off (WCAG 2.1.4)
    e.preventDefault(); fn();
  };
  document.addEventListener("keydown", keyHandler);
}

function dispatch() {
  const r = parseRoute(location.hash);
  if (r.name === "session") { if (session) return; return go("#/"); }
  session = null; clearTimeout(diagTimer); keys({});
  if (!store.priorities && store.attempts.length === 0 && !["about", "join", "clubSession"].includes(r.name)) return welcome();
  switch (r.name) {
    case "today": return today();
    case "practice": return practice();
    case "set": return setPage(r.params.id);
    case "runs": return runsMenu();
    case "lessons": return lessonsList();
    case "lesson": return lesson(r.params.id);
    case "glossary": return glossary();
    case "card": return explain("card");
    case "explain": return EXPLANATIONS[r.params.name] ? explain(r.params.name) : go("#/card");
    case "progress": return stats();
    case "you": return you();
    case "account": return account();
    case "priorities": return welcome(store.priorities);
    case "about": return about();
    case "club": return r.params.id ? clubDetail(r.params.id) : clubPage();
    case "join": return joinRoute(r.params.code);
    case "clubSession": return clubSessionRoute(r.params.short);
    default: return today();
  }
}
window.addEventListener("hashchange", dispatch);
dispatch();
startSync();
