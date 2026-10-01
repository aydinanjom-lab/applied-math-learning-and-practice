// Five quant and financial-math sets: valuation pieces, accounting walks, deal math, rates and options, probability and statistics.
// Plan: docs/superpowers/specs/advance/quant_finance_content.md. Each drill: situation first, one number or one choice, method in the explanation.
import { item, fmt, r2, NUM, PCT, USD, USDM } from "./core.js";

const X = "Answer with a multiple, like 8.";
const pick = (rng, opts, fam) => (fam ? Number(fam.split(":")[1]) : rng.randint(0, opts - 1));
const choiceItem = (o) => item({ abs_tol: 0, ...o });
const r1 = (x) => Math.round(x * 10) / 10;

// ======================= Set 1: valuation pieces =======================
export function ufcf(rng) {
  const ebit = rng.choice([100, 150, 200, 240, 300, 400, 500]);
  const t = rng.choice([20, 25, 30]);
  const da = rng.choice([20, 30, 40, 50, 60]);
  const capex = rng.choice([30, 40, 50, 60, 80]);
  const nwc = rng.choice([-10, 5, 10, 15, 20]);
  const nopat = ebit * (1 - t / 100);
  const ans = nopat + da - capex - nwc;
  return item({ key: `ufcf:${ebit}:${t}:${da}:${capex}:${nwc}`, drill: "ufcf",
    prompt: `EBIT is $${ebit}M, tax rate ${t}%, D&A $${da}M, capex $${capex}M, and working capital ${nwc < 0 ? `shrinks by $${-nwc}M` : `grows by $${nwc}M`}. What is unlevered free cash flow? ${USDM}`, answer: ans,
    explanation: `EBIT x (1 - tax) = ${fmt(nopat)}. Add back D&A ${da}, subtract capex ${capex}, ${nwc < 0 ? `add the ${-nwc} released from working capital` : `subtract the ${nwc} tied up in working capital`}: ${fmt(ans)}. | Unlevered free cash flow is the cash the business throws off before anyone who funds it is paid. It is what a DCF discounts.`, rel_tol: 0.01, abs_tol: 0.5 });
}

export function tv_exit_multiple(rng) {
  const ebitda = rng.choice([50, 80, 100, 120, 150, 200, 250]);
  const mult = rng.choice([6, 7, 8, 9, 10, 12]);
  return item({ key: `tv_exit_multiple:${ebitda}:${mult}`, drill: "tv_exit_multiple",
    prompt: `Year-five EBITDA is $${ebitda}M and comparable companies trade at ${mult}x EBITDA. What is the terminal value by the exit-multiple method? ${USDM}`, answer: ebitda * mult,
    explanation: `${ebitda} x ${mult} = ${fmt(ebitda * mult)}. | Terminal value is what the business is worth at the end of the forecast. The exit-multiple method just applies today's multiple to the last year's EBITDA.`, rel_tol: 0.01, abs_tol: 0.5 });
}

export function tv_perpetuity_vs_exit(rng) {
  const fcf = rng.choice([40, 50, 60, 80, 100]);
  const r = rng.choice([8, 9, 10, 11, 12]);
  const g = rng.choice([2, 2.5, 3, 4]);
  const perp = (fcf * (1 + g / 100)) / ((r - g) / 100);
  const exit = rng.choice([0.7, 0.85, 1.15, 1.3]) * Math.round(perp / 50) * 50;
  const exitRound = Math.round(exit / 10) * 10;
  if (Math.abs(exitRound - perp) < 0.08 * perp) return tv_perpetuity_vs_exit(rng);
  const answer = exitRound > perp ? 0 : 1;
  return choiceItem({ key: `tv_perpetuity_vs_exit:${fcf}:${r}:${g}:${exitRound}`, drill: "tv_perpetuity_vs_exit",
    prompt: `Year-five free cash flow is $${fcf}M, the discount rate is ${r}%, and long-run growth is ${fmt(g)}%. The exit-multiple method gave a terminal value of $${fmt(exitRound)}M. Which method gives the higher terminal value?`,
    choices: ["Exit multiple", "Perpetuity growth"], answer,
    explanation: `Perpetuity: ${fcf} x ${1 + g / 100} / (${r}% - ${fmt(g)}%) = ${fmt(fcf * (1 + g / 100))} / ${(r - g) / 100} = $${fmt(Math.round(perp))}M, ${answer === 0 ? "below" : "above"} the $${fmt(exitRound)}M from the multiple. | The two methods should land near each other. When they do not, one of the assumptions (the multiple or the growth rate) is off, and an interviewer wants to hear that you would check.` });
}

export function implied_growth(rng) {
  const tv = rng.choice([500, 600, 800, 1000, 1200, 1500]);
  const r = rng.choice([8, 9, 10, 11, 12]);
  const fcf = rng.choice([40, 50, 60, 75, 80, 100]);
  const g = ((tv * r) / 100 - fcf) / (tv + fcf);
  if (g <= 0 || g > 0.07) return implied_growth(rng);
  const ans = g * 100;
  return item({ key: `implied_growth:${tv}:${fcf}:${r}`, drill: "implied_growth",
    prompt: `The exit multiple gives a terminal value of $${fmt(tv)}M. Final-year free cash flow is $${fcf}M and the discount rate is ${r}%. What long-run growth rate does that terminal value imply? ${PCT}`, answer: ans,
    explanation: `TV = FCF x (1 + g) / (r - g), so g = (TV x r - FCF) / (TV + FCF) = (${fmt((tv * r) / 100)} - ${fcf}) / ${fmt(tv + fcf)} = ${ans.toFixed(1)}%. | The sanity check on an exit multiple: if it implies growth above the economy's for ever, the multiple is too high.`, abs_tol: 0.25 });
}

const MID_YEAR = [
  ["You switch a DCF from end-of-year to mid-year discounting. The value of the business: up, down, or no change?", 0, "Up. Cash is assumed to arrive half a year sooner, so each flow is discounted by 0.5, 1.5, 2.5 years instead of 1, 2, 3."],
  ["A company's cash comes in evenly through the year. Which discounting convention values it more accurately: end-of-year or mid-year?", 1, "Mid-year. End-of-year pretends the whole year's cash lands on December 31, which understates value. Mid-year puts it at June 30, close to the average arrival date."],
  ["Under mid-year discounting at a 10% rate, by roughly what percent does each year's cash flow gain in value? Up by about 5%, up by about 10%, or no change?", 0, "Up by about 5%. Half a year less discounting at 10% is 1.10 to the power 0.5, which is 1.049. So about 4.9% more for every flow."],
];
export function mid_year_direction(rng, opts = {}) {
  const idx = pick(rng, MID_YEAR.length, opts.family);
  const [q, answer, why] = MID_YEAR[idx];
  const choices = idx === 1 ? ["End-of-year", "Mid-year"] : idx === 2 ? ["Up about 5%", "Up about 10%", "No change"] : ["Up", "Down", "No change"];
  return choiceItem({ key: `mid_year_direction:${idx}`, drill: "mid_year_direction", family: `mid_year_direction:${idx}`,
    prompt: q, choices, answer, explanation: `${why} | Mid-year convention: a company's cash comes in through the year, not on December 31, so the DCF discounts each year's flow by half a year less.` });
}

