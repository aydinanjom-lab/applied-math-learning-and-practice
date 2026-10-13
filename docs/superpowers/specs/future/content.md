# Napkin future path: more questions, and a way to know they are right

Proposal for approval, Oct 13, 2026. First slice built Oct 13 (Q2, minimal Q1, `given`, M&A deeper as a draft); the rest is not built.

## Thesis

Napkin's 120 drills are each tested against an independent formula, but Napkin cannot learn from use which items mislead people, and nothing enforces the rule that the owner can explain a set before it ships. Build for his own recruiting first: **M&A, deeper**, then **Houston energy, deeper**, then **Credit and leveraged finance**. Each goes live only through a **ship gate**: hidden until he passes a say-it-aloud check on every kind of question in it. The first slice also adds a **contract lint** (a test that every drill follows the format rules) and saves **wrong typed answers**, so *item analysis* (statistics on which questions get missed and how) can start with the pilot group. Club-driven sets wait for a club's yes; sets he cannot vouch for wait for a reviewer.

## Evidence

Six searches; pages were blocked here, so this uses search summaries.

- Energy-group interviews ask about EV/EBITDAX (EBITDA before exploration expense), PV-10, $/flowing barrel (EV per daily barrel produced), the 6:1 gas conversion, and NAV (net asset value) [1–3]. Napkin's energy set stops at netback.
- M&A interviews ask for the pro forma EPS number, breakeven synergies, and goodwill [4, 5]. Napkin asks only "accretive or dilutive?"
- LevFin (lending to heavily indebted companies) interviews ask for debt capacity and the rate implied by leverage and coverage [6, 7].
- Trading screens: 60–80 questions in 8 minutes, including currency problems [8, 9]. Real estate PE: cap rate, DSCR, debt yield [10].
- Item analysis flags items strong performers miss, or that draw one common wrong answer: usually a wrong key (stored right answer) or ambiguous wording [11–13].
- In the repo: all 49 sample answers in `advance/club_banks.md` recompute correctly. But on the 21 "Answer in $M." drills, typing "315M" is graded wrong (`parseAnswer` reads M as ×1,000,000). Q2 would catch this.

## Ranked new sets

Effort in agent sessions (S = 1, M = 2, L = 3+); owner time covers lessons and the explain-it check.

| # | Set (effort / owner time) | What the user sees | Why | Risks, dependencies |
|---|---|---|---|---|
| 1 | **M&A, deeper** (S / 25 min) | Offer price and premium, goodwill, shares issued and ownership, accretion as a %, breakeven synergies | Most-asked after DCF [4, 5]; FIR covered deal financing; he can explain it now | Low if prompts say "ignore deferred taxes". Opens after Banking |
| 2 | **Houston energy, deeper** (M / 45 min) | BOE mix, gas $/Mcf to $/BOE, EBITDAX, $/flowing barrel, NAV per share, hedged price, differentials, midstream distribution coverage | His target market [1–3] | Medium: conventions trip people (PV-10 is pre-tax; 6:1 converts energy content, not value). Needs an industry reviewer |
| 3 | **Credit and LevFin** (S / 20 min) | Rate from leverage × coverage, debt capacity, net leverage, years to pay down debt, recovery waterfall | His PE goal [6, 7]; energy companies borrow against reserves | Low; the waterfall is simplified and says so. Opens after Deal math |

Later, each on a club's yes (specs in `club_banks.md`):

4. **Markets in your head**: S, 15 min. Prompts state the FX quote direction.
5. **Trading math**: S, 10 min. Betting logic in market words.
6. **Real estate**: S, 15 min. DSCR is net operating income (NOI) over debt payments.
7. **Case math**: S, 10 min. Overlaps Mighty Moose.
8. **Futures**: S. Basis sign varies; oil hedging goes in set 2 instead.
9. **Hedge fund exposure**: S. Fee conventions vary; needs a reviewer.
10. **Analytics**, **ML metrics**: M, S. Far from his recruiting.
11. **Exam P / FM**: L. Highest risk: he has not studied them, and one wrong annuity formula loses the club. Needs an actuarial reviewer.

On set 2: he cannot explain EBITDAX or PV-10 cold yet. That is why to build it, and why it stays a draft until he can and a reviewer has checked it. Never test prep sites' "typical ranges" (3–7x EBITDAX [2]) as answers; they move with oil prices.

