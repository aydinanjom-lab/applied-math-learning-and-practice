# Plan: advancing Napkin (club-ready, deeper finance math, diagnostic and levels, priorities)

Date: 2026-10-01. A plan, not a build. Four brainstorms ran in parallel, each written up in full under `advance/`:

- `advance/onboarding_priorities.md`: first-run priorities picker and how it drives the app.
- `advance/diagnostic_levels.md`: diagnostic test and an eight-rung level ladder per set.
- `advance/quant_finance_content.md`: 39 new drills in five sets, freshman first round to quant-adjacent.
- `advance/club_shipping.md`: what a club needs, cohort tables and privacy, launch mechanics.

This document is the synthesis: what to take from each, where they disagree, and the build order.

## 1. The shape of it

Today the app is a personal tool with a public link. The four pieces turn it into something a club can adopt:

1. **Priorities** decide what a person sees. Nine sets collapse into five plain-language areas on a first-run screen. A "Today" session draws from the chosen areas, weighted toward weakness and interview proximity.
2. **The diagnostic** places each priority set honestly from a small typed sample and stars what was missed, so the first real session already targets gaps.
3. **Levels** become eight rungs per set with proof required for the upper rungs and decay when a set goes stale, so "advancing" means something and cannot be inflated by say mode.
4. **Content** grows by five sets that follow the recruiting ladder, gated so a freshman is not shown bond duration before enterprise value is solid.
5. **Clubs** get a code, aggregate-only numbers, and a shared ten-question session, with a privacy floor that protects members from their own club president.

## 2. Decisions the synthesis makes

| Question | Decision | Why |
|---|---|---|
| Fixed or adaptive diagnostic | Fixed form: 8 typed items per priority set, up to 3 sets, 24 items, 20 s cap per item, about 6 minutes. One stop rule: four wrong in a row ends that set. | The bank has no calibrated difficulties, so branching would be guessing. Placement never goes above rung 3 from 8 items. |
| How many priority areas | Five: Finance interview numbers (banking, accounting, and the new valuation/deal/accounting sets), Poker as an interview answer (interview, poker), Fast mental math (quick), My business numbers (moose, novyx), Energy and odds (energy, betting). | Nine checkboxes is choice overload; five maps to how a student describes their goal. |
| Onboarding length | Three screens, under a minute: areas (multi-select), interview date (optional), time budget plus an optional "I'll do this when" chip. Then straight into a session. Account prompt only after the first session. | Value before email. Implementation-intention chips have a measured effect; a tour does not. |
| Level system | Replace the five drill-level labels with eight set-level rungs: Unplaced, Started, Learning, Mostly right, Solid, Quick, Fast, Cold. Rungs 4 to 7 require passing a ten-item typed level check; stale after 14 days, drop a rung at 28 and 56, floor at rung 2. Speed thresholds per set, not per drill. | Fixes the current min-across-drills rule that keeps Banking at "New" for months. Proof rungs stop say-mode inflation. |
| Unlock gating | Keep it, extend it: Valuation pieces, Accounting walks, Probability and stats open at once; Deal math after Banking reaches Solid; Rates and options after Deal math. | Matches the brief's "each stage works before the next" and the ladder of interviews. |
| Leaderboard | Opt-in, first name, typed-only, weekly, top ten, off by default per cohort. | Club presidents compete with members for the same internships; nobody sees anyone's score unless they chose to post it. |
| Leader view | Aggregates only through a server function; returns nothing when fewer than five members have attempts. Seven numbers. | Closes the inference problem in small cohorts. |
| Club session | A seed and a set id; every member's device generates the same ten questions from the seed. Live or async. | No question storage, no new content pipeline. |
| Betting set in clubs | Per-cohort hide toggle; math-only note stays. | Under-21 members, adviser objections. |

## 3. Where the brainstorms disagree, and the call

- **Diagnostic sampling.** Onboarding says two items per family; diagnostic says one per drill with hand-picked anchors for big sets. Call: one per drill, anchors for sets over eight drills. Families are too many to sample in six minutes.
- **Where speed lives.** Today's levels put speed thresholds per drill; the ladder moves them to the set. Call: per set. Reading time dominates and differs by set, not by drill.
- **Account before the diagnostic?** Clubs want the code captured on arrival; onboarding wants no email before value. Call: the code is captured from the link and held locally; sign-in is offered after the first session and the diagnostic result is merged into the account then. Nothing is lost.
- **Content first or clubs first?** Content is cheap per set and shows up on day one for every user; clubs only matter once a club says yes. Call: priorities and diagnostic first (they change the first-run for everyone), then content, then club pieces in time for a launch date.

## Status (2026-10-01): steps 1 to 3 built and deployed

Priorities (three-screen first run, Today session weighted by weakness and interview proximity, priority sets first with a More fold, Priorities screen, interview-date-passed card, typed default inside three days of the interview), the diagnostic (fixed form, 8 per set, 3 sets, 20-second cap, four-miss stop rule, placement to rung 3 max, 28-day re-check card), and the eight-rung level ladder with level checks, 24-hour locks, decay, and rung badges everywhere. Files: `web/priorities.js`, `web/levels.js`, `web/diagnostic.js`, plus store fields `priorities`, `stamps`, `diagnostics`, `check_locks`, all synced. 67 tests.

**Where this stopped, for whoever picks it up next:** steps 4 and 5 (content: five new sets, 39 drills, specified in `advance/quant_finance_content.md`) are next and need no backend. Step 6 (clubs) needs Supabase connected first. The old per-drill five-level labels still exist in `progress.js` and feed the `weightsFor` weakness term and the per-drill column on the Levels screen; they are not shown as the headline level any more.

## 4. Build order and effort

| Step | What | Evenings |
|---|---|---|
| 1 | Priorities: three-screen first run, store shape, Today session, home ordering with "More", re-prioritise screen, interview-date pass handling | 2 |
| 2 | Diagnostic: fixed form over priority sets, placement to rungs, stars on misses, result screen, re-diagnostic every 28 days | 2 |
| 3 | Levels: eight-rung ladder, level checks, decay, stamps in the store, stats and home badges switched over | 2 |
| 4 | Content: Valuation pieces, Accounting walks, Probability and stats (26 drills, each tested against an independent formula) | 3 |
| 5 | Content: Deal math, Rates and options (13 drills), gating | 2 |
| 6 | Clubs: schema, policies, aggregate function, join link, leader page, club session, leave and delete | 4 |
| 7 | Leaderboard (opt-in), only if a club asks | 1 |

About 16 evenings. Steps 1 to 3 change what every user experiences and should ship together as one release, because levels and the diagnostic reference each other. Step 6 needs Supabase connected; everything else does not.

## 5. What this plan refuses

Adaptive testing without calibrated items. Percentile scores. Points, badges for volume, hot-streak level-ups. Multiple choice in the diagnostic. Any level that only rises. A leader view of individual scores. Email before the first session. Content the student cannot explain from first principles yet: duration derivations, Black-Scholes, two-asset variance, continuous-time parity. Those are marked "later" in the content note and stay there until the basics are Cold.

## 6. Resume line this builds toward

"Built Napkin, a free interview-math trainer adopted by N club members at Kelley; diagnostic placement, proof-based levels, 115 generated drills with independent tests; X% of members returned five or more days in the first month." Every number in that sentence comes out of the database, and every mechanism in it is one the student can whiteboard.
