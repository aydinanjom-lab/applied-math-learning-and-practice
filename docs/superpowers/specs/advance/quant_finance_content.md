# Napkin: next wave of quant and financial-math drills

Plan, not code. Written Oct 1, 2026 against the 76 drills in `web/drills.js` (GROUPS: interview, poker, quick, banking, accounting, betting, moose, novyx, energy). The existing banking and accounting sets already cover EV/equity bridge, P/E and yields, WACC, CAPM, one-year discounting, the perpetuity formula, a two-year DCF, IRR from MOIC and years, debt paydown, accretion by P/E, synergies break-even, cap-table dilution, interest coverage, the depreciation question, and 14 up/down/no-change statement cases. Nothing below repeats those; several extend them.

Every drill keeps the Napkin contract: situation first, one numeric or multiple-choice answer, a stated method in the explanation, solvable in under 60 seconds. Tiers: 1 = first-round freshman, 2 = superday, 3 = junior superday or quant-adjacent. "Serves" uses IB1 (IB first round), IBS (IB superday), PE, QT (quant/trading). Drills marked **later** rest on something he cannot yet derive from first principles; build them but hide them behind an unlock, as `UNLOCK_AFTER` already does for betting.

## Set 1: Valuation pieces (first round)
Subtitle: "UFCF, the two terminal values, mid-year, comps, implied share price."

1. **ufcf** — "EBIT $200M, tax 25%, D&A $40M, capex $50M, working capital grows $10M. Unlevered free cash flow?" Method: EBIT(1-t) + D&A - capex - change in NWC = 150+40-50-10 = $130M. Tier 1. IB1. (Formula per ibinterviewquestions.com UFCF guide.)
2. **tv_exit_multiple** — "Year-5 EBITDA $100M, peers trade at 8x. Terminal value?" Method: EBITDA x multiple = $800M. Tier 1. IB1.
3. **tv_perpetuity_vs_exit** — "Year-5 FCF $60M, WACC 10%, growth 3%. Perpetuity TV? (Exit-multiple TV was $1,000M.) Which is higher?" Method: 60 x 1.03 / 0.07 = $883M; choice: exit higher. Tier 2. IB1/IBS. Teaches that the two methods should cross-check.
4. **implied_growth** — "Exit-multiple TV $800M, final FCF $50M, WACC 10%. What growth rate does the multiple imply?" Method: g = (TV x r - FCF) / (TV + FCF) = (80-50)/850 = 3.5%. Tier 2. IBS. Standard "sanity-check your TV" follow-up.
5. **mid_year_direction** — "You switch a DCF from end-of-year to mid-year discounting. Value: up, down, or no change?" Choice: up (cash arrives half a year sooner, exponents 0.5, 1.5...). Tier 1. IB1. Follow-up variant: "by roughly what percent at a 10% rate?" sqrt(1.10)-1 = 4.9%. Tier 2.
6. **comps_implied_ev** — "Peers trade at 10x EBITDA. Target EBITDA $150M, net debt $300M, 50M shares. Implied share price?" (1500-300)/50 = $24. Tier 1. IB1. The full comps chain in one line.
7. **multiple_translate** — "EV/Revenue 2x, EBITDA margin 25%. EV/EBITDA?" 2/0.25 = 8x. Tier 1. IB1.
8. **pe_from_ev_ebitda** — "EV/EBITDA 8x, EBITDA $100M, net debt $200M, net income $40M. P/E?" Equity 600/40 = 15x. Tier 2. IBS. Bridges the two multiple families.

## Set 2: Accounting walks (first round to superday)
Subtitle: "One event, three statements, one number at the end."

Each item names an event and asks for one number (cash change, net income change, or equity change) rather than the whole walk, so it stays a 60-second drill. Explanation gives the full walk. Events are the standard ones in WSO's "effect on all three statements" thread and Wall Street Prep's accounting-question list. Default tax rate 25%; the WSO classic uses 40%, so vary it.

