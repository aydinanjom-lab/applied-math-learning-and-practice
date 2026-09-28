# Poker Drills Implementation Plan (built 2026-09-28)

> Built first, on Aydin's call, because FIR interviews start in early October. This plan records the tasks as executed; the Stage 1 plan holds the engine tasks (1 to 3 and 7 to 9) that these drills ride on.

**Goal:** Five poker-math drills on the shared engine, each showing the exact number next to the shortcut.

**Files:** `applied_math/drills/poker.py`, `applied_math/drills/__init__.py`, `tests/test_drills_poker.py`

**Global constraint:** exact probabilities are counted from the deck (47 unseen cards on the flop, 46 on the turn), never looked up.

### Task P1: pot_odds
- Prompt: `Pot is $30 and it's $10 to call. Break-even equity (%)?`
- Answer: `call / (pot + call) * 100`, `abs_tol=0.6` so a whole-number answer counts.
- Explanation adds the odds form (`3 to 1`).
- Test: regex the prompt, recompute, and check the brief's example key `pot_odds:30:10` gives 25.

### Task P2: outs_equity
- Prompt: `9 outs, 2 cards to come. Equity (%)?`
- Answer: exact (`outs/46` for one card; `1 - C(47-outs,2)/C(47,2)` for two). Tolerance is `|rule - exact| + 0.6`, so the rule-of-4-and-2 answer and the exact one both count.
- Test: both answers accepted; `outs_equity:9:2` is 34.97.

### Task P3: ev_call
- Prompt: `Pot $60, $20 to call, 30% equity. EV of calling ($)?`
- Answer: `p * pot - (1 - p) * call`, `rel_tol=0.05, abs_tol=1.0`.

### Task P4: implied_odds
- Prompt: `Pot $30, $10 to call, 20% equity. Extra you must win later to break even ($)?`
- Generator only emits cases where equity is below break-even, so the answer is positive.
- Answer: `call / p - pot - call`.

### Task P5: combos
- Kinds: pair (6), suited (4), offsuit (12), any (16), pair with one blocker (3), two-rank hand with one blocker (12).
- Test: every kind appears in 600 seeded draws and matches the count.

### Task P6: registry
- `GROUPS["poker"]` lists the five; `DEFINITIONS` has a one-line plain-language definition for each.

Each task followed red, green, commit. Final suite: 41 tests passing.
