# Diagnostic test and level ladder

Design note, 2026-10-01. Covers the first-run diagnostic, a per-set level ladder, the periodic re-diagnostic, and the list of things to refuse. Everything below computes from the existing attempt log (`key, drill, family, correct, seconds, mode, ts`) plus two small new stores: level stamps and diagnostic history. Numbers are proposals, not measurements; the bank is parametrically generated and has no per-item difficulty data yet, which shapes the whole design.

## 1. First-run diagnostic

**Scope: priority sets only.** The user picks up to three sets on first run (default: Interview, Quick math, Banking). The bank has 76 drills across 9 sets; a diagnostic over all of them at one item per drill is 76 typed items, about 20 minutes. Not happening. Sets he did not pick stay "Unplaced" and get a 6-item mini-diagnostic the first time he opens them.

**Form: fixed, 8 items per set, 24 items total, typed only, no hints, no definitions shown.** One item per drill. Sets with more than 8 drills (Quick: 13, Banking: 20) use a fixed anchor list of 8 drills chosen by hand for coverage, e.g. Banking: equity_value, multiple_to_yield, after_tax_debt, wacc, lbo_return, accretion, interest_coverage, perpetuity. Sets with fewer than 8 drills (Betting 6, Energy 5) use every drill plus a second item from a different family where one exists. Item order interleaves sets (one Interview, one Quick, one Banking, repeat), which is both a fairer test and better practice ([Rohrer, interleaving](https://ies.ed.gov/use-work/awards/interleaved-mathematics-practice)).

**Time budget.** 24 items at a 15-second median (reading included; banking prompts are two sentences) is 6 minutes. Hard cap: 20 seconds per item, then the item is marked wrong-by-timeout and the next one loads. Worst case 24 x 20 = 8 minutes. The clock is visible per item, not as a total, so he is not racing the whole test.

**One stop rule per set.** If the first 4 items in a set are all wrong, the remaining 4 in that set are skipped and the set is placed at the bottom with every anchor family starred. That is the only adaptive element. Reason: a wrong-wrong-wrong-wrong set tells us where to start; four more wrong answers tell us nothing and cost a minute of a ten-minute student.

**Why fixed rather than adaptive.** A real adaptive test picks each next item from a calibrated bank and stops when the standard error of the estimate is small enough, with minimum and maximum item counts to survive early noise ([Linacre, CAT stopping rules](https://rasch.org/rmt/rmt202f.htm); [MetricGate](https://metricgate.com/docs/cat-stopping-rules)). We have no calibration: 76 drills with generated numbers and one user. An "easy/medium/hard" branch would be guessing which pot-odds item is hard. A fixed form is honest about what it is: one sample per drill. Revisit adaptive once the log has a few hundred typed attempts per set and drills can be ranked by observed miss rate.

**Placement from 8 items without pretending precision.** Per drill, one item gives three signals: wrong, right-slow (over the set's Fast threshold, section 2), right-fast. Per set:

| Diagnostic result | Placement |
|---|---|
| 0 to 3 right | Rung 1 (Started). Star every missed family. |
| 4 to 6 right | Rung 2 (Learning). Star missed families. |
| 7 to 8 right, fewer than 5 fast | Rung 3 (Mostly right). Star missed families. |
| 7 to 8 right, 5+ fast | Rung 3, with the "ready for a level check" prompt shown immediately. |

Nothing places above rung 3 from a diagnostic. Eight items cannot distinguish Fast from Cold, and saying so on screen ("this is a starting point, not a grade") is more credible than a precise-looking number. The screen shows "6 of 8" per set, never "75%", and the median seconds. Diagnostic attempts are logged with `mode: "diag"` so they count as typed proof in the ladder and are also recoverable as a history row.

## 2. Level ladder per set

The current five levels have two problems: `groupLevel` is the minimum across drills, so Banking (20 drills) sits at New until every drill has 10 typed attempts, which is 200+ attempts before anything moves; and nothing above Learning is reachable in the first fortnight. The ladder below has eight rungs, with the lower rungs earned by breadth and the upper rungs by proof.

Per-drill level stays as it is (last 20 typed attempts, accuracy and median seconds), with two changes: only attempts from the last 90 days count, and `diag` and `check` modes count as typed. Speed thresholds move to the set, because reading time differs: Quick 8s Fast / 5s Cold; Interview and Poker 12 / 8; Betting 15 / 10; Banking, Accounting, Moose, Novyx, Energy 20 / 12.

| Rung | Name | Criterion (typed attempts, last 90 days) |
|---|---|---|
| 0 | Unplaced | No typed attempts. |
| 1 | Started | At least one typed attempt in half the drills. |
| 2 | Learning | At least 5 typed attempts in every drill. |
| 3 | Mostly right | Set-wide accuracy 80%+ over the last 40 attempts, no drill under 60%. |
| 4 | Solid | Every drill at or above Solid (80% on its last 10+). Requires a passed level check. |
| 5 | Quick | Rung 4 and set-wide median seconds under the Fast threshold. Level check. |
| 6 | Fast | Every drill at Fast (90%, median under the Fast threshold). Level check. |
| 7 | Cold | Every drill at Cold (95%, under the Cold threshold), nothing starred in the set. Level check. |

The 80% floor at rung 3 follows Bloom's mastery criterion of 80 to 90% on a unit test before moving on ([mastery learning](https://en.wikipedia.org/wiki/Mastery_learning)); the 90 and 95% rungs are the two halves of that range with speed added, since the interview is timed.

**Re-test to level up.** Rungs 4 to 7 are not granted by the running stats alone. When the log says the criterion is met, the home screen offers "Level check: 10 typed questions". The check draws one item per drill, weighted to the drills with the lowest recent accuracy, filling from the rest at random; a set with more than 10 drills gets its weakest 10. Pass means the rung's accuracy and speed criteria hold on those 10 items (9 of 10 at rung 4 and 5, 10 of 10 at rung 6 and 7, because 95% of 10 rounds to 10). Pass stamps `{set, rung, ts}`. Fail stars the misses and locks the check for 24 hours. The check is retrieval practice, not just measurement: the test itself is the learning event ([Roediger and Karpicke 2006](https://psychology.ecu.edu/wp-content/pv-uploads/sites/216/2019/03/Roediger-Karpicke-2006.pdf); [Dunlosky et al. 2013](https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html) rate practice testing and spacing as the two high-utility techniques).

**Decay.** A level that never falls is a lie. 14 days without a typed attempt in the set marks the rung "stale" (a small label, no failure copy). At 28 days the set drops one rung; at 56, two; floor is rung 2. A passed level check restores it. The gaps are long on purpose: for retention over months the best review gap is weeks, and too-short gaps hurt more than too-long ones ([Cepeda et al. 2008](https://pubmed.ncbi.nlm.nih.gov/19076480/)). Slower performance now for better retention later is the desirable-difficulty trade ([Bjork and Bjork 2011](https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/04/EBjork_RBjork_2011.pdf)).

**What makes it motivating.** Rungs 1 to 3 are reachable in a week on any set. Rung 4 on Interview (6 drills) is one good evening. Banking takes longer by design, and the ladder says why: "5 of 20 drills under 5 attempts".

## 3. Periodic re-diagnostic

Every 28 days, or on request from the stats screen, the home screen offers "Check-up: 8 items per set you have started, about 6 minutes". Same form as the first run (anchors, interleaved, 20-second cap, `mode: "diag"`), across every set at rung 1 or above, capped at 4 sets per check-up with the stalest sets first. Results sit in a history table, one row per date: set, right of 8, median seconds, and the change from the previous row ("6 of 8, was 4"). A check-up cannot raise a rung above 3 and cannot by itself lower one; what it can do is refresh the stamp on a stale rung if the 8 items meet that rung's criteria, and star every miss. The point is spaced retrieval and an honest curve, not a grade.

## 4. What not to do

- **No points, XP, or volume badges.** They reward answering more, which means say-mode grinding. The ladder gives nothing for count.
- **No say-mode credit in placement or levels.** Judging your own answer while looking at the solution is the textbook illusion of competence ([Koriat and Bjork 2005](https://newiipdm.haifa.ac.il/wp-content/uploads/2015/05/2005-Koriat-Bjork-JEPLMC-KBA.pdf)).
- **No multiple choice.** Recognition is easier than recall, and the interview is recall.
- **No level-ups from a hot streak of three.** Ten-item checks and 90-day windows stop a lucky minute from moving a rung.
- **No percentiles or comparisons.** One user; a made-up norm is worse than none.
- **No 50-item placement test, and no faked adaptivity.** Over 8 minutes the test gets skipped; branching on uncalibrated "difficulty" is noise with a confident face.
- **No immediate retry counted as proof.** Missing and retrying ten seconds later is relearning, logged as practice, not as a check.
- **No level that only rises, and no "you are interview-ready" copy.** Decay is what makes rung 6 mean something in March; the readiness call is his to make and explain.

Trade-offs accepted: the fixed form over-tests drills he already knows and under-samples 20-drill sets; eight rungs add UI surface; decay will annoy him the first time it fires. Each is cheaper than a score he cannot defend.
