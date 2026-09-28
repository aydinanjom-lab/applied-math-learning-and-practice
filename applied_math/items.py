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
