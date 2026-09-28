# Stage 1: Quick Math Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Status (2026-09-28):** executed. Build order was Tasks 1 to 3, then the poker drills (`2026-09-28-poker-drills.md`), then Tasks 7 to 9, then Tasks 4 to 6 and 10. Drill names in the CLI tests were switched to poker ones because poker was registered first.

**Goal:** A terminal drill tool that runs timed mental-math sessions, stars misses, brings starred items back first, and logs accuracy and speed.

**Architecture:** A small engine (`items`, `store`, `session`, `cli`) plus one generator function per drill in `applied_math/drills/quick.py`. Generators take a `random.Random` and return an `Item`; the engine never knows which drill it is running. Progress lives in one JSON file.

**Tech Stack:** Python 3.11+, standard library only at runtime, `pytest` for tests.

## Global Constraints

- Python `>=3.11`. No runtime dependencies. `pytest>=8` is the only dev dependency.
- Every drill shows the exact answer next to the shortcut in its explanation.
- Every drill has a one-line plain-language definition, shown the first time that drill appears for this user.
- The tool never writes into `notes/`.
- Say-it-out-loud mode is the default; type mode is the `--type` flag.
- A starred item clears after two correct answers in a row; a miss resets the streak.
- Sessions default to 10 items.
- No em-dashes in user-facing strings; use `|` as a separator.

---

### Task 1: Project scaffold

**Files:**
- Create: `pyproject.toml`, `.gitignore`, `applied_math/__init__.py`, `tests/__init__.py`, `tests/test_scaffold.py`, `notes/README.md`, `data/.gitkeep`

**Interfaces:**
- Produces: importable package `applied_math` with `__version__`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_scaffold.py
def test_package_imports():
    import applied_math
    assert applied_math.__version__ == "0.1.0"
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python -m pytest tests/test_scaffold.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'applied_math'` (or pytest not found; install it in Step 3 first).

- [ ] **Step 3: Create the scaffold**

```toml
# pyproject.toml
[project]
name = "applied-math"
version = "0.1.0"
description = "Timed drills for quick math, poker math, betting math, and quant basics."
requires-python = ">=3.11"
dependencies = []

[project.optional-dependencies]
dev = ["pytest>=8"]

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
include = ["applied_math*"]

[tool.pytest.ini_options]
testpaths = ["tests"]
```

```gitignore
# .gitignore
__pycache__/
*.pyc
.venv/
.pytest_cache/
*.egg-info/
data/progress.json
.DS_Store
```

```python
# applied_math/__init__.py
"""Applied math drills. See CLAUDE.md for who this is for."""

__version__ = "0.1.0"
```

```python
# tests/__init__.py
```

```markdown
<!-- notes/README.md -->
# Notes

Hand-written explanations go here, in your own words. The tool never writes to this folder.
Rule from the brief: if you can't explain it here without help, it doesn't go on the resume.
```

Create an empty `data/.gitkeep`.

Then install: `python -m venv .venv && source .venv/bin/activate && pip install -e ".[dev]"`

- [ ] **Step 4: Run the test to verify it passes**

Run: `python -m pytest tests/test_scaffold.py -v`
Expected: `1 passed`

- [ ] **Step 5: Commit**

```bash
git add pyproject.toml .gitignore applied_math/__init__.py tests/__init__.py tests/test_scaffold.py notes/README.md data/.gitkeep
git commit -m "chore: scaffold applied_math package with pytest"
```

---

### Task 2: Item and answer checking

**Files:**
- Create: `applied_math/items.py`
- Test: `tests/test_items.py`

**Interfaces:**
- Produces: `Item(key, drill, prompt, answer, explanation, rel_tol=0.0, abs_tol=0.005)` frozen dataclass with `is_correct(given: float) -> bool`, `to_dict() -> dict`, `Item.from_dict(d) -> Item`; `parse_answer(text: str) -> float | None`; `fmt(x: float) -> str`.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_items.py
from applied_math.items import Item, parse_answer, fmt


def make(answer=12.0, **kw):
    return Item(key="t:1", drill="t", prompt="?", answer=answer, explanation="e", **kw)


def test_exact_item_accepts_small_rounding():
    assert make(0.375).is_correct(0.375)
    assert make(0.375).is_correct(0.38) is False  # abs_tol 0.005 rejects 0.38


def test_estimation_item_uses_relative_tolerance():
    it = make(1000.0, rel_tol=0.05)
    assert it.is_correct(1040)
    assert it.is_correct(1060) is False


def test_round_trip_dict():
    it = make(3.5, rel_tol=0.1)
    assert Item.from_dict(it.to_dict()) == it


def test_parse_answer_handles_symbols_and_suffixes():
    assert parse_answer(" 1,200 ") == 1200
    assert parse_answer("$45.5") == 45.5
    assert parse_answer("25%") == 25
    assert parse_answer("1.2k") == 1200
    assert parse_answer("3M") == 3_000_000
    assert parse_answer("2b") == 2_000_000_000
    assert parse_answer("twelve") is None
    assert parse_answer("") is None


def test_fmt_strips_trailing_zeros():
    assert fmt(12.0) == "12"
    assert fmt(0.375) == "0.375"
    assert fmt(1234567.0) == "1,234,567"
    assert fmt(33.333333) == "33.333"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_items.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'applied_math.items'`

