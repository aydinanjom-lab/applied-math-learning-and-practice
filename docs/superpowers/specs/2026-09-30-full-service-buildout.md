# Plan: full-service buildout

Date: 2026-09-30. A plan, not a build. Companion to the council session (`2026-09-30-monetization-council.md`), whose synthesis sets the direction: free, public, positioned as the daily warm-up for finance recruiting, launched to one club, instrumented to know if anyone returns. Paid features are designed but switched off.

## 0. Where it stands

One web page with 38 drills in eight sets, levels, streaks, a Sunday check, an interview run, and progress saved in the browser. A terminal version with the ten original drills. 23 web tests, 56 Python tests. No accounts, no sync, no analytics, no front page, no way for anyone but Aydin to know it exists.

## 1. Decisions that shape everything

| Decision | Choice | Why |
|---|---|---|
| Retire the terminal version | Done 2026-09-30 | Two copies of drill logic is the biggest maintenance risk in the project. The web page is the product. Python stays only as a reference test bed for the exact-probability math, or is deleted. |
| Framework | None, keep plain files | A no-build page deploys in seconds, has no dependency rot, and is easy to explain in an interview. Revisit only if the page passes 3,000 lines. |
| Backend | Supabase (Postgres plus auth plus row-level security) | Free tier covers thousands of users. Email magic-link sign-in means no passwords to protect. Row-level security means one line of policy keeps users' data private. Firebase is the alternative; Supabase is chosen because its data is plain SQL that Aydin can query and explain. |
| Offline first | Yes | The browser copy stays the source of truth during a session; sync is a background merge. Works on a train, and the page never blocks on the network. |
| Analytics | Privacy-light, self-hosted or Plausible-style counts, no cookies, no user IDs in third-party tools | A student tool for under-21s should not carry ad trackers. Retention is computed from the app's own data, not from a tracker. |
| Sports betting set | Keep, math only, with an age note | Already generated odds only, no bets recorded. Add one line on the set's first screen: practice math, not a betting tool. |
| Content authoring | Drills stay as code, not a JSON editor | A drill authoring UI is a product in itself. Community packs come later, if ever, as pull requests. |

## 2. Phases

Each phase ships on its own and is useful on its own. Effort is in evenings, assuming the same pace as the first week.

### Phase 1: Public-ready (3 evenings) — DONE 2026-09-30 as "Napkin"

The page anyone can land on cold and understand.

- Front page: one screen, the "interview warm-up" position, a Start button, and a one-line "built by a freshman for his own FIR interviews" story. Built as the first-visit welcome screen with a goal picker.
- First-run flow: pick a goal (interviews in N weeks, poker, general) which sets the default set; the definitions screen already exists.
- Install as an app: a web manifest and service worker so Add to Home Screen gives an icon and offline start. No app store.
- Age and purpose note on the betting set. Privacy note (what is stored, where). Terms are one paragraph.
- Feedback: a mailto link, a "report a wrong answer" link on every result screen, and a one-tap "is this useful?" after the tenth session, stored locally.
- Accessibility pass: keyboard-only run, screen reader labels on the progress bar and marks, contrast check in both themes.
- Continuous checks: GitHub Actions running `npm test` on every push; Netlify deploy previews on branches.

Exit: a stranger can open the link on a phone, understand it in ten seconds, finish a session, and come back tomorrow to the same progress.

### Phase 2: Accounts and sync (3 evenings) — BUILT 2026-09-30, needs Aydin's Supabase keys to switch on

Fixes the laptop-versus-phone problem and creates the data that proves retention.

- Supabase project. One table `progress` keyed by user id holding the same JSON the browser holds today, plus `updated_at`. Row-level security: users read and write only their row.
- Sign-in by email magic link. Optional: the app works fully without signing in; signing in turns on sync.
- Merge rule: attempts are append-only, so the merged log is the union by timestamp; stars and streak days are recomputed from the merged log rather than merged themselves. This avoids conflict handling almost entirely.
- Sync happens at session end and on page load. Failures are silent and retried; the local copy always wins during a session.
- Export: a button that downloads the JSON. His data is his.

Exit: practice on the laptop, open the phone, see the same streak.

### Phase 3: Knowing what happens (2 evenings)

