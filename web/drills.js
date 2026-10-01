// Drill generators. An item: { key, drill, prompt, answer, explanation, rel_tol, abs_tol, choices? }.
// Prompt rules: situation first, question last, answer format stated. Jargon lives in the explanation.

import { makeRng, fmt, r2, parseAnswer, isCorrect, item, comb2, NUM, PCT, USD, USDM, POTS, potAndCall, exactEquity, DRAW_NAMES, familyOf, familyFromKey } from "./core.js";
import { FAMILIES } from "./families.js";
import * as interview from "./interview.js";
import * as finance from "./finance.js";
import * as quick2 from "./quick2.js";
import * as quant from "./quant.js";
export { makeRng, fmt, parseAnswer, isCorrect, familyOf, familyFromKey, FAMILIES };

// ======================= poker =======================

function pot_odds(rng) {
  const [pot, call] = potAndCall(rng);
  const answer = (call / (pot + call)) * 100;
  const ratio = r2(pot / call);
  return item({
    key: `pot_odds:${pot}:${call}`, drill: "pot_odds",
    prompt: `There is $${fmt(pot)} in the pot. It costs you $${fmt(call)} to call. How often do you need to win for calling to break even? ${PCT}`,
    answer,
    explanation: `Pot odds: call / (pot + call) = ${call} / ${pot + call} = ${answer.toFixed(1)}%. | As odds, the pot lays you ${fmt(ratio)} to 1, and 1 / (${fmt(ratio)} + 1) is the same number. "Equity" is the poker word for your chance of winning.`,
    abs_tol: 0.6,
  });
}


function outs_equity(rng, opts = {}) {
  const outs = rng.randint(2, 15);
  const cards = opts.family ? Number(opts.family.split(":")[1]) : rng.choice([1, 2]);
  const exact = exactEquity(outs, cards);
  const rule = outs * (cards === 2 ? 4 : 2);
  const name = DRAW_NAMES[outs];
  const lead = name ? `You hold ${name}, ${outs} outs.` : `You have ${outs} outs.`;
  const tail = cards === 1 ? "One card to come. What is your chance of hitting?" : "Two cards to come. What is your chance of hitting by the river?";
  return item({
    key: `outs_equity:${outs}:${cards}`, drill: "outs_equity", family: `outs_equity:${cards}`,
    prompt: `${lead} ${tail} ${PCT}`,
    answer: exact,
    explanation: `Rule of 4 and 2: ${outs} x ${cards === 2 ? 4 : 2} = ${rule}%. | Exact: ${exact.toFixed(1)}% (${outs} outs among ${cards === 2 ? 47 : 46} unseen cards${cards === 2 ? ", two draws" : ""}). Poker calls this your equity.`,
    abs_tol: Math.abs(rule - exact) + 0.6,
  });
}

const EQUITIES = [20, 25, 30, 35, 40, 45, 50];
function ev_call(rng) {
  const [pot, call] = potAndCall(rng);
  const eq = rng.choice(EQUITIES);
  const p = eq / 100;
  const answer = p * pot - (1 - p) * call;
  return item({
    key: `ev_call:${pot}:${call}:${eq}`, drill: "ev_call",
    prompt: `There is $${fmt(pot)} in the pot and it costs $${fmt(call)} to call. You win ${eq}% of the time. On average, how much does calling make or lose? ${USD} Negative if it loses.`,
    answer,
    explanation: `Win ${eq}% of $${pot} = ${fmt(r2(p * pot))}. Lose ${100 - eq}% of $${call} = ${fmt(r2((1 - p) * call))}. Expected value (EV) = ${fmt(r2(answer))}. | Positive means call, negative means fold.`,
    rel_tol: 0.05, abs_tol: 1.0,
  });
}

const IMPLIED_EQUITIES = [10, 12, 15, 18, 20, 25];
function implied_odds(rng) {
  let pot, call, eq, p;
  for (;;) {
    [pot, call] = potAndCall(rng);
    eq = rng.choice(IMPLIED_EQUITIES);
    p = eq / 100;
    if (p < call / (pot + call) - 0.01) break;
  }
  const answer = call / p - pot - call;
  return item({
    key: `implied_odds:${pot}:${call}:${eq}`, drill: "implied_odds",
    prompt: `There is $${fmt(pot)} in the pot and it costs $${fmt(call)} to call. You win ${eq}% of the time, so the pot alone does not justify a call. How much more would you need to win on later streets for the call to break even? ${USD}`,
    answer,
    explanation: `The final pot must be call / win chance = ${call} / ${p} = ${fmt(r2(call / p))}. Only ${pot + call} is there after your call, so you need ${fmt(r2(answer))} more. | This is "implied odds": money you expect to win later if you hit.`,
    rel_tol: 0.05, abs_tol: 1.0,
  });
}

const RANKS = ["A", "K", "Q", "J", "T", "9", "8"];
function combos(rng, opts = {}) {
  const kind = opts.family ? opts.family.split(":")[1] : rng.choice(["pair", "suited", "offsuit", "any", "pair_blocked", "any_blocked"]);
  let [r1, r2_] = rng.sample2(RANKS);
  if (RANKS.indexOf(r1) > RANKS.indexOf(r2_)) [r1, r2_] = [r2_, r1];
  const pairName = { A: "aces", K: "kings", Q: "queens", J: "jacks", T: "tens", 9: "nines", 8: "eights" }[r1];
  const table = {
    pair: [`How many ways can someone hold pocket ${pairName}? ${NUM}`, 6, `4 ${r1}s, choose 2: 4 x 3 / 2 = 6`],
    suited: [`How many ways can someone hold ${r1}${r2_} suited? ${NUM}`, 4, "one per suit = 4"],
    offsuit: [`How many ways can someone hold ${r1}${r2_} offsuit? ${NUM}`, 12, "4 x 4 = 16 total, minus 4 suited = 12"],
    any: [`How many ways can someone hold ${r1}${r2_}, suited or not? ${NUM}`, 16, `4 ${r1}s x 4 ${r2_}s = 16`],
    pair_blocked: [`You hold ${r1 === "A" ? "an" : "a"} ${r1}. How many ways can your opponent hold pocket ${pairName}? ${NUM}`, 3, `3 ${r1}s left, choose 2: 3 x 2 / 2 = 3`],
    any_blocked: [`You hold ${r1 === "A" ? "an" : "a"} ${r1}. How many ways can your opponent hold ${r1}${r2_}? ${NUM}`, 12, `3 ${r1}s left x 4 ${r2_}s = 12`],
  };
  const [prompt, answer, how] = table[kind];
  return item({
    key: `combos:${kind}:${r1}:${r2_}`, drill: "combos", family: `combos:${kind}`, prompt, answer,
    explanation: `${how}. | Each way is a "combo": one exact pair of cards. Cards you hold are "blockers": they remove combos.`,
    abs_tol: 0.1,
  });
}

// ======================= quick math =======================
const PERCENTS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80, 90];
const BASES = [20, 30, 40, 60, 80, 120, 150, 160, 200, 240, 300, 360, 400, 450, 500, 600, 750, 800, 1200, 2500, 4000];
function percent_of(rng) {
  const pct = rng.choice(PERCENTS), base = rng.choice(BASES);
  const answer = (pct * base) / 100;
  return item({
    key: `percent_of:${pct}:${base}`, drill: "percent_of",
    prompt: `What is ${pct}% of ${fmt(base)}? ${NUM}`, answer,
    explanation: `10% of ${fmt(base)} is ${fmt(base / 10)}; ${pct}% is ${fmt(pct / 10)} x that = ${fmt(answer)}.`,
  });
}

