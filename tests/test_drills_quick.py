import random
import re

from applied_math.drills import DEFINITIONS, DRILLS, GROUPS, resolve
from applied_math.drills import quick


def items(gen, n=200, seed=1):
    rng = random.Random(seed)
    return [gen(rng) for _ in range(n)]


def test_percent_of_answers_match_prompt():
    for it in items(quick.percent_of):
        pct, base = re.match(r"What is (\d+(?:\.\d+)?)% of ([\d,]+)\? Answer with a number\.", it.prompt).groups()
        expected = float(pct) * float(base.replace(",", "")) / 100
        assert it.is_correct(expected), it
        assert it.key == f"percent_of:{pct}:{base.replace(',', '')}"
        assert it.drill == "percent_of"
        assert "10%" in it.explanation


def test_fraction_to_decimal_accepts_two_decimal_answers():
    for it in items(quick.fraction_to_decimal):
        n, d = re.match(r"What is (\d+)/(\d+) as a decimal\?", it.prompt).groups()
        exact = int(n) / int(d)
        assert it.is_correct(round(exact, 2)), it
        assert not it.is_correct(exact + 0.02)
        assert it.key == f"fraction_to_decimal:{n}:{d}"


def test_same_seed_same_items():
    assert items(quick.percent_of, 5, seed=7) == items(quick.percent_of, 5, seed=7)


def test_multiply_shortcuts_answers_match_prompt():
    kinds = set()
    for it in items(quick.multiply_shortcuts):
        a, b = re.match(r"What is (\d+) x (\d+)\?", it.prompt).groups()
        assert it.is_correct(int(a) * int(b)), it
        kinds.add(it.key.split(":")[1])
    assert kinds == {"x11", "sq5", "x25"}


def test_growth_rate_from_to():
    seen_kinds = set()
    for it in items(quick.growth_rate):
        kind = it.key.split(":")[1]
        seen_kinds.add(kind)
        if kind == "pct":
            a, b = re.match(r"Something grows from ([\d,.]+) to ([\d,.]+)\. What is the growth rate\?", it.prompt).groups()
            a, b = float(a.replace(",", "")), float(b.replace(",", ""))
            assert it.is_correct((b - a) / a * 100), it
        else:
            r = int(re.match(r"At (\d+)% a year, how many years until it doubles\?", it.prompt).group(1))
            assert it.is_correct(72 / r), "rule of 72 answer must be accepted"
            assert "exact" in it.explanation
    assert seen_kinds == {"pct", "double"}


def test_back_of_envelope_kinds_and_tolerance():
    kinds = set()
    for it in items(quick.back_of_envelope, n=400):
        kind = it.key.split(":")[1]
        kinds.add(kind)
        assert it.rel_tol == 0.05
        assert it.is_correct(it.answer * 1.04)
        assert not it.is_correct(it.answer * 1.06)
    assert kinds == {"multiple", "ebitda", "mktcap", "interest"}


def test_back_of_envelope_multiple_matches_prompt():
    for it in items(quick.back_of_envelope, n=400):
        if it.key.split(":")[1] != "multiple":
            continue
        ev, e = re.match(r"A company is worth \$([\d,]+)M in total \(its enterprise value\) and earns \$([\d,]+)M of EBITDA\.", it.prompt).groups()
        assert it.is_correct(float(ev.replace(",", "")) / float(e.replace(",", ""))), it


def test_quick_group_registered():
    names = ["percent_of", "fraction_to_decimal", "multiply_shortcuts", "growth_rate", "back_of_envelope"]
    assert resolve("quick") == names
    for name in names:
        assert name in DRILLS and name in DEFINITIONS and "\n" not in DEFINITIONS[name]
