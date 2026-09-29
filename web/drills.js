// Drill generators. Mirrors applied_math/drills/*.py; keep the two in step.
// An item: { key, drill, prompt, answer, explanation, rel_tol, abs_tol }.

export function makeRng(seed = Date.now()) {
  // mulberry32: small, seedable, good enough for shuffling drill numbers.
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    random: next,
    choice: (arr) => arr[Math.floor(next() * arr.length)],
    randint: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    sample2: (arr) => { const i = Math.floor(next() * arr.length); let j = Math.floor(next() * (arr.length - 1)); if (j >= i) j += 1; return [arr[i], arr[j]]; },
  };
}

export function fmt(x) {
  if (Math.abs(x - Math.round(x)) < 1e-9) return Math.round(x).toLocaleString("en-US");
  return x.toLocaleString("en-US", { maximumFractionDigits: 3 });
}

export function parseAnswer(text) {
  let t = String(text).trim().replace(/,/g, "").replace(/\$/g, "").replace(/%$/, "").trim();
  if (!t) return null;
  const suffix = { k: 1e3, m: 1e6, b: 1e9 };
  let mult = 1;
  const last = t.slice(-1).toLowerCase();
  if (suffix[last]) { mult = suffix[last]; t = t.slice(0, -1); }
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
  return Number(t) * mult;
}

export function isCorrect(item, given) {
  const diff = Math.abs(given - item.answer);
  return diff <= Math.max(item.rel_tol * Math.max(Math.abs(given), Math.abs(item.answer)), item.abs_tol);
}

const item = (o) => ({ rel_tol: 0, abs_tol: 0.005, ...o });
const comb2 = (n) => (n * (n - 1)) / 2;

// ---------- poker ----------
const POTS = [20, 30, 40, 50, 60, 75, 80, 100, 120, 150, 200, 300];
const CALL_FRACTIONS = [[1, 4], [1, 3], [1, 2], [2, 3], [3, 4], [1, 1]];

function potAndCall(rng) {
  for (;;) {
    const pot = rng.choice(POTS);
    const [num, den] = rng.choice(CALL_FRACTIONS);
    if ((pot * num) % den === 0 && ((pot * num) / den) % 5 === 0) return [pot, (pot * num) / den];
  }
}

function pot_odds(rng) {
  const [pot, call] = potAndCall(rng);
  const answer = (call / (pot + call)) * 100;
  const ratio = Math.round((pot / call) * 100) / 100;
  return item({
    key: `pot_odds:${pot}:${call}`, drill: "pot_odds",
    prompt: `Pot is $${fmt(pot)} and it's $${fmt(call)} to call. Break-even equity (%)?`,
    answer,
    explanation: `call / (pot + call) = ${call} / ${pot + call} = ${answer.toFixed(1)}% | as odds: ${fmt(ratio)} to 1, and 1 / (${fmt(ratio)} + 1) is the same number`,
    abs_tol: 0.6,
  });
}

const DRAW_NAMES = { 2: "pocket pair to a set", 4: "gutshot", 6: "two overcards", 8: "open-ended straight draw", 9: "flush draw", 12: "flush draw plus gutshot", 15: "flush draw plus open-ended straight draw" };

function exactEquity(outs, cards) {
  return cards === 1 ? (outs / 46) * 100 : (1 - comb2(47 - outs) / comb2(47)) * 100;
}