const DENOMINATORS = [3, 4, 5, 6, 7, 8, 9, 11, 12, 16];
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
function fraction_to_decimal(rng) {
  let d, n;
  for (;;) { d = rng.choice(DENOMINATORS); n = rng.randint(1, d - 1); if (gcd(n, d) === 1) break; }
  return item({
    key: `fraction_to_decimal:${n}:${d}`, drill: "fraction_to_decimal",
    prompt: `What is ${n}/${d} as a decimal? ${NUM}`, answer: n / d,
    explanation: `1/${d} = ${(1 / d).toFixed(3)}, so ${n}/${d} = ${n} x ${(1 / d).toFixed(3)} = ${(n / d).toFixed(3)}.`,
    abs_tol: 0.006,
  });
}

function multiply_shortcuts(rng, opts = {}) {
  const kind = opts.family ? opts.family.split(":")[1] : rng.choice(["x11", "sq5", "x25"]);
  let a, b, how;
  if (kind === "x11") {
    a = rng.randint(12, 98); b = 11;
    const tens = Math.floor(a / 10), ones = a % 10;
    how = `Write ${tens} _ ${ones} and put ${tens}+${ones}=${tens + ones} in the middle (carry if 10 or more)`;
  } else if (kind === "sq5") {
    a = b = rng.choice([15, 25, 35, 45, 55, 65, 75, 85, 95]);
    const t = Math.floor(a / 10);
    how = `${t} x ${t + 1} = ${t * (t + 1)}, then append 25`;
  } else {
    a = rng.choice([12, 16, 24, 28, 32, 36, 44, 48, 52, 64, 72, 88, 96]); b = 25;
    how = `${a} / 4 = ${fmt(a / 4)}, then x 100`;
  }
  return item({
    key: `multiply_shortcuts:${kind}:${a}:${b}`, drill: "multiply_shortcuts", family: `multiply_shortcuts:${kind}`,
    prompt: `What is ${a} x ${b}? ${NUM}`, answer: a * b,
    explanation: `${how}. | Exact: ${a} x ${b} = ${fmt(a * b)}.`,
  });
}

const GROWTH_RATES = [5, 10, 12, 15, 20, 25, 30, 50, 100];
const GROWTH_BASES = [40, 50, 80, 100, 120, 150, 200, 240, 300, 400, 500, 800, 1000, 1200, 2000];
const DOUBLING_RATES = [3, 4, 6, 8, 9, 12, 18, 24];
function growth_rate(rng, opts = {}) {
  const pct = opts.family ? opts.family.endsWith(":pct") : rng.random() < 0.6;
  if (pct) {
    const r = rng.choice(GROWTH_RATES), a = rng.choice(GROWTH_BASES);
    const b = (a * (100 + r)) / 100;
    return item({
      key: `growth_rate:pct:${a}:${b}`, drill: "growth_rate", family: "growth_rate:pct",
      prompt: `Something grows from ${fmt(a)} to ${fmt(b)}. What is the growth rate? ${PCT}`, answer: r,
      explanation: `Change = ${fmt(b)} - ${fmt(a)} = ${fmt(b - a)}. Divided by the start, ${fmt(a)}, = ${r}%.`,
      abs_tol: 0.5,
    });
  }
  const r = rng.choice(DOUBLING_RATES);
  const exact = Math.log(2) / Math.log(1 + r / 100);
  return item({
    key: `growth_rate:double:${r}`, drill: "growth_rate", family: "growth_rate:double",
    prompt: `At ${r}% a year, how many years until it doubles? Answer in years.`, answer: 72 / r,
    explanation: `Rule of 72: 72 / ${r} = ${fmt(72 / r)} years. | Exact: ln 2 / ln(1.${String(r).padStart(2, "0")}) = ${exact.toFixed(1)} years.`,
    abs_tol: 1.0,
  });
}

function back_of_envelope(rng, opts = {}) {
  const kind = opts.family ? opts.family.split(":")[1] : rng.choice(["multiple", "ebitda", "mktcap", "interest"]);
  if (kind === "multiple") {
    const e = rng.choice([25, 40, 50, 60, 80, 100, 120, 150, 200, 250, 400]);
    const mult = rng.choice([6, 7, 8, 9, 10, 11, 12, 14, 15]);
    const ev = e * mult;
    return item({ key: `back_of_envelope:multiple:${ev}:${e}`, drill: "back_of_envelope", family: "back_of_envelope:multiple",
      prompt: `A company is worth $${fmt(ev)}M in total (its enterprise value) and earns $${fmt(e)}M of EBITDA. What is its EV/EBITDA multiple? ${NUM}`, answer: mult,
      explanation: `EV / EBITDA = ${fmt(ev)} / ${fmt(e)} = ${mult}x. | Enterprise value (EV) is what the whole business costs, debt included. EBITDA is profit before interest, tax, depreciation and amortisation.`, rel_tol: 0.05 });
  }
  if (kind === "ebitda") {
    const rev = rng.choice([80, 120, 200, 250, 400, 500, 750, 1000, 1500, 2000]);
    const margin = rng.choice([8, 10, 12, 15, 18, 20, 25, 30, 35, 40]);
    const ans = (rev * margin) / 100;
    return item({ key: `back_of_envelope:ebitda:${rev}:${margin}`, drill: "back_of_envelope", family: "back_of_envelope:ebitda",
      prompt: `A company has $${fmt(rev)}M of revenue and a ${margin}% EBITDA margin. What is its EBITDA? ${USDM}`, answer: ans,
      explanation: `${margin}% of ${fmt(rev)} = ${fmt(ans)}. | A margin is profit as a share of revenue.`, rel_tol: 0.05 });
  }
  if (kind === "mktcap") {
    const price = rng.choice([8, 12, 15, 20, 25, 30, 40, 45, 50, 60, 75, 80, 120]);
    const shares = rng.choice([20, 40, 50, 80, 100, 150, 200, 250, 400, 500]);
    return item({ key: `back_of_envelope:mktcap:${price}:${shares}`, drill: "back_of_envelope", family: "back_of_envelope:mktcap",
      prompt: `A stock trades at $${price} and there are ${fmt(shares)}M shares. What is the market cap? ${USDM}`, answer: price * shares,
      explanation: `${price} x ${fmt(shares)} = ${fmt(price * shares)}. | Market cap is the price of all the shares together.`, rel_tol: 0.05 });
  }
  const debt = rng.choice([50, 100, 150, 200, 300, 400, 500, 800, 1000, 1500]);
  const rate = rng.choice([4, 5, 6, 7, 8, 9, 10, 12]);
  const ans = (debt * rate) / 100;
  return item({ key: `back_of_envelope:interest:${debt}:${rate}`, drill: "back_of_envelope", family: "back_of_envelope:interest",
    prompt: `A company has $${fmt(debt)}M of debt at ${rate}% interest. What does it pay in interest each year? ${USDM}`, answer: ans,
    explanation: `${rate}% of ${fmt(debt)} = ${fmt(ans)}. | Interest expense is the yearly cost of carrying the debt.`, rel_tol: 0.05 });
}

// ======================= banking interview numbers =======================
function equity_value(rng) {
  const ev = rng.choice([200, 300, 500, 800, 1000, 1500, 2000, 4000]);
  const debt = rng.choice([50, 100, 150, 200, 300, 500, 800]);
  const cash = rng.choice([10, 20, 50, 100, 150, 200]);
  const ans = ev - debt + cash;
  return item({ key: `equity_value:${ev}:${debt}:${cash}`, drill: "equity_value",
    prompt: `A company's enterprise value is $${fmt(ev)}M. It has $${fmt(debt)}M of debt and $${fmt(cash)}M of cash. What is the equity value? ${USDM}`, answer: ans,
    explanation: `Equity = EV - debt + cash = ${fmt(ev)} - ${fmt(debt)} + ${fmt(cash)} = ${fmt(ans)}. | Enterprise value is the whole business; equity value is what is left for shareholders after lenders are paid, plus the cash on hand.`, rel_tol: 0.02, abs_tol: 1 });
}

