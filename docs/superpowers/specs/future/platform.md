# Napkin platform: health, scale, security, and the owner's numbers

Proposal, 2026-10-13, for the owner's approval. Nothing is built yet.

## Thesis

The pilot's real risk is wrong numbers, not attackers. The leader summary errors every time (checked in real Postgres). Each device overwrites the server copy club numbers come from, and the owner can't count users. So: fix and test the summary, give the owner database totals, gate deploys on tests, then move answers to an append-only table that can't lose them and stays small. No third-party tracker is needed.

Terms: **RLS** (row-level security) is the Postgres rule that filters rows by who asks. A **security-definer function** runs with its owner's rights: it reads every row and returns only totals. **CI** is the tests GitHub runs before deploying.

## Audit findings

I read the SQL, sync.js, store.js, sw.js and app.js's club and account code, ran the SQL in Postgres 16 (PGlite, scratch copy) as several users, and drove the app in Chromium with a fake Supabase.

| Sev | Where | What | Status | Fix |
|---|---|---|---|---|
| High | supabase/clubs.sql:142,150 | `cohort_summary` is marked STABLE (a promise not to write) yet creates a temp table, so Postgres refuses it ("CREATE TABLE is not allowed in a non-volatile function"). Every leader sees "Summary unavailable". | CONFIRMED (ran it) | S |
| High | web/app.js:50-57 | Devices upload their whole copy unmerged. Test: laptop answered 2, phone 3, server kept 3. The laptop's 2 return when it restarts, or are lost if its storage is cleared first (Safari does after 7 idle days). | CONFIRMED; loss PLAUSIBLE | S now, L full |
| Med | clubs.sql:152-156 | One malformed member row (`"ts":"soon"`), writable from the browser console, breaks the club's summary. | CONFIRMED | S |
| Med | clubs.sql:158,163,166 | The five-member floor counts the leader and any spare accounts. Single drill and set rows have no floor, and live numbers let a leader watch one answer. "Did a club session" counts any club's sessions. Days are in UTC. | CONFIRMED; inference PLAUSIBLE | S |
| Med | app.js:496, 38-45 | After sign-out, the next account to sign in on that browser absorbs the previous person's progress, notes included. | CONFIRMED (ran it) | S |
| Med | app.js:588; sync.js:73; style.css:3 | About says "Nothing is sent anywhere", even when signed in. Every visit loads esm.sh code (unpinned `@2`, which can read sign-in tokens) and a Google font. | CONFIRMED (ran it) | S |
| Med | app.js:53 | Answers in the 1.5 s before closing wait for the next visit; nothing retries on reconnect. | CONFIRMED (ran it) | S |
| Med | clubs.sql (absent) | No way to remove a member, replace a leaked code, or delete your account. Export skips notes, priorities and levels. | CONFIRMED | S |
| Med | magic link | On an iPhone home-screen install, the email link opens Safari (separate storage), so the app never signs in. | PLAUSIBLE | S |
| Low | clubs.sql:43,47,53 | The policies reference each other, so direct reads stop with "infinite recursion" (fails closed). A naive fix would expose a self-comparing policy and let members insert themselves into any club. | CONFIRMED | S |
| Low | clubs.sql:176; schema.sql:2-6 | The board trusts the browser: 500 fake future-dated answers topped it. Rows have no size cap (5 MB went in), and the client sets `updated_at`. | CONFIRMED | S |
| Low | sync.js:49,56; store.js:188,208 | Priorities use "this device wins". A deleted note or a cleared to-learn item comes back from the other device. | CONFIRMED | S |
| Low | sw.js:14; router.js:34 | No network timeout, so weak Wi-Fi stalls startup; a missing script gets index.html; a mangled link blanks the page. | CONFIRMED; stall PLAUSIBLE | S |
| Low | .github/workflows/pages.yml | Deploy doesn't wait for tests. Every push to the working branch goes live. | CONFIRMED | S |

I found no injection or cross-site scripting.

## Ranked work items

**1. Fix and test the leader summary.** S; owner 5 min (run SQL). Leaders get real numbers for the first time.
- One query, no temp table, malformed rows skipped.
- Count this club's sessions only, using the students' local days.
- Floor: 5 active members besides the leader. Hide drill and set rows built from fewer than 5 people.
- Report through the end of yesterday.
- Remove the policy loop and the self-insert path.

**2. Owner numbers page.** M; owner 10 min (run SQL, add his id to `app_admins`, list test accounts in `metrics_excluded`). A security-definer `owner_metrics()` returns totals only and raises for anyone not in `app_admins`. A hidden `#/owner` page shows:

1. accounts that have practised (all time, new this week);
2. active in the last 7 and 28 days;
3. practised on 2+ and on 5+ different days (all time, last 28 days);
4. retention by start week: "x of n" back in weeks 1, 2 and 4 (no percentages while n < 10);
5. sessions this week, total and median per active person (a session: answers with no gap over 30 minutes);
6. median practice days per active person this week;
7. per club with 5+ active members besides the leader: members, active this week, 5+ days.