9. **walk_depreciation_cash** — "$10 more depreciation, 40% tax. Ending cash change?" +$4 (NI -6, add back 10). Tier 1. IB1. Extends `dep_cash` by asking the balance-sheet close: PP&E -10, cash +4, retained earnings -6.
10. **walk_inventory_writedown** — "$20 inventory write-down, 25% tax. Cash change? Equity change?" Cash +5; equity -15. Tier 2. IB1/IBS.
11. **walk_sell_inventory** — "Sell $100 of goods costing $60, for cash, 25% tax. Net income? Cash?" NI = (100-60) x 0.75 = $30; cash = +100 received - 10 tax = +$90 (the 60 of inventory leaving is non-cash). Ask one of the two per item. Tier 2. IBS.
12. **walk_capex_cash** — "Buy $200 PP&E with cash, 10-year straight line. Year-one cash change? Year-one net income change (25% tax)?" Cash -200 (then +5 tax shield from $20 depreciation = -195); NI -15. Tier 2. IBS.
13. **walk_debt_raise** — "Raise $100 debt at 5%, 25% tax. Year-one cash change?" +100 - 5 + 1.25 = +$96.25. Tier 2. IBS.
14. **walk_buyback** — "Buy back $50 of stock. Equity change? Net income change?" -50; 0. Tier 1. IB1. Pair with "EPS direction?": up.

## Set 3: Deal math (PE and superday)
Subtitle: "Sources and uses, tranches, the sweep, IRR shortcuts, what moves returns."

The paper LBO is near-universal in PE interviews (Wall Street Prep, CFI, Leland). These drills are its pieces so the whole thing becomes assembly.

15. **sources_uses_equity** — "Buy at 10x on $100M EBITDA, 5x leverage, $30M fees. Sponsor equity check?" Uses 1030; debt 500; equity $530M. Tier 1. PE/IBS.
16. **leverage_turns** — "EBITDA $80M, lenders allow 4.5x senior and 1.5x sub. Total debt? Blended rate if senior 6% and sub 10%?" 480; (360x6+120x10)/480 = 7%. Tier 2. PE.
17. **cash_sweep_year** — "FCF after interest $60M, 100% sweep, opening debt $500M. Debt after year one?" 440. Tier 1. PE. Extends `debt_paydown` with the sweep vocabulary.
18. **moic_from_irr** — "Target 20% IRR over 5 years. MOIC needed?" 1.2^5 = 2.49x, say 2.5x. Tier 2. PE. Reverse of existing `lbo_return`; rules of thumb 2x/5y = 15%, 3x/5y = 25%.
19. **exit_multiple_breakeven** — "Entry 10x on $100M EBITDA. EBITDA grows to $130M. What exit multiple returns the same EV?" 1000/130 = 7.7x. Tier 2. PE. "Multiple compression" with a number.
20. **irr_sensitivity_direction** — "Hold period goes 5 to 7 years, same MOIC. IRR?" Down. Variants: more leverage same EV, higher exit multiple, dividend recap in year 2. Multiple choice. Tier 1. PE.
21. **value_creation_split** — "Equity in $400M, out $1,000M. EBITDA growth added $400M of EV, debt paydown $200M. How much came from multiple expansion?" 600-400-200 = 0. Tier 3. PE (returns attribution; common superday follow-up).

## Set 4: Rates and options (markets and S&T)
Subtitle: "Bonds the fast way, option payoffs, parity as a number, delta as shares."

22. **price_yield_direction** — "Rates rise 1%. A 10-year bond price: up or down? Which falls more, 2-year or 30-year?" Down; 30-year. Tier 1. IB1/QT.
23. **current_yield** — "6% coupon, price 120. Current yield?" 6/120 = 5%. Tier 1. IB1. Pair: "Is YTM above or below 5%?" Below (premium bond). Tier 2.
24. **duration_price_change** — "Modified duration 7, yields up 50bp. Price change?" -3.5%. Tier 2. IBS/QT. Method: -D x change in yield. **later** for the derivation (needs the derivative of the price formula; he has Calc AB so this can unlock in a month, but convexity stays later).
25. **call_payoff** — "Long a 50-strike call for $3. Stock ends at 58. Profit?" 8-3 = 5. Breakeven 53. Tier 1. QT/IBS.
26. **put_call_parity_number** — "Stock 100, strike 100, call 8, put 5, one year. Implied PV of the strike? Risk-free rate roughly?" C - P = S - PV(K), PV(K) = 97, rate about 3%. Tier 3. QT. Teach with the payoff-diagram proof (moontowermeta note), not the e^(-rT) form. **later** until he can draw the four payoff lines unprompted.
27. **delta_hedge_shares** — "Long 20 calls (100 shares each) with delta 0.4. Shares to sell to be flat?" 800. Tier 2. QT. **later** until delta is explained as "probability-ish slope," which he can get from the payoff diagram.