function multiple_to_yield(rng) {
  const x = rng.choice([5, 8, 10, 12, 12.5, 15, 16, 20, 25, 40, 50]);
  const kind = rng.choice(["EBITDA", "earnings"]);
  return item({ key: `multiple_to_yield:${x}:${kind}`, drill: "multiple_to_yield",
    prompt: `A company trades at ${fmt(x)}x ${kind}. What is that as a yield, meaning ${kind} as a percent of price? ${PCT}`, answer: 100 / x,
    explanation: `Yield = 1 / multiple = 1 / ${fmt(x)} = ${(100 / x).toFixed(1)}%. | A multiple and a yield are the same fact upside down. 20x is 5%; 10x is 10%.`, abs_tol: 0.3 });
}

function after_tax_debt(rng) {
  const r = rng.choice([4, 5, 6, 7, 8, 9, 10, 12]);
  const t = rng.choice([20, 21, 25, 30, 40]);
  const ans = r * (1 - t / 100);
  return item({ key: `after_tax_debt:${r}:${t}`, drill: "after_tax_debt",
    prompt: `A company borrows at ${r}% and pays ${t}% tax. Interest is tax-deductible. What is the after-tax cost of the debt? ${PCT}`, answer: ans,
    explanation: `${r}% x (1 - ${t / 100}) = ${fmt(r2(ans))}%. | Interest reduces taxable profit, so the government effectively pays ${t}% of it. This is why debt is cheaper than equity.`, abs_tol: 0.15 });
}

const MOIC_TABLE = [[2, 3], [2, 4], [2, 5], [2.5, 5], [3, 5], [3, 4], [1.5, 3], [4, 5]];
function lbo_return(rng) {
  const [moic, years] = rng.choice(MOIC_TABLE);
  const exact = (Math.pow(moic, 1 / years) - 1) * 100;
  const anchor = moic === 2 ? `Rule of 72: doubling in ${years} years is about ${fmt(r2(72 / years))}% a year.` : `Anchors: 2x in 5 years is 15%, 3x in 5 years is 25%, 2x in 3 years is 26%.`;
  return item({ key: `lbo_return:${moic}:${years}`, drill: "lbo_return",
    prompt: `A buyout returns ${fmt(moic)}x the money in ${years} years. Roughly what yearly return is that? ${PCT}`, answer: exact,
    explanation: `${anchor} | Exact: ${fmt(moic)}^(1/${years}) - 1 = ${exact.toFixed(1)}%. Bankers call this the IRR; the multiple is the MOIC.`, abs_tol: 2.5 });
}

function accretion(rng) {
  let a, b;
  for (;;) { a = rng.choice([10, 12, 15, 18, 20, 25, 30]); b = rng.choice([8, 10, 12, 15, 18, 20, 25, 30]); if (a !== b) break; }
  return item({ key: `accretion:${a}:${b}`, drill: "accretion",
    prompt: `A buyer trading at ${a}x earnings buys a target trading at ${b}x earnings, paying entirely in its own stock. Accretive or dilutive to the buyer's earnings per share?`,
    choices: ["Accretive", "Dilutive"], answer: a > b ? 0 : 1,
    explanation: `All-stock: if the buyer's multiple (${a}x) is higher than the target's (${b}x), the buyer's shares are "more expensive" than what it is buying, so the deal is ${a > b ? "accretive" : "dilutive"}. | In yield terms: buyer's earnings yield ${(100 / a).toFixed(1)}% vs target's ${(100 / b).toFixed(1)}%. Buying a higher yield with a lower one adds earnings per share.`, abs_tol: 0 });
}

function interest_coverage(rng) {
  const i = rng.choice([10, 20, 25, 40, 50, 80, 100]);
  const x = rng.choice([2, 2.5, 3, 4, 5, 6, 8]);
  const e = i * x;
  return item({ key: `interest_coverage:${e}:${i}`, drill: "interest_coverage",
    prompt: `A company earns $${fmt(e)}M of EBITDA and pays $${fmt(i)}M of interest a year. How many times over can it cover its interest? ${NUM}`, answer: x,
    explanation: `Coverage = EBITDA / interest = ${fmt(e)} / ${fmt(i)} = ${fmt(x)}x. | Below about 2x lenders get nervous; above 4x is comfortable.`, abs_tol: 0.15 });
}

// ======================= Mighty Moose (stand-in numbers) =======================
function contribution_margin(rng, opts = {}) {
  const p = rng.choice([35, 40, 45, 50, 60, 75, 90]);
  const c = rng.choice([8, 10, 12, 14, 16, 20]);
  const s = rng.choice([4, 5, 6, 7, 8]);
  const f = rng.choice([3, 4, 5]);
  const ans = p - c - s - (p * f) / 100;
  const pctAsk = opts.family ? opts.family.endsWith(":pct") : rng.random() < 0.4;
  return item({ key: `contribution_margin:${p}:${c}:${s}:${f}${pctAsk ? ":pct" : ""}`, drill: "contribution_margin", family: pctAsk ? "contribution_margin:pct" : "contribution_margin",
    prompt: `A bag sells for $${p}. It costs $${c} to make and $${s} to ship, and the payment processor takes ${f}%. What is the contribution margin per bag${pctAsk ? ", as a percent of price" : ""}? ${pctAsk ? PCT : USD}`,
    answer: pctAsk ? (ans / p) * 100 : ans,
    explanation: `${p} - ${c} - ${s} - ${f}% of ${p} (${fmt(r2((p * f) / 100))}) = $${fmt(r2(ans))}${pctAsk ? `, which is ${((ans / p) * 100).toFixed(0)}% of the price` : ""}. | Contribution margin is what each sale leaves to cover fixed costs and ads.`,
    rel_tol: 0.03, abs_tol: pctAsk ? 1 : 0.5 });
}

function payback_months(rng) {
  const cac = rng.choice([25, 30, 35, 40, 43, 50, 60]);
  const cm = rng.choice([15, 18, 20, 22, 25]);
  const orders = rng.choice([0.5, 1, 1.5, 2]);
  const ans = cac / (cm * orders);
  return item({ key: `payback_months:${cac}:${cm}:${orders}`, drill: "payback_months",
    prompt: `It costs $${cac} in ads to win a customer. Each order contributes $${cm}, and a customer orders ${fmt(orders)} times a month. How many months until the customer pays back the ad cost? Answer in months.`, answer: ans,
    explanation: `${cac} / (${cm} x ${fmt(orders)}) = ${fmt(r2(ans))} months. | CAC is customer acquisition cost. Payback under 3 months is strong for a consumer product.`, rel_tol: 0.05, abs_tol: 0.2 });
}

function break_even_units(rng) {
  const fixed = rng.choice([2000, 3000, 4000, 5000, 6000, 8000, 10000, 12000]);
  const cm = rng.choice([10, 15, 20, 25, 40, 50]);
  return item({ key: `break_even_units:${fixed}:${cm}`, drill: "break_even_units",
    prompt: `Fixed costs are $${fmt(fixed)} a month and each unit contributes $${cm}. How many units a month to break even? ${NUM}`, answer: fixed / cm,
    explanation: `${fmt(fixed)} / ${cm} = ${fmt(fixed / cm)} units. | Fixed costs do not change with volume: rent, software, salaries.`, rel_tol: 0.02, abs_tol: 1 });
}

