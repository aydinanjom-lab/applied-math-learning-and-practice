// Poker questions the way an interviewer follows up after "teach me pot odds".
import { item, fmt, r2, PCT, POTS, potAndCall, exactEquity, DRAW_NAMES } from "./core.js";

const BET_SIZES = [[1, 3], [1, 2], [2, 3], [3, 4], [1, 1], [3, 2], [2, 1]];

export function pot_odds_bet(rng) {
  let pot, bet;
  for (;;) {
    pot = rng.choice(POTS);
    const [n, d] = rng.choice(BET_SIZES);
    if ((pot * n) % d === 0 && ((pot * n) / d) % 5 === 0) { bet = (pot * n) / d; break; }
  }
  const answer = (bet / (pot + 2 * bet)) * 100;
  const frac = bet === pot ? "a pot-sized bet" : bet < pot ? `a ${fmt(r2(bet / pot))}-pot bet` : `a ${fmt(r2(bet / pot))}x-pot bet`;
  return item({
    key: `pot_odds_bet:${pot}:${bet}`, drill: "pot_odds_bet",
    prompt: `The pot is $${fmt(pot)} before your opponent bets $${fmt(bet)}. It costs you $${fmt(bet)} to call. How often do you need to win to break even? ${PCT}`,
    answer,
    explanation: `After the bet the pot is ${pot} + ${bet} = ${pot + bet}, so the number is ${bet} / (${pot + bet} + ${bet}) = ${answer.toFixed(1)}%. | Shortcut for ${frac}: bet / (pot + 2 x bet). A half-pot bet always needs 25%; a pot-sized bet always needs 33%. Interviewers love to change which pot they mean; ask "before or after the bet?"`,
    abs_tol: 0.6,
  });
}

export function bluff_break_even(rng) {
  let pot, bet;
  for (;;) {
    pot = rng.choice(POTS);
    const [n, d] = rng.choice(BET_SIZES);
    if ((pot * n) % d === 0 && ((pot * n) / d) % 5 === 0) { bet = (pot * n) / d; break; }
  }
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