export function comps_implied_ev(rng) {
  const mult = rng.choice([6, 8, 10, 12]);
  const ebitda = rng.choice([50, 80, 100, 120, 150, 200]);
  const debt = rng.choice([100, 200, 300, 400]);
  const shares = rng.choice([20, 25, 40, 50, 80, 100]);
  const ev = mult * ebitda;
  if (ev <= debt) return comps_implied_ev(rng);
  const ans = (ev - debt) / shares;
  return item({ key: `comps_implied_ev:${mult}:${ebitda}:${debt}:${shares}`, drill: "comps_implied_ev",
    prompt: `Peers trade at ${mult}x EBITDA. The target has $${ebitda}M of EBITDA, $${debt}M of net debt, and ${shares}M shares. What share price do the comps imply? ${USD}`, answer: ans,
    explanation: `EV = ${mult} x ${ebitda} = ${fmt(ev)}. Equity = ${fmt(ev)} - ${debt} = ${fmt(ev - debt)}. Per share: ${fmt(ev - debt)} / ${shares} = $${fmt(r2(ans))}. | The whole comps chain in one line: multiple, to enterprise value, to equity value, to a price per share.`, rel_tol: 0.01, abs_tol: 0.05 });
}

export function multiple_translate(rng) {
  const evRev = rng.choice([1, 1.5, 2, 2.5, 3, 4]);
  const margin = rng.choice([10, 20, 25, 30, 40, 50]);
  const ans = evRev / (margin / 100);
  return item({ key: `multiple_translate:${evRev}:${margin}`, drill: "multiple_translate",
    prompt: `A company trades at ${fmt(evRev)}x revenue with a ${margin}% EBITDA margin. What is its EV/EBITDA multiple? ${X}`, answer: ans,
    explanation: `EV/EBITDA = (EV/Revenue) / margin = ${fmt(evRev)} / ${margin / 100} = ${fmt(r1(ans))}x. | A revenue multiple and an EBITDA multiple describe the same price; the margin is the exchange rate between them.`, rel_tol: 0.02, abs_tol: 0.1 });
}

export function pe_from_ev_ebitda(rng) {
  const mult = rng.choice([6, 8, 10, 12]);
  const ebitda = rng.choice([50, 100, 150, 200]);
  const debt = rng.choice([0, 100, 200, 300]);
  const ni = rng.choice([20, 25, 40, 50, 60, 80]);
  const eq = mult * ebitda - debt;
  if (eq <= 0 || eq / ni > 40 || eq / ni < 5) return pe_from_ev_ebitda(rng);
  const ans = eq / ni;
  return item({ key: `pe_from_ev_ebitda:${mult}:${ebitda}:${debt}:${ni}`, drill: "pe_from_ev_ebitda",
    prompt: `EV/EBITDA is ${mult}x on $${ebitda}M of EBITDA. Net debt is $${debt}M and net income is $${ni}M. What is the P/E? ${X}`, answer: ans,
    explanation: `EV = ${fmt(mult * ebitda)}. Equity = ${fmt(mult * ebitda)} - ${debt} = ${fmt(eq)}. P/E = ${fmt(eq)} / ${ni} = ${fmt(r1(ans))}x. | EV multiples price the whole business; P/E prices the equity only. Net debt is the bridge between them.`, rel_tol: 0.02, abs_tol: 0.1 });
}

// ======================= Set 2: accounting walks =======================
export function walk_depreciation_cash(rng) {
  const d = rng.choice([10, 20, 30, 40, 50, 100]);
  const t = rng.choice([20, 25, 30, 40]);
  const ans = (d * t) / 100;
  return item({ key: `walk_depreciation_cash:${d}:${t}`, drill: "walk_depreciation_cash",
    prompt: `Depreciation goes up by $${d}, tax rate ${t}%. By how much does ending cash change? ${USD}`, answer: ans,
    explanation: `Net income falls by ${d} x (1 - ${t / 100}) = ${fmt(d - ans)}. Depreciation is non-cash, so add the ${d} back: cash is up ${fmt(ans)}. Balance sheet: PP&E down ${d}, cash up ${fmt(ans)}, retained earnings down ${fmt(d - ans)}. | The whole point: more depreciation lowers profit but raises cash, by the tax it saves.`, abs_tol: 0.05 });
}

export function walk_inventory_writedown(rng, opts = {}) {
  const w = rng.choice([20, 40, 50, 80, 100]);
  const t = rng.choice([20, 25, 30, 40]);
  const kind = opts.family ? opts.family.split(":")[1] : rng.choice(["cash", "equity"]);
  const cash = (w * t) / 100, equity = -(w - cash);
  return item({ key: `walk_inventory_writedown:${kind}:${w}:${t}`, drill: "walk_inventory_writedown", family: `walk_inventory_writedown:${kind}`,
    prompt: `A company writes down $${w} of inventory, tax rate ${t}%. ${kind === "cash" ? "By how much does cash change?" : "By how much does shareholders' equity change?"} ${USD}`, answer: kind === "cash" ? cash : equity,
    explanation: `The write-down is a ${w} expense: net income falls ${fmt(w - cash)}. It is non-cash, so add ${w} back on the cash flow statement: cash up ${fmt(cash)} from the tax saving. Balance sheet: inventory down ${w}, cash up ${fmt(cash)}, equity down ${fmt(w - cash)}. | Any non-cash charge lowers equity by the after-tax amount and raises cash by the tax it saves.`, abs_tol: 0.05 });
}

