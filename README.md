# Applied Math

Short, timed drills. Ten minutes a day. See `CLAUDE.md` for who this is for and why.

## Easiest: the web page

The same drills as a web page you open in any browser, phone included. No installs.

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

**One limit to know:** progress is saved inside the browser you use. Your laptop and your phone each keep their own
record. Practice on one device, or treat the other as scratch. Clearing the browser's site data wipes it.

## The terminal version (macOS)

Same drills, same star rules, same progress rules. Needs Python 3.11 or newer. Check with `python3 --version`. Nothing else to install.

1. Get the code once:

       git clone https://github.com/aydinanjom-lab/applied-math-learning-and-practice.git
       cd applied-math-learning-and-practice

2. Start a session. Either of these:

       python3 -m applied_math

   or double-click `drill.command` in Finder. The first time, macOS may block it: right-click, Open. If it still
   refuses, run `chmod +x drill.command` once in Terminal.

3. A three-question menu appears (what to drill, say or type, how many). Enter takes the defaults:
   poker, say-it-out-loud, ten items.

## In a session

- **Say mode** (default): read the prompt, say the answer out loud, press Enter. The answer and the working
  appear. Type `y` if you had it, `n` if not. Be honest; this is the whole point.
- **Type mode**: type the number. Percent signs, dollar signs, and commas are fine. Stricter, so use it for a
  weekly check.
- Each line shows ✓ correct or ✗ missed with your time. A miss stars the item. Starred items come back first
  next session and clear after two correct answers in a row.
- Ctrl-C stops early and still saves.

## Commands

    python3 -m applied_math                      # menu
    python3 -m applied_math drill poker          # poker, say mode, 10 items
    python3 -m applied_math drill interview      # pot odds and outs only (the FIR set)
    python3 -m applied_math drill quick --type   # mental math, typed answers
    python3 -m applied_math drill pot_odds -n 5  # one drill, five items
    python3 -m applied_math explain              # the poker index card
    python3 -m applied_math explain pot_odds     # one-screen explanation of one drill
    python3 -m applied_math stars                # what you still owe two clean reps on
    python3 -m applied_math stats                # accuracy and speed per drill
    python3 -m applied_math list                 # every drill with its definition

Progress lives in `data/progress.json` (not committed). Delete it to start over.

## Tests

    pip install pytest && python3 -m pytest     # terminal version, 55 tests
    npm test                                    # web version's drill math and star rules, 11 tests

The drill math exists twice, once for each version. Change one, change the other, and both test suites check it.

## Exit criteria

- **Poker:** the FIR pot-odds answer plus one follow-up cold. Ten items in type mode at 90% or better, three
  sessions in a row, nothing starred.
- **Quick math:** ten items in under four minutes, type mode, 90% or better, three sessions in a row, nothing starred.

Then Stage 3 (betting math) from the spec in `docs/superpowers/specs/`.

## Your notes

`notes/` is yours. Write the explanations by hand there. The tool never writes to it. `explain` shows the
tool's version; if you can't reproduce it without looking, you don't own it yet.
