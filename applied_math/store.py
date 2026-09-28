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