export function walk_sell_inventory(rng, opts = {}) {
  const rev = rng.choice([100, 200, 500, 1000]);
  const cogs = rng.choice([0.4, 0.5, 0.6, 0.7]) * rev;
  const t = rng.choice([20, 25, 30, 40]);
  const kind = opts.family ? opts.family.split(":")[1] : rng.choice(["ni", "cash"]);
  const ni = (rev - cogs) * (1 - t / 100);
  const tax = (rev - cogs) * (t / 100);
  const cash = rev - tax;
  return item({ key: `walk_sell_inventory:${kind}:${rev}:${cogs}:${t}`, drill: "walk_sell_inventory", family: `walk_sell_inventory:${kind}`,
    prompt: `A company sells goods for $${fmt(rev)} cash that cost it $${fmt(cogs)} to make (already in inventory). Tax rate ${t}%. ${kind === "ni" ? "By how much does net income change?" : "By how much does cash change?"} ${USD}`, answer: kind === "ni" ? ni : cash,
    explanation: `Profit before tax = ${fmt(rev)} - ${fmt(cogs)} = ${fmt(rev - cogs)}; tax ${fmt(tax)}; net income up ${fmt(ni)}. Cash: ${fmt(rev)} received minus ${fmt(tax)} tax = up ${fmt(cash)}. The ${fmt(cogs)} of inventory leaving is non-cash, so it is added back. | Cash beats net income here by the cost of goods, because that cash went out when the inventory was bought.`, abs_tol: 0.05 });
}

export function walk_capex_cash(rng, opts = {}) {
  const capex = rng.choice([100, 200, 500, 1000]);
  const life = rng.choice([5, 10, 20]);
  const t = rng.choice([20, 25, 30, 40]);
  const kind = opts.family ? opts.family.split(":")[1] : rng.choice(["cash", "ni"]);
  const dep = capex / life;
  const shield = (dep * t) / 100;
  const cash = -capex + shield, ni = -(dep - shield);
  return item({ key: `walk_capex_cash:${kind}:${capex}:${life}:${t}`, drill: "walk_capex_cash", family: `walk_capex_cash:${kind}`,
    prompt: `A company buys $${fmt(capex)} of equipment with cash at the start of the year, depreciated straight-line over ${life} years. Tax rate ${t}%. ${kind === "cash" ? "By how much does cash change in year one, including the tax effect?" : "By how much does year-one net income change?"} ${USD}`, answer: kind === "cash" ? cash : ni,
    explanation: `Depreciation = ${fmt(capex)} / ${life} = ${fmt(dep)} a year. Net income down ${fmt(dep)} x (1 - ${t / 100}) = ${fmt(dep - shield)}. Cash: ${fmt(capex)} out, ${fmt(shield)} back as tax saved: ${fmt(cash)}. | Capex never touches the income statement; only its depreciation does, a year at a time.`, abs_tol: 0.05 });
}

export function walk_debt_raise(rng) {
  const debt = rng.choice([100, 200, 500, 1000]);
  const rate = rng.choice([4, 5, 6, 8, 10]);
  const t = rng.choice([20, 25, 30, 40]);
  const interest = (debt * rate) / 100;
  const ans = debt - interest * (1 - t / 100);
  return item({ key: `walk_debt_raise:${debt}:${rate}:${t}`, drill: "walk_debt_raise",
    prompt: `A company raises $${fmt(debt)} of debt at ${rate}% and holds the cash. Tax rate ${t}%. By how much is cash up at the end of year one? ${USD}`, answer: ans,
    explanation: `${fmt(debt)} comes in. Interest ${fmt(interest)} goes out, but it is tax-deductible, so it costs ${fmt(interest)} x (1 - ${t / 100}) = ${fmt(interest * (1 - t / 100))} after tax. Cash up ${fmt(ans)}. Net income down ${fmt(interest * (1 - t / 100))}; debt up ${fmt(debt)}. | The after-tax cost of debt in a single walk.`, abs_tol: 0.05 });
}

const BUYBACK = [
  ["A company buys back $50 of its own stock with cash. By how much does shareholders' equity change?", -50, "Treasury stock is a negative line in equity, so equity falls by 50. Cash falls by 50 too; the balance sheet still balances."],
  ["A company buys back $50 of stock with cash. By how much does net income change in the year?", 0, "Zero. A buyback is a financing event: cash out, equity down. Nothing hits the income statement (unless the cash was earning interest, which is a second-order effect)."],
  ["A company buys back $50 of stock with cash. By how much does total assets change?", -50, "Cash is an asset and 50 of it left, so assets fall by 50. Equity falls by 50 to match."],
];
export function walk_buyback(rng, opts = {}) {
  const idx = pick(rng, BUYBACK.length, opts.family);
  const [q, answer, why] = BUYBACK[idx];
  return item({ key: `walk_buyback:${idx}`, drill: "walk_buyback", family: `walk_buyback:${idx}`,
    prompt: `${q} ${USD}`, answer, explanation: `${why} | Buybacks cut share count, so earnings per share go up even though earnings do not.`, abs_tol: 0.5 });
}

// ======================= Set 3: deal math =======================
export function sources_uses_equity(rng) {
  const mult = rng.choice([7, 8, 9, 10, 11, 12]);
  const ebitda = rng.choice([50, 80, 100, 150, 200]);
  const lev = rng.choice([4, 4.5, 5, 5.5, 6]);
  const fees = rng.choice([10, 20, 30, 40, 50]);
  const ev = mult * ebitda, debt = lev * ebitda;
  const ans = ev + fees - debt;
  return item({ key: `sources_uses_equity:${mult}:${ebitda}:${lev}:${fees}`, drill: "sources_uses_equity",
    prompt: `A sponsor buys a company at ${mult}x on $${ebitda}M of EBITDA, with ${fmt(lev)}x of debt and $${fees}M of fees. How big is the equity check? ${USDM}`, answer: ans,
    explanation: `Uses: price ${fmt(ev)} + fees ${fees} = ${fmt(ev + fees)}. Sources: debt ${fmt(lev)} x ${ebitda} = ${fmt(debt)}; the rest is equity: ${fmt(ans)}. | Sources and uses is the first table in any buyout. Equity is always the plug.`, rel_tol: 0.01, abs_tol: 0.5 });
}

