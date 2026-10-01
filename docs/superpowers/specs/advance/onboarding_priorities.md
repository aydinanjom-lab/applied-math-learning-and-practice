# First-run "pick your priorities" flow

*Design note, 2026-10-01. Not code. Replaces the one-question `welcome()` screen in `web/app.js`.*

## Why change it

Today `welcome()` asks one question (interviews / poker / quick math), sets `store.goal`, and `home()` then lists all nine sets in a fixed `HOME_ORDER`. The goal is only used to pick a default set. A student eight weeks from a first round should instead see the two or three sets that matter to him first, get a "Today" session that mixes them, and have the diagnostic sample only those. Three screens, under 60 seconds, no account.

## 1. The screens

**Priority areas** (the nine `GROUPS` keys collapsed to five; order on the screen as below):

| Label on screen | One-liner | Sets |
|---|---|---|
| Finance interview numbers | Multiples, cost of capital, buyout returns, the three statements | `banking`, `accounting` |
| Poker as an interview answer | Pot odds, outs, bluffs. The "teach me something" question. | `interview`, `poker` |
| Fast mental math | Percentages, shortcuts, growth rates, back-of-envelope | `quick` |
| My business numbers | Margin, payback, break-even, pipeline, customer value | `moose`, `novyx` |
| Energy and odds | Barrels and netback; odds formats and the vig (math only) | `energy`, `betting` |

`betting` keeps its `UNLOCK_AFTER: poker` rule inside the area. Five areas, not nine sets, so the first screen is one thumb-scroll with no scrolling.

### Screen 1 of 3: "What do you need to be fast at?"

> **Napkin**
> Ten minutes a day on the numbers interviewers ask. Say it out loud, then check.
>
> **What do you need to be fast at?**
> Pick everything that applies. You can change this any time.
>
> [ ] Finance interview numbers — Multiples, cost of capital, buyout returns, the three statements
> [ ] Poker as an interview answer — Pot odds, outs, bluffs. The "teach me something" question.
> [ ] Fast mental math — Percentages, shortcuts, growth rates, back-of-envelope
> [ ] My business numbers — Margin, payback, break-even, pipeline, customer value
> [ ] Energy and odds — Barrels and netback; odds formats and the vig. Math only.
>
> **Next** (disabled until one box is ticked; helper text: "Pick at least one.")
>
> *Free. Nothing to install. Your progress stays in this browser.*

Multi-select, same `aria-pressed` buttons as the set cards. No "select all"; "Everything" still lives on the home screen.

### Screen 2 of 3: "When is your first interview?"

> **When is your first interview?**
> Napkin front-loads what you will be asked and tapers the rest as the date gets close.
>
> [ date field, native picker, placeholder "Oct 8" ]
>
> **Next**   **I don't have a date yet** (link, skips)

One optional field, native picker. Skipped means no proximity weighting.

### Screen 3 of 3: "How long each day?"

> **How long each day?**
> Short sessions you will actually do beat long ones you skip.
>
> ( ) 5 min — quick hit, about 5 questions
> (•) 10 min — the default, about 10 questions
> ( ) 20 min — long, about 20 questions
>
> **I'll do this when:** [ after breakfast | between classes | before bed | other ]
>
> **Start today's warm-up**

The "I'll do this when" chips are the implementation intention (see research). One tap, optional, stored as a string and shown on the home screen as "Today, between classes". The button goes straight into a session, not to the home screen: the first thing he does in Napkin is answer a question.

Total: three taps minimum (one area, skip date, start). Target under 45 seconds.

## 2. How priorities drive the app

Stored as `store.priorities = { areas: ["finance","poker"], interviewDate: "2026-10-08"|null, minutes: 10, when: "between classes"|null }`. `store.goal` is derived from the first area for backwards compatibility.

**Default set and "Today".** The home screen's primary button becomes **Start · Today · 10 · Say it**. "Today" is a virtual group built by a new `buildTodayQueue(store)`:

1. Starred items first (unchanged rule: starred clears after two clean typed reps).
2. The rest is drawn from priority sets only. Each set gets a weight = `1 + 2 × weakness + 1 × urgency`, where weakness is `1 − (share of drills at Solid or better)` for that set, and urgency is 1 for `banking`/`accounting`/`interview` when the interview date is within 14 days, 0 otherwise. Draws are proportional to weight, with at most 60% of a session from one set so nothing goes stale.
3. The per-day count comes from the time budget: 5/10/20.