- [ ] **Step 3: Write the implementation**

```python
# applied_math/items.py
"""A drill item: one prompt, one numeric answer, one explanation."""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass

_SUFFIX = {"k": 1e3, "m": 1e6, "b": 1e9}


@dataclass(frozen=True)
class Item:
    key: str            # stable id, e.g. "percent_of:15:240"; the same numbers give the same key
    drill: str          # generator name, e.g. "percent_of"
    prompt: str
    answer: float
    explanation: str    # shortcut and exact answer, side by side
    rel_tol: float = 0.0
    abs_tol: float = 0.005

    def is_correct(self, given: float) -> bool:
        return math.isclose(given, self.answer, rel_tol=self.rel_tol, abs_tol=self.abs_tol)

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "Item":
        return cls(**d)


def parse_answer(text: str) -> float | None:
    """Turn what he typed into a number. Accepts commas, $, %, and k/m/b suffixes."""
    t = text.strip().replace(",", "").replace("$", "").rstrip("%").strip()
    if not t:
        return None
    mult = 1.0
    if t[-1].lower() in _SUFFIX:
        mult = _SUFFIX[t[-1].lower()]
        t = t[:-1]
    try:
        return float(t) * mult
    except ValueError:
        return None


def fmt(x: float) -> str:
    """Format a number for display: integers without decimals, else up to 3 decimals."""
    if math.isclose(x, round(x), abs_tol=1e-9):
        return f"{int(round(x)):,}"
    return f"{x:,.3f}".rstrip("0").rstrip(".")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/test_items.py -v`
Expected: `5 passed`

- [ ] **Step 5: Commit**

```bash
git add applied_math/items.py tests/test_items.py
git commit -m "feat: add Item dataclass with answer checking and parsing"
```

---

### Task 3: Store with the star rule

**Files:**
- Create: `applied_math/store.py`
- Test: `tests/test_store.py`

**Interfaces:**
- Consumes: `Item` from Task 2.
- Produces: `Attempt(key, drill, correct, seconds, mode, ts)` frozen dataclass; `Store(path: Path)` with `.attempts: list[dict]`, `.stars: dict[str, dict]`, `.intro_shown: list[str]`, `record(item: Item, attempt: Attempt) -> None`, `starred_items() -> list[Item]`, `mark_intro_shown(drill: str) -> None`, `save() -> None`.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_store.py
from pathlib import Path

from applied_math.items import Item
from applied_math.store import Attempt, Store


def item(key="percent_of:15:240"):
    return Item(key=key, drill="percent_of", prompt="15% of 240?", answer=36.0, explanation="e")


def attempt(correct, key="percent_of:15:240"):
    return Attempt(key=key, drill="percent_of", correct=correct, seconds=3.2, mode="type", ts=0.0)


def test_miss_stars_item(tmp_path: Path):
    s = Store(tmp_path / "p.json")
    s.record(item(), attempt(False))
    assert [i.key for i in s.starred_items()] == ["percent_of:15:240"]


def test_two_clean_reps_clear_star(tmp_path: Path):
    s = Store(tmp_path / "p.json")
    s.record(item(), attempt(False))
    s.record(item(), attempt(True))
    assert s.starred_items(), "one correct is not enough"
    s.record(item(), attempt(True))
    assert s.starred_items() == []


def test_miss_resets_streak(tmp_path: Path):
    s = Store(tmp_path / "p.json")
    s.record(item(), attempt(False))
    s.record(item(), attempt(True))
    s.record(item(), attempt(False))
    s.record(item(), attempt(True))
    assert s.starred_items(), "streak should have reset after the second miss"


def test_correct_on_unstarred_item_does_nothing(tmp_path: Path):
    s = Store(tmp_path / "p.json")
    s.record(item(), attempt(True))
    assert s.starred_items() == []
    assert len(s.attempts) == 1


def test_save_and_reload(tmp_path: Path):
    p = tmp_path / "p.json"
    s = Store(p)
    s.record(item(), attempt(False))
    s.mark_intro_shown("percent_of")
    s.save()
    s2 = Store(p)
    assert [i.key for i in s2.starred_items()] == ["percent_of:15:240"]
    assert s2.attempts[0]["correct"] is False
    assert s2.intro_shown == ["percent_of"]


