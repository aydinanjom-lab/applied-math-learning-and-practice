# Napkin

Ten minutes a day on the numbers interviewers ask. Say it out loud, then check. See `CLAUDE.md` for who this started for and why.

Working name: Napkin (domain not yet secured; the name is one string in `web/app.js`, `web/index.html`, and `web/manifest.webmanifest` if it changes).

## Running it

It is a web page. Open it in any browser, phone included. No installs.

**Hosting:** the page deploys to GitHub Pages on every push (`.github/workflows/pages.yml`), at
`https://napkinprep.com/` (GitHub Pages with a custom domain; the old `aydinanjom-lab.github.io/applied-math-learning-and-practice/` address redirects there). Netlify also works (`netlify.toml` is still here) but its free
build allowance is shared across a team and can run out.

**Put it on Netlify instead (optional):**

1. Go to app.netlify.com and sign in with GitHub.
2. Add new site, Import an existing project, pick this repository and this branch.
3. Netlify reads `netlify.toml` and knows the page lives in the `web` folder. Leave the build command empty. Deploy.
4. You get a link like `something.netlify.app`. Bookmark it. On your phone, use Add to Home Screen so it opens like an app.

Every time this repository changes, Netlify updates the page on its own.

**Try it on your Mac without Netlify:**

    cd applied-math-learning-and-practice/web
    python3 -m http.server 8000

then open http://localhost:8000 in a browser.

**First visit:** three quick screens (what you are here for, an optional interview date, minutes per day), then an optional six-minute typed check that places you per set and stars what you miss. Your "Today" session draws from your priority sets, weighted to where you are weak and how close the interview is. Change priorities any time from the home screen. **Install:** on a phone, Add to Home Screen gives an icon and offline start.

**Layout:** five tabs. Today (one start button, status, cards only when something is due), Practice (every set with its level, a page per set, interview runs), Lessons (to-learn first, all lessons, glossary, index card), Progress (levels, starred, stats, export), You (account, priorities, club, about). Clubs: a leader creates a club and shares a join link; members run shared ten-question sessions from a four-letter code; the leader sees seven aggregate numbers and nothing per person, and nothing at all until five members have practised. A leader can give a club its own question sets, starting from presets such as Poker club or Finance recruiting; members get those sets first for their first two weeks. See `docs/setup-sync.md`. Every page has an address (`#/practice`, `#/set/banking`, `#/lesson/ufcf_build`) so the back button and shared links work.

**What's on the page:** fifteen drill sets (interview, poker, poker advanced, quick math, banking interview numbers, accounting interview numbers,
valuation pieces, accounting walks, deal math, rates and options, probability and statistics, sports betting math, Mighty Moose
numbers, Novyx numbers, Houston energy basics), 112 drills in all, plus 31 one-minute lessons on the standard methods, each with a
"Try three" button. Every question has an "I don't know this" link: it marks the question wrong, stars that kind of question, and
adds the topic with its lesson to a Lessons card on the home screen, where it stays until two clean typed reps or you tap Got it. an Interview run (the FIR question, three typed answers,
90 seconds, pass or fail), a Sunday check (ten typed questions, scored separately), three interview runs (poker, finance, accounting), an eight-rung level per set from typed
answers only (Unplaced to Cold; the top four rungs need a passed ten-question level check and decay if you stop practising), a daily streak with one free skip a week, and personal bests. Sports
betting math unlocks once poker is Solid, deal math once banking is Solid, and rates and options once deal math is Solid, each with an "unlock anyway" link. Three rates drills (duration, put-call parity, delta hedging) join their set only once it is Solid. The betting set is math practice
only: odds are generated, and nothing is ever recorded as a bet.

**Your data:** saved inside the browser you use, no trackers. Export from the Stats page. **Sync between devices** is optional and off until you connect a free Supabase project (about five minutes, see `docs/setup-sync.md`). Then Account on the home screen signs you in by an emailed link, and your laptop and phone share one record. Your laptop and your phone each keep their own
record. Practice on one device, or treat the other as scratch. Clearing the browser's site data wipes it.

## Tests

    npm test

Every drill generator is tested against an independent computation of its answer, and the star, level, streak,
and weekly-check rules are tested on their own. Needs Node 20 or newer.

## Exit criteria

- **Poker:** the FIR pot-odds answer plus one follow-up cold. Ten items in type mode at 90% or better, three
  sessions in a row, nothing starred.
- **Quick math:** ten items in under four minutes, type mode, 90% or better, three sessions in a row, nothing starred.

Then Stage 3 (betting math) from the spec in `docs/superpowers/specs/`.

## Your notes

`notes/` is yours. Write the explanations by hand there. The tool never writes to it. `explain` shows the
tool's version; if you can't reproduce it without looking, you don't own it yet.