function outs_equity(rng) {
  const outs = rng.randint(2, 15);
  const cards = rng.choice([1, 2]);
  const exact = exactEquity(outs, cards);
  const rule = outs * (cards === 2 ? 4 : 2);
  const street = cards === 2 ? "on the flop" : "on the turn";
  const name = DRAW_NAMES[outs];
  const lead = name ? `${name[0].toUpperCase()}${name.slice(1)} (${outs} outs)` : `${outs} outs`;
  return item({
    key: `outs_equity:${outs}:${cards}`, drill: "outs_equity",
    prompt: `${lead} ${street}, ${cards} ${cards === 1 ? "card" : "cards"} to come. Equity (%)?`,
    answer: exact,
    explanation: `rule of 4 and 2: ${outs} x ${cards === 2 ? 4 : 2} = ${rule}% | exact: ${exact.toFixed(1)}% (${outs} outs in ${cards === 2 ? 47 : 46} unseen cards${cards === 2 ? ", two draws" : ""})`,
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
    prompt: `Pot $${fmt(pot)}, $${fmt(call)} to call, ${eq}% equity. EV of calling ($)?`,
    answer,
    explanation: `win ${eq}% of $${pot} = ${fmt(Math.round(p * pot * 100) / 100)}; lose ${100 - eq}% of $${call} = ${fmt(Math.round((1 - p) * call * 100) / 100)}; EV = ${fmt(Math.round(answer * 100) / 100)} | positive means call, negative means fold`,
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
    prompt: `Pot $${fmt(pot)}, $${fmt(call)} to call, ${eq}% equity. Extra you must win later to break even ($)?`,
    answer,
    explanation: `you need the total pot to be call / equity = ${call} / ${p} = ${fmt(Math.round((call / p) * 100) / 100)}; minus the ${pot + call} already there = ${fmt(Math.round(answer * 100) / 100)} more | implied odds count money you expect to win on later streets`,
    rel_tol: 0.05, abs_tol: 1.0,
  });
}

const RANKS = ["A", "K", "Q", "J", "T", "9", "8"];
function combos(rng) {
  const kind = rng.choice(["pair", "suited", "offsuit", "any", "pair_blocked", "any_blocked"]);
  const [r1, r2] = rng.sample2(RANKS);
  const table = {
    pair: [`How many combos of ${r1}${r1} (pocket pair)?`, 6, `4 ${r1}s, choose 2: 4 x 3 / 2 = 6`],
    suited: [`How many combos of ${r1}${r2} suited?`, 4, "one per suit = 4"],
    offsuit: [`How many combos of ${r1}${r2} offsuit?`, 12, "4 x 4 = 16 total, minus 4 suited = 12"],
    any: [`How many combos of ${r1}${r2} (suited or not)?`, 16, `4 ${r1}s x 4 ${r2}s = 16`],
    pair_blocked: [`You hold one ${r1}. How many combos of ${r1}${r1} can an opponent have?`, 3, `3 ${r1}s left, choose 2: 3 x 2 / 2 = 3`],
    any_blocked: [`You hold one ${r1}. How many combos of ${r1}${r2} can an opponent have?`, 12, `3 ${r1}s left x 4 ${r2}s = 12`],
  };
  const [prompt, answer, how] = table[kind];
  return item({
    key: `combos:${kind}:${r1}:${r2}`, drill: "combos", prompt, answer,
    explanation: `${how} | a combo is one specific pair of cards; blockers are cards you hold that they cannot`,
    abs_tol: 0.1,
  });
}

// ---------- quick math ----------
const PERCENTS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80, 90];
const BASES = [20, 30, 40, 60, 80, 120, 150, 160, 200, 240, 300, 360, 400, 450, 500, 600, 750, 800, 1200, 2500, 4000];
function percent_of(rng) {
  const pct = rng.choice(PERCENTS), base = rng.choice(BASES);
  const answer = (pct * base) / 100;
  return item({
    key: `percent_of:${pct}:${base}`, drill: "percent_of",
    prompt: `What is ${pct}% of ${fmt(base)}?`, answer,
    explanation: `10% of ${fmt(base)} is ${fmt(base / 10)}; ${pct}% is ${fmt(pct / 10)} x that = ${fmt(answer)}`,
  });
}

