"""Stage 2: poker math. Each function takes a random.Random and returns an Item.

Every explanation shows the exact number next to the shortcut, so both get learned.
"""

from __future__ import annotations

import random
from math import comb

from ..items import Item, fmt

POTS = [20, 30, 40, 50, 60, 75, 80, 100, 120, 150, 200, 300]
CALL_FRACTIONS = [(1, 4), (1, 3), (1, 2), (2, 3), (3, 4), (1, 1)]


def _pot_and_call(rng: random.Random) -> tuple[int, int]:
    pot = rng.choice(POTS)
    num, den = rng.choice(CALL_FRACTIONS)
    call = pot * num // den
    return pot, max(call, 5)


def pot_odds(rng: random.Random) -> Item:
    pot, call = _pot_and_call(rng)
    answer = call / (pot + call) * 100
    ratio = pot / call
    return Item(
        key=f"pot_odds:{pot}:{call}",
        drill="pot_odds",
        prompt=f"Pot is ${pot:,} and it's ${call:,} to call. Break-even equity (%)?",
        answer=answer,
        explanation=(
            f"call / (pot + call) = {call} / {pot + call} = {answer:.1f}% "
            f"| as odds: {fmt(round(ratio, 2))} to 1, and 1 / ({fmt(round(ratio, 2))} + 1) is the same number"
        ),
        abs_tol=0.6,
    )


def _exact_equity(outs: int, cards: int) -> float:
    """Probability (%) of hitting at least one out. Flop: 47 unseen cards. Turn: 46."""
    if cards == 1:
        return outs / 46 * 100
    return (1 - comb(47 - outs, 2) / comb(47, 2)) * 100


DRAW_NAMES = {
    2: "pocket pair to a set",
    4: "gutshot",
    6: "two overcards",
    8: "open-ended straight draw",
    9: "flush draw",
    12: "flush draw plus gutshot",
    15: "flush draw plus open-ended straight draw",
}


def outs_equity(rng: random.Random) -> Item:
    outs = rng.randint(2, 15)
    cards = rng.choice([1, 2])
    exact = _exact_equity(outs, cards)
    rule = outs * (4 if cards == 2 else 2)
    plural = "card" if cards == 1 else "cards"
    street = "on the flop" if cards == 2 else "on the turn"
    name = DRAW_NAMES.get(outs)
    lead = f"{name.capitalize()} ({outs} outs)" if name else f"{outs} outs"
    return Item(
        key=f"outs_equity:{outs}:{cards}",
        drill="outs_equity",
        prompt=f"{lead} {street}, {cards} {plural} to come. Equity (%)?",
        answer=exact,
        explanation=(
            f"rule of 4 and 2: {outs} x {4 if cards == 2 else 2} = {rule}% "
            f"| exact: {exact:.1f}% ({outs} outs in {47 if cards == 2 else 46} unseen cards"
            f"{', two draws' if cards == 2 else ''})"
        ),
        abs_tol=abs(rule - exact) + 0.6,   # the shortcut answer counts, so does the exact one
    )


EQUITIES = [20, 25, 30, 35, 40, 45, 50]


def ev_call(rng: random.Random) -> Item:
    pot, call = _pot_and_call(rng)
    eq = rng.choice(EQUITIES)
    p = eq / 100
    answer = p * pot - (1 - p) * call
    return Item(
        key=f"ev_call:{pot}:{call}:{eq}",
        drill="ev_call",
        prompt=f"Pot ${pot:,}, ${call:,} to call, {eq}% equity. EV of calling ($)?",
        answer=answer,
        explanation=(
            f"win {eq}% of ${pot} = {fmt(round(p * pot, 2))}; lose {100 - eq}% of ${call} = {fmt(round((1 - p) * call, 2))}; "
            f"EV = {fmt(round(answer, 2))} | positive means call, negative means fold"
        ),
        rel_tol=0.05,
        abs_tol=1.0,
    )


IMPLIED_EQUITIES = [10, 12, 15, 18, 20, 25]


def implied_odds(rng: random.Random) -> Item:
    while True:
        pot, call = _pot_and_call(rng)
        eq = rng.choice(IMPLIED_EQUITIES)
        p = eq / 100
        breakeven = call / (pot + call)
        if p < breakeven - 0.01:
            break
    answer = call / p - pot - call
    return Item(
        key=f"implied_odds:{pot}:{call}:{eq}",
        drill="implied_odds",
        prompt=f"Pot ${pot:,}, ${call:,} to call, {eq}% equity. Extra you must win later to break even ($)?",
        answer=answer,
        explanation=(
            f"you need the total pot to be call / equity = {call} / {p} = {fmt(round(call / p, 2))}; "
            f"minus the {pot + call} already there = {fmt(round(answer, 2))} more "
            f"| implied odds count money you expect to win on later streets"
        ),
        rel_tol=0.05,
        abs_tol=1.0,
    )


RANKS = ["A", "K", "Q", "J", "T", "9", "8"]


def combos(rng: random.Random) -> Item:
    kind = rng.choice(["pair", "suited", "offsuit", "any", "pair_blocked", "any_blocked"])
    r1, r2 = rng.sample(RANKS, 2)
    if kind == "pair":
        prompt, answer, how = f"How many combos of {r1}{r1} (pocket pair)?", 6, f"4 {r1}s, choose 2: 4 x 3 / 2 = 6"
    elif kind == "suited":
        prompt, answer, how = f"How many combos of {r1}{r2} suited?", 4, "one per suit = 4"
    elif kind == "offsuit":
        prompt, answer, how = f"How many combos of {r1}{r2} offsuit?", 12, "4 x 4 = 16 total, minus 4 suited = 12"
    elif kind == "any":
        prompt, answer, how = f"How many combos of {r1}{r2} (suited or not)?", 16, f"4 {r1}s x 4 {r2}s = 16"
    elif kind == "pair_blocked":
        prompt, answer, how = f"You hold one {r1}. How many combos of {r1}{r1} can an opponent have?", 3, f"3 {r1}s left, choose 2: 3 x 2 / 2 = 3"
    else:
        prompt, answer, how = f"You hold one {r1}. How many combos of {r1}{r2} can an opponent have?", 12, f"3 {r1}s left x 4 {r2}s = 12"
    return Item(
        key=f"combos:{kind}:{r1}:{r2}",
        drill="combos",
        prompt=prompt,
        answer=float(answer),
        explanation=f"{how} | a combo is one specific pair of cards; blockers are cards you hold that they cannot",
        abs_tol=0.1,
    )