function discount_trap(rng) {
  let m, d;
  for (;;) { m = rng.choice([40, 50, 60, 70]); d = rng.choice([10, 15, 20, 25, 30]); if (d < m - 5) break; }
  const ans = (m / (m - d) - 1) * 100;
  return item({ key: `discount_trap:${m}:${d}`, drill: "discount_trap",
    prompt: `Your margin is ${m}%. You run a ${d}% off sale. How many more units must you sell to make the same profit as before? ${PCT} more units.`, answer: ans,
    explanation: `Margin after discount = ${m} - ${d} = ${m - d} points. Units needed = ${m} / ${m - d} = ${fmt(r2(m / (m - d)))}x, so ${ans.toFixed(0)}% more. | Discounts come straight out of margin, which is why a small one needs a big volume lift.`, abs_tol: 2 });
}

function roas_to_return(rng) {
  const r = rng.choice([1.5, 2, 2.5, 3, 4, 5]);
  const m = rng.choice([30, 40, 50, 60]);
  const ans = (r * (m / 100) - 1) * 100;
  return item({ key: `roas_to_return:${r}:${m}`, drill: "roas_to_return",
    prompt: `Ads return $${fmt(r)} of sales for every $1 spent, and your margin is ${m}%. What is the profit on each $1 of ad spend? ${PCT} Negative if it loses.`, answer: ans,
    explanation: `${fmt(r)} x ${m}% = ${fmt(r2(r * (m / 100)))} of margin per $1, minus the $1 spent = ${ans.toFixed(0)}%. | "ROAS" counts revenue, not profit. A 3x ROAS at 40% margin only earns 20 cents on the dollar.`, abs_tol: 1.5 });
}

function customer_value(rng) {
  const cm = rng.choice([15, 18, 20, 22, 25, 30]);
  const orders = rng.choice([3, 4, 5, 6, 8, 10]);
  return item({ key: `customer_value:${cm}:${orders}`, drill: "customer_value",
    prompt: `Each order contributes $${cm} and a typical customer orders ${orders} times before they stop. What is a customer worth? ${USD}`, answer: cm * orders,
    explanation: `${cm} x ${orders} = $${fmt(cm * orders)}. | Compare this to CAC. If a customer is worth $${fmt(cm * orders)}, paying $43 to win one is fine; paying $${fmt(cm * orders + 10)} is not.`, rel_tol: 0.02, abs_tol: 1 });
}

// ======================= Novyx / service business (stand-in numbers) =======================
function rebooking_revenue(rng) {
  const v = rng.choice([200, 250, 300, 400, 500]);
  const r = rng.choice([20, 25, 30, 40, 50]);
  const t = rng.choice([150, 200, 250, 300, 400, 600]);
  const ans = v * (r / 100) * t;
  return item({ key: `rebooking_revenue:${v}:${r}:${t}`, drill: "rebooking_revenue",
    prompt: `A clinic sees ${fmt(v)} visits a month. ${r}% of them rebook, and the average visit is $${fmt(t)}. How much monthly revenue comes from rebookings? ${USD}`, answer: ans,
    explanation: `${fmt(v)} x ${r}% x ${fmt(t)} = $${fmt(ans)}. | Rebooking rate is the share of visits that book their next visit before leaving.`, rel_tol: 0.03, abs_tol: 1 });
}

function unrealized_revenue(rng) {
  let r, target;
  for (;;) { r = rng.choice([20, 25, 30, 35]); target = rng.choice([40, 45, 50, 60]); if (target > r) break; }
  const v = rng.choice([200, 250, 300, 400, 500]);
  const t = rng.choice([150, 200, 250, 300, 400]);
  const ans = v * ((target - r) / 100) * t;
  return item({ key: `unrealized_revenue:${v}:${r}:${target}:${t}`, drill: "unrealized_revenue",
    prompt: `A clinic sees ${fmt(v)} visits a month at $${fmt(t)} each. It rebooks ${r}% of visits; a well-run clinic rebooks ${target}%. How much revenue a month is it leaving on the table? ${USD}`, answer: ans,
    explanation: `(${target}% - ${r}%) x ${fmt(v)} visits x $${fmt(t)} = $${fmt(ans)}. | This is the number that sells an automation project: the gap between where they are and where they could be.`, rel_tol: 0.03, abs_tol: 1 });
}

function rate_card(rng) {
  const h = rng.choice([40, 50, 60, 75, 100]);
  const hours = rng.choice([2, 3, 4, 5, 8]);
  const m = rng.choice([20, 25, 30, 40, 50]);
  const ans = (h * hours) / (1 - m / 100);
  return item({ key: `rate_card:${h}:${hours}:${m}`, drill: "rate_card",
    prompt: `A job takes ${hours} hours of labor at $${h} an hour. You want a ${m}% margin on the price. What should the job cost the customer? ${USD}`, answer: ans,
    explanation: `Cost = ${h} x ${hours} = ${fmt(h * hours)}. Price = cost / (1 - ${m / 100}) = $${fmt(r2(ans))}. | Margin is a share of price, so divide by (1 - margin); do not multiply by (1 + margin).`, rel_tol: 0.03, abs_tol: 1 });
}

function pipeline_revenue(rng) {
  const l = rng.choice([20, 30, 40, 50, 80, 100]);
  const c = rng.choice([10, 20, 25, 30, 40, 50]);
  const t = rng.choice([200, 300, 400, 500, 800, 1000]);
  const ans = l * (c / 100) * t;
  return item({ key: `pipeline_revenue:${l}:${c}:${t}`, drill: "pipeline_revenue",
    prompt: `A junk-removal company gets ${l} leads a month, closes ${c}% of them, and the average job is $${fmt(t)}. What is monthly revenue? ${USD}`, answer: ans,
    explanation: `${l} x ${c}% x ${fmt(t)} = $${fmt(ans)}. | Three levers: more leads, better close rate, bigger jobs. Each 10% on one lever is 10% on revenue.`, rel_tol: 0.03, abs_tol: 1 });
}

function lifetime_value(rng) {
  const t = rng.choice([100, 150, 200, 250, 300]);
  const v = rng.choice([2, 3, 4, 6]);
  const y = rng.choice([2, 3, 4, 5]);
  return item({ key: `lifetime_value:${t}:${v}:${y}`, drill: "lifetime_value",
    prompt: `A customer spends $${fmt(t)} per visit, comes ${v} times a year, and stays ${y} years. What are they worth over that time? ${USD}`, answer: t * v * y,
    explanation: `${fmt(t)} x ${v} x ${y} = $${fmt(t * v * y)}. | Lifetime value (LTV). Sets the ceiling on what you can spend to win a customer.`, rel_tol: 0.02, abs_tol: 1 });
}

// ======================= sports betting math (practice only, generated odds) =======================
function american_to_prob(rng) {
  const odds = rng.choice([-400, -300, -250, -200, -150, -120, -110, 110, 120, 150, 200, 250, 300, 400]);
  const p = odds > 0 ? 100 / (odds + 100) : -odds / (-odds + 100);
  const how = odds > 0 ? `100 / (${odds} + 100)` : `${-odds} / (${-odds} + 100)`;
  return item({ key: `american_to_prob:${odds}`, drill: "american_to_prob",
    prompt: `A line reads ${odds > 0 ? "+" : ""}${odds}. What chance of winning does that price imply? ${PCT}`, answer: p * 100,
    explanation: `${how} = ${(p * 100).toFixed(1)}%. | Positive: 100 / (odds + 100). Negative: odds / (odds + 100), ignoring the sign. "Implied probability" is the break-even win rate at that price.`, abs_tol: 0.6 });
}

