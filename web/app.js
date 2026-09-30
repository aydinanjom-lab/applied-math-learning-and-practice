// Screens: home -> session -> summary. Also interview run, weekly check, starred, stats, explain.
import { GROUPS, GROUP_LABELS, DEFINITIONS, EXPLANATIONS, DRILLS, UNLOCK_AFTER, FAMILIES, familyOf, buildQueue, isCorrect, parseAnswer, fmt, makeRng } from "./drills.js";
import { LESSONS, LESSON_BY_ID, LESSON_BY_FAMILY } from "./lessons.js";
import { RUNS } from "./runs.js";
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
const state = { group: saved.group ?? "interview", mode: saved.mode ?? "say", count: saved.count ?? 10 };
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
const HOME_ORDER = ["interview", "poker", "quick", "banking", "accounting", "betting", "moose", "novyx", "energy", "all"];

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
function welcome() {
  const pick = (goal, title, sub) => el("button", { onclick: () => { store.goal = goal; state.group = defaultGroupForGoal(goal); remember(); store.save(); home(); } },
    el("span", { class: "choice" }, el("span", { class: "title" }, title), el("span", { class: "muted small" }, sub)));
  screen(
    el("h1", {}, "Napkin"),
    el("p", { style: "font-size:20px" }, "Ten minutes a day on the numbers interviewers ask. Say it out loud, then check."),
    el("p", { class: "muted" }, "Built by a finance freshman for his own first-round interviews. Free. Nothing to install. Your progress stays in this browser."),
    el("h2", {}, "What are you here for?"),
    el("div", { class: "stack" },
      pick("interviews", "Finance interviews", "Pot odds, multiples, buyout returns. The questions they ask out loud."),
      pick("poker", "Poker math", "Outs, pot odds, EV, combos, with the exact number next to the shortcut."),
      pick("general", "Quick mental math", "Percentages, fractions, growth rates, back-of-envelope numbers.")),
    el("p", { class: "muted small", style: "margin-top:24px" }, "You can switch sets any time.")
  );
}

