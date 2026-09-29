"""One-screen explanations. Plain language, the exact number next to the shortcut.

These are teaching notes shown by the tool. Your own explanations go in notes/, in your words.
"""

POKER_CARD = """\
POKER INDEX CARD (say these cold)

Pot odds        call / (pot + call). $10 into a $30 pot: 10 / 40 = 25%. You need 25% equity to break even.
                As a ratio the pot lays you 3 to 1, and 1 / (3 + 1) is the same 25%.
Outs to equity  Rule of 4 and 2: outs x 4 on the flop, outs x 2 on the turn. It is an approximation.
                9 outs (flush draw): about 35% with two cards to come (exact 34.97%), about 20% with one (exact 19.6%).
                8 outs (open-ended straight): 32% / 17%.  4 outs (gutshot): 17% / 8.7%.  15 outs: 54% / 33%.
Decision        Call when your equity is above the pot-odds number. Judge the decision, not the result.
EV              equity x pot minus (1 - equity) x call. Positive means call, negative means fold.
Implied odds    Money you expect to win later if you hit. They justify a call the pot alone does not.
Combos          Pocket pair 6, suited 4, offsuit 12, any two ranks 16. Holding one of the rank: pair 3, two-rank 12.
"""

EXPLANATIONS = {
    "pot_odds": """\
POT ODDS
The pot is $30. Your opponent bets $10, so it costs you $10 to call.
If you call and win, you win the $30 pot plus their $10 bet, minus your own $10 back: net +$30.
If you call and lose, net -$10. Break-even happens when p x 30 = (1 - p) x 10, so p = 10 / 40 = 25%.
Shortcut: call / (pot + call). Ratio form: the pot offers 3 to 1; 1 / (3 + 1) = 25%.
Follow-up you will get asked: "and with one card to come?" A flush draw is 9 / 46 = 19.6% then, so 25% is not enough.
""",
    "outs_equity": """\
OUTS TO EQUITY
An out is a card that makes your hand. On the flop there are 47 cards you have not seen; on the turn, 46.
One card to come: outs / 46. Nine outs = 19.6%. Rule of 2 says 18%.
Two cards to come: 1 - (miss on turn) x (miss on river) = 1 - (38/47)(37/46) = 34.97% for nine outs. Rule of 4 says 36%.
The rule of 4 overshoots more as outs grow; above about 8 outs, subtract (outs - 8) from the rule-of-4 number.
""",
    "ev_call": """\
EXPECTED VALUE OF A CALL
EV = (chance to win) x (what you win) - (chance to lose) x (what you pay).
Pot $60, $20 to call, 30% equity: 0.30 x 60 - 0.70 x 20 = 18 - 14 = +$4. Call.
Same spot at 20% equity: 12 - 16 = -$4. Fold. The break-even equity is 20 / 80 = 25%, the pot-odds number.
""",
    "implied_odds": """\
IMPLIED ODDS
Pot odds only count money already in the pot. Implied odds add what you expect to win later when you hit.
Pot $30, $10 to call, 20% equity. Pot odds say you need 25%, so calling is wrong on the pot alone.
For 20% to break even the final pot must be call / equity = 10 / 0.20 = $50. Only $40 is there after your call,
so you need to win $10 more on later streets. If your opponent will pay that off, the call becomes correct.
Reverse implied odds: when you hit but still lose a big pot (a low flush against a higher one). Discount for it.
""",
    "combos": """\
HAND COMBINATIONS
A combo is one exact two-card holding. Count them to weigh what an opponent can have.
Pocket pair: 4 cards of that rank, choose 2 = 6. Suited hand like AK suited: one per suit = 4.
Offsuit: 4 x 4 = 16 total two-rank combos minus the 4 suited = 12. Any AK: 16.
Blockers: cards you hold remove combos. Holding one ace leaves AA at 3 combos and AK at 3 x 4 = 12.
""",
}


def explain(name: str | None) -> str | None:
    if name is None:
        return POKER_CARD
    return EXPLANATIONS.get(name)