export function leverage_turns(rng, opts = {}) {
  const ebitda = rng.choice([50, 80, 100, 120, 200]);
  const sr = rng.choice([3, 3.5, 4, 4.5]);
  const sub = rng.choice([1, 1.5, 2]);
  const srRate = rng.choice([5, 6, 7]);
  const subRate = rng.choice([9, 10, 11, 12]);
  const kind = opts.family ? opts.family.split(":")[1] : rng.choice(["total", "rate"]);
  const senior = sr * ebitda, junior = sub * ebitda;
  const total = senior + junior;
  const rate = (senior * srRate + junior * subRate) / total;
  return item({ key: `leverage_turns:${kind}:${ebitda}:${sr}:${sub}:${srRate}:${subRate}`, drill: "leverage_turns", family: `leverage_turns:${kind}`,
    prompt: `EBITDA is $${ebitda}M. Lenders will provide ${fmt(sr)}x of senior debt at ${srRate}% and ${fmt(sub)}x of subordinated debt at ${subRate}%. ${kind === "total" ? `What is total debt? ${USDM}` : `What is the blended interest rate? ${PCT}`}`, answer: kind === "total" ? total : rate,
    explanation: `Senior ${fmt(sr)} x ${ebitda} = ${fmt(senior)}; sub ${fmt(sub)} x ${ebitda} = ${fmt(junior)}; total ${fmt(total)}. Blended rate = (${fmt(senior)} x ${srRate} + ${fmt(junior)} x ${subRate}) / ${fmt(total)} = ${rate.toFixed(2)}%. | "Turns" of leverage means multiples of EBITDA. Subordinated debt gets paid after senior, so it charges more.`, rel_tol: 0.01, abs_tol: kind === "total" ? 0.5 : 0.15 });
}

export function cash_sweep_year(rng) {
  const debt = rng.choice([300, 400, 500, 600, 800, 1000]);
  const fcf = rng.choice([40, 50, 60, 80, 100, 120]);
  const sweep = rng.choice([50, 75, 100]);
  const ans = debt - (fcf * sweep) / 100;
  return item({ key: `cash_sweep_year:${debt}:${fcf}:${sweep}`, drill: "cash_sweep_year",
    prompt: `Opening debt is $${fmt(debt)}M. Free cash flow after interest is $${fcf}M and ${sweep}% of it is swept to repay debt. What is debt after year one? ${USDM}`, answer: ans,
    explanation: `${fmt(debt)} - ${sweep}% x ${fcf} = ${fmt(debt)} - ${fmt((fcf * sweep) / 100)} = ${fmt(ans)}. | A cash sweep is a loan term that sends spare cash straight to the lender. It is how a buyout "pays down debt" and shifts value to the equity.`, rel_tol: 0.01, abs_tol: 0.5 });
}

export function moic_from_irr(rng) {
  const irr = rng.choice([10, 15, 20, 25, 30]);
  const yrs = rng.choice([3, 4, 5, 6, 7]);
  const ans = Math.pow(1 + irr / 100, yrs);
  return item({ key: `moic_from_irr:${irr}:${yrs}`, drill: "moic_from_irr",
    prompt: `A fund targets a ${irr}% IRR over ${yrs} years. What multiple of its money does it need back? ${X}`, answer: ans,
    explanation: `(1 + ${irr / 100})^${yrs} = ${ans.toFixed(2)}x. Anchors: 2x in 5 years is about 15%, 2.5x in 5 is about 20%, 3x in 5 is about 25%. | MOIC (multiple on invested capital) and IRR are two views of the same return: MOIC ignores time, IRR is all about it.`, rel_tol: 0.04, abs_tol: 0.1 });
}

export function exit_multiple_breakeven(rng) {
  const mult = rng.choice([8, 9, 10, 11, 12]);
  const e0 = rng.choice([80, 100, 120, 150, 200]);
  const e1 = Math.round(e0 * rng.choice([1.2, 1.25, 1.3, 1.4, 1.5, 1.6]));
  const ans = (mult * e0) / e1;
  return item({ key: `exit_multiple_breakeven:${mult}:${e0}:${e1}`, drill: "exit_multiple_breakeven",
    prompt: `A sponsor pays ${mult}x on $${e0}M of EBITDA. By exit, EBITDA has grown to $${e1}M. What exit multiple gets back the same enterprise value? ${X}`, answer: ans,
    explanation: `Entry EV = ${mult} x ${e0} = ${fmt(mult * e0)}. Same EV / ${e1} = ${ans.toFixed(1)}x. | This is "multiple compression": how far the multiple can fall before EBITDA growth stops helping. Any exit above ${ans.toFixed(1)}x and growth has added value.`, rel_tol: 0.02, abs_tol: 0.1 });
}

const IRR_CASES = [
  ["Same money in, same money out, but the hold period goes from five years to seven. IRR: up, down, or no change?", 1, "Down. The same multiple earned over more years is a lower yearly rate."],
  ["Same purchase price and exit, but the sponsor uses more debt and less equity. Equity IRR: up, down, or no change?", 0, "Up (if the deal works). Less equity in for the same equity out is a bigger multiple on the equity. More leverage also raises the risk, which an interviewer wants to hear."],
  ["Same entry, but the exit multiple is higher than expected. IRR: up, down, or no change?", 0, "Up. A higher exit multiple means a higher exit value for the same EBITDA."],
  ["The company pays the sponsor a dividend in year two, funded by new debt (a dividend recap). Everything else unchanged. IRR: up, down, or no change?", 0, "Up. Cash comes back earlier, and IRR rewards early cash. MOIC barely moves."],
  ["EBITDA grows as planned but the company burns the cash on capex instead of paying down debt. Equity IRR: up, down, or no change?", 1, "Down. Less debt paid down means more debt at exit, so less of the exit value goes to the equity."],
];
export function irr_sensitivity_direction(rng, opts = {}) {
  const idx = pick(rng, IRR_CASES.length, opts.family);
  const [q, answer, why] = IRR_CASES[idx];
  return choiceItem({ key: `irr_sensitivity_direction:${idx}`, drill: "irr_sensitivity_direction", family: `irr_sensitivity_direction:${idx}`,
    prompt: q, choices: ["Up", "Down", "No change"], answer, explanation: `${why} | Three things drive a buyout return: EBITDA growth, debt paydown, and the exit multiple. Timing of cash decides how the IRR reads them.` });
}

export function value_creation_split(rng) {
  const eqIn = rng.choice([200, 300, 400, 500]);
  const growth = rng.choice([100, 200, 300, 400]);
  const paydown = rng.choice([100, 150, 200, 250]);
  const multiple = rng.choice([-100, 0, 50, 100, 200]);
  const eqOut = eqIn + growth + paydown + multiple;
  return item({ key: `value_creation_split:${eqIn}:${eqOut}:${growth}:${paydown}`, drill: "value_creation_split",
    prompt: `Equity went in at $${eqIn}M and came out at $${fmt(eqOut)}M. EBITDA growth added $${growth}M of value and debt paydown added $${paydown}M. How much came from multiple expansion? ${USDM}`, answer: multiple,
    explanation: `Total gain = ${fmt(eqOut)} - ${eqIn} = ${fmt(eqOut - eqIn)}. Minus growth ${growth} and paydown ${paydown} leaves ${fmt(multiple)} from the multiple. | Returns attribution. A negative number means the sponsor sold at a lower multiple than it paid and the operating gains carried the deal.`, abs_tol: 0.5 });
}

