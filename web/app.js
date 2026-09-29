// Screens: home -> session -> summary. Also review (stars), stats, explain.
import { GROUPS, GROUP_LABELS, DEFINITIONS, EXPLANATIONS, buildQueue, isCorrect, parseAnswer, fmt, makeRng } from "./drills.js";
import { Store } from "./store.js";

const app = document.getElementById("app");
const store = new Store(window.localStorage);
const state = { group: "poker", mode: "say", count: 10 };

const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined) node.append(c);
  return node;
};
const render = (...nodes) => { app.replaceChildren(...nodes.flat().filter((n) => n !== null && n !== undefined)); window.scrollTo(0, 0); };
const display = (x) => fmt(Math.round(x * 10) / 10);

// ---------- home ----------
function home() {
  const starred = store.starredItems().length;
  const choice = (key, on, title, sub, pressed) =>
    el("button", { "aria-pressed": String(pressed), onclick: () => { state[key] = on; home(); } },
      el("span", { class: "choice" }, el("span", { class: "title" }, title), sub ? el("span", { class: "muted small" }, sub) : null));

  render(
    el("h1", {}, "Applied Math"),
    el("p", { class: "muted" }, "Ten minutes. Say it out loud, then check."),
    el("h2", {}, "What do you want to drill?"),
    el("div", { class: "stack" }, Object.keys(GROUPS).map((g) => choice("group", g, GROUP_LABELS[g][0], GROUP_LABELS[g][1], state.group === g))),
    el("h2", {}, "How do you answer?"),
    el("div", { class: "row" },
      choice("mode", "say", "Say it", "Reveal, then grade yourself", state.mode === "say"),
      choice("mode", "type", "Type it", "Stricter. Use weekly.", state.mode === "type")),
    el("h2", {}, "How many?"),
    el("div", { class: "row" }, [5, 10, 20].map((n) => choice("count", n, String(n), n === 5 ? "quick hit" : n === 10 ? "about 5 min" : "long", state.count === n))),
    el("div", { style: "height:24px" }),
    el("button", { class: "primary", onclick: startSession }, "Start"),
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

function startSession() {
  const names = GROUPS[state.group];
  const items = buildQueue(store, names, state.count, makeRng());
  const intros = names.filter((n) => !store.introShown.includes(n));
  session = { items, i: 0, results: [], intros };
  if (intros.length) return introScreen();
  nextItem();
}

function introScreen() {
  render(
    el("h2", {}, "First time on these drills"),
    el("p", { class: "muted" }, "One line each. You will not see this again."),
    ...session.intros.map((n) => el("div", { class: "definition" }, el("strong", {}, n.replace(/_/g, " ")), el("br"), DEFINITIONS[n])),
    el("button", { class: "primary", onclick: () => { session.intros.forEach((n) => store.markIntroShown(n)); store.save(); nextItem(); } }, "Got it, start")
  );
}

function header() {
  const right = session.results.filter((r) => r.correct).length;
  const item = session.items[session.i];
  return el("div", { class: "topbar" },
    el("span", { class: "muted num" }, `${session.i + 1} / ${session.items.length} · ${right} right`),
    store.isStarred(item.key) ? el("span", { class: "star small" }, "starred") : el("button", { class: "link small", onclick: finish }, "End early"));
}

function nextItem() {
  if (session.i >= session.items.length) return finish();
  const item = session.items[session.i];
  const t0 = performance.now();
  const seconds = () => Math.round((performance.now() - t0) / 100) / 10;

  if (state.mode === "say") {
    const reveal = () => {
      const secs = seconds();
      render(
        header(),
        el("div", { class: "prompt" }, item.prompt),
        el("div", { class: "answer num" }, display(item.answer)),
        el("div", { class: "explanation" }, item.explanation.replace(" | ", "\n")),
        el("p", { class: "num" }, el("strong", {}, `${secs.toFixed(1)}s`), el("span", { class: "muted" }, " · Did you have it?")),
        el("div", { class: "row" },
          el("button", { class: "ok", onclick: () => grade(item, true, secs) }, "✓ Yes, I had it"),
          el("button", { class: "miss", onclick: () => grade(item, false, secs) }, "✗ No, missed it"))
      );
      keys({ y: () => grade(item, true, secs), n: () => grade(item, false, secs) });
    };
    render(
      header(),
      el("div", { class: "prompt" }, item.prompt),
      el("p", { class: "muted" }, "Say the answer out loud, then reveal."),
      el("button", { class: "primary", onclick: reveal, autofocus: "" }, "Reveal")
    );
    keys({ Enter: reveal, " ": reveal });
    return;
  }

  const input = el("input", { type: "text", inputmode: "decimal", autocomplete: "off", placeholder: "your answer", "aria-label": "your answer" });
  const submit = () => {
    const secs = seconds();
    const given = parseAnswer(input.value);
    if (given === null) { input.setCustomValidity("Digits only, like 25 or 33.3"); input.reportValidity(); return; }
    grade(item, isCorrect(item, given), secs, input.value);
  };
  render(
    header(),
    el("div", { class: "prompt" }, item.prompt),
    el("form", { onsubmit: (e) => { e.preventDefault(); submit(); } }, input, el("div", { style: "height:12px" }), el("button", { class: "primary", type: "submit" }, "Check"))
  );
  input.focus();
  keys({});
}

function grade(item, correct, secs, typed) {
  keys({});
  const wasStarred = store.isStarred(item.key);
  const attempt = { key: item.key, drill: item.drill, correct, seconds: secs, mode: state.mode, ts: Date.now() / 1000 };
  store.record(item, attempt);
  store.save();
  session.results.push(attempt);
  const cleared = wasStarred && !store.isStarred(item.key);
  const status = cleared ? el("p", { class: "star" }, "Star cleared: two clean reps in a row.")
    : !correct ? el("p", { class: "star" }, "Starred. It comes back first next session until you get it twice running.")
    : null;
  const next = () => { session.i += 1; nextItem(); };
  render(
    header(),
    el("div", { class: "prompt" }, item.prompt),
    el("div", { class: `mark ${correct ? "ok" : "miss"}` }, `${correct ? "✓ Correct" : "✗ Missed"} · ${secs.toFixed(1)}s`),
    typed !== undefined && !correct ? el("p", { class: "muted small" }, `You typed ${typed}.`) : null,
    el("div", { class: "answer num" }, display(item.answer)),
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
  const avg = r.length ? r.reduce((s, a) => s + a.seconds, 0) / r.length : 0;
  const starred = store.starredItems();
  render(
    el("h1", {}, "Session done"),
    el("div", { class: "card" },
      el("p", { class: "num", style: "font-size:22px;font-weight:600" }, `${right} / ${r.length} correct`),
      el("p", { class: "muted num" }, `${avg.toFixed(1)}s average · ${starred.length} starred`)),
    starred.length ? el("h2", {}, "Starred for next time") : null,
    ...starred.map((it) => el("p", { class: "small" }, it.prompt)),
    el("div", { style: "height:24px" }),
    el("button", { class: "primary", onclick: startSession }, "Again"),
    el("button", { class: "link", onclick: home }, "Home")
  );
}

// ---------- other screens ----------
function review() {
  const items = store.starredItems();
  render(
    el("h1", {}, "Starred"),
    el("p", { class: "muted" }, items.length ? "Each clears after two correct answers in a row." : "Nothing starred. Good."),
    ...items.map((it) => el("div", { class: "card", style: "margin-bottom:8px" }, el("div", {}, it.prompt), el("div", { class: "muted small" }, `${it.drill.replace(/_/g, " ")} · clean reps so far: ${store.stars[it.key].streak} / 2`))),
    el("div", { style: "height:16px" }),
    el("button", { class: "link", onclick: home }, "Back")
  );
}

function stats() {
  const rows = store.statsByDrill();
  render(
    el("h1", {}, "Stats"),
    rows.length
      ? el("table", {}, el("thead", {}, el("tr", {}, el("th", {}, "Drill"), el("th", {}, "Tries"), el("th", {}, "Correct"), el("th", {}, "Avg time"))),
          el("tbody", {}, rows.map((s) => el("tr", {}, el("td", {}, s.drill.replace(/_/g, " ")), el("td", { class: "num" }, String(s.attempts)), el("td", { class: "num" }, `${s.accuracy}%`), el("td", { class: "num" }, `${s.avgSeconds}s`)))))
      : el("p", { class: "muted" }, "No attempts yet."),
    el("p", { class: "muted small", style: "margin-top:16px" }, "Compare say-mode and type-mode weeks. If they differ by more than ten points, you are grading yourself softly."),
    el("button", { class: "link", onclick: home }, "Back")
  );
}

function explain(name) {
  render(
    el("h1", {}, name === "card" ? "Poker index card" : name.replace(/_/g, " ")),
    el("pre", {}, EXPLANATIONS[name]),
    name === "card" ? el("div", { class: "row" }, GROUPS.poker.map((n) => el("button", { class: "link", onclick: () => explain(n) }, n.replace(/_/g, " ")))) : null,
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
