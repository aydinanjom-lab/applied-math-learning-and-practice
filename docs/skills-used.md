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

## Used for Phase 3 (2026-09-30)

| Skill | What it was used for |
|---|---|
| `test-driven-development` | Family engine (tags, forced families, family stars, migration, queue, sync replay), 19 new generators, lesson-to-drill coverage, run variants. 48 tests. |
| `run` (browser driving) | Miss screen (method, try-one, lesson link and back), lessons list and Try three, starred-by-family list, accounting run. |

## Used for the visual design research (2026-09-30)

| Skill | What it was used for |
|---|---|
| `deep-research` | Four parallel researchers (typography, buttons and interaction, logo and icon, screen patterns) plus a report writer; produced the plan above with sources and effort estimates. |

## Used for the visual design build, priority 1 (2026-09-30)

| Skill | What it was used for |
|---|---|
| `run` (browser driving) | Light and dark checks that Reveal and Yes/No share the same bar position, digits use a tabular font, the answer is 42px, dark mode has no shadows; caught a function I had accidentally cut. |

## Used for the advance plan (2026-10-01)

| Skill | What it was used for |
|---|---|
| `dispatching-parallel-agents` | Four brainstorms at once: priorities onboarding, diagnostic and levels, quant content, club shipping. Each with sources. |
| `brainstorming` | The synthesis: decisions, disagreements resolved, build order, refused list. |
| `test-driven-development` | Glossary notes: store and merge rules tested before the textareas were added. 50 tests. |

## Used for the priorities, diagnostic, and levels release (2026-10-01)

| Skill | What it was used for |
|---|---|
| `test-driven-development` | Priorities weighting and Today queue, eight-rung ladder with decay and checks, diagnostic builder and placement, store fields and merge rules: tests first. 67 tests. |
| `run` (browser driving) | Full first run: three screens, diagnostic with stop rule, placement screen, home with Today and More, Levels screen, Priorities edit, a seeded Solid level check pass. |

## Used for the quant and financial-math sets (2026-10-01)

| Skill | What it was used for |
|---|---|
| `test-driven-development` | 39 drills checked against independent formulas (UFCF, parity, Bayes with 1,000 people, the 161/36 dice answer), the to-learn store and merge rules, lesson coverage of every new family. 76 tests. |
| `run` (browser driving) | Home with the five sets and two locks, a typed Valuation session with "I don't know this", the Lessons card on home, the to-learn section, reading a lesson from it, Got it. |

## Used for the site structure (2026-10-01)

| Skill | What it was used for |
|---|---|
| Two web searches, not a research pass | Tab bar vs hamburger (NN/g findings as summarised by UX Collective, Onething, Uxcel) and the Duolingo tab skeleton. Enough to confirm a settled answer; no report written. |
| `test-driven-development` | Router: parse, params, unknown routes, tab mapping. 79 tests. |
| `run` (browser driving) | Every tab, set page, session from a set page, reload on a session, lesson route, back button, priorities save, unknown route, wide-screen rail. |

## Used for clubs (2026-10-01)

| Skill | What it was used for |
|---|---|
| `test-driven-development` | Club codes, deterministic shared sessions, summary wording with the five-member floor, held join. 84 tests. |
| `run` (browser driving, mocked backend) | Join link signed out, create club, leader page, new session, member join by link, run the shared session, tags on attempts, same first question on a second device, board opt-in. |

## Used for club question sets and the advanced poker set (2026-10-07)

| Skill | What it was used for |
|---|---|
| `test-driven-development` | Pack rules (known sets, order, cap, two-week lead, double weight), eight poker drills checked against second formulas, geometric sizing replayed street by street, rule coverage. 100 tests. |
| `systematic-debugging` | Monte Carlo equity check: the first run gave nonsense (88 vs AK at 8%); the cause was tiebreak lists of different lengths. Fixed and checked against known matchups before using any anchor. |
| `run` (browser driving, mocked backend) | Leader creates a poker club from the preset and edits it; member joins by link; Today leads with club sets, includes the normally locked advanced set, excludes locked Deal math; offline cache; set page names and lesson links. |

## Still to use

| Skill | When |
|---|---|
| `verification-before-completion` | Before claiming any task done: run `python -m pytest`, read the output. |
| `requesting-code-review` and `finishing-a-development-branch` | End of each stage: review, then merge or open a pull request. |
| `brainstorming` then `writing-plans` | Once per later stage (poker, betting, quant). Each stage gets its own spec and plan. |
| `dataviz` | Stage 4 only, for return and drawdown charts. |
