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

## Used for the web version (2026-09-29)

| Skill | What it was used for |
|---|---|
| `ui-ux-pro-max` | Its design-system search gave the layout pattern (single column, large type, one primary action) and the checklist (contrast, focus rings, reduced motion, 390px). Its font pick was rejected as wrong for the audience. |
| `test-driven-development` | Node tests for the ported drill math and progress rules, written before the port. 11 tests. |
| `run` (built-in browser driving) | Drove a full session in Chromium at phone width; caught a stray "null" on the result screen and a missing icon before shipping. |

## Used for the gamification and scope build (2026-09-29)

| Skill | What it was used for |
|---|---|
| `brainstorming` | The plan itself: fresh look, options, refused list, open questions, written before any code. |
| `test-driven-development` | 23 Node tests and 56 Python tests, written before the drill packs, game logic, and store changes. |
| `run` (browser driving) | Full run in Chromium at phone width with the clock set to a Sunday: interview run, a choice-style question, the weekly check, the unlock override. |

## Used for the palette revamp (2026-09-29)

| Skill | What it was used for |
|---|---|
| `ui-ux-pro-max` | Palette, style, and typography searches. Took the "one accent, calm neutrals, semantic green and red" pattern and the Lexend readability font; rejected the purple study palette as too loud. |
| Web research | Duolingo (flat bottom shadow on buttons, mid-gray body so green and red carry meaning), Brilliant (cool near-black dark canvas, never pure black, mono for numbers), Quizlet (single periwinkle accent on white). |
| `run` (browser driving) | Light and dark screenshots at phone width before shipping. |

## Used for the productization planning (2026-09-30)

| Skill | What it was used for |
|---|---|
| `marketing-council` | Simulated Dunford, Halbert, Hormozi, and Godin (dissenter) on whether to open the app up and charge; produced the disagreement map and the tripwires. |
| `pricing` | The money model kept on the shelf: one-time pack plus club license, no subscription. |
| `product-marketing` | Drafted `.agents/product-marketing.md` so later copy and launch work starts from one position. |
| Web research | Market scan: Zetamac, Rocketblocks, FlashQuant, Preflop+, Poker Drills. |

## Used for Phase 1 (2026-09-30)

| Skill | What it was used for |
|---|---|
| `test-driven-development` | Goal-picker default, feedback timing, and new store fields, tests first. 26 tests. |
| `run` (browser driving) | Verified welcome flow, focus management, About, feedback prompt, manifest, icons, service worker, betting note. Also caught the scroll-to-top bug fix. |

## Used for the question-bank expansion (2026-09-30)

| Skill | What it was used for |
|---|---|
| `test-driven-development` | 19 new generators (interview follow-ups, banking, accounting), each tested against an independent formula before it was written. 32 tests. |
| `run` (browser driving) | Drove a 20-item typed accounting session and a 20-item interview session to confirm the new sets render, including the three-way choice questions. |

## Used for Phase 2 (2026-09-30)

| Skill | What it was used for |
|---|---|
| `test-driven-development` | Merge rule (union of attempts, stars rebuilt by replay, fastest best, max sessions) and store snapshot/load, tests first. 37 tests. |
| `run` (browser driving) | Two-device simulation against a fake backend: magic link, first device pushes, wiped second device pulls streak and stars, sign-out keeps the local copy. |
| `brainstorming` | Phase 3 plan: three approaches to category stars, the better-miss screen, 18 lessons, open questions. |

## Still to use

| Skill | When |
|---|---|
| `verification-before-completion` | Before claiming any task done: run `python -m pytest`, read the output. |
| `requesting-code-review` and `finishing-a-development-branch` | End of each stage: review, then merge or open a pull request. |
| `brainstorming` then `writing-plans` | Once per later stage (poker, betting, quant). Each stage gets its own spec and plan. |
| `dataviz` | Stage 4 only, for return and drawdown charts. |
