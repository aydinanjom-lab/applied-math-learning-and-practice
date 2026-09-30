# Plan: Phase 3. Category stars, a better miss, mini lessons, and a bigger bank

Date: 2026-09-30. Approved the same day (try-one as a button, bet-size families split, lessons written by the tool) and BUILT: sections 2 to 5 as written, 19 new drills, 18 lessons, three interview runs.

## 1. What is being asked, in one line each

1. When you miss, star the *kind* of question, not the exact numbers, and bring that kind back with new numbers.
2. Make the moment after a miss teach something, not just show the answer.
3. Add one-minute lessons on the standard mental-math methods, and connect them to the drills.
4. Keep growing the bank, especially where interviews go.

## 2. Category stars

**The problem with today's rule.** Starring the exact item means you can clear "15% of 240" twice and still be weak at percentages. It also lets you memorise the answer instead of the method. Starring the whole drill is too coarse: "multiply shortcuts" mixes three different tricks.

**Proposal: a "family" per item.** Every generator tags its item with a family id, one level more specific than the drill and one level less specific than the numbers:

| Drill | Families |
|---|---|
| multiply_shortcuts | x11, squares ending in 5, x25 |
| back_of_envelope | multiple, EBITDA from margin, market cap, interest expense |
| growth_rate | percent change, rule of 72 |
| combos | pair, suited, offsuit, any, pair with blocker, two-rank with blocker |
| outs_equity | one card to come, two cards to come |
| pot_odds_bet | by bet size: third-pot, half-pot, two-thirds, pot, overbet |
| statement_direction | one family per event (14) |
| everything else | the drill itself is the family |

**Rules.**
- A miss stars the family. The star stores the family id and the last missed prompt as an example, not the numbers to replay.
- Starred families come first next session, with fresh numbers from the same family. The generator takes an optional `{ family }` argument to force the kind.
- Clears after two correct answers in a row on that family. A miss on any item in the family resets it.
- Levels stay per drill. Stars become per family. The starred list shows the family name and the last example.
- Migration: existing exact-item stars are mapped to their family on first load; nothing is lost.

**Three approaches considered.**
1. Family tag on every item, generators accept a forced family. Recommended. Small change per drill, one change in the queue builder, and the tests already enumerate kinds.
2. Star the drill and let the level system carry the detail. Rejected: too coarse for the reasons above.
3. Star the exact item but also add a "similar" item to the queue. Rejected: doubles queue size and keeps the memorisation problem.

**Cost.** One evening for the engine and migration, plus ten minutes per drill to tag families.

## 3. A better miss

What happens after ✗ today: the answer, the working, "starred". Proposed, in this order on the screen:

1. The mark and the answer, as now.
2. **The method, not just the arithmetic.** One line: "Method: 10% then scale" or "Method: bet / (pot + 2 x bet)". Every family gets a named method; that name is also the lesson's title.
3. **Try one like it now.** A button that puts a fresh item from the same family next in the queue, before moving on. This is the single highest-value change in the phase: immediate re-attempt after an error is what makes the method stick. Optional, not forced, because sometimes you are out of time.
4. **Read the one-minute method.** A link to the lesson for that family. Opens in place; "Back" returns to the same result screen.
5. "Starred" line as now, reworded to the family: "Starred: half-pot bets. Comes back with new numbers until you get two in a row."

Not doing: hints before the answer, multiple attempts on the same numbers, or a "close enough" band. All three soften the honesty of the score.

## 4. Mini lessons

**Shape.** One screen each, under a minute to read, same structure every time: the method in one sentence, three worked examples, when it works and when it does not, one trap, and a "Try three" button that runs three items from the lesson's family in type mode. Read state is saved so the lesson link changes from "Read" to "Read again".

**Sources.** Only methods that are standard and widely taught: the tricks in Arthur Benjamin's *Secrets of Mental Math*, the Trachtenberg multiplication rules, and the standard interview-prep heuristics (rule of 72, rule of 4 and 2, the 2x-in-5-years anchor). No invented shortcuts.

