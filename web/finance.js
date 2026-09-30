// Finance and accounting interview math at the level of a first-round undergrad interview.
import { item, fmt, r2, NUM, PCT, USD, USDM } from "./core.js";

// ---------- banking additions ----------
export function ev_from_equity(rng) {
  const cap = rng.choice([200, 400, 500, 800, 1000, 1500, 2000, 5000]);
  const debt = rng.choice([50, 100, 200, 300, 500, 800, 1000]);
  const cash = rng.choice([20, 50, 100, 150, 200, 400]);
  const ans = cap + debt - cash;
  return item({ key: `ev_from_equity:${cap}:${debt}:${cash}`, drill: "ev_from_equity",
    prompt: `A company's market cap is $${fmt(cap)}M. It carries $${fmt(debt)}M of debt and holds $${fmt(cash)}M of cash. What is its enterprise value? ${USDM}`, answer: ans,
    explanation: `EV = market cap + debt - cash = ${fmt(cap)} + ${fmt(debt)} - ${fmt(cash)} = ${fmt(ans)}. | Enterprise value is the price of the whole business: what a buyer pays for the equity plus the debt they take on, minus the cash they get back.`, rel_tol: 0.02, abs_tol: 1 });
}

export function pe_ratio(rng) {
  const eps = rng.choice([1, 2, 2.5, 4, 5, 8, 10]);
  const mult = rng.choice([8, 10, 12, 15, 16, 20, 25, 30]);
  const price = eps * mult;
  return item({ key: `pe_ratio:${price}:${eps}`, drill: "pe_ratio",
    prompt: `A stock trades at $${fmt(price)} and earned $${fmt(eps)} per share last year. What is its P/E ratio? ${NUM}`, answer: mult,
    explanation: `Price / earnings per share = ${fmt(price)} / ${fmt(eps)} = ${mult}x. | The P/E says how many years of current earnings you pay for. Flip it for the earnings yield: ${(100 / mult).toFixed(1)}%.`, abs_tol: 0.15 });
}

export function wacc(rng) {
  const e = rng.choice([40, 50, 60, 70, 80]);
  const ke = rng.choice([8, 9, 10, 11, 12]);
  const kd = rng.choice([4, 5, 6, 7, 8]);
  const t = rng.choice([20, 25, 30]);
  const ans = (e / 100) * ke + (1 - e / 100) * kd * (1 - t / 100);
  return item({ key: `wacc:${e}:${ke}:${kd}:${t}`, drill: "wacc",
    prompt: `A company is ${e}% equity and ${100 - e}% debt. Equity costs ${ke}%, debt costs ${kd}% before tax, and the tax rate is ${t}%. What is its blended cost of capital? ${PCT}`, answer: ans,
    explanation: `Equity: ${e / 100} x ${ke} = ${fmt(r2((e / 100) * ke))}. Debt after tax: ${(100 - e) / 100} x ${kd} x (1 - ${t / 100}) = ${fmt(r2((1 - e / 100) * kd * (1 - t / 100)))}. Total ${ans.toFixed(2)}%. | This is the WACC, the rate a company must earn to satisfy everyone who funds it. Debt is cheaper than equity because it is safer for the lender and the interest is tax-deductible.`, abs_tol: 0.15 });
}

export function capm(rng) {
  const rf = rng.choice([2, 3, 4, 4.5, 5]);
  const beta = rng.choice([0.6, 0.8, 1, 1.2, 1.5, 2]);
  const prem = rng.choice([4, 5, 6]);
  const ans = rf + beta * prem;
  return item({ key: `capm:${rf}:${beta}:${prem}`, drill: "capm",
    prompt: `The risk-free rate is ${fmt(rf)}%, the stock's beta is ${fmt(beta)}, and the market pays ${prem}% over the risk-free rate. What return do equity investors require? ${PCT}`, answer: ans,
    explanation: `${fmt(rf)} + ${fmt(beta)} x ${prem} = ${fmt(r2(ans))}%. | This is the cost of equity by CAPM. Beta measures how much the stock moves with the market: 1 is average, 2 is twice as jumpy.`, abs_tol: 0.15 });
}