function decimal_to_prob(rng) {
  const d = rng.choice([1.25, 1.5, 1.8, 2, 2.5, 3, 4, 5, 8, 10]);
  return item({ key: `decimal_to_prob:${d}`, drill: "decimal_to_prob",
    prompt: `Decimal odds of ${fmt(d)} pay ${fmt(d)} back for each 1 staked, stake included. What chance of winning does that imply? ${PCT}`, answer: 100 / d,
    explanation: `1 / ${fmt(d)} = ${(100 / d).toFixed(1)}%. | Decimal odds are the total payout per unit. Implied chance is just 1 over that.`, abs_tol: 0.6 });
}

function fraction_to_decimal_odds(rng) {
  const [n, d] = rng.choice([[1, 2], [1, 4], [2, 1], [3, 1], [5, 2], [7, 2], [4, 6], [10, 1], [11, 8], [6, 4]]);
  return item({ key: `fraction_to_decimal_odds:${n}:${d}`, drill: "fraction_to_decimal_odds",
    prompt: `Fractional odds of ${n}/${d} mean you win ${n} for every ${d} staked. What is that in decimal odds? ${NUM}`, answer: n / d + 1,
    explanation: `${n} / ${d} + 1 = ${fmt(r2(n / d + 1))}. | Fractional shows profit; decimal shows profit plus the stake back.`, abs_tol: 0.03 });
}

function remove_vig(rng) {
  let a, b;
  for (;;) { a = rng.choice([40, 45, 50, 52.4, 55, 60, 65, 70]); b = rng.choice([40, 45, 50, 52.4, 55]); if (a + b > 100 && a + b < 115) break; }
  const ans = (a / (a + b)) * 100;
  return item({ key: `remove_vig:${a}:${b}`, drill: "remove_vig",
    prompt: `Two sides of a game are priced at ${fmt(a)}% and ${fmt(b)}% implied chance. They add to more than 100% because the book keeps a cut. What is the fair chance of the first side? ${PCT}`, answer: ans,
    explanation: `${fmt(a)} / (${fmt(a)} + ${fmt(b)}) = ${ans.toFixed(1)}%. | The extra ${(a + b - 100).toFixed(1)} points is the "vig", the book's margin. Divide each side by the total to remove it.`, abs_tol: 0.6 });
}

function bet_ev(rng) {
  const stake = rng.choice([10, 20, 50, 100]);
  const d = rng.choice([1.5, 1.8, 2, 2.5, 3, 4]);
  const p = rng.choice([25, 30, 40, 45, 50, 55, 60, 70]);
  const ans = (p / 100) * stake * (d - 1) - (1 - p / 100) * stake;
  return item({ key: `bet_ev:${stake}:${d}:${p}`, drill: "bet_ev",
    prompt: `Decimal odds ${fmt(d)}, stake $${stake}, and you believe the true chance is ${p}%. On average, what does the bet make or lose? ${USD} Negative if it loses.`, answer: ans,
    explanation: `Win: ${p}% x ${stake} x (${fmt(d)} - 1) = ${fmt(r2((p / 100) * stake * (d - 1)))}. Lose: ${100 - p}% x ${stake} = ${fmt(r2((1 - p / 100) * stake))}. EV = ${fmt(r2(ans))}. | Same formula as the poker call. Practice only: the tool never records a real bet.`, rel_tol: 0.05, abs_tol: 0.6 });
}

function kelly(rng) {
  let p, d, f;
  for (;;) {
    p = rng.choice([40, 45, 50, 55, 60, 65, 70]); d = rng.choice([1.8, 2, 2.2, 2.5, 3, 4]);
    f = ((p / 100) * (d - 1) - (1 - p / 100)) / (d - 1);
    if (f > 0.02) break;
  }
  return item({ key: `kelly:${p}:${d}`, drill: "kelly",
    prompt: `You believe the true chance is ${p}% and the decimal odds are ${fmt(d)}. What share of your bankroll does the Kelly formula say to stake? ${PCT}`, answer: f * 100,
    explanation: `Kelly = (p x (odds - 1) - (1 - p)) / (odds - 1) = (${p / 100} x ${fmt(r2(d - 1))} - ${(1 - p / 100).toFixed(2)}) / ${fmt(r2(d - 1))} = ${(f * 100).toFixed(1)}%. | Full Kelly assumes your ${p}% is exactly right. It never is, so people stake half Kelly or less. Overestimate your edge and Kelly goes broke.`, abs_tol: 1.0 });
}

// ======================= Houston energy basics =======================
function oil_revenue(rng) {
  const bpd = rng.choice([1000, 2000, 5000, 10000, 20000, 50000]);
  const price = rng.choice([50, 60, 70, 75, 80, 90]);
  const ans = (bpd * price * 90) / 1e6;
  return item({ key: `oil_revenue:${bpd}:${price}`, drill: "oil_revenue",
    prompt: `A producer pumps ${fmt(bpd)} barrels a day and oil sells at $${price}. Roughly what is revenue for a 90-day quarter? ${USDM}`, answer: ans,
    explanation: `${fmt(bpd)} x ${price} x 90 = $${fmt(r2(ans))}M. | Barrels per day times price times days. Shortcut: bpd x price x 0.09 gives $M per quarter.`, rel_tol: 0.05, abs_tol: 0.2 });
}

function netback(rng) {
  const p = rng.choice([60, 70, 75, 80, 90]);
  const opex = rng.choice([10, 12, 15, 18, 20]);
  const roy = rng.choice([8, 10, 12, 15]);
  const trans = rng.choice([2, 3, 4, 5]);
  const ans = p - opex - roy - trans;
  return item({ key: `netback:${p}:${opex}:${roy}:${trans}`, drill: "netback",
    prompt: `Oil sells at $${p} a barrel. Operating cost is $${opex}, royalties $${roy}, and transport $${trans}, all per barrel. What does the producer keep per barrel? ${USD}`, answer: ans,
    explanation: `${p} - ${opex} - ${roy} - ${trans} = $${ans}. | This is the "netback": price minus the costs of getting a barrel to market. Royalties go to whoever owns the minerals.`, abs_tol: 0.5 });
}

function decline(rng) {
  const bpd = rng.choice([500, 800, 1000, 1500, 2000, 5000]);
  const r = rng.choice([20, 25, 30, 40, 50, 60]);
  return item({ key: `decline:${bpd}:${r}`, drill: "decline",
    prompt: `A well produces ${fmt(bpd)} barrels a day and output falls ${r}% a year. What does it produce a year from now? Answer in barrels a day.`, answer: bpd * (1 - r / 100),
    explanation: `${fmt(bpd)} x (1 - ${r / 100}) = ${fmt(bpd * (1 - r / 100))}. | Shale wells decline fast, often 50% or more in year one. That is why producers must keep drilling to stand still.`, rel_tol: 0.02, abs_tol: 5 });
}

function reserve_life(rng) {
  const mmbbl = rng.choice([10, 20, 36.5, 50, 73, 100, 146]);
  const bpd = rng.choice([5000, 10000, 20000, 40000]);
  const ans = (mmbbl * 1e6) / (bpd * 365);
  return item({ key: `reserve_life:${mmbbl}:${bpd}`, drill: "reserve_life",
    prompt: `A company has ${fmt(mmbbl)} million barrels of reserves and produces ${fmt(bpd)} barrels a day. At that rate, how many years of reserves does it have? Answer in years.`, answer: ans,
    explanation: `${fmt(mmbbl)}M / (${fmt(bpd)} x 365 = ${fmt(bpd * 365)} a year) = ${fmt(r2(ans))} years. | "Reserve life" or R/P ratio. Ten years is typical; much less means the company must buy or find more.`, rel_tol: 0.05, abs_tol: 0.3 });
}

