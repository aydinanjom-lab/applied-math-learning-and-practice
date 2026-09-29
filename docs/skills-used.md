# Skills used

Claude Code skills applied while producing this buildout plan, and the ones the plan calls for during the build.

## Used for the plan (2026-09-28)

| Skill | What it was used for |
|---|---|
| `using-superpowers` | Routing: decides which process skill applies before any work starts. Sent this task to brainstorming, then writing-plans. |
| `brainstorming` | Turned the brief in `CLAUDE.md` into a design: explored context, compared three approaches, and wrote `superpowers/specs/2026-09-28-applied-math-design.md`. Its question-and-approve loop was replaced by stated assumptions and an open-questions list, because this session ran unattended. |
| `writing-plans` | Wrote `superpowers/plans/2026-09-28-stage1-quick-math.md`: ten bite-sized tasks, each with the failing test, the code, the command to run, and the commit. |

## Used for the build (2026-09-28, same day)

| Skill | What it was used for |
|---|---|
| `executing-plans` | Ran the plans task by task in this session: engine, poker drills, CLI, quick-math drills. |
| `test-driven-development` | Every module: wrote the test file, ran it to see it fail, wrote the code, ran it green, committed. 41 tests. |

## Used for the usability pass (2026-09-29)

| Skill | What it was used for |
|---|---|
| `ui-ux-pro-max` | Checked for terminal-relevant rules. Two carried over: never signal by color alone (every mark has a symbol and a word), and every error says how to recover. The rest is web and mobile guidance, not applicable yet; revisit for the phone front end. |
| `test-driven-development` | Menu, colors, timer, star messages, explain command, named draws, clean pot ratios: each test-first. 55 tests. |

## Still to use

| Skill | When |
|---|---|
| `verification-before-completion` | Before claiming any task done: run `python -m pytest`, read the output. |
| `requesting-code-review` and `finishing-a-development-branch` | End of each stage: review, then merge or open a pull request. |
| `brainstorming` then `writing-plans` | Once per later stage (poker, betting, quant). Each stage gets its own spec and plan. |
| `dataviz` | Stage 4 only, for return and drawdown charts. |