## Set 5: Probability, statistics, estimation (quant-adjacent)
Subtitle: "Dice, coins, Bayes with 100 people, standard error, sqrt-of-time, Fermi."

Sources: techinterview.org brainteaser posts, Optiver/Jane Street question banks, Crack's *Heard on the Street*, Zhou's *Practical Guide*. AP Stats covers expectation, geometric mean 1/p, z-scores, and standard error, so most of this is tier 1-2.

28. **dice_ev** — "Roll one die, paid its face in dollars. Fair price?" 3.5. Variant: two dice product, 12.25 (independence). Tier 1. QT.
29. **flips_to_first_heads** — "Fair coin, flip until heads. Expected flips?" 1/p = 2. Variant: die until a six, 6. Tier 1. QT. (HH-in-a-row = 6 is **later**: needs recursion.)
30. **make_a_market** — "Three dice, sum. Fair value? Pick a 2-wide market." 10.5; e.g. 9.5 at 11.5. Tier 2. QT.
31. **conditional_small** — "Two dice sum 8. Chance one shows a 6?" 2/5. Tier 2. QT. Enumeration on a napkin: (2,6)(3,5)(4,4)(5,3)(6,2).
32. **bayes_100** — "1 in 100 has the condition; test catches 90% of cases, false-positives 10% of healthy. You test positive. Chance you have it?" 0.9 / (0.9 + 9.9) = 8.3%. Tier 2. QT/IBS. Frame with 1,000 people on the napkin.
33. **mean_variance_quick** — "Returns 10%, -5%, 4%, -1%. Mean? Variance (population)?" 2%; 30.5 (%^2). Tier 2. QT.
34. **standard_error** — "Monthly return sd 4%, 36 months. Standard error of the mean?" 4/6 = 0.67%. Tier 2. QT. Then: "mean is 1%: how many standard errors?" 1.5, not significant.
35. **vol_sqrt_time** — "Daily vol 1%. Annual (252 days)?" about 16%. Tier 1. QT. Also monthly to annual: x sqrt(12) = 3.46.
36. **sharpe_quick** — "Return 12%, risk-free 4%, vol 16%. Sharpe?" 0.5. Tier 1. QT/PE. Variant: annualize a monthly Sharpe by sqrt(12). Tier 2.
37. **z_score** — "Mean 5%, sd 10%, observation -15%. Z? Roughly how rare?" -2; about 2.5% tail. Tier 1. QT.
38. **correlation_sign** — "Stock A up on days B is up, 70% of the time. Correlation: positive, negative, or zero?" Positive. Variant with portfolio: "two assets, correlation 1, vol 10% each, equal weight: portfolio vol?" 10%; at correlation 0: 7.1%. Tier 2. QT. The second variant is **later** until he can write out the two-asset variance formula.
39. **market_size_steps** — "US 330M people, 2.5 per household, 60% own a car, one car per driving household, replaced every 12 years. Cars sold a year?" 330/2.5 x 0.6 / 12 = 6.6M (real: ~15M, because multi-car households; the explanation says why). Tier 2. IBS/consulting. Numbers always given in the prompt so it stays a 60-second napkin item, not an essay.

## Order and gating
Set 1 and Set 2 unlock now (freshman first round, FIR interviews start in October). Set 3 unlocks when banking is Solid. Set 4 unlocks when Set 3 is Solid; `duration_price_change`, `put_call_parity_number` and `delta_hedge_shares` stay hidden until he passes a one-line "explain it" check. Set 5 runs in parallel from the start because it leans on AP Stats, with the HH variant of `flips_to_first_heads` and the portfolio-vol variant of `correlation_sign` hidden.

## What this student cannot yet explain from first principles (keep "later")
- Duration as a derivative and convexity (`duration_price_change` derivation).
- Put-call parity with continuous discounting, and delta as a partial derivative (`put_call_parity_number`, `delta_hedge_shares`); the payoff-diagram versions are fine now.
- Expected flips to two heads in a row (recursion).
- Two-asset portfolio variance with correlation (`correlation_sign` variant) until written out by hand.
- Anything Black-Scholes. Not proposed.

