// Quick-math drills tied to the mental-method lessons.
import { item, fmt, r2, NUM, PCT, USD, USDM } from "./core.js";

export function near_100(rng) {
  const a = rng.randint(88, 99), b = rng.randint(88, 99);
  const ga = 100 - a, gb = 100 - b;
  return item({ key: `near_100:${a}:${b}`, drill: "near_100", prompt: `What is ${a} x ${b}? ${NUM}`, answer: a * b,
    explanation: `Gaps from 100: ${ga} and ${gb}. Front: ${a} - ${gb} = ${a - gb}. Back: ${ga} x ${gb} = ${String(ga * gb).padStart(2, "0")}. So ${fmt(a * b)}. | Exact: ${a} x ${b} = ${fmt(a * b)}.` });
}

export function halve_double(rng) {
  const a = rng.choice([12, 14, 16, 18, 22, 24, 26, 28, 32, 36, 44, 48]);
  const b = rng.choice([15, 25, 35, 45, 55, 75]);
  return item({ key: `halve_double:${a}:${b}`, drill: "halve_double", prompt: `What is ${a} x ${b}? ${NUM}`, answer: a * b,
    explanation: `Halve ${a}, double ${b}: ${a / 2} x ${b * 2} = ${fmt(a * b)}. | Keep going while one side is even and the other is not yet round.` });
}

export function split_multiply(rng) {
  const a = rng.randint(21, 89), b = rng.randint(3, 9);
  const tens = Math.floor(a / 10) * 10, ones = a % 10;
  return item({ key: `split_multiply:${a}:${b}`, drill: "split_multiply", prompt: `What is ${a} x ${b}? ${NUM}`, answer: a * b,
    explanation: `${tens} x ${b} = ${fmt(tens * b)}, then ${ones} x ${b} = ${ones * b}. Add: ${fmt(a * b)}. | Say the big part first so you hold less in your head.` });
}

const DIVISORS = { d4: 4, d5: 5, d8: 8, d25: 25, d50: 50 };
export function divide_shortcuts(rng, opts = {}) {
  const kind = opts.family ? opts.family.split(":")[1] : rng.choice(Object.keys(DIVISORS));
  const d = DIVISORS[kind];
  const q = rng.choice(d === 25 || d === 50 ? [7, 9, 11, 13, 17, 19, 23, 31, 44, 52] : [17, 23, 39, 46, 57, 68, 81, 93, 123, 135, 250, 375]);
  const n = q * d;
  const how = { d4: `halve twice: ${n / 2}, ${q}`, d5: `double, then divide by 10: ${n * 2}, ${q}`, d8: `halve three times: ${n / 2}, ${n / 4}, ${q}`, d25: `times 4, then divide by 100: ${n * 4}, ${q}`, d50: `double, then divide by 100: ${n * 2}, ${q}` }[kind];
  return item({ key: `divide_shortcuts:${d}:${n}`, drill: "divide_shortcuts", family: `divide_shortcuts:${kind}`, prompt: `What is ${fmt(n)} / ${d}? ${NUM}`, answer: q,
    explanation: `${how}. | Exact: ${fmt(n)} / ${d} = ${q}.`, abs_tol: 0.01 });
}

export function round_adjust(rng) {
  const a = rng.choice([19, 21, 29, 31, 39, 41, 49, 51, 59, 61, 69, 71, 79, 81, 89, 91, 18, 22, 28, 32, 38, 42, 48, 52, 58, 62]);
  const b = rng.randint(3, 9);
  const round = Math.round(a / 10) * 10, gap = a - round;
  return item({ key: `round_adjust:${a}:${b}`, drill: "round_adjust", prompt: `What is ${a} x ${b}? ${NUM}`, answer: a * b,
    explanation: `${round} x ${b} = ${fmt(round * b)}, then ${gap > 0 ? "add" : "subtract"} ${Math.abs(gap)} x ${b} = ${Math.abs(gap) * b}: ${fmt(a * b)}. | The adjustment is the gap times the other factor.` });
}