A **practice day** is a day in the account's `days` list: the days that build the streak, in the student's own time zone. "Copy for a pitch" gives one paragraph with the definitions, saying "signed-in students" (signed-out use isn't counted).

New signed-in About text: "Your progress is stored in your account so it follows you between devices. Your club leader sees club totals, never your answers. Aydin, who runs Napkin, sees totals across all accounts, never one person's answers." (As database admin he still can open rows; this page means he needn't.)

**3. Tests that gate the deploy.** M; owner 0.
- **SQL tests.** PGlite (Postgres inside Node, no Docker) plus a 15-line stub of Supabase's `auth` schema. It calls each function as leader, member, outsider and anonymous user, inside `npm test`; this is how finding 1 surfaced.
- **Browser tests.** `@playwright/test` 1.56.1 (matches `/opt/pw-browsers` Chromium), phone-sized. Locally: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npx playwright test`.
- **Fake Supabase.** `tests/browser/fake-supabase.mjs` sets `globalThis.__napkinSyncFactory` before the app loads. One in-memory server backs all browser contexts, so two devices can share an account. Any request to another host fails the test.
- **First specs:** onboarding; a typed session saves; signed-out visits contact no other host (fails today); two devices keep both sets of answers (fails until item 4); a second account's sign-in copies nothing; a 3-member club shows the floor; offline reload works; a club session matches on two devices.
- **CI.** One workflow: unit and SQL tests, then browser tests, then deploy, chained with `needs:`.

**4. Sync stopgap.** S–M; owner 0; needs 3.
- Merge before each upload; write only if the row's revision number is unchanged.
- Flush when the tab hides; retry when back online.
- Sign-out offers to clear this browser's copy.
- Timestamps and deletion markers so priorities, notes and to-learn items merge.

**5. Make the privacy promise true.** S; owner 10 min (email forwarding). Vendor a pinned supabase-js into `web/vendor/` and precache it; self-host the font; separate About text for signed-in and signed-out users; feedback to a napkinprep.com address.

**6. Club controls.** S; owner 5 min. Remove a member, issue a new code, delete my account (deleting the auth row cascades), full export, and a 6-digit sign-in code for home-screen iPhones.

**7. Append-only answers (the scaling fix).** L; owner 15 min; needs 3 and 4.
- **New table.** `attempts`: one row per answer, plus the student's local `day` and a server-set `received_at`. The key `(user_id, ts, key)` makes re-sends harmless. RLS allows own-row insert and read only, and a trigger rejects impossible values.
- **Upload.** Only the outbox (unconfirmed answers), about 150 bytes each; today a year-old daily account sends about 1 MB per answer.
- **Pull.** Rows received since the last pull (server clock), merged by the existing `key|ts` union, so `mergeProgress` is unchanged. The rest of progress stays one small JSON row under item 4's revision check.
- **Migration.** (1) `attempts.sql` copies every `data.attempts` into the table, skipping duplicates, old rows dated in Eastern time. (2) The summary, leaderboard and metrics read the table. (3) The new app moves any `data.attempts` it finds into the table on each pull; an old cached app loses nothing, since it keeps its own log. (4) After 30 days without old-format writes, strip `data.attempts`.
- **Size.** 50 students × 15 answers a day ≈ 40 MB a year (free tier: 500 MB). On devices, warn when a save fails (today it fails silently); compact only near 2 MB.

**8. Service worker.** S. Cache fallback after 3 s; `cache: "no-cache"` so two deploys' files never mix; index.html only for page loads.

**9. Before any payment.** S; owner 30 min. Move hosting off GitHub Pages; keep Supabase from pausing over winter break.

## Recommended first slice: "numbers you can show a club"

Items 1 and 2, plus the CI gate from item 3 (unit and SQL tests). About 1–2 agent sessions and 15 owner minutes.

Acceptance criteria:
1. `npm test` runs every `supabase/*.sql` in PGlite. Today's file fails with the CREATE TABLE error; the fixed one returns numbers for a leader plus 6 active members.
2. A member row with `"ts":"soon"` or object-shaped `attempts` is skipped; the summary still returns.
3. With the leader plus 4 active members, the floor holds. A drill tried by only 4 people stays out of "Most missed".
4. Another club's session doesn't count toward "Did a club session".
5. `owner_metrics()` raises for anonymous callers and non-admins. On 8 seeded accounts it matches hand-computed values for all seven numbers, excluded accounts left out.
6. `#/owner` shows the numbers and pitch paragraph; non-admins see "Not available".
7. Signed-in users see the new About text.
8. Deploy `needs:` the tests, so a failing test blocks it.

## What not to do

- No Google Analytics, PostHog, Plausible, Sentry or fingerprinting; no signed-out pings without opt-in.
- No per-member rows or "who hasn't practised" lists for leaders.
- No prizes tied to the board, since the browser writes its scores.
- No server compaction or dropping `data.attempts` before item 7's migration is tested.
- No hosting move during the pilot.
- No retention number on the resume until he can explain its definition and query (CLAUDE.md).

## Open questions

1. Should the floor leave out the leader? (Recommended.)
2. Should the summary run through yesterday (safer), or live, so leaders can watch completions in a meeting?
3. Count signed-in accounts only (recommended), or add an opt-in anonymous count?
