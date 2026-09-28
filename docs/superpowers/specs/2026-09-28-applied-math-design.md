# Applied Math practice tool: design spec

Date: 2026-09-28. Written from `CLAUDE.md` (the project brief). Read that first.

## 1. What this is

A command-line drill tool, in Python, that runs short timed practice sessions in four stages: quick mental math, poker math, sports betting math, and quantitative analysis of financial assets. It tracks accuracy and speed, stars what Aydin misses, and brings starred items back first. It is built for one person and for 10-minute sessions.

## 2. Decisions made without asking (and why)

These are judgment calls the brief left open. Each one is easy to reverse before Stage 1 starts. Push back on any of them.

| Decision | Choice | Why |
|---|---|---|
| Interface | Terminal CLI, run with `python -m applied_math` | Zero setup on macOS + VS Code. A web app adds a week of work and no learning value. |
| Dependencies for Stages 1 to 3 | Python standard library only; `pytest` as the only dev dependency | Nothing to install, nothing to break. Stage 4 adds `numpy`, `pandas`, `matplotlib`. |
| Answer mode | Two modes. "Say" mode: read the prompt, say the answer out loud, press Enter to reveal, self-grade y/n. "Type" mode: type the number. | "Say" matches the FIR prep method in the brief. "Type" exists because self-grading drifts optimistic. |
| What gets starred | The exact item (same numbers), not the skill | The brief says starred items come back. Per-skill weakness shows up separately in `stats`. |
| Clearing a star | Two correct answers in a row on that item; a miss resets the count | Straight from the brief. |
| Storage | One JSON file, `data/progress.json`, gitignored | Human-readable, easy to inspect, no database to learn. Fine for years of 10-a-day attempts. |
| Difficulty | Banking-interview mental math. No calculus. | The brief's "fill in math courses" line is still blank. Adjust once that is filled. |
| Notebook photos (HEIC) | Not a software feature | `sips` on the command line already does it. Do not build OCR. |
| Explanations he writes | A `notes/` folder the tool never writes to | Ground rule: the understanding has to be his. The tool shows worked answers; it never writes his notes. |

## 3. One thing in the brief worth challenging

The brief orders the stages and says each must work before the next starts. But FIR interviews start in early October, about a week from today, and the interview question he will be asked is about pot odds, which is Stage 2.

Recommendation: keep the order, but size Stage 1 so it is done in two or three evenings, then build the pot-odds and outs drills as the first slice of Stage 2 before the rest of Stage 2. The Stage 1 plan is sized for that. If that is too slow, the alternative is to build the pot-odds drill first on the same engine; the engine does not care which drill comes first.

Either way: the pot-odds numbers he needs for the interview (25% break-even on $10 into $30, 9 outs is about 35% and 20%) fit on an index card. Do not let building the tool crowd out saying those out loud every day this week.

## 4. Approaches considered

1. **Recommended: one small drill engine plus a folder of item generators.** Every drill is a function that takes a random generator and returns an `Item` (prompt, answer, explanation, tolerance, stable key). The engine handles ordering, timing, checking, starring, and logging. Adding a drill means adding one function and one test. This is the whole design.
2. **A flashcard deck in a spreadsheet or Anki.** Fastest to start, but no timing, no generated variety, no growth into Stage 4. Rejected.
3. **A web app with a dashboard.** Prettier, and a real hosting and login problem for a one-user tool. Rejected for now; the JSON log can feed a dashboard later if he ever wants one.

## 5. Architecture

```
applied_math/
  __main__.py      entry point: python -m applied_math
  cli.py           argparse commands: drill, stats, stars
  items.py         Item dataclass, answer checking, answer parsing
  store.py         Store: attempts log, stars, first-time definitions; JSON on disk
  session.py       build_queue (starred first, then fresh) and run_session (timing, grading, recording)
  drills/
    __init__.py    registry: name -> generator, plus groups like "quick"
    quick.py       Stage 1 generators
    poker.py       Stage 2 (later)
    betting.py     Stage 3 (later)
    quant/         Stage 4 (later; different shape, see section 8)
tests/             pytest, one test file per module
data/              progress.json (gitignored)
notes/             his hand-written explanations; the tool never touches it
docs/              this spec, plans, skills used
```

**Data flow.** `cli` resolves drill names, builds a `Store`, asks `session.build_queue` for N items (starred first, then freshly generated, no duplicate keys), runs them with `session.run_session`, which records each `Attempt` into the store and saves at the end. `stats` reads the same file.

