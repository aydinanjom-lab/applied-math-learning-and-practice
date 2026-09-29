// Screens: home -> session -> summary. Also interview run, weekly check, starred, stats, explain.
import { GROUPS, GROUP_LABELS, DEFINITIONS, EXPLANATIONS, DRILLS, UNLOCK_AFTER, buildQueue, isCorrect, parseAnswer, fmt, makeRng } from "./drills.js";
import { Store } from "./store.js";
import { LEVELS, groupLevel, masteryLevel, streak, dayKey, weekKey, weeklyCheckDue, isUnlocked, sessionBest } from "./progress.js";

const app = document.getElementById("app");
const store = new Store(window.localStorage);
const state = { group: "interview", mode: "say", count: 10 };
const HOME_ORDER = ["interview", "poker", "quick", "banking", "betting", "moose", "novyx", "energy", "all"];

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
const render = (...nodes) => { app.replaceChildren(...nodes.flat().filter((n) => n !== null && n !== undefined && n !== false)); window.scrollTo(0, 0); };
const display = (it) => (it.choices ? it.choices[it.answer] : fmt(Math.round(it.answer * 10) / 10));
const nice = (name) => name.replace(/_/g, " ");
const levelOf = (group) => LEVELS[groupLevel(store.attempts, GROUPS[group], store.starredKeys())];

// ---------- home ----------
function home() {
  const starred = store.starredItems().length;
  const days = streak(store.days);
  const due = weeklyCheckDue(new Date(), store.weekly);
  const choice = (key, on, title, sub, pressed) =>
    el("button", { "aria-pressed": String(pressed), onclick: () => { state[key] = on; home(); } },
      el("span", { class: "choice" }, el("span", { class: "title" }, title), sub ? el("span", { class: "muted small" }, sub) : null));

  const setButton = (g) => {
    const [title, sub] = GROUP_LABELS[g];
    const unlocked = isUnlocked(g, store.attempts, store.starredKeys(), store.unlocked);
    const level = g === "all" ? null : levelOf(g);
    if (!unlocked) {
      return el("div", { class: "card locked" },
        el("div", { class: "choice" }, el("span", { class: "title" }, title), el("span", { class: "muted small" }, `Locked until ${GROUP_LABELS[UNLOCK_AFTER[g]][0]} is Solid on every drill.`)),
        el("button", { class: "link small", onclick: () => { store.unlock(g); store.save(); home(); } }, "Unlock anyway"));
    }
    return el("button", { "aria-pressed": String(state.group === g), onclick: () => { state.group = g; home(); } },
      el("span", { class: "choice" },
        el("span", { class: "titlerow" }, el("span", { class: "title" }, title), level ? el("span", { class: `badge l${LEVELS.indexOf(level)}` }, level) : null),
        el("span", { class: "muted small" }, sub)));
  };

  render(
    el("div", { class: "topbar" }, el("h1", {}, "Applied Math"), el("span", { class: "muted num" }, days ? `${days}-day streak` : "")),
    el("p", { class: "muted" }, "Ten minutes. Say it out loud, then check."),
    due ? el("div", { class: "card notice" },
      el("div", { class: "title" }, "Sunday check"),
      el("p", { class: "muted small" }, "Ten typed questions from what you have started. This is the honest score."),
      el("button", { class: "primary", onclick: startWeekly }, "Do the weekly check")) : null,
    el("button", { class: "card action", onclick: startInterview },
      el("span", { class: "choice" }, el("span", { class: "title" }, "Interview run"), el("span", { class: "muted small" }, "The FIR question as it will happen. Three typed answers, 90 seconds, pass or fail."))),
    el("h2", {}, "What do you want to drill?"),
    el("div", { class: "stack" }, HOME_ORDER.map(setButton)),
    el("h2", {}, "How do you answer?"),
    el("div", { class: "row" },
      choice("mode", "say", "Say it", "Reveal, then grade yourself", state.mode === "say"),
      choice("mode", "type", "Type it", "Counts toward levels", state.mode === "type")),
    el("h2", {}, "How many?"),
    el("div", { class: "row" }, [5, 10, 20].map((n) => choice("count", n, String(n), n === 5 ? "quick hit" : n === 10 ? "about 5 min" : "long", state.count === n))),
    el("div", { style: "height:24px" }),
    el("button", { class: "primary", onclick: () => startSession(state.group, state.mode, state.count) }, "Start"),
    starred ? el("p", { class: "small star", style: "margin-top:12px" }, `${starred} starred item${starred === 1 ? "" : "s"} will come first.`) : null,
    el("div", { class: "spacer" }),
    el("div", { class: "row" },
      el("button", { class: "link", onclick: review }, "Starred"),
      el("button", { class: "link", onclick: stats }, "Stats"),
      el("button", { class: "link", onclick: () => explain("card") }, "Index card"))
  );
}

