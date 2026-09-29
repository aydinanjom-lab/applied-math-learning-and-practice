# Plan: clearer wording, gamification, wider real-world scope

Date: 2026-09-29. Approved the same day (wording as written, Sunday checks, made-up business numbers) and built in the web version: sections 2, 3a, and packs A through E. Pack F is not built. The terminal version got the wording only (section 2); it is now the plain drill runner and the web page is the main product.

## 1. Fresh look at what exists

Two versions (terminal and web) of the same ten drills. The engine is sound: starred-first ordering, two-clean-reps rule, timer, one-time definitions. Three honest weaknesses, in order of importance:

1. **The questions read like a spec, not like a person asking.** "Pot is $120 and it's $30 to call. Break-even equity (%)?" is terse and uses two jargon words. A first-week user has to decode the question before doing the math, and the decoding time gets logged as thinking time.
2. **Nothing pulls him back tomorrow.** The brief says short sessions he will actually do beat long ones he skips. Right now the tool has no memory of yesterday and no reason to open it today.
3. **Say mode is on the honor system** and there is no structural check on it. Any scoring built on top of say mode is built on sand.

Everything below is shaped by those three.

## 2. Wording: proposed rewrites (approve, then it ships in both versions)

Rules for every prompt from now on:
- Written the way a person at the table or in the interview would ask it.
- Setup first, question last, in its own sentence.
- The unit and format of the answer is stated in the question, the same way every time: "Answer in %", "Answer in $", "Answer with a number".
- No jargon in the question. Jargon is allowed in the answer explanation, because that is where he learns it.

| Drill | Now | Proposed |
|---|---|---|
| pot_odds | Pot is $120 and it's $30 to call. Break-even equity (%)? | There is $120 in the pot. It costs you $30 to call. How often do you need to win for calling to break even? Answer in %. |
| outs_equity | 11 outs on the turn, 1 card to come. Equity (%)? | You have 11 outs. One card to come. What is your chance of hitting? Answer in %. |
| outs_equity (named) | Two overcards (6 outs) on the flop, 2 cards to come. Equity (%)? | You hold two overcards, 6 outs. Two cards to come. What is your chance of hitting by the river? Answer in %. |
| ev_call | Pot $80, $60 to call, 35% equity. EV of calling ($)? | There is $80 in the pot and it costs $60 to call. You win 35% of the time. On average, how much does calling make or lose? Answer in $, negative if it loses. |
| implied_odds | Pot $120, $30 to call, 15% equity. Extra you must win later to break even ($)? | There is $120 in the pot and it costs $30 to call. You win 15% of the time, so the pot alone does not justify a call. How much more would you need to win on later streets for the call to break even? Answer in $. |
| combos | How many combos of 9Q (suited or not)? | How many ways can someone hold Q9, suited or not? Answer with a number. (Also: higher rank first, Q9 not 9Q.) |
| combos (blocked) | You hold one 9. How many combos of 99 can an opponent have? | You hold a 9. How many ways can your opponent hold pocket nines? Answer with a number. |
| percent_of | What is 25% of 500? | Keep. Add "Answer with a number." |
| fraction_to_decimal | 12/16 as a decimal? | Drop fractions that reduce (12/16 is 3/4). Otherwise keep. |
| multiply_shortcuts | 85 x 85? | Keep. |
| growth_rate | From 500 to 550, what is the growth rate (%)? | Something grows from 500 to 550. What is the growth rate? Answer in %. |
| growth_rate (double) | At 9% a year, how many years to double? | Keep. Add "Answer in years." |
| back_of_envelope | EV $175M, EBITDA $25M. EV/EBITDA? | A company is worth $175M in total (enterprise value) and earns $25M of EBITDA. What is its EV/EBITDA multiple? Answer with a number. |
| back_of_envelope | $1,000M of debt at 7%. Annual interest expense ($M)? | A company has $1,000M of debt at 7% interest. What does it pay in interest each year? Answer in $M. |
| back_of_envelope | Share price $50, 500M shares. Market cap ($M)? | A stock trades at $50 and there are 500M shares. What is the market cap? Answer in $M. |

Cost: prompts get longer, so say-mode time goes up a second or two. Acceptable. Reading the situation is part of the skill.

## 3. Gamification: what to build and what to refuse

Design rule: **reward honesty and consistency, never volume.** Points for answering more questions would push him toward easy say-mode sessions and inflate his numbers. That is the opposite of the brief's ground rules.

### 3a. Build these

**Mastery level per drill (the core).** Five levels, computed from the last 20 attempts in type mode only:

| Level | Name | Rule |
|---|---|---|
| 0 | New | fewer than 10 typed attempts |
| 1 | Learning | 10+ attempts |
| 2 | Solid | 80% or better |
| 3 | Fast | 90% or better and median under 12 seconds |
| 4 | Cold | 95% or better, median under 8 seconds, nothing starred in that drill |

Say mode never moves a level. That is the structural check on the honor system: say mode is for practice, type mode is for proof. Levels show on the home screen as a small row per set, so he sees "pot odds: Fast, outs: Learning" before he picks.

**Daily streak.** A day counts if he finishes a session of at least 5 items, either mode. One free skip day per week so a single missed day does not wipe a month. Shown as a number on the home screen, nothing more.

**Weekly check.** Every seven days the home screen offers "Weekly check: 10 typed questions from everything you have started". Its score is kept in a separate history, one line per week. This is the honest curve. If the say-mode accuracy in stats is more than ten points above the weekly-check score, the stats screen says so in one sentence.

**Personal bests.** Fastest 10-item typed session at 90% or better, per set. One line on the summary screen when he beats it.