function breakeven_price(rng) {
  const opex = rng.choice([10, 12, 15, 18, 20]);
  const capex = rng.choice([15, 20, 25, 30, 35]);
  const roy = rng.choice([10, 12.5, 15, 20, 25]);
  const ans = (opex + capex) / (1 - roy / 100);
  return item({ key: `breakeven_price:${opex}:${capex}:${roy}`, drill: "breakeven_price",
    prompt: `Operating cost is $${opex} a barrel and drilling cost works out to $${capex} a barrel. Royalties take ${fmt(roy)}% of the sale price. What oil price does the producer need to break even? ${USD}`, answer: ans,
    explanation: `Costs = ${opex} + ${capex} = ${opex + capex}. Royalty is a share of price, so price = ${opex + capex} / (1 - ${roy / 100}) = $${fmt(r2(ans))}. | When oil trades below a basin's break-even, rigs get parked.`, rel_tol: 0.03, abs_tol: 0.5 });
}

// ======================= registry =======================
export const DRILLS = {
  pot_odds, outs_equity, ev_call, implied_odds, combos,
  percent_of, fraction_to_decimal, multiply_shortcuts, growth_rate, back_of_envelope,
  equity_value, multiple_to_yield, after_tax_debt, lbo_return, accretion, interest_coverage,
  contribution_margin, payback_months, break_even_units, discount_trap, roas_to_return, customer_value,
  rebooking_revenue, unrealized_revenue, rate_card, pipeline_revenue, lifetime_value,
  american_to_prob, decimal_to_prob, fraction_to_decimal_odds, remove_vig, bet_ev, kelly,
  oil_revenue, netback, decline, reserve_life, breakeven_price,
  ...interview, ...finance, ...quick2, ...quant,
};

export const GROUPS = {
  poker: ["pot_odds", "outs_equity", "count_outs", "pot_odds_ratio", "ev_call", "implied_odds", "combos", "price_out_draw"],
  interview: ["pot_odds", "outs_equity", "count_outs", "pot_odds_bet", "bluff_break_even", "pot_odds_decision"],
  quick: ["percent_of", "reverse_percent", "percent_chain", "fraction_to_decimal", "multiply_shortcuts", "near_100", "halve_double", "split_multiply", "round_adjust", "divide_shortcuts", "unit_juggle", "growth_rate", "back_of_envelope"],
  banking: ["equity_value", "ev_from_equity", "multiple_to_yield", "pe_ratio", "dividend_yield", "after_tax_debt", "wacc", "capm", "discount_one_year", "perpetuity", "lbo_return", "lbo_moic", "accretion", "accretion_mix", "synergies_breakeven", "dcf_two_year", "debt_paydown", "cap_table", "interest_coverage", "bank_spread"],
  accounting: ["balance_sheet", "eps", "net_income_from_ebit", "working_capital", "dep_net_income", "dep_cash", "statement_direction"],
  betting: ["american_to_prob", "decimal_to_prob", "fraction_to_decimal_odds", "remove_vig", "bet_ev", "kelly"],
  moose: ["contribution_margin", "payback_months", "break_even_units", "discount_trap", "roas_to_return", "customer_value"],
  novyx: ["rebooking_revenue", "unrealized_revenue", "rate_card", "pipeline_revenue", "lifetime_value"],
  energy: ["oil_revenue", "netback", "decline", "reserve_life", "breakeven_price"],
  valuation: ["ufcf", "tv_exit_multiple", "tv_perpetuity_vs_exit", "implied_growth", "mid_year_direction", "comps_implied_ev", "multiple_translate", "pe_from_ev_ebitda"],
  walks: ["walk_depreciation_cash", "walk_inventory_writedown", "walk_sell_inventory", "walk_capex_cash", "walk_debt_raise", "walk_buyback"],
  deals: ["sources_uses_equity", "leverage_turns", "cash_sweep_year", "moic_from_irr", "exit_multiple_breakeven", "irr_sensitivity_direction", "value_creation_split"],
  rates: ["price_yield_direction", "current_yield", "call_payoff"],
  prob: ["dice_ev", "flips_to_first_heads", "make_a_market", "conditional_small", "bayes_100", "mean_variance_quick", "standard_error", "vol_sqrt_time", "sharpe_quick", "z_score", "correlation_sign", "market_size_steps"],
};
// Drills that join a set only once it is Solid: they rest on a derivation (duration as a derivative, parity, delta) worth earning first.
export const LATER = { rates: ["duration_price_change", "put_call_parity_number", "delta_hedge_shares"] };
GROUPS.all = Object.values(GROUPS).flat().filter((v, i, a) => a.indexOf(v) === i);

// Home-screen order, label, and one-line subtitle.
export const GROUP_LABELS = {
  interview: ["Interview set", "Pot odds, outs, bet sizing, bluffs, call or fold. The FIR question and its follow-ups."],
  poker: ["Poker math", "Pot odds, outs, EV, implied odds, combos, pricing out a draw"],
  quick: ["Quick math", "Percent tricks, fast multiplying and dividing, fractions, growth, units"],
  banking: ["Banking interview numbers", "EV, P/E, cost of capital, discounting, buyout returns, bank spread"],
  accounting: ["Accounting interview numbers", "Balance sheet, EPS, net income, working capital, the depreciation question"],
  betting: ["Sports betting math", "Odds formats, fair chance, the vig, EV, Kelly. Math only."],
  moose: ["Mighty Moose numbers", "Margin, payback, break-even, the discount trap, ad returns"],
  novyx: ["Novyx numbers", "Rebooking, revenue gaps, rate cards, pipeline, customer value"],
  energy: ["Houston energy basics", "Barrels, netback, decline, reserve life, break-even price"],
  valuation: ["Valuation pieces", "Free cash flow, the two terminal values, mid-year, comps, implied share price"],
  walks: ["Accounting walks", "One event, three statements, one number at the end"],
  deals: ["Deal math", "Sources and uses, debt tranches, the sweep, IRR shortcuts, what moves returns"],
  rates: ["Rates and options", "Bonds the fast way, option payoffs, parity as a number, delta as shares"],
  prob: ["Probability and statistics", "Dice, coins, Bayes with 1,000 people, standard error, square root of time, Fermi"],
  all: ["Everything", "All sets mixed"],
};

// A set unlocks when the one before it is Solid on every drill. Override allowed.
export const UNLOCK_AFTER = { betting: "poker", deals: "banking", rates: "deals" };

