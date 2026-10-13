// M&A, deeper: the numbers behind "accretive or dilutive?". A draft until the owner passes its explain-it check
// (web/content.js). Plan: docs/superpowers/specs/future/content.md. Goodwill ignores deferred taxes; every accretion
// prompt states the tax rate and how the deal is paid for.
import { item, fmt, r2, PCT, USDM } from "./core.js";

const PCT_SIGNED = "Answer in %, negative if it falls.";
const r1 = (x) => Math.round(x * 10) / 10;
const usd = (x) => `$${fmt(r2(x))}`;

export function mna_offer_value(rng) {
  const price = rng.choice([20, 25, 30, 40, 50]);
  const shares = rng.choice([40, 50, 60, 80, 100]);
  const prem = rng.choice([20, 25, 30, 40, 50]);
  const offer = price * (1 + prem / 100);
  const ans = offer * shares;
  return item({ key: `mna_offer_value:${price}:${shares}:${prem}`, drill: "mna_offer_value",
    prompt: `The target's stock is $${price}, with ${shares}M shares. The buyer offers a ${prem}% premium. What is the equity purchase price? ${USDM}`, answer: ans,
    explanation: `Offer per share = ${price} x ${1 + prem / 100} = ${usd(offer)}. Times ${shares}M shares = $${fmt(ans)}M. | The equity purchase price is what the target's shareholders receive. Add the target's net debt to get the enterprise value the buyer pays.`, rel_tol: 0.01, abs_tol: 0.5 });
}

export function mna_goodwill(rng) {
  const price = rng.choice([20, 25, 30, 40]);
  const shares = rng.choice([40, 50, 60]);
  const prem = rng.choice([20, 25, 30, 40]);
  const paid = price * (1 + prem / 100) * shares;
  const fair = Math.round((paid * rng.choice([0.4, 0.5, 0.55, 0.6, 0.7])) / 50) * 50;
  const book = fair - rng.choice([50, 100, 150]);
  const ans = paid - fair;
  return item({ key: `mna_goodwill:${price}:${shares}:${prem}:${fair}:${book}`, drill: "mna_goodwill",
    prompt: `The target has ${shares}M shares at $${price}. The buyer pays a ${prem}% premium. Net assets are $${fmt(book)}M on the books, $${fmt(fair)}M at fair value. Ignore deferred taxes. How much goodwill does the deal create? ${USDM}`, answer: ans,
    explanation: `Purchase price = ${price} x ${1 + prem / 100} x ${shares} = ${fmt(paid)}. Goodwill = price - fair value of the net assets = ${fmt(paid)} - ${fmt(fair)} = $${fmt(ans)}M. | Use fair value, not book: the ${fmt(fair - book)} write-up goes onto the assets themselves. Goodwill is what is left over, the price paid above what the assets are worth.`, rel_tol: 0.01, abs_tol: 0.5 });
}

export function mna_ownership(rng) {
  const bp = rng.choice([20, 25, 40, 50, 80]);
  const bs = rng.choice([50, 100, 150, 200]);
  const value = rng.choice([250, 400, 500, 600, 800, 1000, 1200, 1500, 2000]);
  const fresh = value / bp;
  const ans = (100 * fresh) / (bs + fresh);
  if (ans < 5 || ans > 50) return mna_ownership(rng);
  return item({ key: `mna_ownership:${bp}:${bs}:${value}`, drill: "mna_ownership",
    prompt: `The buyer's stock is $${bp}, with ${bs}M shares. It pays $${fmt(value)}M for the target, all in new shares. What share of the combined company do the target's owners hold? ${PCT}`, answer: ans,
    explanation: `New shares = ${fmt(value)} / ${bp} = ${fmt(r2(fresh))}M. Target owners hold ${fmt(r2(fresh))} / (${bs} + ${fmt(r2(fresh))}) = ${ans.toFixed(1)}%. | Divide the price by the buyer's share price to get the shares issued. The bottom of the fraction is old plus new shares, not old shares alone.`, abs_tol: 0.4 });
}

export function mna_accretion_cash(rng) {
  const ni = rng.choice([200, 300, 400, 500]);
  const shares = rng.choice([100, 200]);
  const target = rng.choice([30, 40, 50, 60, 75, 80]);
  const pe = rng.choice([12, 15, 16, 18, 20, 24, 25]);
  const price = target * pe;
  const rate = rng.choice([5, 6, 7, 8]);
  const tax = rng.choice([20, 25, 30]);
  const interest = (price * rate * (100 - tax)) / 10000;
  const ans = (100 * (target - interest)) / ni;
  if (Math.abs(ans) < 0.5 || Math.abs(ans) > 15) return mna_accretion_cash(rng);
  const eps0 = ni / shares, eps1 = (ni + target - interest) / shares;
  return item({ key: `mna_accretion_cash:${ni}:${shares}:${target}:${pe}:${rate}:${tax}`, drill: "mna_accretion_cash",
    prompt: `The buyer earns $${ni}M on ${shares}M shares. It buys a target earning $${target}M for $${fmt(price)}M, paid in cash borrowed at ${rate}%. Tax rate ${tax}%, no synergies. By what percent does the buyer's EPS change? ${PCT_SIGNED}`, answer: ans,
    explanation: `After-tax interest = ${fmt(price)} x ${rate}% x (1 - ${tax}%) = ${fmt(r2(interest))}. Net income ${ni} + ${target} - ${fmt(r2(interest))} = ${fmt(r2(ni + target - interest))} on the same ${shares}M shares. EPS ${eps0.toFixed(2)} to ${eps1.toFixed(2)}: ${ans > 0 ? "+" : ""}${ans.toFixed(1)}%. | Shortcut: (target earnings - after-tax interest) / buyer earnings. Check: the target's earnings yield (${fmt(r1(100 / pe))}%) ${ans > 0 ? "beats" : "is below"} the after-tax cost of debt (${fmt(r2((rate * (100 - tax)) / 100))}%).`, abs_tol: 0.2 });
}

