// Interview runs: three typed questions, a time limit, pass or fail.
import { DRILLS } from "./drills.js";
import { item, exactEquity } from "./core.js";

function pokerRun(rng) {
  const q1 = DRILLS.pot_odds(rng);
  const need = q1.answer;
  const flush = item({ key: "outs_equity:9:1", drill: "outs_equity", family: "outs_equity:1", answer: (9 / 46) * 100, abs_tol: 1.2,
    prompt: "Same hand. You hold a flush draw, 9 outs, and there is one card to come. What is your chance of hitting? Answer in %.",
    explanation: "9 / 46 = 19.6%. Rule of 2 says 18%. | With one card to come there are 46 unseen cards." });
  const call = (9 / 46) * 100 >= need;
  const q3 = item({ key: `interview_call:${q1.key}`, drill: "pot_odds_decision", family: "pot_odds_decision", choices: ["Call", "Fold"], answer: call ? 0 : 1, abs_tol: 0,
    prompt: `You need to win ${need.toFixed(1)}% of the time and you hit ${((9 / 46) * 100).toFixed(1)}% of the time. Call or fold?`,
    explanation: `${((9 / 46) * 100).toFixed(1)}% ${call ? "is above" : "is below"} ${need.toFixed(1)}%, so ${call ? "call" : "fold"}. | Judge the decision, not the result.` });
  return [q1, flush, q3];
}

function financeRun(rng) {
  return [DRILLS.ev_from_equity(rng), DRILLS.multiple_to_yield(rng), DRILLS.lbo_return(rng)];
}

function accountingRun(rng) {
  // One event, walked across the three statements: net income, cash, then equity.
  const d = rng.choice([10, 20, 40, 50]);
  const t = rng.choice([20, 25, 30, 40]);
  const ni = -d * (1 - t / 100), cash = (d * t) / 100;
  return [
    item({ key: `walk_ni:${d}:${t}`, drill: "dep_net_income", family: "dep_net_income", answer: ni, abs_tol: 0.3, prompt: `Depreciation rises by $${d}M and the tax rate is ${t}%. Step 1: how does net income change? Answer in $M, negative if it falls.`,
      explanation: `Pre-tax profit down ${d}; tax down ${(d * t) / 100}; net income down ${(-ni).toFixed(1)}.` }),
    item({ key: `walk_cash:${d}:${t}`, drill: "dep_cash", family: "dep_cash", answer: cash, abs_tol: 0.3, prompt: `Step 2: how does cash change? Answer in $M, positive if it rises.`,
      explanation: `Net income down ${(-ni).toFixed(1)}, add back the non-cash ${d}: cash up ${cash.toFixed(1)}, the tax saved.` }),
    item({ key: `walk_equity:${d}:${t}`, drill: "statement_direction", family: "statement_direction:0", choices: ["Up", "Down", "No change"], answer: 1, abs_tol: 0, prompt: `Step 3: on the balance sheet, which way does shareholders' equity move? Up, down, or no change?`,
      explanation: `Net income fell, and net income flows into retained earnings, so equity is down by ${(-ni).toFixed(1)}. Assets: cash up ${cash.toFixed(1)}, the asset being depreciated down ${d}, net down ${(-ni).toFixed(1)}. It balances.` }),
  ];
}

export const RUNS = {
  poker: { title: "Poker run", sub: "The FIR question and its follow-ups. Pot odds, the one-card chance, call or fold.", seconds: 90, build: pokerRun },
  finance: { title: "Finance run", sub: "Enterprise value, a multiple as a yield, a buyout's yearly return.", seconds: 90, build: financeRun },
  accounting: { title: "Accounting run", sub: "One event walked across all three statements.", seconds: 120, build: accountingRun },
};
