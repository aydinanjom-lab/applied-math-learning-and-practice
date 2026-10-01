// Screens: home -> session -> summary. Also interview run, weekly check, starred, stats, explain.
import { GROUPS, GROUP_LABELS, DEFINITIONS, EXPLANATIONS, DRILLS, UNLOCK_AFTER, LATER, FAMILIES, familyOf, buildQueue, isCorrect, parseAnswer, fmt, makeRng } from "./drills.js";
import { LESSONS, LESSON_BY_ID, LESSON_BY_FAMILY } from "./lessons.js";
import { RUNS } from "./runs.js";
import { AREAS, AREA_ORDER, setsForAreas, daysUntil, weightsFor, todayQueue } from "./priorities.js";
import { RUNGS, rungDetail, setRung, buildLevelCheck, checkRequirement, gradeLevelCheck } from "./levels.js";
import { buildDiagnostic, placeFromResults, diagnosticDue, ITEM_SECONDS } from "./diagnostic.js";
import { Store } from "./store.js";
import { SyncClient, mergeProgress } from "./sync.js";
import { SUPABASE } from "./config.js";
import { LEVELS, groupLevel, masteryLevel, streak, dayKey, weekKey, weeklyCheckDue, isUnlocked, sessionBest, defaultGroupForGoal, shouldAskFeedback } from "./progress.js";

const app = document.getElementById("app");
const bar = document.createElement("div"); bar.className = "actionbar"; bar.hidden = true; document.body.append(bar);
const MARK = () => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 64 64"); s.setAttribute("aria-hidden", "true");
  s.innerHTML = '<g transform="rotate(-8 32 32)"><path d="M10 10 H40 L54 24 V54 H10 Z" fill="currentColor"/><path d="M40 10 V24 H54 Z" fill="#4f46e5"/></g>'; return s; };
const store = new Store(window.localStorage);
const sync = new SyncClient(SUPABASE);
const syncState = { user: null, last: null, error: null, busy: false };
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
    if (syncState.user) { store.onSave = scheduleSync; await pullAndMerge(); if (document.querySelector("h1")?.textContent === "Napkin") home(true); }
  } catch (e) { syncState.error = e.message ?? String(e); }
}
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
const ALL_SETS = ["interview", "poker", "quick", "banking", "accounting", "valuation", "walks", "deals", "prob", "rates", "betting", "moose", "novyx", "energy"];
const prioritySets = () => setsForAreas(store.priorities?.areas ?? []);
const rungOf = (set) => rungDetail(store.attempts, set, store.stamps, store.starredKeys());
const unlockedSet = (g) => !UNLOCK_AFTER[g] || store.unlocked.includes(g) || rungOf(UNLOCK_AFTER[g]).rung >= 4;

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
  window.scrollTo(0, 0);
  const focus = app.querySelector("[autofocus], h1, .prompt");
  if (focus) { if (!focus.hasAttribute("tabindex") && !focus.matches("button,input")) focus.setAttribute("tabindex", "-1"); focus.focus({ preventScroll: true }); }
};
const display = (it) => (it.choices ? it.choices[it.answer] : fmt(Math.round(it.answer * 10) / 10));
const nice = (name) => name.replace(/_/g, " ");
const levelOf = (group) => LEVELS[groupLevel(store.attempts, GROUPS[group], store.starredKeys())];

