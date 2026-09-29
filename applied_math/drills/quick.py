"""Stage 1: quick mental math. Each function takes a random.Random and returns an Item."""

from __future__ import annotations

import math
import random

from ..items import Item, fmt

PERCENTS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80, 90]
BASES = [20, 30, 40, 60, 80, 120, 150, 160, 200, 240, 300, 360, 400, 450, 500, 600, 750, 800, 1200, 2500, 4000]


def percent_of(rng: random.Random) -> Item:
    pct = rng.choice(PERCENTS)
    base = rng.choice(BASES)
    answer = pct * base / 100
    ten = base / 10
    return Item(
        key=f"percent_of:{pct}:{base}",
        drill="percent_of",
        prompt=f"What is {pct}% of {base:,}? Answer with a number.",
        answer=answer,
        explanation=f"10% of {base:,} is {fmt(ten)}; {pct}% is {fmt(pct / 10)} x that = {fmt(answer)}",
    )


DENOMINATORS = [3, 4, 5, 6, 7, 8, 9, 11, 12, 16]


def fraction_to_decimal(rng: random.Random) -> Item:
    while True:
        d = rng.choice(DENOMINATORS)
        n = rng.randint(1, d - 1)
        if math.gcd(n, d) == 1:
            break
    answer = n / d
    return Item(
        key=f"fraction_to_decimal:{n}:{d}",
        drill="fraction_to_decimal",
        prompt=f"What is {n}/{d} as a decimal? Answer with a number.",
        answer=answer,
        explanation=f"1/{d} = {1 / d:.3f}, so {n}/{d} = {n} x {1 / d:.3f} = {answer:.3f}",
        abs_tol=0.006,  # two-decimal answers count
    )


def multiply_shortcuts(rng: random.Random) -> Item:
    kind = rng.choice(["x11", "sq5", "x25"])
    if kind == "x11":
        a = rng.randint(12, 98)
        b = 11
        tens, ones = divmod(a, 10)
        how = f"write {tens} _ {ones}, put {tens}+{ones}={tens + ones} in the middle (carry if 10 or more)"
    elif kind == "sq5":
        a = b = rng.choice([15, 25, 35, 45, 55, 65, 75, 85, 95])
        t = a // 10
        how = f"{t} x {t + 1} = {t * (t + 1)}, then append 25"
    else:
        a = rng.choice([12, 16, 24, 28, 32, 36, 44, 48, 52, 64, 72, 88, 96])
        b = 25
        how = f"{a} / 4 = {fmt(a / 4)}, then x 100"
    answer = a * b
    return Item(
        key=f"multiply_shortcuts:{kind}:{a}:{b}",
        drill="multiply_shortcuts",
        prompt=f"What is {a} x {b}? Answer with a number.",
        answer=float(answer),
        explanation=f"{how} | exact: {a} x {b} = {answer:,}",
    )


GROWTH_RATES = [5, 10, 12, 15, 20, 25, 30, 50, 100]
GROWTH_BASES = [40, 50, 80, 100, 120, 150, 200, 240, 300, 400, 500, 800, 1000, 1200, 2000]
DOUBLING_RATES = [3, 4, 6, 8, 9, 12, 18, 24]


def growth_rate(rng: random.Random) -> Item:
    if rng.random() < 0.6:
        r = rng.choice(GROWTH_RATES)
        a = rng.choice(GROWTH_BASES)
        b = a * (100 + r) / 100
        return Item(
            key=f"growth_rate:pct:{a}:{fmt(b)}",
            drill="growth_rate",
            prompt=f"Something grows from {a:,} to {fmt(b)}. What is the growth rate? Answer in %.",
            answer=float(r),
            explanation=f"change = {fmt(b)} - {a:,} = {fmt(b - a)}; divided by the start {a:,} = {r}%",
            abs_tol=0.5,
        )
    r = rng.choice(DOUBLING_RATES)
    exact = math.log(2) / math.log(1 + r / 100)
    return Item(
        key=f"growth_rate:double:{r}",
        drill="growth_rate",
        prompt=f"At {r}% a year, how many years until it doubles? Answer in years.",
        answer=72 / r,
        explanation=f"rule of 72: 72 / {r} = {fmt(72 / r)} years | exact: ln 2 / ln(1.{r:02d}) = {exact:.1f} years",
        abs_tol=1.0,
    )


def back_of_envelope(rng: random.Random) -> Item:
    """Numbers that come up in banking interviews. Tolerance 5%: this is estimation."""
    kind = rng.choice(["multiple", "ebitda", "mktcap", "interest"])
    if kind == "multiple":
        e = rng.choice([25, 40, 50, 60, 80, 100, 120, 150, 200, 250, 400])
        mult = rng.choice([6, 7, 8, 9, 10, 11, 12, 14, 15])
        ev = e * mult
        return Item(
            key=f"back_of_envelope:multiple:{ev}:{e}",
            drill="back_of_envelope",
            prompt=f"A company is worth ${ev:,}M in total (its enterprise value) and earns ${e:,}M of EBITDA. What is its EV/EBITDA multiple? Answer with a number.",
            answer=float(mult),
            explanation=f"EV / EBITDA = {ev:,} / {e:,} = {mult}x | enterprise value is what the whole business costs, debt included",
            rel_tol=0.05,
        )
    if kind == "ebitda":
        rev = rng.choice([80, 120, 200, 250, 400, 500, 750, 1000, 1500, 2000])
        margin = rng.choice([8, 10, 12, 15, 18, 20, 25, 30, 35, 40])
        ans = rev * margin / 100
        return Item(
            key=f"back_of_envelope:ebitda:{rev}:{margin}",
            drill="back_of_envelope",
            prompt=f"A company has ${rev:,}M of revenue and a {margin}% EBITDA margin. What is its EBITDA? Answer in $M.",
            answer=ans,
            explanation=f"{margin}% of {rev:,} = {fmt(ans)} | margin is profit as a share of revenue",
            rel_tol=0.05,
        )
    if kind == "mktcap":
        price = rng.choice([8, 12, 15, 20, 25, 30, 40, 45, 50, 60, 75, 80, 120])
        shares = rng.choice([20, 40, 50, 80, 100, 150, 200, 250, 400, 500])
        ans = float(price * shares)
        return Item(
            key=f"back_of_envelope:mktcap:{price}:{shares}",
            drill="back_of_envelope",
            prompt=f"A stock trades at ${price} and there are {shares:,}M shares. What is the market cap? Answer in $M.",
            answer=ans,
            explanation=f"{price} x {shares:,} = {fmt(ans)} | market cap is the price of all the equity",
            rel_tol=0.05,
        )
    debt = rng.choice([50, 100, 150, 200, 300, 400, 500, 800, 1000, 1500])
    rate = rng.choice([4, 5, 6, 7, 8, 9, 10, 12])
    ans = debt * rate / 100
    return Item(
        key=f"back_of_envelope:interest:{debt}:{rate}",
        drill="back_of_envelope",
        prompt=f"A company has ${debt:,}M of debt at {rate}% interest. What does it pay in interest each year? Answer in $M.",
        answer=ans,
        explanation=f"{rate}% of {debt:,} = {fmt(ans)} | interest expense is the yearly cost of the debt",
        rel_tol=0.05,
    )
