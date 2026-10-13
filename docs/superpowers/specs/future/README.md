# Napkin: future paths (for approval)

Oct 13, 2026. Four agents each developed one direction into a proposal grounded in the code. This page merges them into a foundation track and three paths. Nothing here is built except the "$M" parsing fix, which shipped the same day.

| File | Direction |
|---|---|
| `platform.md` | Audit: security rules, sync, offline, scaling, owner metrics, tests before deploy |
| `learning-ux.md` | The daily flow, spaced review, session summary, accessibility, reminders, voice |
| `content.md` | Next question sets and a system that catches wrong or ambiguous questions |
| `quant-lab.md` | Stage 4 from the brief: returns, drawdowns, backtests, pitfall demos |

## Foundation: fix what is broken now (recommended before any path)

About 2 agent sessions and 15 owner minutes, mostly running one SQL file.

1. **Leader summary never works.** `cohort_summary` is declared STABLE but creates a temporary table, which Postgres refuses, so every leader sees "Summary unavailable". Rewrite as one query, with SQL tests run in `npm test`. Fix the floor to exclude the leader, count only this club's sessions, and survive a malformed row.
2. **Answers can be overwritten across devices.** Each upload sends the whole local copy without merging the server's, so a phone can overwrite answers from the laptop. Stopgap: merge the server copy before every upload. The full fix, an append-only answers table, also solves growth and comes later.
3. **Sign-out bleed.** The next account signed in on a browser absorbs the previous person's progress. Clear or separate local data on sign-out.
4. **Miss logged twice.** Opening the method from a miss and going back logs the miss again, which corrupts stars and levels.
5. **Deploys skip tests.** Make the Pages workflow run `npm test` first.
6. **About page is wrong.** "Nothing is sent anywhere" is false for signed-in users and for the libraries the page loads.
7. **Owner numbers.** An owner-only `owner_metrics()` function and hidden `#/owner` page: active in 7 and 28 days, people who practised 5+ days, retention by start week, sessions a week, per-club totals. Aggregates only. This is what a club pitch needs.

## Path A: a smoother daily habit (learning UX)

One tap per right answer (31 taps per ten-question Say session today, 21 after), a session that cannot be lost to back-swipe, "End early" on every question, ten questions even with one priority set, cleared stars that return after 3, 7 and 21 days, a summary that closes the session, then install and calendar-reminder prompts, accessibility fixes and a wording pass. Voice answers only after a phone test: they are reported unavailable in iPhone home-screen apps. First slice: 1 session, 5 owner minutes.

## Path B: deeper interview content, with a ship gate

A contract lint over every drill, wrong typed answers saved for weekly triage, and a ship gate: a set stays hidden until the owner passes a say-it-aloud check on every kind of question in it. First set through the gate: **M&A, deeper** (goodwill, ownership after a stock deal, accretion as a percent, breakeven synergies). Then **Houston energy, deeper**, held as a draft until he can explain EBITDAX and PV-10 and a reviewer checks it, and **Credit and leveraged finance**. First slice: 2 sessions, about 40 owner minutes, most of it his explain-it check.

## Path C: the quant lab (Stage 4), mostly later

Worth building, not now: first rounds rarely ask about backtests, and the statistics set already covers Sharpe and volatility at interview depth. First slice only: eight text drills on returns and risk, plus a seeded price generator. The rest (price explorer, four strategy lessons, look-ahead and overfitting demos, a self-graded whiteboard checklist) waits for winter break. Synthetic data, because index data licensing rules out the S&P 500. Nothing in the lab goes on a resume; only a backtest he writes and can whiteboard counts.

## Recommendation

Foundation, then A, then B starting with M&A. C after FIR season. A and the foundation improve every user's experience and make the pilot numbers trustworthy; B is the most valuable to his own recruiting but costs the most of his time.
