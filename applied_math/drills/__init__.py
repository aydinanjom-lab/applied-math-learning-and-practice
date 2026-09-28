"""Drill registry. A drill is a function random.Random -> Item."""

from __future__ import annotations

import random
from typing import Callable

from ..items import Item
from . import poker

Generator = Callable[[random.Random], Item]

DRILLS: dict[str, Generator] = {
    "pot_odds": poker.pot_odds,
    "outs_equity": poker.outs_equity,
    "ev_call": poker.ev_call,
    "implied_odds": poker.implied_odds,
    "combos": poker.combos,
}

GROUPS: dict[str, list[str]] = {
    "poker": ["pot_odds", "outs_equity", "ev_call", "implied_odds", "combos"],
}

# One line, plain language, shown the first time the drill appears.
DEFINITIONS: dict[str, str] = {
    "pot_odds": "Pot odds: the share of the final pot your call is. Call / (pot + call) is the equity you need to break even.",
    "outs_equity": "Outs are cards that make your hand. Equity is your chance to win. Rule of 4 and 2: outs x 4 on the flop, x 2 on the turn.",
    "ev_call": "Expected value (EV): what a decision earns on average. Win chance x pot minus lose chance x cost.",
    "implied_odds": "Implied odds: pot odds plus the money you expect to win later if you hit. They justify calls the pot alone does not.",
    "combos": "Combinations (combos): how many exact two-card holdings make a hand. Six per pocket pair, sixteen per two-rank hand.",
}


def resolve(name: str) -> list[str]:
    """A group name or a drill name -> list of drill names. Raises KeyError if unknown."""
    if name in GROUPS:
        return list(GROUPS[name])
    if name in DRILLS:
        return [name]
    raise KeyError(name)