// ---------- home ----------
function welcome(existing = null, onDone = null) {
  const draft = { areas: [...(existing?.areas ?? [])], interviewDate: existing?.interviewDate ?? null, minutes: existing?.minutes ?? 10, when: existing?.when ?? null };
  const finish = () => {
    store.priorities = draft;
    store.goal = draft.areas[0] === "poker" ? "poker" : draft.areas[0] === "quick" ? "general" : "interviews";
    state.group = "today"; state.count = draft.minutes === 5 ? 5 : draft.minutes === 20 ? 20 : 10; remember(); store.save();
    if (onDone) return onDone();
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
  const sets = prioritySets().slice(0, 3);
  screen(
    el("h1", {}, "Six-minute check"),
    el("p", {}, `Eight typed questions from each of: ${sets.map((s) => GROUP_LABELS[s][0]).join(", ")}. Twenty seconds each. It places you honestly and stars what you miss, so your first real session goes where it counts.`),
    el("p", { class: "muted small" }, "You can skip it and take it later from the home screen.")
  );
  setBar([el("button", { onclick: () => home() }, "Skip for now"), el("button", { class: "primary", onclick: startDiagnostic }, "Take it")]);
}

function home(keepScroll = false) {
  if (!store.priorities && store.attempts.length === 0) return welcome();
  const starred = store.starredItems().length;
  const days = streak(store.days);
  const due = weeklyCheckDue(new Date(), store.weekly);
  const pri = prioritySets();
  const dUntil = daysUntil(store.priorities?.interviewDate ?? null);
  const choice = (key, on, title, sub, pressed) =>
    el("button", { "aria-pressed": String(pressed), onclick: () => { state[key] = on; remember(); home(true); } },
      el("span", { class: "choice" }, el("span", { class: "title" }, title), sub ? el("span", { class: "muted small" }, sub) : null));
  const setButton = (g) => {
    const [title, sub] = g === "today" ? ["Today", `Starred first, then your priorities: ${pri.map((s) => GROUP_LABELS[s][0]).join(", ")}.`] : GROUP_LABELS[g];
    if (g !== "today" && g !== "all" && !unlockedSet(g)) {
      return el("div", { class: "card locked" },
        el("div", { class: "choice" }, el("span", { class: "title" }, title), el("span", { class: "muted small" }, `Locked until ${GROUP_LABELS[UNLOCK_AFTER[g]][0]} reaches Solid.`)),
        el("button", { class: "link small", onclick: () => { store.unlock(g); store.save(); home(true); } }, "Unlock anyway"));
    }
    const r = g === "today" || g === "all" ? null : rungOf(g);
    return el("button", { "aria-pressed": String(state.group === g), onclick: () => { state.group = g; remember(); home(true); } },
      el("span", { class: "choice" },
        el("span", { class: "titlerow" }, el("span", { class: "title" }, title), r ? el("span", { class: `badge l${Math.min(4, Math.floor(r.rung / 2))}` }, r.name + (r.stale ? " · stale" : "")) : null),
        el("span", { class: "muted small" }, sub)));
  };
  const rest = ALL_SETS.filter((g) => !pri.includes(g));
  const todayDone = store.days.includes(dayKey(new Date()));
  const groupName = state.group === "today" ? "Today" : GROUP_LABELS[state.group][0];
  const startLabel = `Start · ${groupName} · ${state.count} · ${state.mode === "say" ? "Say it" : "Type it"}`;
  const diagDue = diagnosticDue(store.diagnostics);
  (keepScroll ? render : screen)(
    el("div", { class: "topbar" }, el("div", { class: "brand" }, MARK(), el("h1", {}, "Napkin")), el("span", { class: "muted num" }, days ? `${days}-day streak` : "")),
    el("div", { class: "status num" },
      el("span", {}, todayDone ? "Today: done" : "Today: not yet"),
      el("span", {}, starred ? el("strong", {}, `${starred} starred`) : "Nothing starred"),
      dUntil !== null && dUntil >= 0 ? el("span", { class: dUntil <= 14 ? "star" : "" }, `Interview in ${dUntil} day${dUntil === 1 ? "" : "s"}`) : null,
      due ? el("span", { class: "star" }, "Sunday check due") : null),
    el("button", { class: "primary", onclick: () => startSession(state.group, state.mode, state.count) }, startLabel),
    dUntil !== null && dUntil < 0 ? el("div", { class: "card notice", style: "margin-top:16px" },
      el("div", { class: "title" }, "Your interview date has passed"),
      el("p", { class: "muted small" }, "How did it go? Set the next date, or clear it."),
      el("div", { class: "row" }, el("button", { onclick: () => welcome(store.priorities, () => home()) }, "Set the next date"), el("button", { onclick: () => { store.priorities = { ...store.priorities, interviewDate: null }; store.save(); home(); } }, "No date for now"))) : null,
    diagDue ? el("div", { class: "card notice", style: "margin-top:16px" },
      el("div", { class: "title" }, store.diagnostics.length ? "Time for a re-check" : "Six-minute check"),
      el("p", { class: "muted small" }, store.diagnostics.length ? "It has been four weeks. Eight typed questions per priority set, to see what moved." : "Eight typed questions per priority set. Places you honestly and stars what you miss."),
      el("button", { class: "primary", onclick: startDiagnostic }, "Take it")) : null,
    due ? el("div", { class: "card notice", style: "margin-top:16px" },
      el("div", { class: "title" }, "Sunday check"),
      el("p", { class: "muted small" }, "Ten typed questions from what you have started. This is the honest score."),
      el("button", { class: "primary", onclick: startWeekly }, "Do the weekly check")) : null,
    store.toLearnItems().length ? el("button", { class: "card notice action", onclick: lessonsList },
      el("span", { class: "choice" }, el("span", { class: "title" }, `Lessons · ${store.toLearnItems().length} to learn`), el("span", { class: "muted small" }, store.toLearnItems().slice(0, 3).map((t) => (FAMILIES[t.family] ?? { name: nice(t.drill) }).name).join(" · ") + (store.toLearnItems().length > 3 ? " · more" : "")))) : null,
    el("h2", {}, "Your sets"),
    el("div", { class: "stack" }, ["today", ...pri].map(setButton)),
    el("button", { class: "link", onclick: () => { state.more = !state.more; home(true); } }, state.more ? "Fewer sets" : `More sets (${rest.length + 1})`),
    state.more ? el("div", { class: "stack" }, [...rest, "all"].map(setButton)) : null,
    el("h2", {}, "How do you answer?"),
    el("div", { class: "row" },
      choice("mode", "say", "Say it", "Reveal, then grade yourself", state.mode === "say"),
      choice("mode", "type", "Type it", "Counts toward levels", state.mode === "type")),
    el("h2", {}, "How many?"),
    el("div", { class: "row" }, [5, 10, 20].map((n) => choice("count", n, String(n), n === 5 ? "quick hit" : n === 10 ? "about 5 min" : "long", state.count === n))),
    el("h2", {}, "Interview runs"),
    el("button", { class: "card action", onclick: runsMenu },
      el("span", { class: "choice" }, el("span", { class: "title" }, "Poker, finance, or accounting"), el("span", { class: "muted small" }, "Three typed answers against the clock, pass or fail."))),
    el("div", { class: "spacer" }),
    el("div", { class: "row", style: "margin-top:24px" },
      el("button", { class: "link", onclick: review }, "Starred"),
      el("button", { class: "link", onclick: stats }, "Levels"),
      el("button", { class: "link", onclick: lessonsList }, "Lessons"),
      el("button", { class: "link", onclick: glossary }, "Glossary"),
      el("button", { class: "link", onclick: () => welcome(store.priorities, () => home()) }, "Priorities"),
      el("button", { class: "link", onclick: () => explain("card") }, "Index card"),
      el("button", { class: "link", onclick: about }, "About"),
      el("button", { class: "link", onclick: account }, syncState.user ? "Account ✓" : "Account"))
  );
  if (!keepScroll) setBar(null);
}

function account() {
  if (!sync.configured) {
    return screen(
      el("h1", {}, "Account"),
      el("p", {}, "Sync is not switched on for this copy of Napkin. Your progress stays in this browser."),
      el("p", { class: "muted small" }, "To share progress between your laptop and phone, follow docs/setup-sync.md in the repository. About five minutes."),
      el("button", { class: "link", onclick: () => home() }, "Back")
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
          el("button", { onclick: async () => { await sync.signOut(); syncState.user = null; store.onSave = null; home(); } }, "Sign out"))),
      el("p", { class: "muted small" }, "Signing out leaves this browser's copy in place. Your account copy is untouched."),
      el("button", { class: "link", onclick: () => home() }, "Back")
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
    el("button", { class: "link", onclick: () => home() }, "Back")
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
        lessonId ? el("button", { class: "primary", onclick: () => lesson(lessonId, lessonsList) }, store.lessonsRead.includes(lessonId) ? `Read again: ${LESSON_BY_ID[lessonId].title}` : `Read: ${LESSON_BY_ID[lessonId].title}`) : null,
        el("button", { onclick: () => { const items = []; const rng = makeRng(); for (let k = 0; k < 40 && items.length < 3; k++) { const it = DRILLS[t.drill](rng, { family: t.family }); if (!items.some((x) => x.key === it.key)) items.push(it); } session = null; startSession(state.group, "type", items.length, { items, kind: "lesson" }); } }, "Try three")));
  };
  screen(
    el("h1", {}, "Lessons"),
    flagged.length ? el("h2", { style: "margin-top:0" }, `To learn (${flagged.length})`) : null,
    flagged.length ? el("p", { class: "muted small" }, "Kinds of question you marked \"I don't know this\". Each clears after two clean typed reps, or tap Got it.") : null,
    ...flagged.map(flaggedRow),
    flagged.length ? el("h2", {}, "All lessons") : null,
    el("p", { class: "muted" }, "One minute each. Standard methods, nothing invented. Read one, then try three."),
    el("div", { class: "stack" }, LESSONS.map((l) => el("button", { onclick: () => lesson(l.id, lessonsList) },
      el("span", { class: "choice" }, el("span", { class: "titlerow" }, el("span", { class: "title" }, l.title), store.lessonsRead.includes(l.id) ? el("span", { class: "badge l3" }, "read") : null), el("span", { class: "muted small" }, l.method))))),
    el("div", { style: "height:16px" }),
    el("button", { class: "link", onclick: () => home() }, "Back")
  );
}

