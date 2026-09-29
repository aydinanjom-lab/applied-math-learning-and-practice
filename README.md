# Applied Math

Short, timed drills. Ten minutes a day. See `CLAUDE.md` for who this is for and why.

## How to run it (macOS)

Needs Python 3.11 or newer. Check with `python3 --version`. Nothing else to install.

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

    pip install pytest
    python3 -m pytest

## Exit criteria

- **Poker:** the FIR pot-odds answer plus one follow-up cold. Ten items in type mode at 90% or better, three
  sessions in a row, nothing starred.
- **Quick math:** ten items in under four minutes, type mode, 90% or better, three sessions in a row, nothing starred.

Then Stage 3 (betting math) from the spec in `docs/superpowers/specs/`.

## Your notes

`notes/` is yours. Write the explanations by hand there. The tool never writes to it. `explain` shows the
tool's version; if you can't reproduce it without looking, you don't own it yet.