const DENOMINATORS = [3, 4, 5, 6, 7, 8, 9, 11, 12, 16];
function fraction_to_decimal(rng) {
  const d = rng.choice(DENOMINATORS), n = rng.randint(1, d - 1);
  return item({
    key: `fraction_to_decimal:${n}:${d}`, drill: "fraction_to_decimal",
    prompt: `${n}/${d} as a decimal?`, answer: n / d,
    explanation: `1/${d} = ${(1 / d).toFixed(3)}, so ${n}/${d} = ${n} x ${(1 / d).toFixed(3)} = ${(n / d).toFixed(3)}`,
    abs_tol: 0.006,
  });
}

function multiply_shortcuts(rng) {
  const kind = rng.choice(["x11", "sq5", "x25"]);
  let a, b, how;
  if (kind === "x11") {
    a = rng.randint(12, 98); b = 11;
    const tens = Math.floor(a / 10), ones = a % 10;
    how = `write ${tens} _ ${ones}, put ${tens}+${ones}=${tens + ones} in the middle (carry if 10 or more)`;
  } else if (kind === "sq5") {
    a = b = rng.choice([15, 25, 35, 45, 55, 65, 75, 85, 95]);
    const t = Math.floor(a / 10);
    how = `${t} x ${t + 1} = ${t * (t + 1)}, then append 25`;
  } else {
    a = rng.choice([12, 16, 24, 28, 32, 36, 44, 48, 52, 64, 72, 88, 96]); b = 25;
    how = `${a} / 4 = ${fmt(a / 4)}, then x 100`;
  }
  return item({
    key: `multiply_shortcuts:${kind}:${a}:${b}`, drill: "multiply_shortcuts",
    prompt: `${a} x ${b}?`, answer: a * b,
    explanation: `${how} | exact: ${a} x ${b} = ${fmt(a * b)}`,
  });
}

const GROWTH_RATES = [5, 10, 12, 15, 20, 25, 30, 50, 100];
const GROWTH_BASES = [40, 50, 80, 100, 120, 150, 200, 240, 300, 400, 500, 800, 1000, 1200, 2000];
const DOUBLING_RATES = [3, 4, 6, 8, 9, 12, 18, 24];
function growth_rate(rng) {
  if (rng.random() < 0.6) {
    const r = rng.choice(GROWTH_RATES), a = rng.choice(GROWTH_BASES);
    const b = (a * (100 + r)) / 100;
    return item({
      key: `growth_rate:pct:${a}:${b}`, drill: "growth_rate",
      prompt: `From ${fmt(a)} to ${fmt(b)}, what is the growth rate (%)?`, answer: r,
      explanation: `change = ${fmt(b)} - ${fmt(a)} = ${fmt(b - a)}; divided by the start ${fmt(a)} = ${r}%`,
      abs_tol: 0.5,
    });
  }
  const r = rng.choice(DOUBLING_RATES);
  const exact = Math.log(2) / Math.log(1 + r / 100);
  return item({
    key: `growth_rate:double:${r}`, drill: "growth_rate",
    prompt: `At ${r}% a year, how many years to double?`, answer: 72 / r,
    explanation: `rule of 72: 72 / ${r} = ${fmt(72 / r)} years | exact: ln 2 / ln(1.${String(r).padStart(2, "0")}) = ${exact.toFixed(1)} years`,
    abs_tol: 1.0,
  });
}