- A private admin view (Aydin only, gated by user id): sign-ups, sessions per day, users who returned 2+, 5+, and 10+ days, the say-versus-typed gap across users, most-missed drills.
- Computed from the `progress` table by a nightly SQL job or on demand. No third-party tracker.
- Most-missed drills feed the next content pass. The say-versus-typed gap across users is a genuinely interesting number, and a resume-worthy one if it says something.

Exit: the retention number the council's tripwire needs, computed from real rows.

### Phase 4: Cohorts (3 evenings, only if Phase 3 shows returns)

The productization lever without a paywall.

- A cohort code (for example `KELLEY-FIR-F26`). A user enters it once. The cohort owner sees aggregate numbers only: members active this week, average level per set, most-missed drills. No individual scores are ever shown to the owner.
- Optional opt-in weekly leaderboard inside a cohort, typed mode only, first name only, top ten only. Off by default. This is the one place a leaderboard makes sense because the group is real and small.
- The cohort page is the club-license product if the money model is ever switched on.

Exit: one club running on a code, with a screenshot of aggregate numbers that Aydin can show without exposing anyone.

### Phase 5: Content depth (ongoing, one evening per pack)

- Consulting case math pack (market sizing, break-even, percentages of percentages). Same engine, a second starving crowd, and a hedge if finance recruiting goes quiet.
- Accounting pack, since he plans the double major: working capital moves, depreciation effects on the three statements as number questions.
- The quant stage from the original spec (returns, volatility, Sharpe, drawdown, one backtest) stays a separate library project with its own gate. It does not become a drill set; it is a thing he builds and can explain.

### Phase 6: Money, switched off until the tripwire fires (2 evenings when needed)

Designed now so it can be enabled in a weekend:

- One-time interview pack, $19 to $29: interview run variants for banking, consulting, and quant; the full banking set; a printable index card set. Stripe Checkout, no subscription logic.
- Club license, $150 per semester: a cohort code with the aggregate view and up to 100 members. Invoiced by hand at first.
- Everything else stays free forever. No ads, ever.

Not before: 30 or more users returning five or more days in one cycle, and at least one unprompted "can I pay you".

## 3. Operations and cost

| Item | Cost | Note |
|---|---|---|
| Netlify | $0 | Static hosting, free tier is plenty. |
| Supabase | $0 | Free tier: 50k monthly active users, 500 MB. Paid at $25 a month only far beyond this. |
| Domain | about $12 a year | Worth it for the resume and the club message. Pick a name that is not "applied math". |
| Email for magic links | $0 | Supabase includes it at low volume. |
| Stripe | 2.9% plus 30 cents per sale | Only if Phase 6 turns on. |

Total until money turns on: about $12 a year.

## 4. Risks, stated plainly

- **Building replaces using.** Godin's tripwire from the council. If Aydin's own streak drops below four days a week, stop building.
- **Recruiting-season timing.** Phases 1 and 2 are six evenings. Do them across two weeks, not one, and never the week of an interview.
- **Wrong numbers in a drill.** With other users, an error is a reputation cost. Every generator already has a test against an independent computation; keep that rule for every new pack, and add a "report a wrong answer" link on the result screen.
- **Two copies of the logic.** Resolved by retiring the terminal version in Phase 1.
- **Under-21 users and the betting set.** Math only, generated odds, no bet recording, one visible note. If a club adviser objects, the set can be hidden per cohort.
- **Resume overclaiming.** Only numbers computed from the database go on the resume, with the method one sentence away. "Used by N students, X% returned five or more days" is claimable; "growing user base" is not.

## 5. Order and timeline

| When | What |
|---|---|
| This week | Nothing new. Drill. Interview run daily. |
| Weeks of Oct 6 and Oct 13 | Phase 1. Retire terminal version, front page, install, checks, accessibility. |
| Weeks of Oct 20 and Oct 27 | Phase 2. Accounts and sync. Then send one personal message to one club. |
| November | Phase 3. Watch the numbers for four weeks. Phase 5 pack if evenings are free. |
| December | Decide: Phase 4 if returns are real; Phase 6 only if the tripwire fires. Otherwise it stays a very good personal tool with a public link, which is still a resume line. |

## 6. Skills to use when building

`copywriting` (front page), `signup` and `onboarding` (first-run and magic link), `analytics` (retention design, then the admin view), `launch` (the club message), `free-tools` (the engineering-as-marketing framing), `pricing` and `offers` (Phase 6 only), `security-review` (before accounts go live), `test-driven-development` throughout.