// ======================= Set 4: rates and options =======================
const PY_CASES = [
  ["Interest rates rise by 1%. The price of an existing 10-year bond: up, down, or no change?", 1, "Down. New bonds pay more, so the old bond's fixed coupon is worth less; its price falls until its yield matches."],
  ["Rates rise. Which bond price falls more: a 2-year or a 30-year with the same coupon?", 1, "The 30-year. More years of below-market coupons to discount, so more sensitivity. Longer maturity means higher duration."],
  ["Rates fall by 1%. A bond trading at par (100): up, down, or no change?", 0, "Up. Its coupon is now above the market rate, so buyers pay a premium for it."],
  ["Two bonds, same maturity. One pays a 2% coupon, the other 8%. Rates rise. Which price falls more in percent?", 0, "The 2% coupon bond. More of its value sits in the far-off principal payment, so it has the higher duration."],
];
export function price_yield_direction(rng, opts = {}) {
  const idx = pick(rng, PY_CASES.length, opts.family);
  const [q, answer, why] = PY_CASES[idx];
  const choices = idx === 1 ? ["2-year", "30-year"] : idx === 3 ? ["2% coupon", "8% coupon"] : ["Up", "Down", "No change"];
  return choiceItem({ key: `price_yield_direction:${idx}`, drill: "price_yield_direction", family: `price_yield_direction:${idx}`,
    prompt: q, choices, answer, explanation: `${why} | Price and yield move opposite ways, and the longer the cash is out there, the bigger the move.` });
}

export function current_yield(rng, opts = {}) {
  const coupon = rng.choice([3, 4, 5, 6, 7, 8]);
  const price = rng.choice([80, 90, 95, 105, 110, 120, 125]);
  const kind = opts.family ? opts.family.split(":")[1] : rng.choice(["yield", "ytm"]);
  const cy = (coupon / price) * 100;
  if (kind === "yield") return item({ key: `current_yield:yield:${coupon}:${price}`, drill: "current_yield", family: "current_yield:yield",
    prompt: `A bond pays a ${coupon}% coupon and trades at ${price}. What is its current yield? ${PCT}`, answer: cy,
    explanation: `${coupon} / ${price} = ${cy.toFixed(2)}%. | Current yield is just coupon over price. It ignores the pull back to 100 at maturity, which the yield to maturity includes.`, abs_tol: 0.1 });
  return choiceItem({ key: `current_yield:ytm:${coupon}:${price}`, drill: "current_yield", family: "current_yield:ytm",
    prompt: `A bond pays a ${coupon}% coupon and trades at ${price}, so its current yield is ${cy.toFixed(1)}%. Is the yield to maturity above or below that?`, choices: ["Above", "Below"], answer: price < 100 ? 0 : 1,
    explanation: `The bond is at ${price} and pays back 100 at maturity: ${price < 100 ? "a gain on top of the coupons, so YTM is above the current yield" : "a loss on top of the coupons, so YTM is below the current yield"}. | Discount bond: YTM above current yield above coupon. Premium bond: the reverse.` });
}

export function duration_price_change(rng) {
  const dur = rng.choice([2, 3, 5, 7, 8, 10, 15]);
  const bp = rng.choice([-100, -50, -25, 25, 50, 100]);
  const ans = (-dur * bp) / 100;
  return item({ key: `duration_price_change:${dur}:${bp}`, drill: "duration_price_change",
    prompt: `A bond has a modified duration of ${dur}. Yields ${bp > 0 ? "rise" : "fall"} by ${Math.abs(bp)} basis points. Roughly how much does its price change? ${PCT}`, answer: ans,
    explanation: `Price change is about minus duration times the yield change: -${dur} x ${bp / 100}% = ${fmt(ans)}%. | Duration is the bond's price sensitivity: a duration of ${dur} means about ${dur}% of price for every 1% of yield. Basis point: a hundredth of a percent.`, abs_tol: 0.1 });
}

export function call_payoff(rng, opts = {}) {
  const k = rng.choice([40, 50, 60, 80, 100]);
  const prem = rng.choice([2, 3, 4, 5, 6, 8]);
  const kind = opts.family ? opts.family.split(":")[1] : rng.choice(["call", "put", "breakeven"]);
  if (kind === "breakeven") return item({ key: `call_payoff:breakeven:${k}:${prem}`, drill: "call_payoff", family: "call_payoff:breakeven",
    prompt: `You buy a ${k}-strike call for $${prem}. What stock price at expiry do you need to break even? ${USD}`, answer: k + prem,
    explanation: `Strike plus premium: ${k} + ${prem} = ${k + prem}. Above that you profit, below it you lose some or all of the $${prem}. | A call is the right to buy at the strike. It is worth max(stock - strike, 0) at expiry, and you paid for it.`, abs_tol: 0.05 });
  const s = k + rng.choice([-15, -10, -5, 0, 2, 5, 8, 12, 20]);
  if (kind === "call") { const ans = Math.max(s - k, 0) - prem; return item({ key: `call_payoff:call:${k}:${prem}:${s}`, drill: "call_payoff", family: "call_payoff:call",
    prompt: `You buy a ${k}-strike call for $${prem}. The stock ends at ${s}. What is your profit or loss? ${USD}`, answer: ans,
    explanation: `Payoff max(${s} - ${k}, 0) = ${Math.max(s - k, 0)}, minus the $${prem} paid: ${fmt(ans)}. | A long call loses at most the premium and wins without limit above the strike.`, abs_tol: 0.05 }); }
  const ans = Math.max(k - s, 0) - prem;
  return item({ key: `call_payoff:put:${k}:${prem}:${s}`, drill: "call_payoff", family: "call_payoff:put",
    prompt: `You buy a ${k}-strike put for $${prem}. The stock ends at ${s}. What is your profit or loss? ${USD}`, answer: ans,
    explanation: `Payoff max(${k} - ${s}, 0) = ${Math.max(k - s, 0)}, minus the $${prem} paid: ${fmt(ans)}. | A put is the right to sell at the strike. It pays when the stock falls below it.`, abs_tol: 0.05 });
}

