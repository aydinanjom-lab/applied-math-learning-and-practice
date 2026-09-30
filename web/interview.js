// Poker questions the way an interviewer follows up after "teach me pot odds".
import { item, fmt, r2, NUM, PCT, USD, POTS, potAndCall, exactEquity, DRAW_NAMES } from "./core.js";

const BET_SIZES = [[1, 3, "third"], [1, 2, "half"], [2, 3, "twothirds"], [3, 4, "twothirds"], [1, 1, "pot"], [3, 2, "over"], [2, 1, "over"]];
function betFor(rng, family) {
  const sizes = family ? BET_SIZES.filter((b) => b[2] === family.split(":")[1]) : BET_SIZES;
  for (;;) {
    const pot = rng.choice(POTS);
    const [n, d, fam] = rng.choice(sizes);
    if ((pot * n) % d === 0 && ((pot * n) / d) % 5 === 0) return [pot, (pot * n) / d, fam];
  }
}

export function pot_odds_bet(rng, opts = {}) {
  const [pot, bet, fam] = betFor(rng, opts.family);
  const answer = (bet / (pot + 2 * bet)) * 100;
  const frac = bet === pot ? "a pot-sized bet" : bet < pot ? `a ${fmt(r2(bet / pot))}-pot bet` : `a ${fmt(r2(bet / pot))}x-pot bet`;
  return item({
    key: `pot_odds_bet:${fam}:${pot}:${bet}`, drill: "pot_odds_bet", family: `pot_odds_bet:${fam}`,
    prompt: `The pot is $${fmt(pot)} before your opponent bets $${fmt(bet)}. It costs you $${fmt(bet)} to call. How often do you need to win to break even? ${PCT}`,
    answer,
    explanation: `After the bet the pot is ${pot} + ${bet} = ${pot + bet}, so the number is ${bet} / (${pot + bet} + ${bet}) = ${answer.toFixed(1)}%. | Shortcut for ${frac}: bet / (pot + 2 x bet). A half-pot bet always needs 25%; a pot-sized bet always needs 33%. Interviewers love to change which pot they mean; ask "before or after the bet?"`,
    abs_tol: 0.6,
  });
}

export function bluff_break_even(rng) {
  const [pot, bet] = betFor(rng);
  const answer = (bet / (pot + bet)) * 100;
  return item({
    key: `bluff_break_even:${pot}:${bet}`, drill: "bluff_break_even",
    prompt: `The pot is $${fmt(pot)}. You bluff by betting $${fmt(bet)}. How often must your opponent fold for the bluff to break even? ${PCT}`,
    answer,
    explanation: `You risk ${bet} to win ${pot}: ${bet} / (${pot} + ${bet}) = ${answer.toFixed(1)}%. | Same shape as pot odds, seen from the bettor's side. A half-pot bluff needs a fold one time in three; a pot-sized bluff needs one in two.`,
    abs_tol: 0.6,
  });
}

export function pot_odds_decision(rng) {
  let pot, call, outs, cards, need, hit;
  for (;;) {
    [pot, call] = potAndCall(rng);
    outs = rng.choice([4, 6, 8, 9, 12, 15]);
    cards = rng.choice([1, 2]);
    need = call / (pot + call);
    hit = exactEquity(outs, cards) / 100;
    if (Math.abs(hit - need) > 0.02) break;
  }
  const call_ = hit >= need;
  const name = DRAW_NAMES[outs];
  return item({
    key: `pot_odds_decision:${pot}:${call}:${outs}:${cards}`, drill: "pot_odds_decision",
    prompt: `There is $${fmt(pot)} in the pot and it costs $${fmt(call)} to call. You hold ${name}, ${outs} outs, with ${cards === 1 ? "one card" : "two cards"} to come and no more betting after this. Call or fold?`,
    choices: ["Call", "Fold"], answer: call_ ? 0 : 1,
    explanation: `You need ${(need * 100).toFixed(1)}% (${call} / ${pot + call}). You hit ${(hit * 100).toFixed(1)}% (rule of ${cards === 2 ? 4 : 2}: about ${outs * (cards === 2 ? 4 : 2)}%). ${(hit * 100).toFixed(1)} ${call_ ? "is above" : "is below"} ${(need * 100).toFixed(1)}, so ${call_ ? "call" : "fold"}. | Judge the decision, not the result. "No more betting" matters: with more streets, implied odds could change the answer.`,
    abs_tol: 0,
  });
}

const OUTS_CASES = [
  ["a flush draw", 9, "13 of the suit minus the 4 you can see"],
  ["an open-ended straight draw", 8, "two ranks complete it, 4 cards each"],
  ["a gutshot straight draw", 4, "one rank completes it"],
  ["two overcards", 6, "3 of each rank left"],
  ["a pocket pair hoping for a set", 2, "2 of your rank left"],
  ["a flush draw plus a gutshot", 12, "9 + 4 minus the 1 card counted twice"],
  ["a flush draw plus an open-ended straight draw", 15, "9 + 8 minus the 2 cards counted twice"],
];
export function count_outs(rng) {
  const idx = rng.randint(0, OUTS_CASES.length - 1);
  const [name, outs, why] = OUTS_CASES[idx];
  return item({ key: `count_outs:${idx}`, drill: "count_outs", prompt: `You hold ${name}. How many outs do you have? ${NUM}`, answer: outs,
    explanation: `${outs}: ${why}. | Add the draws, subtract any card counted twice, and discount cards that also help your opponent.`, abs_tol: 0.1 });
}

export function pot_odds_ratio(rng) {
  const [pot, call] = potAndCall(rng);
  const ratio = pot / call;
  return item({ key: `pot_odds_ratio:${pot}:${call}`, drill: "pot_odds_ratio", prompt: `There is $${fmt(pot)} in the pot and it costs you $${fmt(call)} to call. What are the pot odds as a ratio? Answer with a number, meaning that many to 1.`, answer: ratio,
    explanation: `${pot} to ${call} is ${fmt(r2(ratio))} to 1. As a percent: 1 / (${fmt(r2(ratio))} + 1) = ${((call / (pot + call)) * 100).toFixed(1)}%. | Poker players say the ratio; interviewers usually want the percent. Know both.`, abs_tol: 0.06 });
}

export function price_out_draw(rng) {
  const pot = rng.choice([40, 60, 80, 100, 120, 150, 200]);
  const outs = rng.choice([4, 8, 9]);
  const hit = exactEquity(outs, 2) / 100;
  const minBet = (hit * pot) / (1 - 2 * hit);
  const name = DRAW_NAMES[outs];
  return item({ key: `price_out_draw:${pot}:${outs}`, drill: "price_out_draw", prompt: `The pot is $${fmt(pot)} on the flop. Your opponent has ${name}, ${outs} outs, and will see both cards if they call. What is the smallest bet that makes their call a mistake on pot odds alone? ${USD}`, answer: minBet,
    explanation: `They hit ${(hit * 100).toFixed(1)}%. A bet b gives them b / (${pot} + 2b); set that above ${(hit * 100).toFixed(1)}% and b > ${fmt(r2(minBet))}. | Rule of thumb: a flush draw is priced out by anything above about half pot; a gutshot by a quarter pot.`, rel_tol: 0.05, abs_tol: 1 });
}