**Unlocks tied to the brief's stage rule.** A new pack becomes available when the pack before it reaches Solid on every drill. Poker unlocks betting math. Betting math unlocks the quant stage. He can override with one tap ("unlock anyway"), so it is a nudge, not a wall. This turns "each stage should work before the next starts" into something the tool enforces gently instead of a sentence in a brief.

**Interview run.** A separate button: the FIR question as it will actually happen. Pot odds, then the follow-up ("and with one card to come?"), then one outs question, all typed, 90 seconds total, pass or fail. No partial credit. This is the thing the first two weeks are for.

### 3b. Refuse these, and why

- **Points or XP.** They reward volume and make say-mode grinding feel productive. Cut.
- **Badges for milestones like "100 questions".** Same problem. Cut.
- **Leaderboards.** One user. Cut.
- **Streak penalties or guilt copy** ("you broke your streak!"). He runs two businesses and a full course load. A missed day is not a failure and the tool should not say it is. The streak just shows a number.
- **Animations, confetti, sounds.** Add nothing to learning, cost attention. Cut.

### 3c. What it needs under the hood

Everything computes from the attempt log that already exists. New stored fields: days with a completed session (for the streak), weekly-check history, personal bests, and an unlock override flag. Small changes to the progress file in both versions.

## 4. Wider real-world scope: new drill packs

Each pack is five to eight drills on the same engine. Listed with why it earns a place, and what it must not become.

**Pack A: Banking interview numbers (extend the existing back-of-envelope set).** The multiples he will be asked about in FIR and in summer 2027 recruiting.
- EV to equity value: subtract net debt.
- Multiple to yield: 10x EBITDA is a 10% yield. 20x earnings is 5%.
- After-tax cost of debt: 8% at a 25% tax rate is 6%.
- Paper LBO returns: 2x in 5 years is about 15% a year; 3x in 5 years about 25%. Rule of 72 and the two anchors get him there.
- Accretion or dilution direction: buyer at 20x earnings buys target at 12x with stock: accretive or dilutive?
- Interest coverage: EBITDA over interest.
Guardrail: numbers only. He writes the "why" in `notes/`.

**Pack B: Mighty Moose numbers.** His own business, with numbers close to his real ones, so he can talk about them in interviews without notes.
- Contribution margin from price, product cost, shipping, payment fee.
- Payback: CAC divided by monthly contribution per customer.
- Break-even units for a fixed cost.
- Discount trap: at 60% margin, a 20% discount needs 50% more units to make the same profit.
- Return on ad spend to profit: 3x ROAS at 40% margin is a 20% return on the spend, not 200%.
- Organic share: 62% of orders from search; what happens to blended CAC if paid doubles.
Guardrail: use rounded stand-in numbers, not the real KPI file. The real numbers stay in his head and his spreadsheet.

**Pack C: Novyx and service-business numbers.** Same logic, for the other business and for the med spa story.
- Rebooking rate to monthly revenue: 30% rebooking on 1,155 visits at an average ticket.
- Unrealized revenue: visits that did not rebook times average ticket.
- Rate card: hourly rate to job price with a margin target.
- Close rate times leads times average ticket: monthly revenue.
- Lifetime value of a customer from visit frequency and ticket.

**Pack D: Sports betting math.** Already promised as Stage 3, unchanged: odds formats, implied probability, removing the vig, expected value, Kelly. Math only, generated odds only, no bets ever recorded. Fits the gamification model well because every question has one right number.

**Pack E: Houston energy basics.** Because that is the target market and he will get asked. Kept small and honest to what a freshman can explain.
- Barrels a day times price times days: quarterly revenue.
- Netback: price minus costs per barrel.
- Decline: a well producing 1,000 barrels a day falling 30% a year; production next year.
- Reserves to production: years of reserves at current output.
- Break-even oil price from cost per barrel.
Guardrail: he should not put "energy sector knowledge" on a resume off the back of five drills. This pack is vocabulary and intuition for conversations, nothing more.

**Pack F: Everyday decision math (later, if wanted).** Expected value of a warranty, insurance deductible choices, effective annual rate of a "buy now pay later" offer, tip and split math. Cheap to build, low priority. Nice for the streak on tired days.

**Not adding:** anything he cannot explain from first principles. Option pricing, regression, DCF mechanics beyond one multiple. The quant stage in the original spec stays a separate, later project with its own gate.

## 5. Recommended order

| Step | What | Why first |
|---|---|---|
| 1 | Wording rewrites (section 2), both versions | Cheap, and every later feature logs times that depend on questions being readable. |
| 2 | Mastery levels and the weekly check | The honest backbone. Everything else scores against it. |
| 3 | Interview run | The next two weeks are about one question. |
| 4 | Streak, personal bests | Small, and only meaningful once 2 exists. |
| 5 | Pack A (banking numbers) | Highest payoff for recruiting. |
| 6 | Pack D (betting), then unlock gating | Stage 3 as promised; gating is only worth it once there is something to gate. |
| 7 | Packs B and C (his businesses) | Interview story material. Needs a short session with him to pick the stand-in numbers. |
| 8 | Pack E (energy) | Conversation fluency for Houston. |
| 9 | Pack F, if he wants it | Filler for tired days. |

Steps 1 to 4 are about two evenings of build. Each pack after that is one evening.

## 6. Questions for Aydin before building

1. Wording table in section 2: approve as is, or mark the ones you want different.
2. Weekly check on a fixed day (Sunday) or "seven days since the last one"? Fixed day is easier to remember. Rolling is kinder to a bad week.
3. Packs B and C use rounded stand-in numbers for your businesses. Give me five or six numbers you are comfortable having in the repository, or say "make them up" and I will pick plausible ones.
4. Anything in section 3b (the refused list) you disagree with? Say which and why, and I will reconsider.
