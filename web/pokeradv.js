// Poker, advanced: for players who already know pot odds and outs. The poker-club pack.
// Plan: docs/superpowers/specs/advance/club_banks.md (poker club). Every drill states its rule of thumb; lessons teach it.
import { item, fmt, r2, NUM, PCT, USD } from "./core.js";

const SIZES = { third: [1, 3], half: [1, 2], twothirds: [2, 3], pot: [1, 1], over: [3, 2] };
const SIZE_WORDS = { third: "a third of the pot", half: "half the pot", twothirds: "two-thirds of the pot", pot: "the size of the pot", over: "one and a half times the pot" };
const SIZED_POTS = [30, 60, 90, 120, 150, 180, 240, 300];
const kindOf = (rng, fam, keys) => (fam ? fam.split(":")[1] : rng.choice(keys));
function sized(rng, fam) {
  const kind = kindOf(rng, fam, Object.keys(SIZES));
  const [n, d] = SIZES[kind];
  const pot = rng.choice(SIZED_POTS);
  return { kind, pot, bet: (pot * n) / d };
}

// Minimum defense frequency: how often to continue so any two cards cannot bluff at a profit.
export function mdf(rng, opts = {}) {
  const { kind, pot, bet } = sized(rng, opts.family);
  const ans = (pot / (pot + bet)) * 100;
  return item({ key: `mdf:${kind}:${pot}`, drill: "mdf", family: `mdf:${kind}`,
    prompt: `The pot is $${fmt(pot)} and your opponent bets $${fmt(bet)}, ${SIZE_WORDS[kind]}. How often must you continue, by calling or raising, so their bluffs cannot profit automatically? ${PCT}`,
    answer: ans,
    explanation: `Minimum defense frequency = pot / (pot + bet) = ${fmt(pot)} / ${fmt(pot + bet)} = ${ans.toFixed(1)}%. | Their bluff risks ${fmt(bet)} to win ${fmt(pot)}, so it profits only if you fold more than ${(100 - ans).toFixed(1)}%. Anchors: third pot 75%, half pot 67%, two-thirds 60%, pot 50%, 1.5x pot 40%.`,
    abs_tol: 0.7 });
}

// Balanced river betting: the share of bets that should be bluffs equals the caller's pot odds.
export function bluff_ratio(rng, opts = {}) {
  const { kind, pot, bet } = sized(rng, opts.family);
  const ans = (bet / (pot + 2 * bet)) * 100;
  return item({ key: `bluff_ratio:${kind}:${pot}`, drill: "bluff_ratio", family: `bluff_ratio:${kind}`,
    prompt: `On the river you bet $${fmt(bet)} into $${fmt(pot)}, ${SIZE_WORDS[kind]}. What share of the hands you bet this way should be bluffs, so calling and folding pay your opponent the same? ${PCT}`,
    answer: ans,
    explanation: `Bluff share = bet / (pot + 2 x bet) = ${fmt(bet)} / ${fmt(pot + 2 * bet)} = ${ans.toFixed(1)}%. It is exactly the price your opponent gets to call. | At that mix their call breaks even, so always calling and always folding both stop working. Anchors: third pot 20%, half 25%, two-thirds 29%, pot 33%, 1.5x pot 37.5%. A pot-sized bet wants 1 bluff for every 2 value bets.`,
    abs_tol: 0.7 });
}

// Stack-to-pot ratio from the effective (smaller) stack.
const SPR_POTS = [20, 40, 50, 60, 80, 100, 120, 150, 200];
const STACKS = [100, 150, 200, 250, 300, 400, 500, 600, 800, 1000];
export function spr(rng) {
  const pot = rng.choice(SPR_POTS);
  let a, b;
  do { a = rng.choice(STACKS); b = rng.choice(STACKS); } while (a === b);
  const eff = Math.min(a, b);
  const ans = eff / pot;
  return item({ key: `spr:${pot}:${a}:${b}`, drill: "spr",
    prompt: `The pot is $${fmt(pot)} going to the flop. You have $${fmt(a)} behind and your opponent has $${fmt(b)}. What is the stack-to-pot ratio? ${NUM}`,
    answer: ans,
    explanation: `Use the effective stack, the smaller one: $${fmt(eff)}. SPR = ${fmt(eff)} / ${fmt(pot)} = ${fmt(r2(ans))}. | Guideline: under about 3, one strong pair is usually enough to get all the money in; above about 10, it usually is not.`,
    rel_tol: 0.02, abs_tol: 0.1 });
}

