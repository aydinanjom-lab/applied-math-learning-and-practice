# Napkin: ship to clubs

Date: 2026-10-01. A plan for Phase 4 (cohorts) of the buildout spec. Builds on what exists: plain HTML/JS, GitHub Pages, Supabase magic-link accounts, one `progress` table with per-user JSON and row-level security (RLS: a Postgres rule that filters rows by who is asking). Gate from the spec still applies: do not start until the admin view shows real returns.

## 1. What a club leader needs to say yes

A club president is a student with a Slack channel and no time. Five pieces:

1. **One-page pitch.** Half a screen, sent as a message, not a PDF: what it is, who built it (a freshman in the same club, for the same interviews), what the leader gets (a weekly count of members warming up, nothing on individuals), what it costs (nothing, no ads), what it asks (post the link twice). Draft in section 5.
2. **A cohort code.** `KELLEY-FIR-F26` style, baked into a link so nobody types it. The leader creates it on a `/club` page by signing in and typing a name. One click, one code, one link.
3. **Aggregate-only progress.** Members active this week, sessions this week, average level per set, three most-missed drills. Never a per-person row, never names next to scores. This is the opposite of Duolingo for Schools and Quizlet classes, where teachers see each student's accuracy, time spent and missed terms ([Duolingo teacher dashboard](https://www.schoollibraryjournal.com/story/slj-reviews-duolingo-for-schools-test-drive), [Quizlet assignments](https://help.quizlet.com/hc/articles/39836814088845-Using-Assignments)). Right for a teacher with grading authority; wrong for a peer club where the president competes with members for the same internships. Aggregates-only is what makes the pitch safe to say yes to.
4. **Club session.** The same ten questions for everyone, from a short code the leader shares. Works live (everyone does it in the meeting, phones out, four minutes) or async (do it by Friday). Kahoot's student-paced challenge is the model for async, minus the podium ([Kahoot assignments](https://kahoot.com/blog/2025/09/08/teacher-takeover-kahootopia-assignment/)).
5. **Leaderboard: opt-in, first name, typed-only, weekly, top ten, off by default.** Typed-only because say-mode is self-reported and a board on it rewards lying; opt-in because an unwanted board drives out the nervous members who need the warm-up most; weekly so a bad first week does not stick; top ten so it is never a full ranking; first name because a club board is social and "Member 7" kills that. The leader enables it per cohort; each member still opts in. "None" was rejected: a real, small group is the one place a board works, and clubs will ask.

## 2. Minimum technical pieces

Three tables, one view-returning function, one policy change. Everything else is a page.

```sql
create table cohorts (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,            -- KELLEY-FIR-F26, uppercase, 6-20 chars
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  hide_betting boolean not null default false,
  leaderboard boolean not null default false,
  created_at timestamptz default now()
);
create table cohort_members (
  cohort_id uuid references cohorts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  first_name text,                      -- null unless the member opts into the board
  board_opt_in boolean not null default false,
  joined_at timestamptz default now(),
  primary key (cohort_id, user_id)
);
create table club_sessions (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references cohorts(id) on delete cascade,
  short_code text unique not null,      -- 4 letters, e.g. MXQ7
  seed integer not null,
  set_id text not null,                 -- 'banking', 'poker', ...
  due_at timestamptz,
  created_by uuid references auth.users(id)
);
```

**RLS.** `cohorts`: anyone signed in can select by exact code (join flow); only the owner can update. `cohort_members`: a user can insert and delete their own row; the owner can select rows of their cohort **but the policy grants select only on `(cohort_id, user_id, joined_at)` through a view**, never on progress. `progress` keeps its one-row-per-user policy untouched; the owner never gets a select policy on it.

**Aggregates by RPC, not by policy.** A `security definer` function (runs with the function owner's rights, not the caller's) `cohort_summary(cohort_id)` checks `auth.uid() = owner_id`, then computes counts from `progress` joined to `cohort_members`, and returns one row: `active_7d`, `sessions_7d`, `members`, `avg_level_by_set jsonb`, `top_missed jsonb` (drill ids and miss rates). Minimum-group rule inside the function: if fewer than five members have any attempts, return nulls for everything except `members`. That stops a leader inferring one person's score from a cohort of two. Add `cohort_leaderboard(cohort_id)` with the same guard: top ten by typed-level sum in the last seven days, only rows with `board_opt_in`, returns `first_name` and `score`, visible to all members of that cohort when `leaderboard` is on.

**Progress JSON gains two fields:** `cohort_codes: []` and an optional `club_session` short code per attempt. Attempts stay append-only, so the merge rule does not change.

**Club session definition and distribution.** `makeRng(seed)` already exists in `core.js`. A club session is `(set_id, seed, 10)`: the page derives the same ten drill instances from the seed on every phone, so the server stores a seed, not questions. The leader taps "New club session", picks a set, gets a four-letter short code and a link `napkin.app/#s=MXQ7`. The client fetches `(seed, set_id)` by short code (public select policy on `club_sessions`), runs ten typed questions, tags the attempts. Live mode is the same thing with everyone pressing Start together. Async works offline: fetch the seed once, run later.

**Leader dashboard: seven numbers.** Members, active this week, sessions this week, members returned 5+ days this cycle, average level per set (one row), top three missed drills, last club session completion count. Nothing else. A screenshot of this is the artifact the spec asks for.

## 3. Privacy and consent