## Sources
- Paper LBO format and IRR/MOIC rules of thumb: [Wall Street Prep, paper LBO practice](https://www.wallstreetprep.com/knowledge/the-paper-lbo-practice-exercises-to-ace-the-private-equity-interview/), [CFI paper LBO tutorial](https://corporatefinanceinstitute.com/resources/career/paper-lbo), [Leland paper LBO guide](https://www.joinleland.com/library/a/a-comprehensive-guide-the-paper-lbo-pe-interview-question), [roadtooffer LBO questions](https://www.roadtooffer.com/blog/lbo-interview-questions).
- DCF pieces, UFCF, mid-year convention: [ibinterviewquestions.com UFCF](https://ibinterviewquestions.com/guides/valuation-investment-banking/unlevered-free-cash-flow-calculation-components), [ibinterviewquestions.com mid-year](https://ibinterviewquestions.com/guides/valuation-investment-banking/discounting-mechanics-present-value-mid-year-convention), [Wall Street Prep DCF questions](https://www.wallstreetprep.com/knowledge/dcf-model-interview-questions), [fe.training walk me through a DCF](https://www.fe.training/free-resources/financial-modeling/walk-me-through-a-dcf-5-steps/).
- Accounting walks: [WSO: effect on all three statements](https://www.wallstreetoasis.com/forums/interview-question-effect-on-all-three-financial-statements), [WSO: classic accounting adjustment questions](https://www.wallstreetoasis.com/forum/job-search/classic-ib-accounting-adjustment-interview-questions), [Wall Street Prep accounting questions](https://wallstreetprep.com/knowledge/accounting-interview-questions), [CFI accounting questions](https://corporatefinanceinstitute.com/accounting-interview-questions).
- Comps: [ibinterviewquestions.com comps](https://ibinterviewquestions.com/blog/how-to-build-comparable-company-analysis), [PrepLounge comps basics](https://www.preplounge.com/en/finance-interview-basics/comparable-company-analysis).
- Bonds: [ibinterviewquestions.com bond pricing, yield, duration](https://ibinterviewquestions.com/blog/bond-pricing-yield-duration-explained), [daytrading.com IB questions](https://www.daytrading.com/investment-banking-interview-questions).
- Options: [techinterview.org options for quant interviews](https://www.techinterview.org/post/3233474555/options-pricing-quant-interviews/), [techinterview.org Greeks](https://www.techinterview.org/post/3233477254/options-greeks-quant-trading-interview/), [Moontower put-call parity proof](https://notion.moontowermeta.com/a-common-interview-question-is-can-you-prove-put-call-paritythe-financial-hacking-proof-is-quick-visual-and-insightful).
- Probability and EV: [techinterview.org probability brainteasers](https://www.techinterview.org/post/3233474553/probability-brainteasers-quant-interviews/), [techinterview.org expected value](https://www.techinterview.org/post/3233474559/expected-value-fair-game-quant-interviews/), [Optiver interview guide](https://www.techinterview.org/companies/optiver-interview-guide/), [quantvault Jane Street questions](https://quantvault.org/jane-street-interview-questions.html), [Heard on the Street review](https://www.quantt.co.uk/resources/heard-on-the-street-review). Books: Crack, *Heard on the Street* (rev. 23rd ed.); Zhou, *A Practical Guide to Quantitative Finance Interviews*.
- Statistics: [quantvault statistics guide](https://quantvault.org/statistics-interview-guide.html), [wecreateproblems quant questions](https://www.wecreateproblems.com/interview-questions/quant-interview-questions).
- Market sizing: [IGotAnOffer market sizing](https://igotanoffer.com/blogs/mckinsey-case-interview-blog/market-sizing), [Management Consulted](https://managementconsulted.com/market-sizing/).
- Mergers & Inquisitions (IB and PE interview-question guides) and the BIWS 400-question guide are the standard references for Sets 1-3; mergersandinquisitions.com was blocked by this container's network proxy, so those pages were not re-read for this note. Canonical URLs: https://mergersandinquisitions.com/investment-banking-interview-questions/ and https://mergersandinquisitions.com/private-equity-interview-questions/ (unverified here).