// Geometric sizing: equal pot-fraction bets on each street that get the stacks in by the river.
// (1 + 2f)^streets = 1 + 2 x SPR. Cases chosen so the root is a whole number.
const GEO = [[1.5, 2, 0.5], [4, 2, 1], [7.5, 2, 1.5], [12, 2, 2], [3.5, 3, 0.5], [13, 3, 1], [31.5, 3, 1.5]];
export function geo_sizing(rng) {
  const [s, n, f] = rng.choice(GEO);
  const pot = rng.choice([40, 50, 60, 80, 100, 200]);
  const stack = s * pot;
  const streets = n === 2 ? "the turn and the river" : "the flop, turn, and river";
  return item({ key: `geo_sizing:${pot}:${s}:${n}`, drill: "geo_sizing",
    prompt: `The pot is $${fmt(pot)} and the effective stack is $${fmt(stack)}, an SPR of ${fmt(s)}. You want to be all in by the end with the same-sized bet, as a share of the pot, on ${streets}, each one called. What share of the pot is each bet? Answer with a number, like 0.5 for half pot.`,
    answer: f,
    explanation: `A called bet of f times the pot multiplies the pot by (1 + 2f). To fit the stacks: (1 + 2f)^${n} = 1 + 2 x ${fmt(s)} = ${fmt(1 + 2 * s)}. So 1 + 2f = ${fmt(1 + 2 * f)} and f = ${fmt(f)}. | Anchors: two pot-sized bets get in an SPR of 4; three get in an SPR of 13.`,
    abs_tol: 0.05 });
}

// Combos once some cards are visible on the board or in your hand.
const RANKS = ["A", "K", "Q", "J", "T", "9"];
const NAMES = { A: "ace", K: "king", Q: "queen", J: "jack", T: "ten", 9: "nine" };
const plural = (n, r) => `${n === 0 ? "no" : n === 1 ? "one" : "two"} ${NAMES[r]}${n === 1 ? "" : "s"}`;
export function board_combos(rng, opts = {}) {
  const kind = kindOf(rng, opts.family, ["pair", "unpaired"]);
  if (kind === "pair") {
    const r = rng.choice(RANKS);
    const seen = rng.choice([1, 2]);
    const left = 4 - seen;
    const ans = (left * (left - 1)) / 2;
    return item({ key: `board_combos:pair:${r}:${seen}`, drill: "board_combos", family: "board_combos:pair",
      prompt: `Counting the board and your own hand, you can see ${plural(seen, r)}. How many ways can your opponent hold pocket ${NAMES[r]}s? ${NUM}`,
      answer: ans,
      explanation: `${left} ${NAMES[r]}s are unseen. Choose 2: ${left} x ${left - 1} / 2 = ${ans}. | Full count is 6 for a pair and 16 for two ranks; every card you can see takes some away.`, abs_tol: 0.1 });
  }
  const [r1, r2_] = rng.sample2(RANKS);
  let a, b;
  do { a = rng.choice([0, 1, 2]); b = rng.choice([0, 1, 2]); } while (a === 0 && b === 0);
  const ans = (4 - a) * (4 - b);
  return item({ key: `board_combos:unpaired:${r1}:${r2_}:${a}:${b}`, drill: "board_combos", family: "board_combos:unpaired",
    prompt: `Counting the board and your own hand, you can see ${plural(a, r1)} and ${plural(b, r2_)}. How many ways can your opponent hold ${r1}${r2_}, suited or not? ${NUM}`,
    answer: ans,
    explanation: `${4 - a} ${NAMES[r1]}s and ${4 - b} ${NAMES[r2_]}s are unseen: ${4 - a} x ${4 - b} = ${ans}. | Full count is 16 for two ranks; every card you can see takes some away.`, abs_tol: 0.1 });
}