**What is collected.** Email (for the magic link), the progress JSON (attempt timestamps, drill id, mode, right/wrong, typed answer), cohort membership, first name only if the member opts into the board. No IP logs beyond what Supabase keeps by default, no third-party analytics, no cookies except the Supabase session.

**Under-21 users and the betting set.** The set is math on generated odds and records no bets. Per-cohort `hide_betting` removes the set from the home screen and from club sessions for every member while they are in that cohort; the leader sets it at creation, and the pitch says so. Default is visible, since the note already on the set is the honest framing, but a club adviser's objection flips it in one click.

**Plain-language privacy note** (goes on the join screen, under 80 words): "Napkin stores your email and your drill history so your progress follows you between devices. If you join a club, your club leader sees counts for the whole club, never your scores or your name. If you turn on the leaderboard, your first name and weekly typed score show to club members. Nothing is sold or sent to advertisers. Download or delete everything from Settings, any time."

**FERPA-adjacent.** FERPA covers education records held by institutions receiving federal funds. A student-run club using a peer-built tool is not the university and drill history is not an education record, so FERPA does not apply directly. The adjacent risk is reputational: an officer who can see a named member is slow at arithmetic has gossip that leaks into recruiting. Aggregates-only and the five-member floor close that. Two rules: never sign a data agreement with a university office (that makes it a system of record), and if a Kelley adviser asks for access, give the same aggregate view and nothing more.

**Deletion and export.** Export already exists (JSON download). Add "Delete my account": an RPC that deletes the `auth.users` row; cascades remove progress and memberships. Leaving a cohort deletes the membership row; the leader's aggregates simply drop by one. A leader deleting a cohort deletes memberships, not anyone's progress.

## 4. Onboarding via a club link

`napkin.app/#join=KELLEY-FIR-F26`:

1. Welcome screen with the club name pre-filled: "FIR members: warm up for first rounds. Ten minutes a day." One button.
2. Priorities picker (exists): interviews in N weeks / poker / general. Club links default to interviews.
3. Diagnostic: eight typed questions across the sets, no timer shown, sets the starting levels. Ends with "you are quickest at X, slowest at Y; starting there".
4. First session, ten questions, the normal flow.
5. Only now the sign-in prompt: "Save this to your club code? Enter your email." Joining the cohort happens on sign-in. Everything before this works without an account, so the diagnostic and first session never hit a sign-in wall. The privacy note is on this screen.
6. Settings shows the cohort with Leave, the board opt-in toggle, and the first-name field.

**First week for a club.**
- Day 0 (meeting): leader posts the link; everyone does the diagnostic in the room. Optional live club session, poker set, four minutes.
- Days 1-4: ten minutes a day, own sessions. Leader posts a one-line nudge on day 2 with the club's active count ("31 of 48 have warmed up this week").
- Day 5 (Friday): async club session on the banking set, due Sunday.
- Day 7: leader checks the dashboard; the member count returning 5+ days is the only number that matters.

## 5. Launch mechanics for the first club

**Message** (Slack, from Aydin, not from an account named Napkin):

> I built a ten-minute warm-up for the mental-math questions in first rounds (multiple to yield, EV to equity, pot odds for the teach-me-something answer). I use it daily for my own FIR interviews. Free, no ads, works on a phone. Link joins you to the FIR group so [president] can see how many of us are warming up each week; nobody sees anyone's scores. If a question is wrong, there's a report link on every answer and I'll fix it that night. [link]

Send it to the FIR president first and ask them to post it. Follow with 20 personal DMs to people from the open meetings: the council's "100 personal invites" rule, scaled to a freshman's address book.

**Measure in week one** (from the database; GitHub Pages has no analytics): cohort joins, first sessions completed, sign-ins, members returning 2+ days, club-session completions, wrong-answer reports, unprompted replies. Targets: 20 first sessions, 10 people with sessions on two separate days. Below ten returners, stop building club features.

**Tripwires from the council.** Godin: if Aydin's own streak drops under four days a week while building this, stop. Hormozi: if 30+ people return five or more days in the cycle and anyone asks to pay, switch on the $150 club license, which is this cohort page. Halbert: the test is who opens it twice, not who says it is cool.

## 6. Effort, in evenings, in order

| # | Piece | Evenings | Note |
|---|---|---|---|
| 1 | Schema, RLS, `cohort_summary` RPC with five-member floor, tests against a second test user | 1.5 | Do first; everything else depends on it |
| 2 | Join link, cohort in progress JSON, sign-in-after-first-session flow, privacy note | 1 | |
| 3 | Leader page: create cohort, seven numbers, hide-betting toggle | 1 | Screenshot target |
| 4 | Club session: seed storage, short-code link, tagged attempts, completion count | 1 | `makeRng` exists |
| 5 | Account delete RPC, Leave cohort | 0.5 | Ship before launch, not after |
| 6 | Diagnostic (eight questions, set starting levels) | 1 | Can ship without; levels start at 0 |
| 7 | Opt-in leaderboard | 1 | Last; only if the first club asks |

Seven evenings; four (pieces 1-3 and 5) before the first club link goes out. Spread over three weeks, never an interview week.

Comparables checked: Duolingo for Schools and Quizlet classes show per-student data to teachers (rejected for a peer club); Kahoot's student-paced challenge is the async club-session model; Anki shared decks share content only and no progress, which is the right analogy for the seeded club session ([Anki shared decks](https://anki.tenderapp.com/kb/collection-management/how-can-i-work-with-someone-else-to-create-a-deck)).