function home(keepScroll = false) {
  if (!store.goal && store.attempts.length === 0) return welcome();
  const starred = store.starredItems().length;
  const days = streak(store.days);
  const due = weeklyCheckDue(new Date(), store.weekly);
  const choice = (key, on, title, sub, pressed) =>
    el("button", { "aria-pressed": String(pressed), onclick: () => { state[key] = on; remember(); home(true); } },
      el("span", { class: "choice" }, el("span", { class: "title" }, title), sub ? el("span", { class: "muted small" }, sub) : null));

  const setButton = (g) => {
    const [title, sub] = GROUP_LABELS[g];
    const unlocked = isUnlocked(g, store.attempts, store.starredKeys(), store.unlocked);
    const level = g === "all" ? null : levelOf(g);
    if (!unlocked) {
      return el("div", { class: "card locked" },
        el("div", { class: "choice" }, el("span", { class: "title" }, title), el("span", { class: "muted small" }, `Locked until ${GROUP_LABELS[UNLOCK_AFTER[g]][0]} is Solid on every drill.`)),
        el("button", { class: "link small", onclick: () => { store.unlock(g); store.save(); home(true); } }, "Unlock anyway"));
    }
    return el("button", { "aria-pressed": String(state.group === g), onclick: () => { state.group = g; remember(); home(true); } },
      el("span", { class: "choice" },
        el("span", { class: "titlerow" }, el("span", { class: "title" }, title), level ? el("span", { class: `badge l${LEVELS.indexOf(level)}` }, level) : null),
        el("span", { class: "muted small" }, sub)));
  };

  const todayDone = store.days.includes(dayKey(new Date()));
  const startLabel = `Start · ${GROUP_LABELS[state.group][0]} · ${state.count} · ${state.mode === "say" ? "Say it" : "Type it"}`;
  (keepScroll ? render : screen)(
    el("div", { class: "topbar" }, el("div", { class: "brand" }, MARK(), el("h1", {}, "Napkin")), el("span", { class: "muted num" }, days ? `${days}-day streak` : "")),
    el("div", { class: "status num" },
      el("span", {}, todayDone ? "Today: done" : "Today: not yet"),
      el("span", {}, starred ? el("strong", {}, `${starred} starred`) : "Nothing starred"),
      due ? el("span", { class: "star" }, "Sunday check due") : null),
    el("button", { class: "primary", onclick: () => startSession(state.group, state.mode, state.count) }, startLabel),
    starred ? el("p", { class: "small muted", style: "margin-top:8px" }, `${starred} starred kind${starred === 1 ? "" : "s"} come first.`) : null,
    due ? el("div", { class: "card notice", style: "margin-top:16px" },
      el("div", { class: "title" }, "Sunday check"),
      el("p", { class: "muted small" }, "Ten typed questions from what you have started. This is the honest score."),
      el("button", { class: "primary", onclick: startWeekly }, "Do the weekly check")) : null,
    el("h2", {}, "What do you want to drill?"),
    el("div", { class: "stack" }, HOME_ORDER.map(setButton)),
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
      el("button", { class: "link", onclick: stats }, "Stats"),
      el("button", { class: "link", onclick: lessonsList }, "Lessons"),
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
  screen(
    el("h1", {}, "Account"),
    el("p", {}, "Sign in to share your progress between devices. No password: you get a link by email."),
    el("form", { onsubmit: async (e) => {
      e.preventDefault();
      status.textContent = "Sending…";
      try { await sync.sendMagicLink(input.value.trim()); status.textContent = "Check your email and open the link on this device."; }
      catch (err) { status.textContent = `Could not send: ${err.message ?? err}`; }
    } }, input, el("div", { style: "height:12px" }), el("button", { class: "primary", type: "submit" }, "Email me a sign-in link")),
    status,
    el("p", { class: "muted small" }, "Progress already in this browser is kept and merged in, not replaced."),
    el("button", { class: "link", onclick: () => home() }, "Back")
  );
  input.focus();
}


function lessonsList() {
  screen(
    el("h1", {}, "Lessons"),
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
  const names = GROUPS[group];
  const items = opts.items ?? buildQueue(store, names, count, makeRng());
  const intros = names.filter((n) => !store.introShown.includes(n));
  session = { group, mode, items, i: 0, results: [], intros, kind: opts.kind ?? "drill", run: opts.run ?? null,
    starredAtStart: new Set(items.filter((it) => store.isStarred(it)).map((it) => it.key)), starsBefore: new Set(store.starredKeys()), streakBefore: streak(store.days), todayBefore: store.days.includes(dayKey(new Date())) };
  if (intros.length && session.kind === "drill") return introScreen();
  nextItem();
}

function introScreen() {
  screen(
    el("h2", {}, "First time on these drills"),
    el("p", { class: "muted" }, "One line each. You will not see this again."),
    SET_NOTES[session.group] ? el("p", { class: "star small" }, SET_NOTES[session.group]) : null,
    ...session.intros.map((n) => el("div", { class: "definition" }, el("strong", {}, nice(n)), el("br"), DEFINITIONS[n]))
  );
  setBar([el("button", { class: "primary", onclick: () => { session.intros.forEach((n) => store.markIntroShown(n)); store.save(); nextItem(); } }, "Got it, start")]);
}

function header() {
  const right = session.results.filter((r) => r.correct).length;
  const item = session.items[session.i];
  const label = session.kind === "interview" ? "Interview run" : session.kind === "weekly" ? "Sunday check" : session.kind === "lesson" ? "Try three" : null;
  const segs = session.items.map((it, k) => el("span", { class: (k < session.i ? "done" : k === session.i ? "now" : "") + (session.starredAtStart?.has(it.key) ? " star" : "") }));
  return [el("div", { class: "topbar" },
    el("span", { class: "muted num" }, `${label ? label + " · " : ""}${session.i + 1} / ${session.items.length} · ${right} right`),
    store.isStarred(item) ? el("span", { class: "star small" }, "starred") : el("button", { class: "link small", onclick: finish }, "End early")),
    el("div", { class: "progress", role: "progressbar", "aria-valuenow": String(session.i), "aria-valuemin": "0", "aria-valuemax": String(session.items.length), "aria-label": "session progress" }, ...segs)];
}

function nextItem() {
  if (session.i >= session.items.length) return finish();
  const item = session.items[session.i];
  const t0 = performance.now();
  const seconds = () => Math.round((performance.now() - t0) / 100) / 10;

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
    screen(header(), promptEl(item), el("p", { class: "muted" }, "Say the answer out loud, then reveal."), keysOn() ? el("p", { class: "muted small kbd-hint" }, "Enter to reveal · Y or N to grade") : null);
    setBar([el("button", { class: "primary", onclick: reveal, autofocus: "" }, "Reveal")]);
    keys({ Enter: reveal, " ": reveal });
    return;
  }

  if (item.choices) {
    screen(header(), promptEl(item), el("p", { class: "muted" }, "Pick one."));
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
    el("form", { id: "ansform", onsubmit: (e) => { e.preventDefault(); submit(); } }, el("div", { class: "inputrow" }, input, minus)));
  setBar([el("button", { class: "primary", type: "submit", form: "ansform" }, "Check")]);
  input.focus();
  keys({});
}

function grade(item, correct, secs, typed) {
  keys({});
  const wasStarred = store.isStarred(item);
  const family = familyOf(item);
  const attempt = { key: item.key, drill: item.drill, family, correct, seconds: secs, mode: session.mode, ts: Date.now() / 1000 };
  store.record(item, attempt);
  store.save();
  session.results.push(attempt);
  const cleared = wasStarred && !store.isStarred(item);
  const fam = FAMILIES[family] ?? { name: nice(item.drill), method: null };
  const lessonId = LESSON_BY_FAMILY[family];
  const status = cleared ? el("p", { class: "star" }, `Star cleared: ${fam.name}. Two clean reps in a row.`)
    : !correct ? el("p", { class: "star" }, `Starred: ${fam.name}. Comes back with new numbers until you get two in a row.`) : null;
  const next = () => { session.i += 1; nextItem(); };
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
    el("div", { class: `mark ${correct ? "ok" : "miss"}` }, correct ? CHECK() : "✗ ", `${correct ? "Correct" : "Missed"} · ${secs.toFixed(1)}s`),
    typed !== undefined && !correct ? el("p", { class: "muted small" }, `You answered ${typed}.`) : null,
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
    bestLine = isNew ? `New personal best for ${GROUP_LABELS[session.group][0]}: ${best.toFixed(1)}s.` : `Best for this set: ${store.bests[session.group].toFixed(1)}s.`;
  }
  store.save();
  if (session.kind === "interview") return interviewResult(right, total);
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
    session.kind === "drill" && session.group !== "all" ? el("p", { class: "muted small" }, `${GROUP_LABELS[session.group][0]} level: ${levelOf(session.group)}${session.mode === "say" ? " (say mode does not change levels)" : ""}`) : null,
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
  screen(
    el("h1", {}, "Stats"),
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
    Object.keys(store.bests).length ? el("p", { class: "muted small" }, "Personal bests: " + Object.entries(store.bests).map(([g, s]) => `${GROUP_LABELS[g][0]} ${s.toFixed(0)}s`).join(" · ")) : null,
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
