# Napkin: site structure plan

Written Oct 1, 2026, after the quant sets shipped and napkinprep.com went live. Plan, not code. Research was kept to two searches; the conclusions below are the settled ones in the field, not new findings.

## What the research says (short)

- **Visible navigation beats hidden.** Nielsen Norman Group's measurements: hiding destinations behind a hamburger menu roughly halves their use; a tab bar with three to five destinations is the right primary pattern for an app used daily. Hamburger or "More" is for overflow only.
- **Three to five tabs, each a noun.** Every daily-habit app that works (Duolingo, Brilliant, Anki's better redesigns) uses the same skeleton: one tab that says *do today's thing*, one for *browse what there is*, one for *how am I doing*, one for *me*. Lessons or review earn a tab only when they are a daily destination.
- **Home is a dashboard, not a menu.** The home tab leads with one primary action and a few status cards. Settings, lists, and reference live elsewhere.
- **Each page needs an address.** Deep links (a club join link, a lesson link, a set link) require real routes, and the browser back button must work. A single-page app without routes breaks back and cannot be shared.

Sources: [UX Collective, common mobile nav patterns](https://uxdesign.cc/some-common-mobile-nav-patterns-when-to-use-them-9b2bff9fcb0e), [Onething, hamburger vs tab bar](https://www.onething.design/post/hamburger-menu-vs-tab-bar), [Uxcel, tab bar](https://uxcel.com/glossary/tab-bar), [Lazyweb, Duolingo main tabs flow](https://lazyweb.com/flow/duolingo/main-tabs), [Banani, Duolingo reference](https://www.banani.co/references/apps/duolingo).

## Where Napkin is today

One screen does everything. The home page holds the start button, mode and count pickers, every set, interview runs, and eight footer links in one row (Starred, Levels, Lessons, Glossary, Priorities, Index card, About, Account). There are no routes: a reload always lands on home, the back button leaves the site, and nothing can be linked to. That blocks clubs, which need a join link.

## Proposed structure: four tabs and routes

Bottom tab bar, visible on every top-level page, hidden during a session (the action bar takes its place).

| Tab | Route | What is on it |
|---|---|---|
| **Today** | `#/` | One primary button: Start today's session (count and mode remembered, changeable inline). Status strip: streak, starred count, interview countdown. Cards only when relevant: to-learn topics, diagnostic due, Sunday check, interview date passed, club session waiting. Nothing else. |
| **Practice** | `#/practice` | Every set as a card with its rung badge, priority sets first, locked sets with the unlock rule. Mode and count pickers. Interview runs. Tapping a set goes to `#/set/:id` (set page: description, rung, level check button, personal best, start). |
| **Lessons** | `#/lessons` | To-learn section first, then all lessons. Each lesson at `#/lesson/:id` so it can be linked from a result screen or a club message. Glossary moves here as a second section (`#/glossary`), since both are reference. |
| **Progress** | `#/progress` | Levels per set with checks, Starred list, weekly history, bests, export. Replaces the Levels and Starred footer links. |
| **You** (gear icon, right end) | `#/you` | Account, Priorities, Club (join or lead), Index card, About, keyboard shortcuts, data export and delete. The overflow page; one tap deep. |

Sessions: `#/session` (not linkable; a reload returns to Today). Club join: `#/join/:code`. Club session: `#/s/:short`. Both must survive a reload and a sign-in round trip, so the code is held in local storage until the account exists.

## Rules

- Back button always works: every page is a hash route; `history` is the stack.
- No page has more than one primary button.
- The footer link row is removed; everything on it has a home in a tab.
- Phone first: tab bar 56 px, labels under icons, safe-area padding; on wide screens the tab bar becomes a left rail.
- No new colours. Icons are simple line glyphs in the current accent.

## Build order (after the two bug fixes already made)

1. **Router** (`web/router.js`): hash routes, a `go(route)` helper, back handling; tests for parse and match. Half an evening.
2. **Tab bar and page split.** Move existing screens into the five tabs without redesigning them. Home becomes Today. One evening.
3. **Set pages and lesson routes.** `#/set/:id`, `#/lesson/:id`; result screens link to them. Half an evening.
4. **Progress page.** Merge Levels and Starred; weekly history and export. Half an evening.
5. **Clubs** per `advance/club_shipping.md`: schema and policies, join link, You → Club, leader page, club session route. Two to three evenings. Needs the router first.

## What this does not change

The drill engine, store, sync, levels, diagnostic, and priorities stay as they are. This is a navigation change, not a logic change, and the test suite should pass untouched after steps 1 to 4.

## Status (2026-10-01): steps 1 to 4 built

`web/router.js` (hash routes, five tabs, tests), tab bar with a left rail above 900 px, Today / Practice / set page / Lessons (with glossary and index card as reference) / Progress (levels + starred + stats) / You (account, priorities, club placeholder, about). Sessions push `#/session` and hide the tab bar; a reload on a session returns to Today. The old footer link row is gone. Fixed on the way: the Glossary referenced an undefined `HOME_ORDER` and would have crashed. Step 5 (clubs) is next.