## Ranked quality features

| # | Feature (effort / owner time) | How it works here |
|---|---|---|
| Q1 | **Ship gate with explain-it check** (S–M / 1 min per family) | A `web/content.js` manifest holds each set's `v`, `status`, `explained` date, and `reviewer`. Drafts sit in a `DRAFTS` registry, playable only at `#/draft/<set>`. The explain-it screen shows each family's example; he says the method aloud, reveals the `FAMILIES` line, taps "Said it" or "Not yet". It prints `mna: 7/7 explained <date>` to paste to the agent. A test fails if a live set lacks a date or a needed reviewer. |
| Q2 | **Contract lint** (S / 0) | `tests/web/contract.test.mjs` samples 200 items per drill, drafts included: the prompt *ends* with the answer line (today's test only checks it appears); the explanation has a method; prompts stay under 300 characters (longest today: 274); one key never maps to two prompts; $M drills accept "NM". |
| Q3 | **Wrong-answer capture and triage** (M / 10 min a week) | A miss saves `given` on the attempt. "Report it" writes to an insert-only `reports` table (email offline). Weekly, an agent rebuilds each flagged item from its key, recomputes it, and writes `docs/content/triage-<date>.md`: wrong key, tight tolerance, ambiguous, or user slip. Each fix adds a regression test. |
| Q4 | **Item analysis** (M / 10 min a week) | `web/itemstats.js` gives each family's miss rate, median seconds against `SPEED`, and top wrong `given`. Flags: *suspect key* (one wrong value draws 40%+ of misses, or Solid-level users miss 30%+); *unit slip* (off by ×100 or ×10⁶); *too slow*; *too easy*. Cross-user counts: an owner-only `content_stats()` with `cohort_summary`'s five-user floor, disclosed on the privacy page. Correlation measures [11] wait for 100+ attempts. |
| Q5 | **Versions and golden answers** (S–M / 0) | Attempts record `v`. `tests/web/golden.json` pins 10 seeded answers per drill; changing one without raising `v` fails. Misses under a wrong-key version stop counting. |
| Q6 | **Reviewer pack** (S / 5 min) | `scripts/review_pack.mjs <set>` prints two worked items per family with formula, source, and four checks: standard formula, convention stated, shortcut accepted, one reading only. |
| Q7 | **Difficulty tiers** (M / 0) | Tier 1–3 per family: tier 2 joins at rung 3, tier 3 at Solid. Build last, from Q4 data; before that, tiers are guesses. |

## Sample drills, top three sets

Every answer was computed in node two independent ways; every tolerance was checked with `web/core.js` `isCorrect` (accepts the shortcut, rejects common wrong answers).

**M&A, deeper**
1. "The target has 40M shares at $25. The buyer pays a 30% premium. Net assets are $600M on the books, $700M at fair value. Ignore deferred taxes. Goodwill created? Answer in $M." **600.** $32.50 × 40 = $1,300M; 1,300 − 700 = 600. *Goodwill*: price paid above the fair value of identifiable assets.
2. "The buyer's stock is $50, with 100M shares. It pays $1,000M in new shares. Target owners' share of the combined company? Answer in %." **16.7%.** 1,000 / 50 = 20M new shares; 20 / 120. Tolerance ±0.4.
3. "The buyer earns $200M on 100M shares. It buys a target earning $60M for $1,200M, paid in cash borrowed at 6%. Tax 25%, no synergies. EPS change? Answer in %." **+3.0%.** Net income 200 + 60 − 1,200 × 6% × 0.75 = 206; EPS $2.00 to $2.06. Check: the target's 5% earnings yield beats the 4.5% after-tax debt cost.

**Houston energy, deeper**
1. "A producer makes 12,000 barrels of oil and 48,000 Mcf (thousand cubic feet) of gas a day. Count 6 Mcf as one barrel of oil equivalent (BOE). Oil share of production? Answer in %." **60%.** 48,000 / 6 = 8,000 BOE; 12,000 / 20,000.
2. "A producer swapped 60% of its oil at $72. Oil averages $60. Average price per barrel, counting the hedge? Answer in $." **$67.20.** 0.6 × 72 + 0.4 × 60, or 60 + 0.6 × 12. A *swap* pays the producer the gap below the fixed price; the producer pays the gap above it.
3. "PV-10 of proved reserves is $2,400M, net debt $600M, 60M shares. Simple NAV (PV-10 minus net debt) per share? Answer in $." **$30.** (2,400 − 600) / 60. *PV-10*: reserves' cash flows before income tax, discounted at 10%. A $24 stock is 0.8x NAV.

**Credit and LevFin**
1. "Debt is 5x EBITDA, and EBITDA covers interest 5 times. Average interest rate? Answer in %." **4%.** With EBITDA 100, debt is 500 and interest 20. Shortcut: 1 / (5 × 5) [6].
2. "EBITDA is $100M and debt costs 8%. Lenders allow at most 4.5x leverage and need at least 3x coverage. Maximum borrowing? Answer in $M." **$417M.** Leverage allows 450; coverage caps interest at 33.3, so debt at 416.7. The smaller binds. Tolerance 1%; 450 rejected.
3. "A bankrupt company sells for $500M. It owes $300M senior secured and $400M unsecured, paid in order. Bondholder recovery? Answer in %." **50%.** That leaves 200 for 400 of bonds.

## First slice

Two agent sessions, about 40 owner minutes: Q2, minimal Q1, Q3's `given`, and **M&A, deeper** through the gate. Done when:

1. `npm test` passes; the contract test covers `DRILLS` and `DRAFTS`.
2. A test proves `mna` stays out of `GROUPS`, Today, the diagnostic, and club packs until its explained date is set; `#/draft/mna` plays it.
3. `mna` has 6+ drills, each with a `FAMILIES` entry, lesson, `DEFINITIONS` line, and independent-formula test; the three samples are pinned; `rules.test.mjs` passes.
4. Goodwill prompts say "ignore deferred taxes"; accretion prompts state the tax rate and financing.
5. A typed miss stores `given`, and the sync merge keeps it.
6. The owner scores 7 of 7 on the explain-it check before `mna` goes live.

## What not to do

- No Exam P/FM, ML metrics, or hedge-fund fee drills without a named reviewer.
- No AI grading of explanations; the check stays spoken and self-reported, like his FIR method.
- No set to a club before he passes its explain-it check.
- No tiers before there is item data.
- No per-person item stats, for anyone.
- No claiming the drills as his own writing. Claude built them; he can claim the system and what he can explain.

## Open questions

1. Is an energy-group interview coming first? If so, swap sets 1 and 2.
2. Upstream, midstream, or oilfield services: which matters most? It changes half of set 2.
3. Who could spend 15 minutes reviewing the energy set?

## Sources

[1] [ibinterviewquestions: energy technicals](https://ibinterviewquestions.com/guides/energy-investment-banking/energy-specific-technical-questions) [2] [E&P multiples](https://ibinterviewquestions.com/guides/energy-investment-banking/ep-valuation-multiples-ebitdax-production-reserves-acre) [3] [NAV, PV-10, EBITDAX](https://ibinterviewquestions.com/guides/valuation-investment-banking/oil-gas-valuation-reserve-based-nav-pv10-ebitdax) [4] [Wall Street Prep: M&A](https://www.wallstreetprep.com/knowledge/ma-interview-questions/) [5] [roadtooffer: merger model](https://www.roadtooffer.com/blog/merger-model-interview-questions) [6] [Restructuring Interviews: rate from ratios](https://restructuringinterviews.com/blogs/restructuring/interview-question-finding-an-interest-rate-from-the-leverage-and-coverage-ratio) [7] [Firsthand: LevFin interview](https://firsthand.co/blogs/in-the-black-vaults-finance-careers-blog/the-leveraged-finance-interview) [8] [techinterview.org: trading mental math](https://www.techinterview.org/post/3233474557/mental-math-trading-interviews/) [9] [tradinginterview.com](https://www.tradinginterview.com/mental-math-in-trading/) [10] [Leland: REPE](https://joinleland.com/library/a/real-estate-private-equity-interview) [11] [ASC: point-biserial](https://assess.com/the-point-biserial-item-discrimination/) [12] [HKU item analysis](https://bimhse.med.hku.hk/wp-content/uploads/2026/05/Item_Analysis_Workshop_PDF_BIMHSE.pdf) [13] [MetricGate](https://metricgate.com/docs/discrimination-index-item-analysis/)