export function perpetuity(rng) {
  const cf = rng.choice([10, 20, 50, 100, 200, 500]);
  const r = rng.choice([8, 10, 12, 15]);
  const g = rng.choice([0, 0, 2, 3, 4, 5]);
  const ans = cf / ((r - g) / 100);
  return item({ key: `perpetuity:${cf}:${r}:${g}`, drill: "perpetuity",
    prompt: g ? `A business will pay $${fmt(cf)}M next year, growing ${g}% a year forever. Investors want ${r}%. What is it worth today? ${USDM}` : `A business will pay $${fmt(cf)}M a year forever. Investors want ${r}%. What is it worth today? ${USDM}`, answer: ans,
    explanation: `Value = cash flow / (rate - growth) = ${fmt(cf)} / (${r}% - ${g}%) = ${fmt(cf)} / ${(r - g) / 100} = ${fmt(r2(ans))}. | The perpetuity formula. It is how the "terminal value" at the end of a DCF is usually computed, and it is very sensitive to the gap between rate and growth.`, rel_tol: 0.02, abs_tol: 1 });
}

export function discount_one_year(rng) {
  const pv = rng.choice([100, 200, 500, 1000, 2000]);
  const r = rng.choice([5, 8, 10, 12, 20, 25]);
  const fv = pv * (1 + r / 100);
  return item({ key: `discount_one_year:${fv}:${r}`, drill: "discount_one_year",
    prompt: `You will receive $${fmt(fv)} one year from now. Money is worth ${r}% a year to you. What is that payment worth today? ${USD}`, answer: pv,
    explanation: `${fmt(fv)} / (1 + ${r / 100}) = ${fmt(pv)}. | Discounting: a dollar later is worth less than a dollar now. Every valuation is some version of this line.`, rel_tol: 0.02, abs_tol: 1 });
}

export function lbo_moic(rng) {
  const ev = rng.choice([500, 800, 1000, 1200, 2000]);
  const debtPct = rng.choice([50, 60, 70]);
  const debt = (ev * debtPct) / 100;
  const exitEv = ev * rng.choice([1.2, 1.5, 1.8, 2]);
  const exitDebt = debt * rng.choice([0.5, 0.6, 0.75]);
  const ans = (exitEv - exitDebt) / (ev - debt);
  return item({ key: `lbo_moic:${ev}:${debt}:${exitEv}:${exitDebt}`, drill: "lbo_moic",
    prompt: `A fund buys a company for $${fmt(ev)}M using $${fmt(debt)}M of debt and the rest in equity. Five years later it sells for $${fmt(exitEv)}M with $${fmt(exitDebt)}M of debt left. How many times its equity did the fund get back? ${NUM}`, answer: ans,
    explanation: `Equity in: ${fmt(ev)} - ${fmt(debt)} = ${fmt(ev - debt)}. Equity out: ${fmt(exitEv)} - ${fmt(exitDebt)} = ${fmt(exitEv - exitDebt)}. Multiple: ${fmt(r2(ans))}x. | This is the whole leveraged buyout in one line: growth in the business plus debt paid down, all of it landing on a small equity check.`, rel_tol: 0.03, abs_tol: 0.05 });
}

export function bank_spread(rng) {
  const loans = rng.choice([100, 200, 500, 1000, 2000, 5000]);
  const lend = rng.choice([6, 7, 8, 9, 10]);
  const pay = rng.choice([2, 3, 4, 5]);
  const ans = (loans * (lend - pay)) / 100;
  return item({ key: `bank_spread:${loans}:${lend}:${pay}`, drill: "bank_spread",
    prompt: `A bank has $${fmt(loans)}M of loans out at ${lend}% and pays its depositors ${pay}%. How much does it earn a year on the gap? ${USDM}`, answer: ans,
    explanation: `Spread = ${lend}% - ${pay}% = ${lend - pay}%. On ${fmt(loans)}: ${fmt(ans)}. | The spread (net interest margin) is how a bank makes money: borrow short from depositors, lend long to borrowers, keep the difference.`, rel_tol: 0.02, abs_tol: 0.5 });
}

