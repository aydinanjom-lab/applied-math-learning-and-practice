# Applied Math

Short, timed drills. Ten minutes a day. See `CLAUDE.md` for who this is for and why.

## Setup (once)

    python3 -m venv .venv && source .venv/bin/activate
    pip install -e ".[dev]"

## Daily

    python -m applied_math drill poker          # say the answer, press Enter, grade yourself
    python -m applied_math drill poker --type   # type the answer; use this for the weekly check
    python -m applied_math drill quick          # mental math (percentages, fractions, multiples, growth, banking numbers)
    python -m applied_math drill all            # both sets mixed
    python -m applied_math drill pot_odds -n 5  # one drill, five items
    python -m applied_math stars                # what you missed and still owe two clean reps on
    python -m applied_math stats                # accuracy and speed per drill
    python -m applied_math list                 # every drill with its one-line definition

Starred items come back first next session. A star clears after two correct answers in a row.
Progress lives in `data/progress.json` (not committed). Delete it to start over.

## Tests

    python -m pytest

## Exit criteria

- **Poker:** the FIR pot-odds answer plus one follow-up cold. Ten items in type mode at 90% or better, three sessions in a row, nothing starred.
- **Quick math:** ten items in under four minutes, type mode, 90% or better, three sessions in a row, nothing starred.

Then Stage 3 (betting math) from the spec in `docs/superpowers/specs/`.

## Your notes

`notes/` is yours. Write the explanations by hand there. The tool never writes to it.
