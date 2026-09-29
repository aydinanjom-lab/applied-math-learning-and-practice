"""Build a queue of items (starred first) and run it with timing and grading.

Input and output are passed in as functions so a phone or web front end can drive
the same engine later without touching this file.
"""

from __future__ import annotations

import random
import time
from typing import Callable

from .drills import DEFINITIONS, DRILLS
from .items import Item, fmt, parse_answer
from .store import Attempt, Store
from .ui import Palette, plain

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


def _self_grade(ask: Ask, say: Say) -> bool:
    while True:
        reply = ask("  Did you get it? [y/n] ").strip().lower()
        if reply.startswith("y"):
            return True
        if reply.startswith("n"):
            return False
        say("  Please answer y or n.")


def run_session(
    items: list[Item],
    store: Store,
    mode: str,
    ask: Ask,
    say: Say,
    clock: Callable[[], float] = time.monotonic,
    now: Callable[[], float] = time.time,
    palette: Palette | None = None,
) -> list[Attempt]:
    pal = palette or plain()
    results: list[Attempt] = []
    n_ok = 0
    try:
        for i, item in enumerate(items, 1):
            starred = item.key in store.stars
            tag = pal.dim(" (starred)") if starred else ""
            say(f"\n{pal.dim(f'[{i}/{len(items)}] {n_ok} right')}{tag}")
            say(f"{pal.bold(item.prompt)}")
            t0 = clock()
            if mode == "say":
                ask("  (say it, then press Enter) ")
                secs = clock() - t0
                say(f"  Answer: {pal.bold(fmt(round(item.answer, 1)))}  {pal.dim(item.explanation)}")
                correct = _self_grade(ask, say)
                say(f"  {pal.ok('✓ correct') if correct else pal.miss('✗ missed')}  {pal.dim(f'{secs:.1f}s')}")
            else:
                raw = ask("  > ")
                secs = clock() - t0
                given = parse_answer(raw)
                if given is None:
                    say("  That's not a number; counted as a miss. Type digits only, like 25 or 33.3.")
                    correct = False
                else:
                    correct = item.is_correct(given)
                mark = pal.ok("✓ correct") if correct else pal.miss("✗ missed")
                say(f"  {mark}  {pal.dim(f'{secs:.1f}s')}  Answer: {pal.bold(fmt(round(item.answer, 1)))}")
                say(f"  {pal.dim(item.explanation)}")
            attempt = Attempt(item.key, item.drill, correct, round(secs, 1), mode, now())
            store.record(item, attempt)
            if starred and item.key not in store.stars:
                say(f"  {pal.ok('star cleared')}: two clean reps in a row")
            elif not correct:
                say(f"  {pal.miss('starred')}: comes back first next session until you get it twice running")
            n_ok += correct
            results.append(attempt)
    except KeyboardInterrupt:
        say("\nStopped early; saving what you did.")
    store.save()
    return results
