# Stage 4: the quant lab (proposal, not built)

Written 2026-10-13. Plan only, not approved.

## Thesis

The lab teaches what a price history's numbers say and how a backtest (testing a trading rule on past prices) misleads, on seeded synthetic prices inside Napkin, ending at a checklist he passes on paper. It produces nothing for the resume: agents build the app, so the only claimable backtest is one he later writes himself (the Python plan, `2026-09-28-applied-math-design.md` §8). **Timing: worth building, not now.** FIR interviews are under way, IB first rounds rarely ask about backtests, and the Probability and statistics set already covers Sharpe and volatility at interview depth. Build slice 1 (text-only drills) only; the rest waits for winter break. This keeps the spirit of the 2026-09-30 buildout's "does not become a drill set": the lab is the practice field, his own code the deliverable.

## Fit with the codebase

- **Placement.** Slice 1 is a new set, `risk` ("Returns and risk"), in Markets and quant, unlocking after `prob` is Solid. The lab is a card on Practice with routes `#/lab` and `#/lab/:id`; no sixth tab.
- **Modules.** `web/series.js` (pure math, seeded generator), `backtest.js`, `chart.js`, `lab.js`. Lab code loads by dynamic import on `#/lab`; all join the `sw.js` shell.
- **Drill contract unchanged.** Keys carry the prices (`max_drawdown_path:100:108:…`) so tests recompute answers independently; answers are positive with the sign in the words. Lab screens record only the checklist.
- **Performance** (computed in node; phones 3–5× slower): one 10-year daily backtest 1.6 ms; 4,800 backtests 434 ms. Sliders re-run live; the overfitting demo uses 20 seeds.

## Charts (dataviz skill applied)

- **Rendering.** Inline SVG, no library; works offline once cached.
- **Forms.** Lines for price and equity curves (value of $1 over time); a separate underwater chart (distance below the last peak), never a second y-axis; a dumbbell for in-sample vs out-of-sample Sharpe; stat tiles.
- **Color.** Emphasis form: strategy in `--accent`, buy-and-hold in `--muted`; no new colors. Validator: the pair separates (normal-vision ΔE 24.3 light, 15.4 dark; ≥3:1 contrast). The gray fails chroma by design (de-emphasis), and dark accent sits just over the lightness band (0.678 vs 0.67), so a legend plus direct end labels carry identity. The dumbbell's light end, `color-mix(in srgb, var(--accent) 45%, var(--surface))`, passes the ordinal check.
- **Phone.** About 326 × 180 px of plot plus the axis band; long series downsampled to a low/high pair per pixel so drawdowns survive. A crosshair tooltip and a "Show as table" toggle on every chart.

## Data decision: synthetic

Seeded geometric Brownian motion (each day the price moves by a random percentage: drift plus noise), two regimes:

- **Calm:** +7% a year, 12% volatility (how much returns swing).
- **Stressed:** −20% a year, 35% volatility, about 12% of days.

Why synthetic:

- **Licensing.** FRED's S&P 500 is copyrighted by S&P Dow Jones Indices; reproducing it needs their permission ([series notes](https://fred.stlouisfed.org/graph/?g=lim)). I found no redistribution terms for Kenneth French's library. EIA data is public domain if credited ([EIA reuse](https://www.eia.gov/about/copyrights_reuse.php)), but I believe its spot-price tables credit an outside vendor; confirm first.
- **Teaching.** Only data with no edge by construction shows overfitting cleanly.
- **Size.** Zero bytes; the seed is the dataset.

**Cost:** synthetic data bakes in the answer. Trend rules look good because regimes persist; mean reversion cannot work on a random walk. Every strategy screen says so, and a "mean-reverting" generator option shows each rule on data that suits it and data that doesn't.

**Optional later:** EIA weekly WTI (about 15 KB, a Houston tie-in); its negative April 2020 close breaks percentage returns, itself a lesson.

## Ranked components

Effort is in agent sessions: S = 1, M = 2–3, L = 4+.

**1. Returns and risk drills (slice 1).**
- Eight typed drills on short price paths: total return; compounding (+50% then −50% = −25%); gain needed to recover a loss; max drawdown (largest fall from a peak); CAGR (compound annual growth rate), exact beside the rule of 72; annualised volatility from four monthly returns; Sharpe ratio (excess return per unit of volatility); volatility drag (compound ≈ average − variance/2).
- **Why:** interview-useful now; everything rests on it.
- **Effort** S · **owner** 20 min reviewing wording · **risk:** numbers must stay hand-computable · **needs:** nothing.

**2. Price path explorer.**
- A synthetic year with its underwater chart. He says a drawdown and volatility guess aloud, then reveals the tiles. Controls: new seed, calm/stressed toggle.
- **Why:** pictures the drill numbers; builds `chart.js` once.
- **Effort** M · **owner** 15 min on his phone · **risk:** largest new code surface · **needs:** 1.

**3. Build a strategy (four lessons).**
- Buy-and-hold (the baseline); moving-average crossover (own it when the 20-day average is above the 100-day); momentum (own it when the past N-day return is positive); mean reversion (buy k% below the 20-day average, sell at it). Each: the rule in one sentence, a prediction, one slider, equity curve vs buy-and-hold, stats, and "what this cannot tell you". Signals see only prices up to yesterday, so look-ahead is impossible outside the demo.
- **Effort** M · **owner** 40 min · **risk:** could pass for a trading tool, so each chart says "illustration on synthetic prices" · **needs:** 2.

**4. Pitfall demos.**
- **(a) Look-ahead bias** (using information not yet available). A toggle lets the rule see today's close before trading today. Computed over 50 seeds:
  - "Price above its 20-day average" goes from Sharpe 0.23 to 3.38.
  - The crossover goes only from 0.28 to 0.35. The demo uses the first rule; the second shows the bias can hide.
- **(b) Overfitting** (tuning to past noise). Search 48 crossover pairs on five edgeless years, then run the winner on the next five. Computed over 100 seeds:
  - The best in-sample Sharpe averaged 0.31.
  - The same parameters scored −0.12 out of sample (data the search never saw).
- **(c) Transaction costs.** A 0–50 basis-point-per-trade slider (1 bp = 0.01%) showing the break-even cost.
- **Effort** M · **owner** 30 min · **risk:** one seed can contradict the lesson, so the cross-seed average shows beside it · **needs:** 3.

**5. Whiteboard checklist.**
- About 12 prompts in three groups: strategy logic, backtest method, pitfalls. He answers aloud or on paper, no notes, then reveals a model answer and marks himself.
- He passes when all prompts are clean on two separate days. Only dates are stored, in a new `lab` store field that sync merges and tests cover.
- Passing unlocks nothing. The last screen lists what a claimable project needs: his own code, data and explanation.
- **Effort** S · **owner** 2 × 20 min plus notes · **risk:** self-graded; the interviewer is the real test · **needs:** 4.

**6. One real series (optional).** Effort S · owner 10 min · needs a license check.

## Worked example (computed with node)

Prices: 100, 108, 112, 105, 98, 103, 115, 109, 96, 104.

Below the last peak (%): 0, 0, 0, −6.3, −12.5, −8.0, 0, −5.2, −16.5, −9.6.

- **Max drawdown is −16.5%** (115 to 96, or 19/115), not the earlier −12.5% (112 to 98).
- Recovering from 96 to 115 needs +19.8%.
- The nine returns add to 6.73% but compound to 4.00%.

## Slice 1 acceptance criteria

1. `GROUPS.risk` holds 8 drills, with a label, a `SPEED` target, a place in `AREAS.markets`, and `UNLOCK_AFTER.risk = "prob"`.
2. `web/series.js` exports `returns`, `compound`, `maxDrawdown`, `cagr`, `annualVol`, `sharpe` and `gbmPath(seed, n, opts)`. Each has a hand-computed test, including the series above (−16.52%, peak index 6, trough index 8).
3. `gbmPath` gives an identical array for the same seed and never calls `Math.random`.
4. For 300 items per drill (seed 11), each answer matches a separate naive computation in the test.
5. Every family has a `FAMILIES` entry and a lesson, and `familyFromKey` round-trips.
6. Prompts list prices as text, state the sign in words, and need at most one division per step. Tolerance: ±0.5 percentage points.
7. `series.js` is in the `sw.js` shell, and the cache version is bumped.
8. `npm test` passes, `style.css` and the store schema are untouched, and README counts are updated.

## What not to do

- **No resume bait.** No export, share card, "my strategy" naming or downloadable results. "Built a backtesting engine" would be false.
- **No real tickers, live prices or fetching:** licensing, offline, and it implies a tradable signal.
- **No "optimize" button** without the out-of-sample result beside it.
- **No dollar outcomes** ("would have made $X"), advice, or real money.
- **No lab drills in Today's queue by default.** Interview sets keep priority.
- **No sixth tab, chart library, or palette change.**
- **Don't start components 2–5** before the Stage 1–3 exit criteria are met; the brief says each stage works first.

## Open questions for Aydin

1. Build slice 1 now (one session), or hold everything until FIR interviews end?
2. Is your own Python backtest still the end goal, with the lab only preparing you for it?
3. Synthetic only, or should an agent confirm the WTI license for one real series?