export function dividend_yield(rng) {
  const price = rng.choice([20, 25, 40, 50, 80, 100, 120]);
  const div = rng.choice([0.5, 1, 1.5, 2, 2.5, 3, 4]);
  const ans = (div / price) * 100;
  return item({ key: `dividend_yield:${div}:${price}`, drill: "dividend_yield",
    prompt: `A stock trades at $${fmt(price)} and pays $${fmt(div)} a year in dividends. What is the dividend yield? ${PCT}`, answer: ans,
    explanation: `${fmt(div)} / ${fmt(price)} = ${ans.toFixed(1)}%. | Yield is the cash you get per dollar invested, before any price change.`, abs_tol: 0.15 });
}

// ---------- accounting ----------
export function eps(rng) {
  const sh = rng.choice([10, 20, 25, 50, 100, 200, 500]);
  const ni = sh * rng.choice([0.5, 1, 1.5, 2, 2.5, 3, 4, 5]);
  return item({ key: `eps:${ni}:${sh}`, drill: "eps",
    prompt: `A company earned $${fmt(ni)}M of net income and has ${fmt(sh)}M shares. What are its earnings per share? ${USD}`, answer: ni / sh,
    explanation: `${fmt(ni)} / ${fmt(sh)} = $${fmt(ni / sh)}. | Earnings per share (EPS) is what P/E divides the price by. Issuing shares in a deal raises the denominator; that is where accretion and dilution come from.`, abs_tol: 0.03 });
}

export function dep_net_income(rng) {
  const d = rng.choice([10, 20, 25, 40, 50, 100]);
  const t = rng.choice([20, 25, 30, 40]);
  const ans = -d * (1 - t / 100);
  return item({ key: `dep_net_income:${d}:${t}`, drill: "dep_net_income",
    prompt: `Depreciation goes up by $${fmt(d)}M. The tax rate is ${t}%. How does net income change? ${USDM} Negative if it falls.`, answer: ans,
    explanation: `Pre-tax profit falls ${fmt(d)}. Taxes fall ${fmt(d)} x ${t}% = ${fmt(r2((d * t) / 100))}. Net income falls ${fmt(d)} x (1 - ${t / 100}) = ${fmt(r2(-ans))}. | First half of the classic "depreciation goes up by 10" question. The second half is what happens to cash.`, abs_tol: 0.3 });
}

export function dep_cash(rng) {
  const d = rng.choice([10, 20, 25, 40, 50, 100]);
  const t = rng.choice([20, 25, 30, 40]);
  const ans = (d * t) / 100;
  return item({ key: `dep_cash:${d}:${t}`, drill: "dep_cash",
    prompt: `Depreciation goes up by $${fmt(d)}M. The tax rate is ${t}%. How does cash change? ${USDM} Positive if it rises.`, answer: ans,
    explanation: `Net income falls ${fmt(r2(d * (1 - t / 100)))}, but depreciation is not cash, so add the ${fmt(d)} back: cash rises by ${fmt(d)} - ${fmt(r2(d * (1 - t / 100)))} = ${fmt(ans)}, which is the tax saved. | Cash goes up because the company paid less tax on a non-cash expense.`, abs_tol: 0.3 });
}

export function working_capital(rng) {
  const ca = rng.choice([100, 150, 200, 300, 500, 800, 1000]);
  const cl = rng.choice([50, 80, 100, 150, 200, 400, 600]);
  return item({ key: `working_capital:${ca}:${cl}`, drill: "working_capital",
    prompt: `Current assets are $${fmt(ca)}M and current liabilities are $${fmt(cl)}M. What is working capital? ${USDM} Negative if liabilities are larger.`, answer: ca - cl,
    explanation: `${fmt(ca)} - ${fmt(cl)} = ${fmt(ca - cl)}. | Working capital is the money tied up in running day to day: inventory and receivables minus what is owed to suppliers. When it grows, cash shrinks.`, rel_tol: 0.02, abs_tol: 1 });
}