**Home-screen ordering.** `HOME_ORDER` becomes: Today, then priority sets in the order the areas were ticked, then a collapsed **More** disclosure holding the rest and "Everything". Non-priority sets keep their levels, bests, and unlock rules; they are folded, not hidden.

**Lessons.** `lessonsList()` shows a "Suggested" block at the top: lessons for families in priority sets where the level is below Solid, worst first, max three. The full list follows under "All lessons".

**Diagnostic.** The diagnostic (designed separately) samples only drills in priority sets, two per family, typed. Its result seeds the weakness term above so the first "Today" is already shaped. If only one area is picked, the diagnostic is shorter, never padded with sets he did not pick.

**Interview-date behaviour.** Home shows "Interview in 7 days" under the streak. Within 14 days: `banking`, `accounting`, `interview` get the urgency bump and the Sunday check pulls from priority sets only. Within 3 days: the Today session switches default mode to Type it, because that is the honest score.

## 3. Re-prioritising later

A **Priorities** link joins the home footer row (Starred · Stats · Lessons · Glossary · Index card · Priorities · About). It reopens the same three screens pre-filled, with **Save** in place of Start.

When the interview date passes: the next home visit shows one card, "Your Oct 8 interview has passed. How did the numbers go?" with **Set the next date**, **No date for now**, and a free-text line "What did they ask?" that is stored only in this browser as a note on the Stats screen. The urgency weighting resets to zero; priorities and streak are untouched.

## 4. Research grounding

- **Show value before the account.** Growth.design's Duolingo teardown shows a full lesson before any sign-up, and NN/g's login-walls article finds users are rarely more annoyed than at a wall that precedes content. Napkin has no account at all in onboarding; Screen 3 ends in a session. (https://growth.design/case-studies/duolingo-user-retention, https://www.nngroup.com/articles/login-walls/)
- **Goal selection, few options.** Iyengar and Lepper's jam study: 24 options drew more browsers but 6 produced ten times the purchases. Five areas, not nine sets. (https://www.atticusli.com/replication-crisis/choice-overload-jam-study/ for the replication caveats; original "When Choice is Demotivating", 2000)
- **Progressive disclosure.** Nielsen: defer rarely-used options to a secondary screen so the primary ones get attention. That is the "More" fold on home and the one-field date screen. (https://www.nngroup.com/videos/progressive-disclosure/)
- **Habit stacking in onboarding.** Headspace asks "when" in terms of existing routines (before bed, commute) rather than abstract times, and its redesign cut a 38% onboarding drop-off by making intro screens skippable and going straight into session one. Napkin's "I'll do this when" chips and the straight-to-session button follow this. (https://tearthemdown.substack.com/p/headspace, https://irrationallabs.com/case-studies/headspace-doubled-course-starts/)
- **Implementation intentions.** Gollwitzer (1999) and the Gollwitzer and Sheeran (2006) meta-analysis of 94 tests: an "if situation x, then I do y" plan raises goal attainment by d = 0.65, with academic goals at about 0.57. A one-tap cue is cheap and backed. (https://www.socmot.uni-konstanz.de/sites/default/files/99_Gollwitzer_Implementation_Intentions.pdf, https://goalsandprogress.com/implementation-intentions-research/)
- **Tutorials do not work; doing does.** NN/g tested deck-of-cards tutorials across 70 users and found them skipped and forgotten. No tour screens. (https://www.nngroup.com/articles/mobile-tutorials/)
- **Elevate as the counter-example.** Elevate's onboarding runs about 40 steps before the first game, which reviewers flag as friction despite the personalisation feel. (https://screensdesign.com/showcase/elevate-brain-training-games, https://ixd.prattsi.org/2023/02/design-critique-elevate-ios-app/). Growth.design does not appear to have an Elevate teardown; the above are the sources used.

## 5. What to avoid

- No quiz longer than three screens, and no personality questions ("How do you learn best?"). They feel personal but change nothing we can act on.
- No email, name, or account before the first session. Account stays where it is, behind the footer link.
- No "select all" default. A pre-ticked list is a list he did not choose.
- No notification permission prompt during onboarding. If reminders come later, ask after the second completed day.
- No goal-size question ("casual / serious / intense"). The time budget is the only commitment asked for, and 10 minutes is pre-selected.
- No copy that calls it a journey, a plan, or a programme. Brand voice: warm-up, out loud, ten minutes, honest score.
