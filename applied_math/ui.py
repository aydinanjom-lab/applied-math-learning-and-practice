"""Terminal colors. Meaning is never carried by color alone: every mark has a symbol and a word too."""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from typing import Callable

Style = Callable[[str], str]


@dataclass(frozen=True)
class Palette:
    ok: Style
    miss: Style
    dim: Style
    bold: Style


def _wrap(code: str) -> Style:
    return lambda s: f"\x1b[{code}m{s}\x1b[0m"


def plain() -> Palette:
    ident: Style = lambda s: s
    return Palette(ok=ident, miss=ident, dim=ident, bold=ident)


def colored() -> Palette:
    return Palette(ok=_wrap("32"), miss=_wrap("31"), dim=_wrap("2"), bold=_wrap("1"))


def auto() -> Palette:
    """Colors only when stdout is a real terminal and NO_COLOR is not set."""
    if os.environ.get("NO_COLOR") or not sys.stdout.isatty():
        return plain()
    return colored()