export function put_call_parity_number(rng, opts = {}) {
  const s = rng.choice([50, 80, 100, 120]);
  const k = s;
  const rate = rng.choice([2, 3, 4, 5]);
  const pvk = r2(k / (1 + rate / 100));
  const put = rng.choice([3, 4, 5, 6, 8]);
  const call = r2(put + s - pvk);
  const kind = opts.family ? opts.family.split(":")[1] : rng.choice(["pvk", "rate"]);
  return item({ key: `put_call_parity_number:${kind}:${s}:${rate}:${put}`, drill: "put_call_parity_number", family: `put_call_parity_number:${kind}`,
    prompt: `Stock ${s}, strike ${k}, one year to expiry. The call costs $${fmt(call)} and the put $${put}. ${kind === "pvk" ? `What is the present value of the strike? ${USD}` : `Roughly what one-year interest rate does that imply? ${PCT}`}`, answer: kind === "pvk" ? pvk : rate,
    explanation: `Put-call parity: call - put = stock - PV(strike). So PV(strike) = ${s} - (${fmt(call)} - ${put}) = ${fmt(pvk)}. Rate: ${k} / ${fmt(pvk)} - 1 = about ${rate}%. | Parity holds because long call + short put has exactly the payoff of owning the stock and owing the strike. Draw the four lines and it is obvious.`, abs_tol: kind === "pvk" ? 0.1 : 0.4 });
}

export function delta_hedge_shares(rng) {
  const n = rng.choice([5, 10, 20, 25, 40, 50]);
  const delta = rng.choice([0.2, 0.3, 0.4, 0.5, 0.6, 0.7]);
  const ans = n * 100 * delta;
  return item({ key: `delta_hedge_shares:${n}:${delta}`, drill: "delta_hedge_shares",
    prompt: `You are long ${n} call contracts (100 shares each) with a delta of ${delta}. How many shares do you sell to be flat to small moves? ${NUM}`, answer: ans,
    explanation: `${n} x 100 x ${delta} = ${fmt(ans)} shares. | Delta is how much the option moves per $1 move in the stock, and roughly the chance it finishes in the money. ${n} contracts with delta ${delta} behave like ${fmt(ans)} shares, so selling that many cancels the exposure.`, abs_tol: 0.5 });
}

// ======================= Set 5: probability and statistics =======================
export function dice_ev(rng, opts = {}) {
  const kind = opts.family ? opts.family.split(":")[1] : rng.choice(["one", "two_sum", "two_product", "max"]);
  const table = {
    one: ["Roll one fair die and get paid its face value in dollars. What is a fair price to play?", 3.5, "Average of 1 to 6 = 21 / 6 = 3.5."],
    two_sum: ["Roll two fair dice and get paid the sum in dollars. Fair price?", 7, "Each die averages 3.5, and averages add: 7."],
    two_product: ["Roll two fair dice and get paid the product in dollars. Fair price?", 12.25, "Independent dice: the average of a product is the product of the averages, 3.5 x 3.5 = 12.25."],
    max: ["Roll two fair dice and get paid the higher face in dollars. Fair price?", 4.47, "P(max = k) = (k^2 - (k-1)^2) / 36. Sum of k x (2k - 1) / 36 for k = 1 to 6 = 161 / 36 = 4.47."],
  };
  const [q, answer, why] = table[kind];
  return item({ key: `dice_ev:${kind}`, drill: "dice_ev", family: `dice_ev:${kind}`,
    prompt: `${q} ${USD}`, answer, explanation: `${why} | Fair price means the expected payout. Pay less and you have an edge; pay more and the house does.`, abs_tol: 0.06 });
}

export function flips_to_first_heads(rng, opts = {}) {
  const kind = opts.family ? opts.family.split(":")[1] : rng.choice(["coin", "die", "biased"]);
  const p = kind === "coin" ? 0.5 : kind === "die" ? 1 / 6 : rng.choice([0.2, 0.25, 0.1]);
  const ans = 1 / p;
  const q = kind === "coin" ? "Flip a fair coin until the first heads. Expected number of flips?" : kind === "die" ? "Roll a fair die until the first six. Expected number of rolls?" : `A coin lands heads ${fmt(p * 100)}% of the time. Flip until the first heads. Expected number of flips?`;
  return item({ key: `flips_to_first_heads:${kind}:${p}`, drill: "flips_to_first_heads", family: `flips_to_first_heads:${kind}`,
    prompt: `${q} ${NUM}`, answer: ans, explanation: `Expected tries to the first success is 1 / p = 1 / ${fmt(p)} = ${fmt(ans)}. | The geometric rule. Two heads in a row is a different question (the answer is 6, by recursion), and worth knowing that it is different.`, abs_tol: 0.05 });
}

export function make_a_market(rng, opts = {}) {
  const n = rng.choice([2, 3, 4]);
  const kind = opts.family ? opts.family.split(":")[1] : rng.choice(["fair", "bid"]);
  const fair = 3.5 * n;
  const width = rng.choice([1, 2]);
  if (kind === "fair") return item({ key: `make_a_market:fair:${n}`, drill: "make_a_market", family: "make_a_market:fair",
    prompt: `A trader asks you to price the sum of ${n} fair dice. What is the fair value? ${NUM}`, answer: fair,
    explanation: `${n} x 3.5 = ${fmt(fair)}. | "Make me a market" means quote a bid and an offer around the fair value. Know the fair value first, then set the width to the risk.`, abs_tol: 0.05 });
  return item({ key: `make_a_market:bid:${n}:${width}`, drill: "make_a_market", family: "make_a_market:bid",
    prompt: `You are asked for a ${width}-wide market on the sum of ${n} fair dice, centred on fair value. What is your bid? ${NUM}`, answer: fair - width / 2,
    explanation: `Fair value ${fmt(fair)}; a ${width}-wide market centred there is ${fmt(fair - width / 2)} bid, ${fmt(fair + width / 2)} offered. | Bid below fair, offer above, and the gap is your compensation for being wrong.`, abs_tol: 0.05 });
}

const COND = [
  ["Two fair dice sum to 8. What is the chance at least one shows a 6?", 2 / 5, "Ways to make 8: (2,6)(3,5)(4,4)(5,3)(6,2), five of them. Two contain a 6: 2 / 5."],
  ["Two fair dice sum to 7. What is the chance one of them shows a 1?", 2 / 6, "Ways to make 7: six of them, (1,6) and (6,1) have a 1: 2 / 6."],
  ["Two fair dice, at least one is a 6. What is the chance the sum is 12?", 1 / 11, "Outcomes with at least one 6: 11 (not 12: (6,6) is counted once). Only (6,6) sums to 12: 1 / 11."],
  ["A family has two children and at least one is a boy. Chance both are boys?", 1 / 3, "BB, BG, GB are the cases with at least one boy; one of the three is BB."],
  ["Two fair dice sum to 10. Chance they are a double?", 1 / 3, "(4,6)(5,5)(6,4): one double in three."],
];
export function conditional_small(rng, opts = {}) {
  const idx = pick(rng, COND.length, opts.family);
  const [q, answer, why] = COND[idx];
  return item({ key: `conditional_small:${idx}`, drill: "conditional_small", family: `conditional_small:${idx}`,
    prompt: `${q} ${PCT}`, answer: answer * 100, explanation: `${why} | Conditional probability on a napkin: list the outcomes that fit the condition, then count the ones you want.`, abs_tol: 0.6 });
}