**Item.** Frozen dataclass: `key`, `drill`, `prompt`, `answer` (float), `explanation`, `rel_tol`, `abs_tol`. `is_correct(given)` uses `math.isclose`. Estimation drills set `rel_tol` (for example 5%); exact drills use a small `abs_tol`.

**Store.** Holds `attempts` (list of dicts), `stars` (key to `{item, streak}`), `intro_shown` (drill names whose one-line definition has been shown). `record(item, attempt)` applies the star rule. `save()` writes JSON.

**Session.** `build_queue(store, drill_names, n, rng)` returns starred items for those drills first, then round-robins the generators until it has `n` unique keys. `run_session(items, store, mode, ask, say, clock, now)` takes input and output functions as parameters so tests can drive it without a terminal.

**Error handling.** Non-numeric typed answers count as a miss and say so. A missing or corrupt `progress.json` starts fresh after printing one line; it never crashes a session. Ctrl-C ends the session and still saves what was completed.

**Testing.** Every generator is tested by seeding the random generator, producing 200 items, and checking each answer against an independent computation, plus key stability. Store tests cover the star rule with a scripted sequence of hits and misses. Session tests use scripted `ask` and `say` functions and a fake clock.

## 6. Stage 1: quick math (detailed plan in `docs/superpowers/plans/2026-09-28-stage1-quick-math.md`)

Drills, each with a one-line plain-language definition shown the first time it appears:

- `percent_of`: "What is 15% of 240?" Explanation shows the 10%-and-5% route.
- `fraction_to_decimal`: "3/8 as a decimal?" Explanation shows 1/8 = 0.125, times 3.
- `multiply_shortcuts`: two-digit times 11; squares ending in 5; times 25 as divide by 4 then times 100.
- `growth_rate`: "From 80 to 100, what is the growth rate?" and "At 6%, how many years to double?" with the rule of 72 next to the exact answer.
- `back_of_envelope`: EV/EBITDA multiple, EBITDA from revenue and margin, market cap from price and share count, interest expense from debt and rate. Estimation tolerance 5%.

Exit criterion: 10 items in under 4 minutes, in type mode, at 90% or better, three sessions in a row, with no starred items outstanding.

## 7. Stages 2 and 3: design at a glance

**Stage 2, poker.** Generators for outs to equity (rule of 4 and 2 next to the exact probability computed from the deck), pot odds as a break-even percentage, implied odds, expected value of a call, and hand combinations (how many ways to hold AK, or a pocket pair, given blockers). The exact probability comes from counting cards, never from a lookup table, so the explanation can show the count. Exit criterion: he can do the FIR pot-odds answer plus one follow-up ("what if there's one card to come?") cold.

**Stage 3, sports betting math.** Converting between American, decimal, and fractional odds; implied probability; removing the vig from a two-way market; expected value of a bet at a given true probability; Kelly fraction and fractional Kelly. All odds are generated, never fetched. The tool never records a bet, real or hypothetical. Exit criterion: convert any odds format in under 10 seconds, and explain in one line why Kelly with an overestimated edge goes broke.

## 8. Stage 4: quantitative analysis (different shape)

This stage is not drills. It is a small library plus notebooks he works through:

- `quant/returns.py`: simple and log returns, annualised volatility, correlation, Sharpe ratio, maximum drawdown. Each function has a docstring with the formula in words and a test against a hand-computed example.
- `quant/backtest.py`: one strategy interface (signal in, positions out), a fixed-cost transaction model, and a report. First strategy: moving-average crossover on one asset, because its pitfalls are easy to see.
- Data: daily prices as CSV files committed under `data/prices/`, downloaded once by a documented script. Reproducible and offline. Do not backtest against a live API.

Ground-rule gate: no backtest result goes on the resume until he can whiteboard, without the code open, the strategy logic, the backtest method, and the three pitfalls named in the brief (look-ahead bias, overfitting, transaction costs). The plan for this stage will include a written self-test with those questions, which he answers by hand in `notes/`.

## 9. Open questions for Aydin

1. Which math courses have you taken, and which Kelley math course are you in now? (The brief leaves this blank. It sets Stage 4 difficulty.)
2. Keep the strict stage order, or build the pot-odds drill first because of the October interviews? Section 3 recommends the first with a fast Stage 1.
3. Is a terminal tool acceptable, or do you want something you can open on a phone between classes? Phone use changes the architecture and should be decided before Stage 2, not after.