export function mna_accretion_stock(rng) {
  const shares = rng.choice([100, 200]);
  const eps = rng.choice([1, 1.5, 2, 2.5]);
  const bpe = rng.choice([12, 15, 20, 25]);
  const tpe = rng.choice([10, 12, 15, 16, 20, 25, 30]);
  if (tpe === bpe) return mna_accretion_stock(rng);
  const target = rng.choice([20, 30, 40, 50, 60, 80]);
  const ni = eps * shares, bp = eps * bpe, price = target * tpe, fresh = price / bp;
  const eps1 = (ni + target) / (shares + fresh);
  const ans = 100 * (eps1 / eps - 1);
  if (Math.abs(ans) < 0.5 || Math.abs(ans) > 20) return mna_accretion_stock(rng);
  return item({ key: `mna_accretion_stock:${shares}:${eps}:${bpe}:${tpe}:${target}`, drill: "mna_accretion_stock",
    prompt: `The buyer earns $${fmt(ni)}M on ${shares}M shares, which trade at $${fmt(bp)}. It buys a target earning $${target}M for $${fmt(price)}M, paid in new shares at $${fmt(bp)}. No synergies. By what percent does the buyer's EPS change? ${PCT_SIGNED}`, answer: ans,
    explanation: `New shares = ${fmt(price)} / ${fmt(bp)} = ${fmt(r2(fresh))}M. EPS ${eps.toFixed(2)} before; (${fmt(ni)} + ${target}) / ${fmt(r2(shares + fresh))} = ${eps1.toFixed(3)} after: ${ans > 0 ? "+" : ""}${ans.toFixed(1)}%. | Quick check: the buyer's P/E of ${bpe} is ${bpe > tpe ? "above" : "below"} the target's ${tpe}, so it is ${bpe > tpe ? "accretive" : "dilutive"}. The percent needs the full math.`, abs_tol: 0.2 });
}

export function mna_eps_synergies(rng) {
  const shares = rng.choice([100, 200]);
  const eps = rng.choice([1, 2, 2.5]);
  const bpe = rng.choice([15, 20, 25]);
  const tpe = bpe + rng.choice([5, 10, 15]);
  const target = rng.choice([20, 30, 40, 50]);
  const tax = rng.choice([20, 25]);
  const ni = eps * shares, bp = eps * bpe, price = target * tpe, fresh = price / bp;
  const need = eps * (shares + fresh), gap = need - (ni + target);
  const ans = gap / (1 - tax / 100);
  return item({ key: `mna_eps_synergies:${shares}:${eps}:${bpe}:${tpe}:${target}:${tax}`, drill: "mna_eps_synergies",
    prompt: `The buyer earns $${fmt(ni)}M on ${shares}M shares at $${fmt(bp)}. It buys a target earning $${target}M for $${fmt(price)}M, all in new shares at $${fmt(bp)}. Tax rate ${tax}%. What yearly pre-tax synergies keep the buyer's EPS unchanged? ${USDM}`, answer: ans,
    explanation: `New shares = ${fmt(price)} / ${fmt(bp)} = ${fmt(r2(fresh))}M. To hold EPS at ${eps.toFixed(2)} on ${fmt(r2(shares + fresh))}M shares, net income must be ${fmt(r2(need))}; the two companies make ${fmt(ni + target)}. The ${fmt(r2(gap))} gap is after tax, so pre-tax synergies = ${fmt(r2(gap))} / (1 - ${tax}%) = $${fmt(r2(ans))}M. | Breakeven synergies: the extra yearly profit that makes a dilutive deal EPS-neutral.`, rel_tol: 0.03, abs_tol: 0.3 });
}

export function mna_max_cash_price(rng) {
  const target = rng.choice([30, 36, 45, 54, 60, 72, 90]);
  const rate = rng.choice([5, 6, 8]);
  const tax = rng.choice([20, 25]);
  const cost = (rate * (100 - tax)) / 10000;
  const ans = target / cost;
  return item({ key: `mna_max_cash_price:${target}:${rate}:${tax}`, drill: "mna_max_cash_price",
    prompt: `A target earns $${target}M a year. The buyer would borrow the whole price at ${rate}%, tax rate ${tax}%, no synergies. What is the most it can pay without diluting its EPS? ${USDM}`, answer: ans,
    explanation: `After-tax cost of debt = ${rate}% x (1 - ${tax}%) = ${fmt(r2(cost * 100))}%. Break-even is where after-tax interest equals the target's earnings: price x ${fmt(r2(cost * 100))}% = ${target}, so price = $${fmt(r2(ans))}M, ${fmt(r1(1 / cost))}x earnings. | Same rule as accretion: a cash deal adds to EPS while the target's earnings yield beats the after-tax cost of debt.`, rel_tol: 0.02, abs_tol: 1 });
}