export function reverse_percent(rng) {
  const pct = rng.choice([20, 25, 40, 50, 60, 75, 80, 90, 120, 125, 150]);
  const whole = rng.choice([40, 60, 80, 120, 160, 200, 240, 300, 400, 500]);
  const part = (whole * pct) / 100;
  return item({ key: `reverse_percent:${part}:${pct}`, drill: "reverse_percent", prompt: `${fmt(part)} is ${pct}% of what number? ${NUM}`, answer: whole,
    explanation: `${fmt(part)} / ${pct / 100} = ${fmt(whole)}. | Divide by the percent as a decimal. Check: ${pct}% of ${fmt(whole)} is ${fmt(part)}.`, rel_tol: 0.01, abs_tol: 0.5 });
}

export function percent_chain(rng) {
  const a = rng.choice([10, 20, 25, 30, 50, -10, -20, -25, -30, -50]);
  const b = rng.choice([10, 20, 25, 30, 50, -10, -20, -25, -30, -50]);
  const ans = ((1 + a / 100) * (1 + b / 100) - 1) * 100;
  const w = (x) => (x >= 0 ? `up ${x}%` : `down ${-x}%`);
  return item({ key: `percent_chain:${a}:${b}`, drill: "percent_chain", prompt: `Something goes ${w(a)}, then ${w(b)}. What is the total change? ${PCT} Negative if it ends lower.`, answer: ans,
    explanation: `${1 + a / 100} x ${1 + b / 100} = ${fmt(r2((1 + a / 100) * (1 + b / 100)))}, so ${fmt(r2(ans))}%. | Percent changes multiply; they do not add. Up 20 then down 20 is down 4.`, abs_tol: 0.6 });
}

export function unit_juggle(rng) {
  const kind = rng.choice(["per_share", "daily", "cap"]);
  if (kind === "per_share") {
    const total = rng.choice([1.2, 2.4, 3, 4.5, 6, 9]), shares = rng.choice([40, 50, 60, 100, 150, 200]);
    const ans = (total * 1000) / shares;
    return item({ key: `unit_juggle:per_share:${total}:${shares}`, drill: "unit_juggle", prompt: `A company is worth $${fmt(total)}B and has ${fmt(shares)}M shares. What is that per share? ${USD}`, answer: ans,
      explanation: `$${fmt(total)}B is ${fmt(total * 1000)}M. ${fmt(total * 1000)}M / ${fmt(shares)}M = $${fmt(r2(ans))}. | Convert both to the same unit first, then the units cancel.`, rel_tol: 0.02, abs_tol: 0.1 });
  }
  if (kind === "daily") {
    const yearly = rng.choice([365, 730, 1825, 3650, 7300]);
    const ans = yearly / 365;
    return item({ key: `unit_juggle:daily:${yearly}`, drill: "unit_juggle", prompt: `Yearly revenue is $${fmt(yearly)}M. Roughly what is that per day? ${USDM}`, answer: ans,
      explanation: `${fmt(yearly)} / 365 = ${fmt(r2(ans))}M a day. | Anchor: $365M a year is $1M a day.`, rel_tol: 0.05, abs_tol: 0.1 });
  }
  const price = rng.choice([8, 12, 25, 40, 60, 150]), shares = rng.choice([0.5, 1.2, 2, 3.5, 5]);
  const ans = price * shares;
  return item({ key: `unit_juggle:cap:${price}:${shares}`, drill: "unit_juggle", prompt: `A stock trades at $${price} and there are ${fmt(shares)}B shares. What is the market cap? Answer in $B.`, answer: ans,
    explanation: `${price} x ${fmt(shares)}B = $${fmt(ans)}B. | Dollars times billions of shares is billions of dollars.`, rel_tol: 0.02, abs_tol: 0.1 });
}