function lesson(id, back) {
  const l = LESSON_BY_ID[id];
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
    startSession(state.group, "type", items.length, { items, kind: "lesson" });
  };
  screen(
    el("h1", {}, l.title),
    el("p", { style: "font-size:19px" }, l.method),
    el("h2", {}, "Worked examples"),
    ...l.examples.map((x) => el("p", { class: "num" }, x)),
    el("h2", {}, "When it works"), el("p", {}, l.when),
    el("h2", {}, "The trap"), el("p", {}, l.trap),
    el("p", { class: "muted small", style: "margin-top:16px" }, "This is the tool's explanation. Write your own in your notes without looking; if you can't, you don't own it yet."),
    el("button", { class: "link", onclick: back ?? (() => home()) }, "Back")
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
    el("button", { class: "link", onclick: () => home() }, "Back")
  );
}

// ---------- session ----------
let session = null;

function startSession(group, mode, count, opts = {}) {
  const pri = prioritySets();
  // "Later" drills join a set once it is Solid: they rest on a derivation worth earning first.
  const withLater = (g) => (LATER[g] && rungOf(g).rung >= 4 ? [...GROUPS[g], ...LATER[g]] : GROUPS[g]);
  const names = group === "today" ? pri.flatMap((s) => GROUPS[s]) : withLater(group);
  const urgent = daysUntil(store.priorities?.interviewDate ?? null);
  if (group === "today" && mode === "say" && urgent !== null && urgent >= 0 && urgent <= 3 && !opts.items) mode = "type";
  const items = opts.items ?? (group === "today" ? todayQueue(store, pri, count, weightsFor(store, pri, store.priorities?.interviewDate ?? null), makeRng()) : buildQueue(store, names, count, makeRng()));
  const intros = group === "today" ? [] : names.filter((n) => !store.introShown.includes(n));
  session = { group, mode, items, i: 0, results: [], intros, kind: opts.kind ?? "drill", run: opts.run ?? null,
    target: opts.target ?? null, checkSet: opts.checkSet ?? null, diagSets: opts.diagSets ?? null,
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
  const sets = HOME_ORDER.filter((g) => g !== "all");
  screen(
    el("h1", {}, "Glossary"),
    el("p", { class: "muted" }, "Every drill's one-line definition, by set. The same lines you see the first time a drill appears. The box under each one is for your own note; it saves as you type."),
    el("p", { class: "muted small" }, `${Object.keys(store.notes).length} note${Object.keys(store.notes).length === 1 ? "" : "s"} so far.`),
    ...sets.flatMap((g) => [
      el("h2", {}, GROUP_LABELS[g][0]),
      SET_NOTES[g] ? el("p", { class: "star small" }, SET_NOTES[g]) : null,
      el("div", { class: "stack" }, GROUPS[g].map((d) => el("div", { class: "card", style: "padding:12px 14px" },
        el("div", { class: "title" }, nice(d)),
        el("div", { class: "small muted", style: "font-weight:400;margin-top:2px" }, DEFINITIONS[d]),
        FAMILIES[d]?.method ? el("div", { class: "small muted", style: "font-weight:400;margin-top:4px" }, el("strong", {}, "Method: "), FAMILIES[d].method) : null,
        LESSON_BY_FAMILY[d] ? el("button", { class: "link small", style: "padding:4px 0", onclick: () => lesson(LESSON_BY_FAMILY[d], glossary) }, "Read the one-minute method") : null,
        noteBox(d)))),
    ]),
    el("div", { style: "height:16px" }),
    el("button", { class: "link", onclick: () => home() }, "Back")
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
  const attempt = { key: item.key, drill: item.drill, family, correct, seconds: secs, mode: session.mode, ts: Date.now() / 1000 };
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
    el("h1", {}, session.kind === "weekly" ? "Sunday check done" : "Session done"),
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
    session.kind === "lesson" ? el("button", { class: "primary", onclick: lessonsList }, "Back to lessons") : null,
    el("button", { onclick: () => home() }, "Home"),
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
  const sets = prioritySets().slice(0, 3);
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
  setBar([el("button", { class: "primary", onclick: () => startSession("today", "type", state.count) }, "Start a typed session"), el("button", { onclick: () => home() }, "Home")]);
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
  setBar([el("button", { class: "primary", onclick: () => startSession(session.checkSet, "type", 10) }, "Drill this set"), el("button", { onclick: () => home() }, "Home")]);
}

function runsMenu() {
  screen(
    el("h1", {}, "Interview runs"),
    el("p", { class: "muted" }, "Three typed answers, against the clock, no partial credit."),
    el("div", { class: "stack" }, Object.entries(RUNS).map(([id, r]) => el("button", { onclick: () => startInterview(id) },
      el("span", { class: "choice" }, el("span", { class: "title" }, `${r.title} · ${r.seconds}s`), el("span", { class: "muted small" }, r.sub))))),
    el("div", { style: "height:16px" }),
    el("button", { class: "link", onclick: () => home() }, "Back")
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
    el("button", { class: "link", onclick: runsMenu }, "Other runs")
  );
  setBar([el("button", { class: "primary", onclick: () => startInterview(session.run ?? "poker") }, "Run it again"), el("button", { onclick: () => home() }, "Home")]);
}

// ---------- other screens ----------
function review() {
  const items = store.starredItems();
  screen(
    el("h1", {}, "Starred"),
    items.length ? el("p", { class: "muted" }, "A star is a kind of question, not one set of numbers. Each clears after two correct answers in a row.") : el("div", { class: "empty" }, el("p", {}, "Nothing starred."), el("p", { class: "small" }, "Misses land here as kinds of question and come back with new numbers. Start a session to fill it.")),
    ...items.map((st) => el("div", { class: "card", style: "margin-bottom:8px" }, el("div", { class: "title" }, FAMILIES[st.family]?.name ?? nice(st.drill)), el("div", { class: "muted small" }, st.example), el("div", { class: "muted small" }, `clean reps so far: ${st.streak} / 2 · comes back with new numbers`))),
    el("div", { style: "height:16px" }),
    el("button", { class: "link", onclick: () => home() }, "Back")
  );
  setBar([el("button", { class: "primary", onclick: () => startSession(state.group, state.mode, state.count) }, items.length ? "Start (starred first)" : "Start a session")]);
}

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
    screen(el("h1", {}, "Stats"), el("div", { class: "empty" }, el("p", {}, "No sessions yet."), el("p", { class: "small" }, "Accuracy, speed, and a level per drill show up here after your first session.")), el("button", { class: "link", onclick: () => home() }, "Back"));
    setBar([el("button", { class: "primary", onclick: () => startSession(state.group, state.mode, state.count) }, "Start a session")]);
    return;
  }
  const setRows = [...new Set([...prioritySets(), ...ALL_SETS])].map((set) => ({ set, d: rungOf(set) })).filter((r) => r.d.rung > 0 || prioritySets().includes(r.set));
  screen(
    el("h1", {}, "Levels"),
    el("div", { class: "stack" }, setRows.map(({ set, d }) => {
      const locked = store.checkLocks[set] && Date.now() / 1000 - store.checkLocks[set] < 86400;
      return el("div", { class: "card" },
        el("div", { class: "titlerow" }, el("span", { class: "title" }, GROUP_LABELS[set][0]), el("span", { class: `badge l${Math.min(4, Math.floor(d.rung / 2))}` }, d.name + (d.stale ? " · stale" : ""))),
        el("div", { class: "muted small" }, d.next),
        d.canCheck && !locked ? el("button", { class: "link small", style: "padding:4px 0", onclick: () => startCheck(set, d.canCheck) }, `Sit the ${RUNGS[d.canCheck]} check`) : locked ? el("div", { class: "muted small" }, "Check locked for 24 hours after a miss.") : null);
    })),
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
    Object.keys(store.bests).length ? el("p", { class: "muted small" }, "Personal bests: " + Object.entries(store.bests).map(([g, s]) => `${g === "today" ? "Today" : GROUP_LABELS[g]?.[0] ?? g} ${s.toFixed(0)}s`).join(" · ")) : null,
    el("button", { class: "link", onclick: () => home() }, "Back")
  );
}

function explain(name) {
  screen(
    el("h1", {}, name === "card" ? "Poker index card" : nice(name)),
    el("pre", {}, EXPLANATIONS[name]),
    name === "card" ? el("div", { class: "row" }, GROUPS.poker.map((n) => el("button", { class: "link", onclick: () => explain(n) }, nice(n)))) : null,
    el("p", { class: "muted small" }, "Read it once, then write it in your own words without looking. If you can't, you don't own it yet."),
    el("button", { class: "link", onclick: () => (name === "card" ? home() : explain("card")) }, "Back")
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

home();
startSync();