function back_of_envelope(rng) {
  const kind = rng.choice(["multiple", "ebitda", "mktcap", "interest"]);
  if (kind === "multiple") {
    const e = rng.choice([25, 40, 50, 60, 80, 100, 120, 150, 200, 250, 400]);
    const mult = rng.choice([6, 7, 8, 9, 10, 11, 12, 14, 15]);
    const ev = e * mult;
    return item({ key: `back_of_envelope:multiple:${ev}:${e}`, drill: "back_of_envelope", prompt: `EV $${fmt(ev)}M, EBITDA $${fmt(e)}M. EV/EBITDA?`, answer: mult,
      explanation: `EV / EBITDA = ${fmt(ev)} / ${fmt(e)} = ${mult}x | enterprise value is what the whole business costs, debt included`, rel_tol: 0.05 });
  }
  if (kind === "ebitda") {
    const rev = rng.choice([80, 120, 200, 250, 400, 500, 750, 1000, 1500, 2000]);
    const margin = rng.choice([8, 10, 12, 15, 18, 20, 25, 30, 35, 40]);
    const ans = (rev * margin) / 100;
    return item({ key: `back_of_envelope:ebitda:${rev}:${margin}`, drill: "back_of_envelope", prompt: `Revenue $${fmt(rev)}M at a ${margin}% EBITDA margin. EBITDA ($M)?`, answer: ans,
      explanation: `${margin}% of ${fmt(rev)} = ${fmt(ans)} | margin is profit as a share of revenue`, rel_tol: 0.05 });
  }
  if (kind === "mktcap") {
    const price = rng.choice([8, 12, 15, 20, 25, 30, 40, 45, 50, 60, 75, 80, 120]);
    const shares = rng.choice([20, 40, 50, 80, 100, 150, 200, 250, 400, 500]);
    return item({ key: `back_of_envelope:mktcap:${price}:${shares}`, drill: "back_of_envelope", prompt: `Share price $${price}, ${fmt(shares)}M shares. Market cap ($M)?`, answer: price * shares,
      explanation: `${price} x ${fmt(shares)} = ${fmt(price * shares)} | market cap is the price of all the equity`, rel_tol: 0.05 });
  }
  const debt = rng.choice([50, 100, 150, 200, 300, 400, 500, 800, 1000, 1500]);
  const rate = rng.choice([4, 5, 6, 7, 8, 9, 10, 12]);
  const ans = (debt * rate) / 100;
  return item({ key: `back_of_envelope:interest:${debt}:${rate}`, drill: "back_of_envelope", prompt: `$${fmt(debt)}M of debt at ${rate}%. Annual interest expense ($M)?`, answer: ans,
    explanation: `${rate}% of ${fmt(debt)} = ${fmt(ans)} | interest expense is the yearly cost of the debt`, rel_tol: 0.05 });
}

// ---------- registry ----------
export const DRILLS = { pot_odds, outs_equity, ev_call, implied_odds, combos, percent_of, fraction_to_decimal, multiply_shortcuts, growth_rate, back_of_envelope };

export const GROUPS = {
  poker: ["pot_odds", "outs_equity", "ev_call", "implied_odds", "combos"],
  interview: ["pot_odds", "outs_equity"],
  quick: ["percent_of", "fraction_to_decimal", "multiply_shortcuts", "growth_rate", "back_of_envelope"],
  all: ["pot_odds", "outs_equity", "ev_call", "implied_odds", "combos", "percent_of", "fraction_to_decimal", "multiply_shortcuts", "growth_rate", "back_of_envelope"],
};

export const GROUP_LABELS = {
  poker: ["Poker math", "Pot odds, outs, EV, implied odds, combos"],
  interview: ["Interview set", "Pot odds and outs only. The FIR question."],
  quick: ["Quick math", "Percentages, fractions, multiplication, growth, banking numbers"],
  all: ["Everything", "Both sets mixed"],
};

export const DEFINITIONS = {
  pot_odds: "Pot odds: the share of the final pot your call is. Call / (pot + call) is the equity you need to break even.",
  outs_equity: "Outs are cards that make your hand. Equity is your chance to win. Rule of 4 and 2: outs x 4 on the flop, x 2 on the turn.",
  ev_call: "Expected value (EV): what a decision earns on average. Win chance x pot minus lose chance x cost.",
  implied_odds: "Implied odds: pot odds plus the money you expect to win later if you hit. They justify calls the pot alone does not.",
  combos: "Combinations (combos): how many exact two-card holdings make a hand. Six per pocket pair, sixteen per two-rank hand.",
  percent_of: "Percent means per hundred: 15% of 240 is 15 hundredths of 240. Start from 10% and scale.",
  fraction_to_decimal: "A fraction is a division: 3/8 means 3 divided by 8. Memorise 1/n and multiply.",
  multiply_shortcuts: "Patterns that replace long multiplication: x11, squares ending in 5, x25 as quarter-then-hundred.",
  growth_rate: "Growth rate is change divided by the starting value. Rule of 72: years to double is about 72 / rate.",
  back_of_envelope: "Rough interview numbers: EV/EBITDA multiple, EBITDA from a margin, market cap, interest expense. Within 5% counts.",
};

