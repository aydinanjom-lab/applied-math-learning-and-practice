"""Drill registry. A drill is a function random.Random -> Item."""

from __future__ import annotations

import random
from typing import Callable

from ..items import Item
from . import poker, quick

Generator = Callable[[random.Random], Item]

DRILLS: dict[str, Generator] = {
    "pot_odds": poker.pot_odds,
    "outs_equity": poker.outs_equity,
    "ev_call": poker.ev_call,
    "implied_odds": poker.implied_odds,
    "combos": poker.combos,
    "percent_of": quick.percent_of,
    "fraction_to_decimal": quick.fraction_to_decimal,
    "multiply_shortcuts": quick.multiply_shortcuts,
    "growth_rate": quick.growth_rate,
    "back_of_envelope": quick.back_of_envelope,
}

GROUPS: dict[str, list[str]] = {
    "poker": ["pot_odds", "outs_equity", "ev_call", "implied_odds", "combos"],
    "quick": ["percent_of", "fraction_to_decimal", "multiply_shortcuts", "growth_rate", "back_of_envelope"],
    "all": ["pot_odds", "outs_equity", "ev_call", "implied_odds", "combos",
            "percent_of", "fraction_to_decimal", "multiply_shortcuts", "growth_rate", "back_of_envelope"],
}

# One line, plain language, shown the first time the drill appears.
DEFINITIONS: dict[str, str] = {
    "pot_odds": "Pot odds: the share of the final pot your call is. Call / (pot + call) is the equity you need to break even.",
    "outs_equity": "Outs are cards that make your hand. Equity is your chance to win. Rule of 4 and 2: outs x 4 on the flop, x 2 on the turn.",
    "ev_call": "Expected value (EV): what a decision earns on average. Win chance x pot minus lose chance x cost.",
    "implied_odds": "Implied odds: pot odds plus the money you expect to win later if you hit. They justify calls the pot alone does not.",
    "combos": "Combinations (combos): how many exact two-card holdings make a hand. Six per pocket pair, sixteen per two-rank hand.",
    "percent_of": "Percent means per hundred: 15% of 240 is 15 hundredths of 240. Start from 10% and scale.",
    "fraction_to_decimal": "A fraction is a division: 3/8 means 3 divided by 8. Memorise 1/n and multiply.",
    "multiply_shortcuts": "Patterns that replace long multiplication: x11, squares ending in 5, x25 as quarter-then-hundred.",
    "growth_rate": "Growth rate is change divided by the starting value. Rule of 72: years to double is about 72 / rate.",
    "back_of_envelope": "Rough interview numbers: EV/EBITDA multiple, EBITDA from a margin, market cap, interest expense. Within 5% counts.",
}


def resolve(name: str) -> list[str]:
    """A group name or a drill name -> list of drill names. Raises KeyError if unknown."""
    if name in GROUPS:
        return list(GROUPS[name])
    if name in DRILLS:
        return [name]
    raise KeyError(name)