export const DEFINITIONS = {
  ufcf: "Unlevered free cash flow: EBIT x (1 - tax) + D&A - capex - increase in working capital. The cash a DCF discounts.",
  tv_exit_multiple: "Terminal value by exit multiple: final-year EBITDA times the multiple peers trade at.",
  tv_perpetuity_vs_exit: "Terminal value by perpetuity: final cash flow x (1 + g) / (rate - g). Cross-check it against the exit-multiple number.",
  implied_growth: "Implied growth: the long-run growth rate an exit multiple assumes. g = (TV x r - FCF) / (TV + FCF).",
  mid_year_direction: "Mid-year convention: discount each year's cash by half a year less, because cash arrives through the year.",
  comps_implied_ev: "Comps chain: peer multiple x target EBITDA = EV; minus net debt = equity; divided by shares = price.",
  multiple_translate: "Translating multiples: EV/EBITDA = (EV/Revenue) / EBITDA margin.",
  pe_from_ev_ebitda: "From EV multiple to P/E: EV minus net debt is equity value; divide by net income.",
  walk_depreciation_cash: "The depreciation walk: more depreciation cuts net income by the after-tax amount and raises cash by the tax saved.",
  walk_inventory_writedown: "Inventory write-down: a non-cash expense. Equity falls after tax, cash rises by the tax saved.",
  walk_sell_inventory: "Selling inventory for cash: net income rises by the after-tax profit; cash rises by the sale minus tax (the inventory was paid for earlier).",
  walk_capex_cash: "Capex walk: the purchase hits cash now; only depreciation hits net income, a year at a time.",
  walk_debt_raise: "Raising debt: cash up by the amount, less the after-tax interest in year one. Net income down by the after-tax interest.",
  walk_buyback: "Buyback: cash down, equity down, net income unchanged, share count down, so EPS up.",
  sources_uses_equity: "Sources and uses: uses are price plus fees; sources are debt plus the equity check, which is the plug.",
  leverage_turns: "Turns of leverage: debt as a multiple of EBITDA. Blended rate weights each tranche by its size.",
  cash_sweep_year: "Cash sweep: a share of spare cash goes straight to repaying debt each year.",
  moic_from_irr: "MOIC from IRR: (1 + IRR) to the power of years. 2x in 5 years is about 15%, 3x about 25%.",
  exit_multiple_breakeven: "Break-even exit multiple: entry EV divided by exit EBITDA. Below it, multiple compression eats the growth.",
  irr_sensitivity_direction: "IRR drivers: EBITDA growth, debt paydown, exit multiple, and how early the cash comes back.",
  value_creation_split: "Returns attribution: equity gain = EBITDA growth + debt paydown + multiple expansion. Solve for the missing piece.",
  price_yield_direction: "Price and yield move opposite ways. Longer maturity and lower coupon mean a bigger price move.",
  current_yield: "Current yield: coupon / price. Yield to maturity also counts the pull back to 100 at maturity.",
  duration_price_change: "Duration: price change in percent is about minus duration times the yield change in percent.",
  call_payoff: "Option payoff at expiry: call pays max(stock - strike, 0), put pays max(strike - stock, 0). Subtract the premium for profit.",
  put_call_parity_number: "Put-call parity: call - put = stock - PV(strike). Use it to back out the present value of the strike.",
  delta_hedge_shares: "Delta hedge: contracts x 100 x delta is the share exposure. Sell that many shares to be flat.",
  dice_ev: "Fair price of a game: the expected payout. Averages add; for independent things, averages multiply.",
  flips_to_first_heads: "Expected tries to the first success: 1 / p. Coin: 2 flips. Die for a six: 6 rolls.",
  make_a_market: "Make a market: quote a bid below fair value and an offer above it. Know fair value first.",
  conditional_small: "Conditional probability by counting: list the outcomes that fit the condition, then count the ones you want.",
  bayes_100: "Bayes with a crowd: picture 1,000 people, count true and false positives, divide.",
  mean_variance_quick: "Mean is the average. Population variance is the average squared distance from the mean; its square root is the standard deviation.",
  standard_error: "Standard error of the mean: sd / sqrt(n). Mean / SE is the t-statistic; 2 is the usual bar.",
  vol_sqrt_time: "Volatility scales with the square root of time: daily x sqrt(252), monthly x sqrt(12).",
  sharpe_quick: "Sharpe ratio: (return - risk-free) / volatility. Annualise a monthly Sharpe by sqrt(12).",
  z_score: "Z-score: (observation - mean) / sd. One-sided tails: 1 sd 16%, 2 sd 2.5%, 3 sd 0.15%.",
  correlation_sign: "Correlation: -1 to 1, whether two things move together. Equal-weight portfolio vol = vol x sqrt((1 + correlation) / 2).",
  market_size_steps: "Market sizing: chain the givens, one step at a time, and say which assumption is weakest.",
  pot_odds: "Pot odds: the share of the final pot your call is. Call / (pot + call) is the win rate you need to break even.",
  pot_odds_bet: "When the pot is stated before the bet, the number is bet / (pot + 2 x bet). Half-pot needs 25%, full pot 33%.",
  bluff_break_even: "A bluff breaks even when they fold bet / (pot + bet) of the time. Pot odds from the bettor's side.",
  pot_odds_decision: "Call when your chance of hitting is above the pot-odds number. Judge the decision, not the result.",
  count_outs: "Outs: the unseen cards that make your hand. Add the draws, subtract any card counted twice.",
  pot_odds_ratio: "Pot odds as a ratio: pot to call. 3 to 1 means you need to win one time in four.",
  price_out_draw: "A bet prices out a draw when the pot odds it offers are worse than the draw's chance of hitting.",
  near_100: "Numbers near 100: use the gaps from 100 for the front and back halves.",
  halve_double: "Halve the even one, double the other, until the product is easy.",
  split_multiply: "Split one factor into tens and ones, multiply each, add.",
  round_adjust: "Multiply by the nearest round number, then fix the difference.",
  divide_shortcuts: "Divide by 4, 5, 8, 25, 50 with halving and doubling instead of long division.",
  reverse_percent: "If a part is p% of a whole, the whole is part / p.",
  percent_chain: "Percent changes multiply. Up 20 then down 20 is down 4.",
  unit_juggle: "Millions, billions, per-share, per-day: name the units, then multiply or cancel them.",
  accretion_mix: "Mixed deals: compare the target's earnings yield with the blended cost of the buyer's stock and after-tax debt.",
  synergies_breakeven: "Synergies needed = premium paid / the multiple peers trade at.",
  dcf_two_year: "Discount each year's cash by (1 + rate) to that year's power, add the terminal value in the last year.",
  debt_paydown: "Debt at exit = starting debt minus yearly paydown times years.",
  cap_table: "After a raise you keep pre-money / (pre-money + new money) of what you had.",
  ev_from_equity: "Enterprise value = market cap + debt - cash. The price of the whole business.",
  pe_ratio: "P/E = price / earnings per share. Years of earnings you pay for. Flip it for the earnings yield.",
  dividend_yield: "Dividend yield = yearly dividend / price.",
  wacc: "WACC: the blended cost of a company's money, equity at its cost plus debt at its after-tax cost, weighted.",
  capm: "Cost of equity by CAPM: risk-free rate + beta x market premium.",
  discount_one_year: "A dollar later is worth less now. Divide by (1 + rate) once per year.",
  perpetuity: "A cash flow forever is worth cash flow / (rate - growth). The terminal value formula.",
  lbo_moic: "Buyout multiple: equity out / equity in. Debt paid down and growth both land on the equity.",
  bank_spread: "A bank earns the gap between what it charges borrowers and pays depositors, on its loan book.",
  balance_sheet: "Assets = liabilities + equity. Always.",
  eps: "Earnings per share = net income / shares outstanding.",
  net_income_from_ebit: "Net income = (EBIT - interest) x (1 - tax rate).",
  working_capital: "Working capital = current assets - current liabilities. Cash tied up in running the business.",
  dep_net_income: "More depreciation lowers net income by the amount times (1 - tax rate).",
  dep_cash: "More depreciation raises cash by the tax saved: amount x tax rate.",
  statement_direction: "Three-statement questions: one event, then which way each of net income, cash, and the balance sheet moves.",
  outs_equity: "Outs are cards that make your hand. Rule of 4 and 2: outs x 4 with two cards to come, x 2 with one.",
  ev_call: "Expected value (EV): what a decision earns on average. Win chance x pot minus lose chance x cost.",
  implied_odds: "Implied odds: pot odds plus the money you expect to win later if you hit.",
  combos: "Combos: how many exact two-card holdings make a hand. Six per pocket pair, sixteen per two-rank hand.",
  percent_of: "Percent means per hundred. Start from 10% and scale.",
  fraction_to_decimal: "A fraction is a division. Memorise 1/n and multiply.",
  multiply_shortcuts: "Patterns that replace long multiplication: x11, squares ending in 5, x25 as quarter-then-hundred.",
  growth_rate: "Growth rate is change divided by the starting value. Rule of 72: years to double is about 72 / rate.",
  back_of_envelope: "Rough interview numbers: EV/EBITDA, EBITDA from a margin, market cap, interest expense. Within 5% counts.",
  equity_value: "Enterprise value is the whole business. Equity value = EV minus debt plus cash.",
  multiple_to_yield: "A multiple upside down is a yield. 20x earnings is a 5% earnings yield.",
  after_tax_debt: "Interest is tax-deductible, so the real cost of debt is the rate times (1 minus the tax rate).",
  lbo_return: "A buyout's return is stated two ways: the multiple of money (MOIC) and the yearly rate (IRR).",
  accretion: "Accretive means the deal raises the buyer's earnings per share; dilutive means it lowers them.",
  interest_coverage: "Interest coverage: EBITDA divided by interest. How many times over the company can pay its lenders.",
  contribution_margin: "Contribution margin: what each sale leaves after the costs that come with that sale.",
  payback_months: "Payback: months until a customer's contribution covers what it cost to win them.",
  break_even_units: "Break-even: fixed costs divided by contribution per unit.",
  discount_trap: "A discount comes out of margin, so a small discount needs a large volume lift to stand still.",
  roas_to_return: "ROAS is revenue per ad dollar. Profit per ad dollar is ROAS times margin, minus the dollar.",
  customer_value: "Customer value: contribution per order times orders per customer. Compare it to CAC.",
  rebooking_revenue: "Rebooking rate: the share of visits that book their next visit before leaving.",
  unrealized_revenue: "Unrealized revenue: the gap between current performance and what a well-run peer achieves.",
  rate_card: "Margin is a share of price. To hit a margin, divide cost by (1 minus margin).",
  pipeline_revenue: "Revenue = leads x close rate x average job.",
  lifetime_value: "Lifetime value (LTV): spend per visit x visits per year x years.",
  american_to_prob: "American odds: +150 means win 150 on 100; -200 means stake 200 to win 100. Both imply a chance.",
  decimal_to_prob: "Decimal odds are total payout per unit staked. Implied chance is 1 over that.",
  fraction_to_decimal_odds: "Fractional odds show profit per stake. Add 1 to get decimal odds.",
  remove_vig: "The vig is the book's cut: implied chances sum above 100%. Divide each by the total to get fair chances.",
  bet_ev: "Expected value of a bet: win chance x profit minus lose chance x stake. Practice only.",
  kelly: "Kelly: the bankroll share that maximises long-run growth if your win estimate is right. Most people use half.",
  oil_revenue: "Revenue = barrels per day x price x days.",
  netback: "Netback: price per barrel minus the costs of producing and delivering it.",
  decline: "Decline rate: how fast a well's output falls each year. Shale wells decline fast.",
  reserve_life: "Reserve life: reserves divided by yearly production. Years left at the current rate.",
  breakeven_price: "Break-even price: the oil price at which a barrel covers its costs, royalties included.",
};