// Semi-bluff expected value: they fold now, or they call and you sometimes hit.
const SB_POTS = [60, 80, 100, 120, 150, 200];
export function semibluff_ev(rng) {
  const pot = rng.choice(SB_POTS);
  const [n, d] = rng.choice([[1, 2], [2, 3], [1, 1]]);
  const bet = (pot * n) / d;
  const fold = rng.choice([20, 30, 40, 50, 60]);
  const eq = rng.choice([20, 25, 30, 35, 40]);
  const f = fold / 100, e = eq / 100;
  const called = e * (pot + 2 * bet) - bet;
  const ans = f * pot + (1 - f) * called;
  return item({ key: `semibluff_ev:${pot}:${bet}:${fold}:${eq}`, drill: "semibluff_ev",
    prompt: `You semi-bluff, betting $${fmt(bet)} into $${fmt(pot)}. They fold ${fold}% of the time. When they call, you win ${eq}% of the time and there is no more betting. Counting the pot as what you win when they fold, what is the bet worth on average? ${USD} Negative if it loses.`,
    answer: ans,
    explanation: `They fold: ${f} x ${fmt(pot)} = ${fmt(r2(f * pot))}. They call: you win ${eq}% of the final $${fmt(pot + 2 * bet)} pot and paid ${fmt(bet)}, so ${e} x ${fmt(pot + 2 * bet)} - ${fmt(bet)} = ${fmt(r2(called))}; times ${r2(1 - f)} = ${fmt(r2((1 - f) * called))}. Total ${fmt(r2(ans))}. | Same called part another way: win ${eq}% of (pot + their call) and lose ${100 - eq}% of your bet. The called part alone is often negative; fold equity is what makes the bet good.`,
    rel_tol: 0.05, abs_tol: 1 });
}

// How often they must fold for a semi-bluff to break even.
export function semibluff_breakeven(rng) {
  let pot, bet, eq, called;
  do {
    pot = rng.choice([100, 200]);
    bet = pot * rng.choice([0.5, 1]);
    eq = rng.choice([0, 10, 15, 20, 25]);
    called = (eq / 100) * (pot + 2 * bet) - bet;
  } while (called >= 0);
  const ans = (-called / (pot - called)) * 100;
  return item({ key: `semibluff_breakeven:${pot}:${bet}:${eq}`, drill: "semibluff_breakeven",
    prompt: `You bet $${fmt(bet)} into $${fmt(pot)}. When called you win ${eq}% of the time and there is no more betting. How often must they fold for the bet to break even? ${PCT}`,
    answer: ans,
    explanation: `When called, the bet is worth ${eq / 100} x ${fmt(pot + 2 * bet)} - ${fmt(bet)} = ${fmt(r2(called))}. Break even when fold x ${fmt(pot)} = (1 - fold) x ${fmt(r2(-called))}, so fold = ${fmt(r2(-called))} / (${fmt(pot)} + ${fmt(r2(-called))}) = ${ans.toFixed(1)}%. | With no chance to hit this is the pure bluff number, bet / (pot + bet). Every bit of equity lowers the folds you need.`,
    abs_tol: 1 });
}

// Preflop all-in equities worth knowing cold. Each was checked with a 150,000-deal simulation.
const MATCHUPS = {
  aa_kk: ["AA against KK", "AA", 82, "AA wins about 82% (simulated 82.1%)."],
  pair_vs_lower: ["a higher pocket pair against a lower one, such as JJ against 88", "higher pair", 81, "The higher pair wins about 80% (JJ against 88 simulated 80.7%)."],
  pair_vs_overs: ["a pocket pair against two higher cards, such as 88 against AK offsuit", "pair", 55, "The pair wins about 55%, the famous coin flip (88 against AK simulated 55.7%; 22 is 53%, QQ is 57%)."],
  dominated: ["AK against AQ, both offsuit", "AK", 74, "AK wins about 74% (simulated 74.0%). A shared card with a worse kicker is the worst spot in preflop poker."],
  overs_vs_unders: ["two higher cards against two lower cards, such as AK against 7-6, all offsuit", "higher cards", 61, "The higher cards win about 60% (AK against 76 simulated 61.3%)."],
  pair_vs_one_over: ["a pocket pair against one higher and one lower card, such as 99 against A-8 offsuit", "pair", 71, "The pair wins about 70% (99 against A8 simulated 71.1%)."],
};
export function preflop_anchor(rng, opts = {}) {
  const kind = kindOf(rng, opts.family, Object.keys(MATCHUPS));
  const [desc, who, ans, why] = MATCHUPS[kind];
  return item({ key: `preflop_anchor:${kind}`, drill: "preflop_anchor", family: `preflop_anchor:${kind}`,
    prompt: `All in before the flop: ${desc}. Roughly how often does the ${who} win, counting ties as half? ${PCT}`,
    answer: ans,
    explanation: `${why} | Anchors: pair against two overcards about 55%, pair against a lower pair about 80%, AA against KK about 82%, dominated kicker about 74%, two overs against two unders about 60%, pair against one over about 70%.`,
    abs_tol: 4 });
}