// ---------- session ----------
let session = null;

function startSession(group, mode, count, opts = {}) {
  const names = GROUPS[group];
  const items = opts.items ?? buildQueue(store, names, count, makeRng());
  const intros = names.filter((n) => !store.introShown.includes(n));
  session = { group, mode, items, i: 0, results: [], intros, kind: opts.kind ?? "drill", deadline: opts.deadline ?? null };
  if (intros.length && session.kind === "drill") return introScreen();
  nextItem();
}

function introScreen() {
  render(
    el("h2", {}, "First time on these drills"),
    el("p", { class: "muted" }, "One line each. You will not see this again."),
    ...session.intros.map((n) => el("div", { class: "definition" }, el("strong", {}, nice(n)), el("br"), DEFINITIONS[n])),
    el("button", { class: "primary", onclick: () => { session.intros.forEach((n) => store.markIntroShown(n)); store.save(); nextItem(); } }, "Got it, start")
  );
}

function header() {
  const right = session.results.filter((r) => r.correct).length;
  const item = session.items[session.i];
  const label = session.kind === "interview" ? "Interview run" : session.kind === "weekly" ? "Sunday check" : null;
  return el("div", { class: "topbar" },
    el("span", { class: "muted num" }, `${label ? label + " · " : ""}${session.i + 1} / ${session.items.length} · ${right} right`),
    store.isStarred(item.key) ? el("span", { class: "star small" }, "starred") : el("button", { class: "link small", onclick: finish }, "End early"));
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
        el("div", { class: "prompt" }, item.prompt),
        el("div", { class: "answer num" }, display(item)),
        el("div", { class: "explanation" }, item.explanation.replace(" | ", "\n")),
        el("p", { class: "num" }, el("strong", {}, `${secs.toFixed(1)}s`), el("span", { class: "muted" }, " · Did you have it?")),
        el("div", { class: "row" },
          el("button", { class: "ok", onclick: () => grade(item, true, secs) }, "✓ Yes, I had it"),
          el("button", { class: "miss", onclick: () => grade(item, false, secs) }, "✗ No, missed it"))
      );
      keys({ y: () => grade(item, true, secs), n: () => grade(item, false, secs) });
    };
    render(header(), el("div", { class: "prompt" }, item.prompt), el("p", { class: "muted" }, "Say the answer out loud, then reveal."),
      el("button", { class: "primary", onclick: reveal, autofocus: "" }, "Reveal"));
    keys({ Enter: reveal, " ": reveal });
    return;
  }

  if (item.choices) {
    render(header(), el("div", { class: "prompt" }, item.prompt),
      el("div", { class: "row" }, item.choices.map((c, idx) => el("button", { class: "primary", onclick: () => grade(item, isCorrect(item, idx), seconds(), c) }, c))));
    keys({});
    return;
  }

  const input = el("input", { type: "text", inputmode: "decimal", autocomplete: "off", placeholder: "your answer", "aria-label": "your answer" });
  const submit = () => {
    const secs = seconds();
    const given = parseAnswer(input.value);
    if (given === null) { input.setCustomValidity("Digits only, like 25 or 33.3"); input.reportValidity(); return; }
    grade(item, isCorrect(item, given), secs, input.value);
  };
  render(header(), el("div", { class: "prompt" }, item.prompt),
    el("form", { onsubmit: (e) => { e.preventDefault(); submit(); } }, input, el("div", { style: "height:12px" }), el("button", { class: "primary", type: "submit" }, "Check")));
  input.focus();
  keys({});
}