**The first lesson set (18), ordered by how often the drills need them.**

Arithmetic
1. Percent: start at 10%, then scale (and 1% for the awkward ones).
2. Percent flip: a% of b equals b% of a. 8% of 25 is 25% of 8.
3. Multiply by 11: split and add the middle.
4. Multiply by 5, 25, 50: halve then x10, quarter then x100, halve then x100.
5. Multiply by 15: add half, then x10.
6. Squares ending in 5.
7. Near-100 multiplication (97 x 96 style).
8. Halve-and-double (16 x 35 = 8 x 70).
9. Split the hard one (23 x 7 = 20 x 7 + 3 x 7).
10. Divide by 5, 25, 50: double then ÷10, x4 then ÷100, double then ÷100.
11. Divide by 4 and 8: halve twice, halve three times.
12. Fractions to decimals worth memorising: sevenths, ninths, elevenths, twelfths, sixteenths.
13. Rounding and adjusting: 49 x 6 = 300 - 6.
14. Working in millions and billions without losing zeros.

Finance and poker
15. Rule of 72, and the anchors for doubling and tripling money over years (2x/5y = 15%, 3x/5y = 25%).
16. Multiples and yields are the same fact upside down.
17. Pot odds three ways: percent, ratio, and "pot before the bet" (bet / (pot + 2 x bet)).
18. Rule of 4 and 2, with the correction above 8 outs.

**Where they live.** A "Lessons" entry on the home screen, and a link from every miss. Content is a data file (`web/lessons.js`), one object per lesson, so adding one is writing, not coding.

**Guardrail from the brief.** These are the tool's explanations. His own explanations stay in `notes/`. The lesson screen says so at the bottom, as the explain screen does today.

## 5. Bank expansion (the families the lessons need, plus interview depth)

**Quick math, new drills (each maps to a lesson above):** multiply by 5/15/50; near-100 products; halve-and-double; divide by 4/5/8/25; percent flip; reverse percent ("120 is 80% of what?"); percent chains ("up 20% then down 20%"); rounding-and-adjust products; unit juggling ($M x shares in M, revenue per day from a yearly figure).

**Poker, new drills:** count the outs from a hand description ("flush draw plus an open-ended straight draw: how many outs?"); pot odds as a ratio; turn-and-river combined odds for two cards; bet sizing to give a draw the wrong price ("how big a bet makes a flush draw a mistake to call?").

**Finance, new drills:** three-statement walk as a three-step item (net income, then cash, then balance sheet for one event, all three must be right); accretion with a cash-and-stock mix; break-even synergies; simple DCF with two years plus a terminal value; debt paydown over years; cap table basics (ownership after a raise).

**Interview run variants:** Finance run (three banking questions, 90 seconds) and Accounting run (a full three-statement walk on one event). The poker run stays as the default.

Roughly 30 new drills. Each one tested against an independent formula, as now.

## 6. Order and effort

| Step | What | Evenings |
|---|---|---|
| 1 | Family tags, family stars, migration, queue change | 1 |
| 2 | Better miss: method line, "try one like it", starred wording | 1 |
| 3 | Lessons data file with the 18 lessons, Lessons screen, links from misses | 2 (mostly writing) |
| 4 | Quick-math bank expansion tied to lessons | 1 |
| 5 | Poker and finance bank expansion, interview run variants | 2 |

Steps 1 and 2 are the ones you feel every session. Steps 3 to 5 can trail by a week without hurting anything.

## 7. Open questions for Aydin

1. **"Try one like it now": on by default after every miss, or only offered as a button?** Recommendation: a button. Forced retries make sessions drift past ten minutes.
2. **Family granularity for pot_odds_bet: by bet size (five families) or one family?** Recommendation: by bet size. Half-pot and overbets are different reflexes.
3. **Lessons written in my voice, or do you want to write two or three of them yourself in `notes/` first and have the tool link to yours?** Either works technically. Writing them yourself is more work and more yours.