export function bayes_100(rng) {
  const base = rng.choice([1, 2, 5, 10]);
  const sens = rng.choice([80, 90, 95, 99]);
  const fpr = rng.choice([1, 5, 10, 20]);
  const sick = base * 10, healthy = 1000 - sick;
  const tp = (sick * sens) / 100, fp = (healthy * fpr) / 100;
  const ans = (tp / (tp + fp)) * 100;
  return item({ key: `bayes_100:${base}:${sens}:${fpr}`, drill: "bayes_100",
    prompt: `${base} in 100 people have a condition. The test catches ${sens}% of real cases and gives a false positive to ${fpr}% of healthy people. You test positive. What is the chance you actually have it? ${PCT}`, answer: ans,
    explanation: `Picture 1,000 people: ${sick} sick, ${healthy} healthy. True positives ${fmt(tp)}; false positives ${fmt(fp)}. Chance = ${fmt(tp)} / (${fmt(tp)} + ${fmt(fp)}) = ${ans.toFixed(1)}%. | Bayes without the formula: count the positives in a crowd of 1,000. A rare condition means most positives are false.`, abs_tol: 1 });
}

export function mean_variance_quick(rng, opts = {}) {
  const kind = opts.family ? opts.family.split(":")[1] : rng.choice(["mean", "var"]);
  const xs = Array.from({ length: 4 }, () => rng.choice([-5, -2, -1, 0, 1, 2, 3, 4, 5, 6, 8, 10]));
  const mean = xs.reduce((a, b) => a + b, 0) / 4;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / 4;
  return item({ key: `mean_variance_quick:${kind}:${xs.join(":")}`, drill: "mean_variance_quick", family: `mean_variance_quick:${kind}`,
    prompt: `Four monthly returns: ${xs.map((x) => `${x}%`).join(", ")}. ${kind === "mean" ? `What is the mean? ${PCT}` : "What is the population variance, in %-squared? Answer with a number."}`, answer: kind === "mean" ? mean : variance,
    explanation: `Mean = ${xs.join(" + ")} = ${fmt(xs.reduce((a, b) => a + b, 0))}, / 4 = ${fmt(mean)}%. Deviations squared: ${xs.map((x) => fmt(r2((x - mean) ** 2))).join(" + ")} = ${fmt(r2(variance * 4))}, / 4 = ${fmt(r2(variance))}. Standard deviation is the square root, ${Math.sqrt(variance).toFixed(1)}%. | Variance is the average squared distance from the mean; sample variance would divide by 3 instead.`, abs_tol: kind === "mean" ? 0.05 : 0.3 });
}

export function standard_error(rng, opts = {}) {
  const sd = rng.choice([2, 3, 4, 5, 6]);
  const n = rng.choice([9, 16, 25, 36, 64, 100]);
  const kind = opts.family ? opts.family.split(":")[1] : rng.choice(["se", "t"]);
  const se = sd / Math.sqrt(n);
  if (kind === "se") return item({ key: `standard_error:se:${sd}:${n}`, drill: "standard_error", family: "standard_error:se",
    prompt: `Monthly returns have a standard deviation of ${sd}% over ${n} months. What is the standard error of the mean? ${PCT}`, answer: se,
    explanation: `${sd} / sqrt(${n}) = ${sd} / ${Math.sqrt(n)} = ${fmt(r2(se))}%. | The standard error says how much the average itself wobbles. More months, smaller wobble, but only by the square root.`, abs_tol: 0.05 });
  const mean = rng.choice([0.5, 1, 1.5, 2]);
  return item({ key: `standard_error:t:${sd}:${n}:${mean}`, drill: "standard_error", family: "standard_error:t",
    prompt: `Monthly returns average ${fmt(mean)}% with a standard deviation of ${sd}% over ${n} months. How many standard errors is the mean from zero? ${NUM}`, answer: mean / se,
    explanation: `SE = ${sd} / sqrt(${n}) = ${fmt(r2(se))}. ${fmt(mean)} / ${fmt(r2(se))} = ${(mean / se).toFixed(2)}. ${mean / se >= 2 ? "Above 2, so the average is unlikely to be luck." : "Below 2, so it could easily be luck."} | A t-statistic. Two standard errors is the usual bar for "probably real".`, abs_tol: 0.1 });
}

export function vol_sqrt_time(rng, opts = {}) {
  const kind = opts.family ? opts.family.split(":")[1] : rng.choice(["daily", "monthly"]);
  if (kind === "daily") {
    const d = rng.choice([0.5, 1, 1.5, 2]);
    return item({ key: `vol_sqrt_time:daily:${d}`, drill: "vol_sqrt_time", family: "vol_sqrt_time:daily",
      prompt: `Daily volatility is ${fmt(d)}%. What is annual volatility, using 252 trading days? ${PCT}`, answer: d * Math.sqrt(252),
      explanation: `${fmt(d)} x sqrt(252) = ${fmt(d)} x 15.9 = ${(d * Math.sqrt(252)).toFixed(1)}%. | Volatility scales with the square root of time, because independent moves add in variance, not in standard deviation. Shortcut: daily x 16.`, rel_tol: 0.03, abs_tol: 0.3 });
  }
  const m = rng.choice([2, 3, 4, 5, 6]);
  return item({ key: `vol_sqrt_time:monthly:${m}`, drill: "vol_sqrt_time", family: "vol_sqrt_time:monthly",
    prompt: `Monthly volatility is ${m}%. What is annual volatility? ${PCT}`, answer: m * Math.sqrt(12),
    explanation: `${m} x sqrt(12) = ${m} x 3.46 = ${(m * Math.sqrt(12)).toFixed(1)}%. | Same square-root rule. Twelve months, so multiply by about 3.5.`, rel_tol: 0.03, abs_tol: 0.3 });
}