function grade(item, correct, secs, typed) {
  keys({});
  const wasStarred = store.isStarred(item.key);
  const attempt = { key: item.key, drill: item.drill, correct, seconds: secs, mode: session.mode, ts: Date.now() / 1000 };
  store.record(item, attempt);
  store.save();
  session.results.push(attempt);
  const cleared = wasStarred && !store.isStarred(item.key);
  const status = cleared ? el("p", { class: "star" }, "Star cleared: two clean reps in a row.")
    : !correct ? el("p", { class: "star" }, "Starred. It comes back first next session until you get it twice running.") : null;
  const next = () => { session.i += 1; nextItem(); };
  render(
    header(),
    el("div", { class: "prompt" }, item.prompt),
    el("div", { class: `mark ${correct ? "ok" : "miss"}` }, `${correct ? "✓ Correct" : "✗ Missed"} · ${secs.toFixed(1)}s`),
    typed !== undefined && !correct ? el("p", { class: "muted small" }, `You answered ${typed}.`) : null,
    el("div", { class: "answer num" }, display(item)),
    el("div", { class: "explanation" }, item.explanation.replace(" | ", "\n")),
    status,
    el("button", { class: "primary", onclick: next, autofocus: "" }, session.i + 1 < session.items.length ? "Next" : "Finish")
  );
  keys({ Enter: next, " ": next });
}

