import random
import re
from math import comb

import pytest

from applied_math.drills import DEFINITIONS, DRILLS, GROUPS, resolve
from applied_math.drills import poker


def items(gen, n=300, seed=1):
    rng = random.Random(seed)
    return [gen(rng) for _ in range(n)]


def test_pot_odds_is_call_over_pot_plus_call():
    for it in items(poker.pot_odds):
        pot, call = re.match(r"Pot is \$([\d,]+) and it's \$([\d,]+) to call\. Break-even equity \(%\)\?", it.prompt).groups()
        pot, call = float(pot.replace(",", "")), float(call.replace(",", ""))
        assert it.is_correct(call / (pot + call) * 100), it
        assert it.is_correct(round(call / (pot + call) * 100)), "whole-number answers count"
        assert "to 1" in it.explanation


def test_pot_odds_brief_example_gives_25():
    rng = random.Random(0)
    found = [it for it in items(poker.pot_odds, 2000) if it.key == "pot_odds:30:10"]
    assert found and found[0].answer == 25.0


def test_outs_equity_exact_and_rule_both_accepted():
    for it in items(poker.outs_equity):
        outs, cards = re.search(r"(\d+) outs\)? on the \w+, (\d) cards? to come\. Equity \(%\)\?", it.prompt).groups()
        outs, cards = int(outs), int(cards)
        if cards == 1:
            exact = outs / 46 * 100
            rule = outs * 2
        else:
            exact = (1 - comb(47 - outs, 2) / comb(47, 2)) * 100
            rule = outs * 4
        assert it.is_correct(exact), it
        assert it.is_correct(rule), it
        assert "exact" in it.explanation and "rule of 4 and 2" in it.explanation


def test_nine_outs_two_cards_is_about_35():
    nine = [it for it in items(poker.outs_equity, 2000) if it.key == "outs_equity:9:2"]
    assert nine and abs(nine[0].answer - 34.97) < 0.01


def test_ev_call_formula():
    for it in items(poker.ev_call):
        pot, call, eq = re.match(r"Pot \$([\d,]+), \$([\d,]+) to call, (\d+)% equity\. EV of calling \(\$\)\?", it.prompt).groups()
        pot, call, eq = float(pot.replace(",", "")), float(call.replace(",", "")), int(eq) / 100
        assert it.is_correct(eq * pot - (1 - eq) * call), it


def test_implied_odds_extra_needed_is_positive_and_correct():
    for it in items(poker.implied_odds):
        pot, call, eq = re.match(r"Pot \$([\d,]+), \$([\d,]+) to call, (\d+)% equity\. Extra you must win later to break even \(\$\)\?", it.prompt).groups()
        pot, call, eq = float(pot.replace(",", "")), float(call.replace(",", "")), int(eq) / 100
        assert it.answer > 0
        assert it.is_correct(call / eq - pot - call), it


def test_combos_counts():
    expected = {"pair": 6, "suited": 4, "offsuit": 12, "any": 16, "pair_blocked": 3, "any_blocked": 12}
    seen = set()
    for it in items(poker.combos, 600):
        kind = it.key.split(":")[1]
        seen.add(kind)
        assert it.answer == expected[kind], it
        assert it.abs_tol < 0.5
    assert seen == set(expected)


def test_registry():
    assert resolve("poker") == GROUPS["poker"]
    assert set(GROUPS["poker"]) == {"pot_odds", "outs_equity", "ev_call", "implied_odds", "combos"}
    assert set(GROUPS["poker"]) <= set(DRILLS)
    with pytest.raises(KeyError):
        resolve("nope")
    for name in DRILLS:
        assert name in DEFINITIONS and "\n" not in DEFINITIONS[name]


def test_outs_prompts_name_common_draws():
    prompts = " ".join(it.prompt for it in items(poker.outs_equity, 500)).lower()
    assert "flush draw" in prompts and "open-ended straight draw" in prompts and "gutshot" in prompts
    assert "on the flop" in prompts and "on the turn" in prompts


def test_pot_odds_uses_clean_ratios():
    for it in items(poker.pot_odds, 500):
        pot, call = (int(x) for x in it.key.split(":")[1:])
        assert (pot * 12) % call == 0, f"{pot}:{call} is not a clean ratio"
        assert call % 5 == 0