export const EXPLANATIONS = {
  card: `POKER INDEX CARD (say these cold)

Pot odds        call / (pot + call). $10 into a $30 pot: 10 / 40 = 25%. You need to win 25% of the time to break even.
                As a ratio the pot lays you 3 to 1, and 1 / (3 + 1) is the same 25%.
Outs to equity  Rule of 4 and 2: outs x 4 on the flop, outs x 2 on the turn. It is an approximation.
                9 outs (flush draw): about 35% with two cards to come (exact 34.97%), about 20% with one (exact 19.6%).
                8 outs (open-ended straight): 32% / 17%.  4 outs (gutshot): 17% / 8.7%.  15 outs: 54% / 33%.
Decision        Call when your chance of winning is above the pot-odds number. Judge the decision, not the result.
EV              win chance x pot minus (1 - win chance) x call. Positive means call, negative means fold.
Implied odds    Money you expect to win later if you hit. They justify a call the pot alone does not.
Combos          Pocket pair 6, suited 4, offsuit 12, any two ranks 16. Holding one of the rank: pair 3, two-rank 12.`,
  pot_odds: `POT ODDS
The pot is $30. Your opponent bets $10, so it costs you $10 to call.
If you call and win, you win the $30 pot plus their $10 bet, minus your own $10 back: net +$30.
If you call and lose, net -$10. Break-even happens when p x 30 = (1 - p) x 10, so p = 10 / 40 = 25%.
Shortcut: call / (pot + call). Ratio form: the pot offers 3 to 1; 1 / (3 + 1) = 25%.
Follow-up you will get asked: "and with one card to come?" A flush draw is 9 / 46 = 19.6% then, so 25% is not enough. Fold.`,
  outs_equity: `OUTS TO EQUITY
An out is a card that makes your hand. On the flop there are 47 cards you have not seen; on the turn, 46.
One card to come: outs / 46. Nine outs = 19.6%. Rule of 2 says 18%.
Two cards to come: 1 - (miss on turn) x (miss on river) = 1 - (38/47)(37/46) = 34.97% for nine outs. Rule of 4 says 36%.
The rule of 4 overshoots more as outs grow; above about 8 outs, subtract (outs - 8) from the rule-of-4 number.`,
  ev_call: `EXPECTED VALUE OF A CALL
EV = (chance to win) x (what you win) - (chance to lose) x (what you pay).
Pot $60, $20 to call, 30% to win: 0.30 x 60 - 0.70 x 20 = 18 - 14 = +$4. Call.
Same spot at 20%: 12 - 16 = -$4. Fold. The break-even is 20 / 80 = 25%, the pot-odds number.`,
  implied_odds: `IMPLIED ODDS
Pot odds only count money already in the pot. Implied odds add what you expect to win later when you hit.
Pot $30, $10 to call, 20% to win. Pot odds say you need 25%, so calling is wrong on the pot alone.
For 20% to break even the final pot must be call / chance = 10 / 0.20 = $50. Only $40 is there after your call,
so you need to win $10 more on later streets. If your opponent will pay that off, the call becomes correct.
Reverse implied odds: when you hit but still lose a big pot (a low flush against a higher one). Discount for it.`,
  combos: `HAND COMBINATIONS
A combo is one exact two-card holding. Count them to weigh what an opponent can have.
Pocket pair: 4 cards of that rank, choose 2 = 6. Suited hand like AK suited: one per suit = 4.
Offsuit: 4 x 4 = 16 total two-rank combos minus the 4 suited = 12. Any AK: 16.
Blockers: cards you hold remove combos. Holding one ace leaves AA at 3 combos and AK at 3 x 4 = 12.`,
};

export function resolve(name) {
  if (GROUPS[name]) return [...GROUPS[name]];
  if (DRILLS[name]) return [name];
  throw new Error(`Unknown drill or group: ${name}`);
}

export function buildQueue(store, drillNames, n, rng) {
  const wanted = new Set(drillNames);
  const queue = [];
  const seen = new Set();
  for (const star of store.starredItems()) {
    if (queue.length >= n || !wanted.has(star.drill) || !DRILLS[star.drill]) continue;
    for (let t = 0; t < 20; t++) {
      const it = DRILLS[star.drill](rng, { family: star.family });
      if (familyOf(it) === star.family && !seen.has(it.key)) { seen.add(it.key); queue.push(it); break; }
    }
  }
  let i = 0, tries = 0;
  while (queue.length < n && tries < n * 50) {
    const it = DRILLS[drillNames[i % drillNames.length]](rng);
    i += 1; tries += 1;
    if (seen.has(it.key)) continue;
    seen.add(it.key); queue.push(it);
  }
  return queue;
}