def test_corrupt_file_starts_fresh(tmp_path: Path, capsys):
    p = tmp_path / "p.json"
    p.write_text("{not json")
    s = Store(p)
    assert s.attempts == [] and s.stars == {}
    assert "starting fresh" in capsys.readouterr().out
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_store.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'applied_math.store'`

- [ ] **Step 3: Write the implementation**

```python
# applied_math/store.py
"""Progress on disk: every attempt, the starred items, and which definitions have been shown."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path

from .items import Item

CLEAR_AFTER = 2  # correct answers in a row needed to clear a star


@dataclass(frozen=True)
class Attempt:
    key: str
    drill: str
    correct: bool
    seconds: float
    mode: str      # "say" or "type"
    ts: float      # unix time


class Store:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.attempts: list[dict] = []
        self.stars: dict[str, dict] = {}
        self.intro_shown: list[str] = []
        if self.path.exists():
            try:
                data = json.loads(self.path.read_text())
                self.attempts = data.get("attempts", [])
                self.stars = data.get("stars", {})
                self.intro_shown = data.get("intro_shown", [])
            except (json.JSONDecodeError, AttributeError):
                print(f"Could not read {self.path}; starting fresh.")

    def record(self, item: Item, attempt: Attempt) -> None:
        self.attempts.append(asdict(attempt))
        if not attempt.correct:
            self.stars[item.key] = {"item": item.to_dict(), "streak": 0}
        elif item.key in self.stars:
            self.stars[item.key]["streak"] += 1
            if self.stars[item.key]["streak"] >= CLEAR_AFTER:
                del self.stars[item.key]

    def starred_items(self) -> list[Item]:
        return [Item.from_dict(s["item"]) for s in self.stars.values()]

    def mark_intro_shown(self, drill: str) -> None:
        if drill not in self.intro_shown:
            self.intro_shown.append(drill)

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = {"attempts": self.attempts, "stars": self.stars, "intro_shown": self.intro_shown}
        self.path.write_text(json.dumps(payload, indent=1))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/test_store.py -v`
Expected: `6 passed`

- [ ] **Step 5: Commit**

```bash
git add applied_math/store.py tests/test_store.py
git commit -m "feat: add Store with attempt log and two-clean-reps star rule"
```

---

### Task 4: Drills: percent_of and fraction_to_decimal

**Files:**
- Create: `applied_math/drills/__init__.py`, `applied_math/drills/quick.py`
- Test: `tests/test_drills_quick.py`

**Interfaces:**
- Consumes: `Item` from Task 2.
- Produces: `applied_math.drills.DRILLS: dict[str, Callable[[random.Random], Item]]`, `applied_math.drills.GROUPS: dict[str, list[str]]`, `applied_math.drills.DEFINITIONS: dict[str, str]`, `applied_math.drills.resolve(name: str) -> list[str]` (raises `KeyError` on unknown). Generators `quick.percent_of(rng)`, `quick.fraction_to_decimal(rng)`.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_drills_quick.py
import random
import re

import pytest

from applied_math.drills import DEFINITIONS, DRILLS, GROUPS, resolve
from applied_math.drills import quick


def items(gen, n=200, seed=1):
    rng = random.Random(seed)
    return [gen(rng) for _ in range(n)]


def test_percent_of_answers_match_prompt():
    for it in items(quick.percent_of):
        pct, base = re.match(r"What is (\d+(?:\.\d+)?)% of ([\d,]+)\?", it.prompt).groups()
        expected = float(pct) * float(base.replace(",", "")) / 100
        assert it.is_correct(expected), it
        assert it.key == f"percent_of:{pct}:{base.replace(',', '')}"
        assert it.drill == "percent_of"
        assert "10%" in it.explanation


def test_fraction_to_decimal_accepts_two_decimal_answers():
    for it in items(quick.fraction_to_decimal):
        n, d = re.match(r"(\d+)/(\d+) as a decimal\?", it.prompt).groups()
        exact = int(n) / int(d)
        assert it.is_correct(round(exact, 2)), it   # he answers to two decimals
        assert not it.is_correct(exact + 0.02)
        assert it.key == f"fraction_to_decimal:{n}:{d}"


def test_same_seed_same_items():
    a = items(quick.percent_of, 5, seed=7)
    b = items(quick.percent_of, 5, seed=7)
    assert a == b


def test_registry_and_groups():
    assert set(GROUPS["quick"]) <= set(DRILLS)
    assert "percent_of" in GROUPS["quick"]
    assert resolve("quick") == GROUPS["quick"]
    assert resolve("percent_of") == ["percent_of"]
    with pytest.raises(KeyError):
        resolve("nope")
    for name in DRILLS:
        assert name in DEFINITIONS and DEFINITIONS[name].count("\n") == 0
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_drills_quick.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'applied_math.drills'`

- [ ] **Step 3: Write the two generators and the registry**

```python
# applied_math/drills/quick.py
"""Stage 1: quick mental math. Each function takes a random.Random and returns an Item."""

from __future__ import annotations

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
        prompt=f"What is {pct}% of {base:,}?",
        answer=answer,
        explanation=f"10% of {base:,} is {fmt(ten)}; {pct}% is {fmt(pct / 10)} x that = {fmt(answer)}",
    )


DENOMINATORS = [3, 4, 5, 6, 7, 8, 9, 11, 12, 16]


def fraction_to_decimal(rng: random.Random) -> Item:
    d = rng.choice(DENOMINATORS)
    n = rng.randint(1, d - 1)
    answer = n / d
    return Item(
        key=f"fraction_to_decimal:{n}:{d}",
        drill="fraction_to_decimal",
        prompt=f"{n}/{d} as a decimal?",
        answer=answer,
        explanation=f"1/{d} = {1 / d:.3f}, so {n}/{d} = {n} x {1 / d:.3f} = {answer:.3f}",
        abs_tol=0.006,  # two-decimal answers count
    )
```

```python
# applied_math/drills/__init__.py
"""Drill registry. A drill is a function random.Random -> Item."""

from __future__ import annotations

import random
from typing import Callable

from ..items import Item
from . import quick

Generator = Callable[[random.Random], Item]

DRILLS: dict[str, Generator] = {
    "percent_of": quick.percent_of,
    "fraction_to_decimal": quick.fraction_to_decimal,
}

GROUPS: dict[str, list[str]] = {
    "quick": ["percent_of", "fraction_to_decimal"],
}

# One line, plain language, shown the first time the drill appears.
DEFINITIONS: dict[str, str] = {
    "percent_of": "Percent means per hundred: 15% of 240 is 15 hundredths of 240. Start from 10% and scale.",
    "fraction_to_decimal": "A fraction is a division: 3/8 means 3 divided by 8. Memorise 1/n and multiply.",
}


def resolve(name: str) -> list[str]:
    """A group name or a drill name -> list of drill names. Raises KeyError if unknown."""
    if name in GROUPS:
        return list(GROUPS[name])
    if name in DRILLS:
        return [name]
    raise KeyError(name)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/test_drills_quick.py -v`
Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add applied_math/drills/__init__.py applied_math/drills/quick.py tests/test_drills_quick.py
git commit -m "feat: add percent_of and fraction_to_decimal drills with registry"
```

---

### Task 5: Drills: multiply_shortcuts and growth_rate

**Files:**
- Modify: `applied_math/drills/quick.py` (append), `applied_math/drills/__init__.py` (register)
- Test: `tests/test_drills_quick.py` (append)

**Interfaces:**
- Produces: `quick.multiply_shortcuts(rng)`, `quick.growth_rate(rng)`; registered as `"multiply_shortcuts"`, `"growth_rate"` in `DRILLS`, `GROUPS["quick"]`, `DEFINITIONS`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_drills_quick.py`:

```python
def test_multiply_shortcuts_answers_match_prompt():
    kinds = set()
    for it in items(quick.multiply_shortcuts):
        a, b = re.match(r"(\d+) x (\d+)\?", it.prompt).groups()
        assert it.is_correct(int(a) * int(b)), it
        kinds.add(it.key.split(":")[1])
    assert kinds == {"x11", "sq5", "x25"}


def test_growth_rate_from_to():
    seen_kinds = set()
    for it in items(quick.growth_rate):
        kind = it.key.split(":")[1]
        seen_kinds.add(kind)
        if kind == "pct":
            a, b = re.match(r"From ([\d,.]+) to ([\d,.]+), what is the growth rate \(%\)\?", it.prompt).groups()
            a, b = float(a.replace(",", "")), float(b.replace(",", ""))
            assert it.is_correct((b - a) / a * 100), it
        else:
            r = int(re.match(r"At (\d+)% a year, how many years to double\?", it.prompt).group(1))
            assert it.is_correct(72 / r), "rule of 72 answer must be accepted"
            assert "exact" in it.explanation
    assert seen_kinds == {"pct", "double"}


def test_new_drills_registered():
    for name in ("multiply_shortcuts", "growth_rate"):
        assert name in DRILLS and name in GROUPS["quick"] and name in DEFINITIONS
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_drills_quick.py -v`
Expected: 3 new tests FAIL with `AttributeError: module 'applied_math.drills.quick' has no attribute 'multiply_shortcuts'`

- [ ] **Step 3: Write the generators and register them**

Add `import math` to the imports at the top of `applied_math/drills/quick.py`, then append:

```python
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
        prompt=f"{a} x {b}?",
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
            prompt=f"From {a:,} to {fmt(b)}, what is the growth rate (%)?",
            answer=float(r),
            explanation=f"change = {fmt(b)} - {a:,} = {fmt(b - a)}; divided by the start {a:,} = {r}%",
            abs_tol=0.5,
        )
    r = rng.choice(DOUBLING_RATES)
    exact = math.log(2) / math.log(1 + r / 100)
    return Item(
        key=f"growth_rate:double:{r}",
        drill="growth_rate",
        prompt=f"At {r}% a year, how many years to double?",
        answer=72 / r,
        explanation=f"rule of 72: 72 / {r} = {fmt(72 / r)} years | exact: ln 2 / ln(1.{r:02d}) = {exact:.1f} years",
        abs_tol=1.0,
    )
```

In `applied_math/drills/__init__.py`, replace the three dicts with:

```python
DRILLS: dict[str, Generator] = {
    "percent_of": quick.percent_of,
    "fraction_to_decimal": quick.fraction_to_decimal,
    "multiply_shortcuts": quick.multiply_shortcuts,
    "growth_rate": quick.growth_rate,
}

GROUPS: dict[str, list[str]] = {
    "quick": ["percent_of", "fraction_to_decimal", "multiply_shortcuts", "growth_rate"],
}

DEFINITIONS: dict[str, str] = {
    "percent_of": "Percent means per hundred: 15% of 240 is 15 hundredths of 240. Start from 10% and scale.",
    "fraction_to_decimal": "A fraction is a division: 3/8 means 3 divided by 8. Memorise 1/n and multiply.",
    "multiply_shortcuts": "Patterns that replace long multiplication: x11, squares ending in 5, x25 as quarter-then-hundred.",
    "growth_rate": "Growth rate is change divided by the starting value. Rule of 72: years to double is about 72 / rate.",
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/test_drills_quick.py -v`
Expected: `7 passed`

- [ ] **Step 5: Commit**

```bash
git add applied_math/drills/quick.py applied_math/drills/__init__.py tests/test_drills_quick.py
git commit -m "feat: add multiply_shortcuts and growth_rate drills"
```

---

### Task 6: Drill: back_of_envelope (banking numbers)

**Files:**
- Modify: `applied_math/drills/quick.py` (append), `applied_math/drills/__init__.py` (register)
- Test: `tests/test_drills_quick.py` (append)

**Interfaces:**
- Produces: `quick.back_of_envelope(rng)`; registered as `"back_of_envelope"`. All items use `rel_tol=0.05`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_drills_quick.py`:

```python
def test_back_of_envelope_kinds_and_tolerance():
    kinds = set()
    for it in items(quick.back_of_envelope, n=400):
        kind = it.key.split(":")[1]
        kinds.add(kind)
        assert it.rel_tol == 0.05
        assert it.is_correct(it.answer * 1.04)
        assert not it.is_correct(it.answer * 1.06)
        assert "$" in it.prompt or "%" in it.prompt
    assert kinds == {"multiple", "ebitda", "mktcap", "interest"}


def test_back_of_envelope_multiple_matches_prompt():
    for it in items(quick.back_of_envelope, n=400):
        if it.key.split(":")[1] != "multiple":
            continue
        ev, e = re.match(r"EV \$([\d,]+)M, EBITDA \$([\d,]+)M\. EV/EBITDA\?", it.prompt).groups()
        assert it.is_correct(float(ev.replace(",", "")) / float(e.replace(",", ""))), it


def test_back_of_envelope_registered():
    assert "back_of_envelope" in DRILLS and "back_of_envelope" in GROUPS["quick"] and "back_of_envelope" in DEFINITIONS
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_drills_quick.py -v`
Expected: 3 new tests FAIL with `AttributeError: ... has no attribute 'back_of_envelope'`

- [ ] **Step 3: Write the generator and register it**

Append to `applied_math/drills/quick.py`:

```python
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
            prompt=f"EV ${ev:,}M, EBITDA ${e:,}M. EV/EBITDA?",
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
            prompt=f"Revenue ${rev:,}M at a {margin}% EBITDA margin. EBITDA ($M)?",
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
            prompt=f"Share price ${price}, {shares:,}M shares. Market cap ($M)?",
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
        prompt=f"${debt:,}M of debt at {rate}%. Annual interest expense ($M)?",
        answer=ans,
        explanation=f"{rate}% of {debt:,} = {fmt(ans)} | interest expense is the yearly cost of the debt",
        rel_tol=0.05,
    )
```

In `applied_math/drills/__init__.py`, add to each dict:

```python
    "back_of_envelope": quick.back_of_envelope,        # DRILLS
```
```python
    "quick": ["percent_of", "fraction_to_decimal", "multiply_shortcuts", "growth_rate", "back_of_envelope"],
```
```python
    "back_of_envelope": "Rough interview numbers: EV/EBITDA multiple, EBITDA from a margin, market cap, interest expense. Within 5% counts.",
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/test_drills_quick.py -v`
Expected: `10 passed`

- [ ] **Step 5: Commit**

```bash
git add applied_math/drills/quick.py applied_math/drills/__init__.py tests/test_drills_quick.py
git commit -m "feat: add back_of_envelope banking-number drill"
```

---

### Task 7: Session: queue ordering and the run loop

**Files:**
- Create: `applied_math/session.py`
- Test: `tests/test_session.py`

**Interfaces:**
- Consumes: `DRILLS`, `DEFINITIONS` (Task 4 to 6), `Store`, `Attempt` (Task 3), `Item`, `parse_answer`, `fmt` (Task 2).
- Produces: `build_queue(store: Store, drill_names: list[str], n: int, rng: random.Random) -> list[Item]`; `run_session(items: list[Item], store: Store, mode: str, ask: Callable[[str], str], say: Callable[[str], None], clock: Callable[[], float] = time.monotonic, now: Callable[[], float] = time.time) -> list[Attempt]`; `show_intros(drill_names, store, say) -> None`.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_session.py
import random
from pathlib import Path

from applied_math.items import Item
from applied_math.session import build_queue, run_session, show_intros
from applied_math.store import Attempt, Store


def starred_item(key="percent_of:15:240"):
    return Item(key=key, drill="percent_of", prompt="What is 15% of 240?", answer=36.0, explanation="e")


def test_starred_items_come_first_and_queue_has_no_duplicates(tmp_path: Path):
    s = Store(tmp_path / "p.json")
    s.record(starred_item(), Attempt("percent_of:15:240", "percent_of", False, 1.0, "type", 0.0))
    q = build_queue(s, ["percent_of", "fraction_to_decimal"], 10, random.Random(3))
    assert q[0].key == "percent_of:15:240"
    assert len(q) == 10
    assert len({i.key for i in q}) == 10


def test_starred_items_from_other_drills_are_left_out(tmp_path: Path):
    s = Store(tmp_path / "p.json")
    s.record(starred_item(), Attempt("percent_of:15:240", "percent_of", False, 1.0, "type", 0.0))
    q = build_queue(s, ["fraction_to_decimal"], 3, random.Random(3))
    assert all(i.drill == "fraction_to_decimal" for i in q)


class FakeClock:
    def __init__(self):
        self.t = 0.0

    def __call__(self):
        self.t += 2.5
        return self.t


def scripted(answers):
    answers = list(answers)
    out = []

    def ask(prompt):
        out.append(prompt)
        return answers.pop(0)

    def say(text):
        out.append(text)

    return ask, say, out


def test_type_mode_grades_and_records(tmp_path: Path):
    s = Store(tmp_path / "p.json")
    items = [starred_item(), Item("t:2", "percent_of", "What is 50% of 80?", 40.0, "e2")]
    ask, say, out = scripted(["36", "41"])
    results = run_session(items, s, "type", ask, say, clock=FakeClock(), now=lambda: 99.0)
    assert [a.correct for a in results] == [True, False]
    assert results[0].seconds == 2.5 and results[0].mode == "type" and results[0].ts == 99.0
    assert [i.key for i in s.starred_items()] == ["t:2"]
    assert (tmp_path / "p.json").exists(), "session saves at the end"
    assert any("Answer: 40" in line for line in out)


def test_say_mode_uses_self_grade(tmp_path: Path):
    s = Store(tmp_path / "p.json")
    ask, say, out = scripted(["", "y", "", "n"])
    results = run_session([starred_item(), starred_item("t:2")], s, "say", ask, say, clock=FakeClock(), now=lambda: 0.0)
    assert [a.correct for a in results] == [True, False]


def test_non_number_counts_as_miss(tmp_path: Path):
    s = Store(tmp_path / "p.json")
    ask, say, out = scripted(["thirty six"])
    results = run_session([starred_item()], s, "type", ask, say, clock=FakeClock(), now=lambda: 0.0)
    assert results[0].correct is False
    assert any("not a number" in line for line in out)


def test_intro_shown_once(tmp_path: Path):
    s = Store(tmp_path / "p.json")
    ask, say, out = scripted([])
    show_intros(["percent_of"], s, say)
    show_intros(["percent_of"], s, say)
    assert sum("percent_of" in line for line in out) == 1
    assert s.intro_shown == ["percent_of"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_session.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'applied_math.session'`

- [ ] **Step 3: Write the implementation**

```python
# applied_math/session.py
"""Build a queue of items (starred first) and run it with timing and grading."""

from __future__ import annotations

import random
import time
from typing import Callable

from .drills import DEFINITIONS, DRILLS
from .items import Item, fmt, parse_answer
from .store import Attempt, Store

Ask = Callable[[str], str]
Say = Callable[[str], None]


def build_queue(store: Store, drill_names: list[str], n: int, rng: random.Random) -> list[Item]:
    wanted = set(drill_names)
    queue = [it for it in store.starred_items() if it.drill in wanted][:n]
    seen = {it.key for it in queue}
    tries = 0
    i = 0
    while len(queue) < n and tries < n * 50:
        gen = DRILLS[drill_names[i % len(drill_names)]]
        i += 1
        tries += 1
        item = gen(rng)
        if item.key in seen:
            continue
        seen.add(item.key)
        queue.append(item)
    return queue


def show_intros(drill_names: list[str], store: Store, say: Say) -> None:
    for name in drill_names:
        if name not in store.intro_shown:
            say(f"{name}: {DEFINITIONS[name]}")
            store.mark_intro_shown(name)


def run_session(
    items: list[Item],
    store: Store,
    mode: str,
    ask: Ask,
    say: Say,
    clock: Callable[[], float] = time.monotonic,
    now: Callable[[], float] = time.time,
) -> list[Attempt]:
    results: list[Attempt] = []
    try:
        for i, item in enumerate(items, 1):
            say(f"\n[{i}/{len(items)}] {item.prompt}")
            t0 = clock()
            if mode == "say":
                ask("  (say it, then press Enter) ")
                secs = clock() - t0
                say(f"  Answer: {fmt(item.answer)} | {item.explanation}")
                correct = ask("  Did you get it? [y/n] ").strip().lower().startswith("y")
            else:
                raw = ask("  > ")
                secs = clock() - t0
                given = parse_answer(raw)
                if given is None:
                    say("  That's not a number; counted as a miss.")
                    correct = False
                else:
                    correct = item.is_correct(given)
                mark = "OK " if correct else "MISS "
                say(f"  {mark}Answer: {fmt(item.answer)} | {item.explanation}")
            attempt = Attempt(item.key, item.drill, correct, round(secs, 1), mode, now())
            store.record(item, attempt)
            results.append(attempt)
    except KeyboardInterrupt:
        say("\nStopped early; saving what you did.")
    store.save()
    return results
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/test_session.py -v`
Expected: `6 passed`

- [ ] **Step 5: Commit**

```bash
git add applied_math/session.py tests/test_session.py
git commit -m "feat: add session queue ordering and run loop with say and type modes"
```

---

### Task 8: CLI: drill command and session summary

**Files:**
- Create: `applied_math/cli.py`, `applied_math/__main__.py`
- Test: `tests/test_cli.py`

**Interfaces:**
- Consumes: `resolve`, `build_queue`, `run_session`, `show_intros`, `Store`.
- Produces: `main(argv: list[str] | None = None, ask=input, say=print) -> int`; `summarize(results: list[Attempt], store: Store) -> str`. Command: `python -m applied_math drill <name> [-n N] [--type] [--data PATH] [--seed S]`.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_cli.py
from pathlib import Path

from applied_math.cli import main


def scripted(answers):
    answers = list(answers)
    out = []

    def ask(prompt):
        return answers.pop(0)

    def say(text=""):
        out.append(str(text))

    return ask, say, out


def test_drill_runs_and_summarizes(tmp_path: Path):
    ask, say, out = scripted(["0"] * 3)  # three wrong typed answers
    rc = main(["drill", "quick", "-n", "3", "--type", "--data", str(tmp_path / "p.json"), "--seed", "1"], ask=ask, say=say)
    assert rc == 0
    text = "\n".join(out)
    assert "0/3 correct" in text
    assert "3 starred" in text
    assert (tmp_path / "p.json").exists()


def test_unknown_drill_returns_error(tmp_path: Path):
    ask, say, out = scripted([])
    rc = main(["drill", "nope", "--data", str(tmp_path / "p.json")], ask=ask, say=say)
    assert rc == 2
    assert any("Unknown drill" in line for line in out)


def test_intro_shown_on_first_run_only(tmp_path: Path):
    data = str(tmp_path / "p.json")
    ask, say, out1 = scripted(["0"])
    main(["drill", "percent_of", "-n", "1", "--type", "--data", data], ask=ask, say=say)
    ask, say, out2 = scripted(["0"])
    main(["drill", "percent_of", "-n", "1", "--type", "--data", data], ask=ask, say=say)
    assert any("Percent means" in line for line in out1)
    assert not any("Percent means" in line for line in out2)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_cli.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'applied_math.cli'`

- [ ] **Step 3: Write the CLI**

```python
# applied_math/cli.py
"""Command line: drill, stats, stars."""

from __future__ import annotations

import argparse
import random
from pathlib import Path
from statistics import mean

from .drills import resolve
from .session import build_queue, run_session, show_intros
from .store import Attempt, Store

DEFAULT_DATA = Path("data/progress.json")


def summarize(results: list[Attempt], store: Store) -> str:
    if not results:
        return "No items answered."
    n_ok = sum(a.correct for a in results)
    avg = mean(a.seconds for a in results)
    return f"{n_ok}/{len(results)} correct | {avg:.1f}s average | {len(store.stars)} starred"


def cmd_drill(args, ask, say) -> int:
    try:
        names = resolve(args.name)
    except KeyError:
        say(f"Unknown drill or group: {args.name}. Try 'quick' or run 'python -m applied_math list'.")
        return 2
    store = Store(args.data)
    rng = random.Random(args.seed)
    show_intros(names, store, say)
    mode = "type" if args.type else "say"
    items = build_queue(store, names, args.n, rng)
    results = run_session(items, store, mode, ask, say)
    say("\n" + summarize(results, store))
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="applied_math", description="Short timed math drills.")
    sub = p.add_subparsers(dest="command", required=True)

    d = sub.add_parser("drill", help="run a session")
    d.add_argument("name", help="a drill name or a group, e.g. quick")
    d.add_argument("-n", type=int, default=10, help="number of items (default 10)")
    d.add_argument("--type", action="store_true", help="type answers instead of say-and-self-grade")
    d.add_argument("--seed", type=int, default=None, help="fix the random seed (for tests)")
    d.add_argument("--data", type=Path, default=DEFAULT_DATA, help="progress file (default data/progress.json)")
    d.set_defaults(func=cmd_drill)
    return p


def main(argv: list[str] | None = None, ask=input, say=print) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args, ask, say)
```

Note: `--data` is registered on each subparser, not the top-level parser, so it works after the subcommand (`drill quick --data x.json`).

```python
# applied_math/__main__.py
import sys

from .cli import main

sys.exit(main())
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/test_cli.py -v`
Expected: `3 passed`

Then try it by hand: `python -m applied_math drill quick -n 3`
Expected: definitions print once, three prompts, a summary line.

- [ ] **Step 5: Commit**

```bash
git add applied_math/cli.py applied_math/__main__.py tests/test_cli.py
git commit -m "feat: add drill command with session summary"
```

---

### Task 9: CLI: stats, stars, and list commands

**Files:**
- Modify: `applied_math/cli.py`
- Test: `tests/test_cli.py` (append)

**Interfaces:**
- Produces: commands `stats [--data]`, `stars [--data]`, `list`. Function `stats_lines(store: Store) -> list[str]` returns one line per drill: `name: attempts, accuracy %, average seconds`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_cli.py`:

```python
from applied_math.cli import stats_lines
from applied_math.items import Item
from applied_math.store import Attempt, Store


def test_stats_lines_per_drill(tmp_path: Path):
    s = Store(tmp_path / "p.json")
    it = Item("percent_of:1:1", "percent_of", "?", 1.0, "e")
    s.record(it, Attempt(it.key, "percent_of", True, 2.0, "type", 0.0))
    s.record(it, Attempt(it.key, "percent_of", False, 4.0, "type", 0.0))
    lines = stats_lines(s)
    assert lines == ["percent_of: 2 attempts | 50% correct | 3.0s average"]


def test_stats_and_stars_commands(tmp_path: Path):
    data = str(tmp_path / "p.json")
    ask, say, _ = scripted(["0"])
    main(["drill", "percent_of", "-n", "1", "--type", "--data", data], ask=ask, say=say)
    ask, say, out = scripted([])
    assert main(["stats", "--data", data], ask=ask, say=say) == 0
    assert any("percent_of: 1 attempts" in line for line in out)
    ask, say, out = scripted([])
    assert main(["stars", "--data", data], ask=ask, say=say) == 0
    assert any("What is" in line for line in out)


def test_list_command_names_groups_and_drills():
    ask, say, out = scripted([])
    assert main(["list"], ask=ask, say=say) == 0
    text = "\n".join(out)
    assert "quick" in text and "back_of_envelope" in text
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_cli.py -v`
Expected: 3 new tests FAIL (`ImportError: cannot import name 'stats_lines'`).

- [ ] **Step 3: Add the commands**

Add to `applied_math/cli.py` (imports at top, functions before `build_parser`):

```python
from collections import defaultdict

from .drills import DEFINITIONS, DRILLS, GROUPS


def stats_lines(store: Store) -> list[str]:
    by_drill: dict[str, list[dict]] = defaultdict(list)
    for a in store.attempts:
        by_drill[a["drill"]].append(a)
    lines = []
    for name in sorted(by_drill):
        rows = by_drill[name]
        acc = 100 * sum(r["correct"] for r in rows) / len(rows)
        avg = mean(r["seconds"] for r in rows)
        lines.append(f"{name}: {len(rows)} attempts | {acc:.0f}% correct | {avg:.1f}s average")
    return lines


def cmd_stats(args, ask, say) -> int:
    store = Store(args.data)
    lines = stats_lines(store) or ["No attempts yet."]
    for line in lines:
        say(line)
    say(f"{len(store.stars)} starred")
    return 0


def cmd_stars(args, ask, say) -> int:
    store = Store(args.data)
    items = store.starred_items()
    if not items:
        say("Nothing starred.")
        return 0
    for it in items:
        streak = store.stars[it.key]["streak"]
        say(f"[{it.drill}] {it.prompt}  (clean reps so far: {streak}/2)")
    return 0


def cmd_list(args, ask, say) -> int:
    for group, names in GROUPS.items():
        say(f"{group}: {', '.join(names)}")
    say("")
    for name in DRILLS:
        say(f"{name}: {DEFINITIONS[name]}")
    return 0
```

In `build_parser`, after the `drill` subparser:

```python
    for name, func in (("stats", cmd_stats), ("stars", cmd_stars)):
        sp = sub.add_parser(name, help=f"show {name}")
        sp.add_argument("--data", type=Path, default=DEFAULT_DATA)
        sp.set_defaults(func=func)
    ls = sub.add_parser("list", help="list drills and groups")
    ls.set_defaults(func=cmd_list)
```

- [ ] **Step 4: Run the whole suite**

Run: `python -m pytest -v`
Expected: all tests pass (`34 passed` if every earlier task was done as written).

- [ ] **Step 5: Commit**

```bash
git add applied_math/cli.py tests/test_cli.py
git commit -m "feat: add stats, stars, and list commands"
```

---

### Task 10: README and first real session

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the README**

```markdown
# Applied Math

Short, timed drills. Ten minutes a day. See `CLAUDE.md` for who this is for and why.

## Setup (once)

    python3 -m venv .venv && source .venv/bin/activate
    pip install -e ".[dev]"

## Daily

    python -m applied_math drill quick          # say the answer, press Enter, grade yourself
    python -m applied_math drill quick --type   # type the answer; use this for the weekly check
    python -m applied_math stars                # what you missed and still owe two clean reps on
    python -m applied_math stats                # accuracy and speed per drill

Starred items come back first next session. A star clears after two correct answers in a row.

## Tests

    python -m pytest

## Stage 1 exit criterion

Ten items in under four minutes, in type mode, at 90% or better, three sessions in a row, with nothing starred.
Then start Stage 2 (poker) from the spec in `docs/superpowers/specs/`.
```

- [ ] **Step 2: Run one real session in type mode and check the file**

Run: `python -m applied_math drill quick --type` then `cat data/progress.json | head -30`
Expected: attempts recorded with `seconds` and `mode: "type"`; any misses appear under `stars`.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with daily commands and Stage 1 exit criterion"
```

---

## Self-review against the spec

- **Spec coverage.** Five drills (Tasks 4 to 6), say and type modes (Task 7), starred-first ordering and two-clean-reps rule (Tasks 3 and 7), timing and accuracy log (Tasks 3, 7, 9), one-line definitions shown once (Tasks 4 to 8), exact answer next to the shortcut (every explanation string), Ctrl-C safe save (Task 7), corrupt file recovery (Task 3), `notes/` untouched (Task 1 only creates a README there). Covered.
- **Placeholders.** None. Every step has its code.
- **Type consistency.** `Item` fields, `Attempt(key, drill, correct, seconds, mode, ts)`, `Store.record(item, attempt)`, `build_queue(store, names, n, rng)`, `run_session(items, store, mode, ask, say, clock, now)` are used with the same signatures in every task.
- **Known soft spot.** `back_of_envelope:multiple` keys use `ev:e`, and `growth_rate:pct` keys embed the formatted target, so two different prompts can never share a key, but a formatting change to `fmt` would orphan old stars. Acceptable for a one-user tool; note it if `fmt` ever changes.