export function sharpe_quick(rng, opts = {}) {
  const kind = opts.family ? opts.family.split(":")[1] : rng.choice(["annual", "monthly"]);
  if (kind === "annual") {
    const ret = rng.choice([8, 10, 12, 15, 20]);
    const rf = rng.choice([2, 3, 4, 5]);
    const vol = rng.choice([8, 10, 12, 16, 20, 25]);
    return item({ key: `sharpe_quick:annual:${ret}:${rf}:${vol}`, drill: "sharpe_quick", family: "sharpe_quick:annual",
      prompt: `A strategy returns ${ret}% a year with ${vol}% volatility. The risk-free rate is ${rf}%. What is its Sharpe ratio? ${NUM}`, answer: (ret - rf) / vol,
      explanation: `(${ret} - ${rf}) / ${vol} = ${((ret - rf) / vol).toFixed(2)}. | Sharpe ratio: extra return per unit of risk. Below 0.5 is ordinary, 1 is good, above 2 is suspicious until proven.`, abs_tol: 0.03 });
  }
  const ms = rng.choice([0.2, 0.3, 0.4, 0.5]);
  return item({ key: `sharpe_quick:monthly:${ms}`, drill: "sharpe_quick", family: "sharpe_quick:monthly",
    prompt: `A strategy's monthly Sharpe ratio is ${fmt(ms)}. What is its annual Sharpe? ${NUM}`, answer: ms * Math.sqrt(12),
    explanation: `${fmt(ms)} x sqrt(12) = ${fmt(ms)} x 3.46 = ${(ms * Math.sqrt(12)).toFixed(2)}. | Return scales with time, volatility with its square root, so the ratio grows by the square root.`, abs_tol: 0.05 });
}

export function z_score(rng, opts = {}) {
  const kind = opts.family ? opts.family.split(":")[1] : rng.choice(["z", "tail"]);
  const mean = rng.choice([0, 1, 2, 5]);
  const sd = rng.choice([2, 4, 5, 10]);
  const z = rng.choice([-3, -2.5, -2, -1.5, -1, 1, 1.5, 2, 2.5, 3]);
  const obs = mean + z * sd;
  if (kind === "z") return item({ key: `z_score:z:${mean}:${sd}:${obs}`, drill: "z_score", family: "z_score:z",
    prompt: `Returns average ${mean}% with a standard deviation of ${sd}%. This month came in at ${fmt(obs)}%. What is the z-score? ${NUM}`, answer: z,
    explanation: `(${fmt(obs)} - ${mean}) / ${sd} = ${fmt(z)}. | A z-score counts standard deviations from the mean. Sign says which side.`, abs_tol: 0.05 });
  const tails = { 1: 16, 1.5: 7, 2: 2.5, 2.5: 0.6, 3: 0.15 };
  const az = Math.abs(z);
  return item({ key: `z_score:tail:${mean}:${sd}:${obs}`, drill: "z_score", family: "z_score:tail",
    prompt: `Returns average ${mean}% with a standard deviation of ${sd}%. This month came in at ${fmt(obs)}%. If returns were normal, roughly what percent of months would be ${z < 0 ? "this bad or worse" : "this good or better"}? ${PCT}`, answer: tails[az],
    explanation: `z = ${fmt(z)}. One-sided tails: 1 sd about 16%, 1.5 about 7%, 2 about 2.5%, 2.5 about 0.6%, 3 about 0.15%. | The 68-95-99.7 rule, halved for one side. Real returns have fatter tails than this.`, rel_tol: 0.35, abs_tol: 0.3 });
}

export function correlation_sign(rng, opts = {}) {
  const kind = opts.family ? opts.family.split(":")[1] : rng.choice(["sign", "sign", "portfolio"]);
  if (kind === "sign") {
    const pct = rng.choice([30, 40, 50, 60, 70, 80]);
    const answer = pct > 50 ? 0 : pct < 50 ? 1 : 2;
    return choiceItem({ key: `correlation_sign:sign:${pct}`, drill: "correlation_sign", family: "correlation_sign:sign",
      prompt: `On days stock B is up, stock A is up ${pct}% of the time (and down the rest). Is their correlation positive, negative, or about zero?`, choices: ["Positive", "Negative", "About zero"], answer,
      explanation: `${pct}% is ${pct > 50 ? "above" : pct < 50 ? "below" : "exactly"} the 50% you would see with no relationship, so the correlation is ${["positive", "negative", "about zero"][answer]}. | Correlation runs from -1 to 1. It measures whether two things move together, not how much.` });
  }
  const vol = rng.choice([10, 12, 16, 20]);
  const rho = rng.choice([1, 0, 0.5, -1]);
  const ans = vol * Math.sqrt((1 + rho) / 2);
  return item({ key: `correlation_sign:portfolio:${vol}:${rho}`, drill: "correlation_sign", family: "correlation_sign:portfolio",
    prompt: `Two assets, each with ${vol}% volatility, held in equal weights. Their correlation is ${fmt(rho)}. What is the portfolio's volatility? ${PCT}`, answer: ans,
    explanation: `Variance = 0.25 x ${vol}^2 + 0.25 x ${vol}^2 + 2 x 0.25 x ${fmt(rho)} x ${vol}^2 = ${fmt(r2(ans ** 2))}, so vol = ${ans.toFixed(1)}%. Shortcut for equal vols: vol x sqrt((1 + correlation) / 2). | Correlation 1 gives no diversification, 0 cuts vol by about 30%, -1 cancels it entirely.`, rel_tol: 0.03, abs_tol: 0.2 });
}

export function market_size_steps(rng) {
  const pop = rng.choice([330, 340]);
  const perHh = rng.choice([2, 2.5]);
  const own = rng.choice([50, 60, 80, 90]);
  const yrs = rng.choice([8, 10, 12, 15]);
  const ans = ((pop / perHh) * (own / 100)) / yrs;
  return item({ key: `market_size_steps:${pop}:${perHh}:${own}:${yrs}`, drill: "market_size_steps",
    prompt: `Take ${pop}M people, ${fmt(perHh)} per household, ${own}% of households own a car, one car each, replaced every ${yrs} years. How many cars are sold a year? Answer in millions. ${NUM}`, answer: ans,
    explanation: `${pop} / ${fmt(perHh)} = ${fmt(pop / perHh)}M households. x ${own / 100} = ${fmt((pop / perHh) * (own / 100))}M cars. / ${yrs} = ${ans.toFixed(1)}M a year. | Real US sales are about 15M, because many households own two or three cars. The method is what is graded; saying why the number is low is the bonus.`, rel_tol: 0.03, abs_tol: 0.1 });
}