function finish() {
  keys({});
  const r = session.results;
  const right = r.filter((a) => a.correct).length;
  const total = r.reduce((s, a) => s + a.seconds, 0);
  const avg = r.length ? total / r.length : 0;
  if (r.length >= 5) store.markDay(dayKey(new Date()));
  let bestLine = null;
  const best = sessionBest(r);
  if (best !== null && session.kind === "drill") {
    const isNew = store.recordBest(session.group, best);
    bestLine = isNew ? `New personal best for ${GROUP_LABELS[session.group][0]}: ${best.toFixed(1)}s.` : `Best for this set: ${store.bests[session.group].toFixed(1)}s.`;
  }
  if (session.kind === "weekly") store.addWeekly({ week: weekKey(new Date()), score: right, total: r.length, ts: Date.now() / 1000 });
  store.save();
  if (session.kind === "interview") return interviewResult(right, total);
  const starred = store.starredItems();
  render(
    el("h1", {}, session.kind === "weekly" ? "Sunday check done" : "Session done"),
    el("div", { class: "card" },
      el("p", { class: "num", style: "font-size:22px;font-weight:600" }, `${right} / ${r.length} correct`),
      el("p", { class: "muted num" }, `${avg.toFixed(1)}s average · ${total.toFixed(0)}s total · ${starred.length} starred`),
      bestLine ? el("p", { class: "star" }, bestLine) : null,
      session.kind === "drill" && session.group !== "all" ? el("p", { class: "muted small" }, `${GROUP_LABELS[session.group][0]} level: ${levelOf(session.group)}${session.mode === "say" ? " (say mode does not change levels)" : ""}`) : null),
    starred.length ? el("h2", {}, "Starred for next time") : null,
    ...starred.slice(0, 8).map((it) => el("p", { class: "small" }, it.prompt)),
    starred.length > 8 ? el("p", { class: "muted small" }, `and ${starred.length - 8} more`) : null,
    el("div", { style: "height:24px" }),
    session.kind === "drill" ? el("button", { class: "primary", onclick: () => startSession(session.group, session.mode, session.items.length) }, "Again") : null,
    el("button", { class: "link", onclick: home }, "Home")
  );
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
function startInterview() {
  const rng = makeRng();
  const q1 = DRILLS.pot_odds(rng);
  const need = q1.answer;
  const q2 = DRILLS.outs_equity(makeRng(9)); // seed 9 is not special; overwritten below
  const flush = { ...q2, key: "outs_equity:9:1", drill: "outs_equity", answer: (9 / 46) * 100, abs_tol: 1.2,
    prompt: "Same hand. You hold a flush draw, 9 outs, and there is one card to come. What is your chance of hitting? Answer in %.",
    explanation: "9 / 46 = 19.6%. Rule of 2 says 18%. | With one card to come there are 46 unseen cards." };
  const call = (9 / 46) * 100 >= need;
  const q3 = { key: `interview_call:${q1.key}`, drill: "interview_call", choices: ["Call", "Fold"], answer: call ? 0 : 1, rel_tol: 0, abs_tol: 0,
    prompt: `You need to win ${need.toFixed(1)}% of the time and you hit ${((9 / 46) * 100).toFixed(1)}% of the time. Call or fold?`,
    explanation: `${((9 / 46) * 100).toFixed(1)}% ${call ? "is above" : "is below"} ${need.toFixed(1)}%, so ${call ? "call" : "fold"}. | Judge the decision, not the result. The river card does not change whether the call was right.` };
  session = null;
  startSession("interview", "type", 3, { items: [q1, flush, q3], kind: "interview" });
}

function interviewResult(right, total) {
  const pass = right === 3 && total <= 90;
  render(
    el("h1", {}, pass ? "Pass" : "Not yet"),
    el("div", { class: "card" },
      el("p", { class: "num", style: "font-size:22px;font-weight:600" }, `${right} / 3 correct in ${total.toFixed(0)}s`),
      el("p", { class: "muted" }, pass ? "That is the FIR answer, with the follow-up, under time. Do it again tomorrow." : right < 3 ? "One wrong answer is a fail in the room. Read the index card, then run it again." : "All correct but over 90 seconds. Speed comes from reps. Run it again.")),
    el("div", { style: "height:24px" }),
    el("button", { class: "primary", onclick: startInterview }, "Run it again"),
    el("button", { class: "link", onclick: () => explain("pot_odds") }, "Read the pot odds page"),
    el("button", { class: "link", onclick: home }, "Home")
  );
}

// ---------- other screens ----------
function review() {
  const items = store.starredItems();
  render(
    el("h1", {}, "Starred"),
    el("p", { class: "muted" }, items.length ? "Each clears after two correct answers in a row." : "Nothing starred. Good."),
    ...items.map((it) => el("div", { class: "card", style: "margin-bottom:8px" }, el("div", {}, it.prompt), el("div", { class: "muted small" }, `${nice(it.drill)} · clean reps so far: ${store.stars[it.key].streak} / 2`))),
    el("div", { style: "height:16px" }),
    el("button", { class: "link", onclick: home }, "Back")
  );
}

function stats() {
  const rows = store.statsByDrill();
  const say = store.attempts.filter((a) => a.mode === "say");
  const type = store.attempts.filter((a) => a.mode === "type");
  const acc = (xs) => (xs.length ? Math.round((100 * xs.filter((a) => a.correct).length) / xs.length) : null);
  const sayAcc = acc(say), typeAcc = acc(type);
  const gap = sayAcc !== null && typeAcc !== null && say.length >= 10 && type.length >= 10 && sayAcc - typeAcc > 10;
  render(
    el("h1", {}, "Stats"),
    el("div", { class: "card" },
      el("p", { class: "num" }, `Streak: ${streak(store.days)} days · Say mode: ${sayAcc ?? "–"}% · Type mode: ${typeAcc ?? "–"}%`),
      gap ? el("p", { class: "star" }, "Your say-mode score is more than ten points above your typed score. You are grading yourself softly.") : null),
    store.weekly.length ? el("h2", {}, "Sunday checks") : null,
    ...store.weekly.slice(-8).reverse().map((w) => el("p", { class: "num small" }, `Week of ${w.week}: ${w.score} / ${w.total}`)),
    el("h2", {}, "By drill"),
    rows.length
      ? el("table", {}, el("thead", {}, el("tr", {}, el("th", {}, "Drill"), el("th", {}, "Level"), el("th", {}, "Tries"), el("th", {}, "Correct"), el("th", {}, "Avg"))),
          el("tbody", {}, rows.map((s) => el("tr", {}, el("td", {}, nice(s.drill)), el("td", {}, DRILLS[s.drill] ? LEVELS[masteryLevel(store.attempts, s.drill, store.starredKeys())] : "–"), el("td", { class: "num" }, String(s.attempts)), el("td", { class: "num" }, `${s.accuracy}%`), el("td", { class: "num" }, `${s.avgSeconds}s`)))))
      : el("p", { class: "muted" }, "No attempts yet."),
    el("p", { class: "muted small", style: "margin-top:16px" }, "Levels use your last 20 typed answers per drill: Learning at 10 answers, Solid at 80%, Fast at 90% and under 12s, Cold at 95%, under 8s and nothing starred."),
    Object.keys(store.bests).length ? el("p", { class: "muted small" }, "Personal bests: " + Object.entries(store.bests).map(([g, s]) => `${GROUP_LABELS[g][0]} ${s.toFixed(0)}s`).join(" · ")) : null,
    el("button", { class: "link", onclick: home }, "Back")
  );
}

function explain(name) {
  render(
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
    if (fn) { e.preventDefault(); fn(); }
  };
  document.addEventListener("keydown", keyHandler);
}

home();