export const EXPLANATIONS = {
  card: `POKER INDEX CARD (say these cold)

Pot odds        call / (pot + call). $10 into a $30 pot: 10 / 40 = 25%. You need 25% equity to break even.
                As a ratio the pot lays you 3 to 1, and 1 / (3 + 1) is the same 25%.
Outs to equity  Rule of 4 and 2: outs x 4 on the flop, outs x 2 on the turn. It is an approximation.
                9 outs (flush draw): about 35% with two cards to come (exact 34.97%), about 20% with one (exact 19.6%).
                8 outs (open-ended straight): 32% / 17%.  4 outs (gutshot): 17% / 8.7%.  15 outs: 54% / 33%.
Decision        Call when your equity is above the pot-odds number. Judge the decision, not the result.
EV              equity x pot minus (1 - equity) x call. Positive means call, negative means fold.
Implied odds    Money you expect to win later if you hit. They justify a call the pot alone does not.
Combos          Pocket pair 6, suited 4, offsuit 12, any two ranks 16. Holding one of the rank: pair 3, two-rank 12.`,
  pot_odds: `POT ODDS
The pot is $30. Your opponent bets $10, so it costs you $10 to call.
If you call and win, you win the $30 pot plus their $10 bet, minus your own $10 back: net +$30.
If you call and lose, net -$10. Break-even happens when p x 30 = (1 - p) x 10, so p = 10 / 40 = 25%.
Shortcut: call / (pot + call). Ratio form: the pot offers 3 to 1; 1 / (3 + 1) = 25%.
Follow-up you will get asked: "and with one card to come?" A flush draw is 9 / 46 = 19.6% then, so 25% is not enough.`,
  outs_equity: `OUTS TO EQUITY
An out is a card that makes your hand. On the flop there are 47 cards you have not seen; on the turn, 46.
One card to come: outs / 46. Nine outs = 19.6%. Rule of 2 says 18%.
Two cards to come: 1 - (miss on turn) x (miss on river) = 1 - (38/47)(37/46) = 34.97% for nine outs. Rule of 4 says 36%.
The rule of 4 overshoots more as outs grow; above about 8 outs, subtract (outs - 8) from the rule-of-4 number.`,
  ev_call: `EXPECTED VALUE OF A CALL
EV = (chance to win) x (what you win) - (chance to lose) x (what you pay).
Pot $60, $20 to call, 30% equity: 0.30 x 60 - 0.70 x 20 = 18 - 14 = +$4. Call.
Same spot at 20% equity: 12 - 16 = -$4. Fold. The break-even equity is 20 / 80 = 25%, the pot-odds number.`,
  implied_odds: `IMPLIED ODDS
Pot odds only count money already in the pot. Implied odds add what you expect to win later when you hit.
Pot $30, $10 to call, 20% equity. Pot odds say you need 25%, so calling is wrong on the pot alone.
For 20% to break even the final pot must be call / equity = 10 / 0.20 = $50. Only $40 is there after your call,
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
  const queue = store.starredItems().filter((it) => wanted.has(it.drill)).slice(0, n);
  const seen = new Set(queue.map((it) => it.key));
  let i = 0, tries = 0;
  while (queue.length < n && tries < n * 50) {
    const it = DRILLS[drillNames[i % drillNames.length]](rng);
    i += 1; tries += 1;
    if (seen.has(it.key)) continue;
    seen.add(it.key); queue.push(it);
  }
  return queue;
}