export function net_income_from_ebit(rng) {
  const ebit = rng.choice([100, 150, 200, 300, 400, 500, 1000]);
  const i = rng.choice([10, 20, 25, 40, 50, 100]);
  const t = rng.choice([20, 25, 30]);
  const ans = (ebit - i) * (1 - t / 100);
  return item({ key: `net_income_from_ebit:${ebit}:${i}:${t}`, drill: "net_income_from_ebit",
    prompt: `Operating profit (EBIT) is $${fmt(ebit)}M, interest expense is $${fmt(i)}M, and the tax rate is ${t}%. What is net income? ${USDM}`, answer: ans,
    explanation: `(${fmt(ebit)} - ${fmt(i)}) x (1 - ${t / 100}) = ${fmt(ebit - i)} x ${1 - t / 100} = ${fmt(r2(ans))}. | Walk down the income statement: operating profit, minus interest, minus tax, equals what is left for shareholders.`, rel_tol: 0.02, abs_tol: 0.5 });
}

export function balance_sheet(rng) {
  const a = rng.choice([200, 300, 500, 800, 1000, 1500, 2000]);
  const l = rng.choice([100, 150, 200, 300, 400, 600, 900]);
  if (l >= a) return balance_sheet(rng);
  return item({ key: `balance_sheet:${a}:${l}`, drill: "balance_sheet",
    prompt: `A company has $${fmt(a)}M of assets and $${fmt(l)}M of liabilities. What is shareholders' equity? ${USDM}`, answer: a - l,
    explanation: `Assets = liabilities + equity, so equity = ${fmt(a)} - ${fmt(l)} = ${fmt(a - l)}. | The balance sheet always balances. Every event changes at least two of the three.`, rel_tol: 0.02, abs_tol: 1 });
}

const DIRECTION_CASES = [
  ["Depreciation rises. Net income?", 1, "Depreciation is an expense on the income statement; more of it means less profit."],
  ["Depreciation rises. Cash?", 0, "Less tax is paid on a non-cash expense, so cash rises by the tax saved."],
  ["Inventory rises, paid in cash. Net income?", 2, "Buying inventory moves cash into another asset; nothing hits the income statement until it is sold."],
  ["Inventory rises, paid in cash. Cash?", 1, "The cash left the company to buy the inventory."],
  ["The company issues $100M of new shares for cash. Total assets?", 0, "Cash comes in; equity goes up by the same amount."],
  ["The company issues $100M of new shares. Net income?", 2, "Financing does not touch the income statement."],
  ["The company takes on $100M of debt. Equity?", 2, "Debt raises assets (cash) and liabilities equally; equity is untouched."],
  ["The company pays a $50M dividend. Equity?", 1, "Dividends come out of retained earnings, which sits in equity."],
  ["The company pays a $50M dividend. Net income?", 2, "Dividends are paid from earnings; they are not an expense."],
  ["Interest expense rises. Cash?", 1, "Interest is a real cash cost, and it also lowers taxes a little, but the net is a cash outflow."],
  ["Accounts receivable rises. Cash?", 1, "Sales were booked but the customer has not paid yet; cash is behind profit."],
  ["Accounts payable rises. Cash?", 0, "The company has not yet paid its suppliers, so it is holding onto cash for longer."],
  ["A customer pays an invoice from last quarter. Net income?", 2, "The revenue was recognised when the sale was made; collecting it only moves receivables into cash."],
  ["The company buys a $200M factory with cash. Net income?", 2, "Buying an asset is capitalised, not expensed; depreciation hits later, a little each year."],
];
export function statement_direction(rng) {
  const idx = rng.randint(0, DIRECTION_CASES.length - 1);
  const [q, answer, why] = DIRECTION_CASES[idx];
  return item({ key: `statement_direction:${idx}`, drill: "statement_direction",
    prompt: `${q} Up, down, or no change?`, choices: ["Up", "Down", "No change"], answer,
    explanation: `${why} | Three-statement questions: an interviewer picks one event and walks you across the income statement, the cash flow statement, and the balance sheet.`, abs_tol: 0 });
}
