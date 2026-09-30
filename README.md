# Applied Math

Short, timed drills. Ten minutes a day. See `CLAUDE.md` for who this is for and why.

## Running it

It is a web page. Open it in any browser, phone included. No installs.

**Put it on Netlify (once, about two minutes):**

1. Go to app.netlify.com and sign in with GitHub.
2. Add new site, Import an existing project, pick this repository and this branch.
3. Netlify reads `netlify.toml` and knows the page lives in the `web` folder. Leave the build command empty. Deploy.
4. You get a link like `something.netlify.app`. Bookmark it. On your phone, use Add to Home Screen so it opens like an app.

Every time this repository changes, Netlify updates the page on its own.

**Try it on your Mac without Netlify:**

    cd applied-math-learning-and-practice/web
    python3 -m http.server 8000

then open http://localhost:8000 in a browser.

**What's on the page:** eight drill sets (interview, poker, quick math, banking interview numbers, sports betting math,
Mighty Moose numbers, Novyx numbers, Houston energy basics), an Interview run (the FIR question, three typed answers,
90 seconds, pass or fail), a Sunday check (ten typed questions, scored separately), a level per set from your typed
answers only (New, Learning, Solid, Fast, Cold), a daily streak with one free skip a week, and personal bests. Sports
betting math unlocks once poker is Solid on every drill, with an "unlock anyway" link. The betting set is math practice
only: odds are generated, and nothing is ever recorded as a bet.

**One limit to know:** progress is saved inside the browser you use. Your laptop and your phone each keep their own
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
