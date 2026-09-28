"""Command line: drill, stats, stars, list."""

from __future__ import annotations

import argparse
import random
from collections import defaultdict
from pathlib import Path
from statistics import mean

from .drills import DEFINITIONS, DRILLS, GROUPS, resolve
from .session import build_queue, run_session, show_intros
from .store import Attempt, Store

DEFAULT_DATA = Path("data/progress.json")


def summarize(results: list[Attempt], store: Store) -> str:
    if not results:
        return "No items answered."
    n_ok = sum(a.correct for a in results)
    avg = mean(a.seconds for a in results)
    return f"{n_ok}/{len(results)} correct | {avg:.1f}s average | {len(store.stars)} starred"


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


def cmd_drill(args, ask, say) -> int:
    try:
        names = resolve(args.name)
    except KeyError:
        say(f"Unknown drill or group: {args.name}. Run 'python -m applied_math list' to see them.")
        return 2
    store = Store(args.data)
    rng = random.Random(args.seed)
    show_intros(names, store, say)
    mode = "type" if args.type else "say"
    items = build_queue(store, names, args.n, rng)
    results = run_session(items, store, mode, ask, say)
    say("\n" + summarize(results, store))
    return 0


def cmd_stats(args, ask, say) -> int:
    store = Store(args.data)
    for line in stats_lines(store) or ["No attempts yet."]:
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


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="applied_math", description="Short timed math drills.")
    sub = p.add_subparsers(dest="command", required=True)

    d = sub.add_parser("drill", help="run a session")
    d.add_argument("name", help="a drill name or a group, e.g. poker")
    d.add_argument("-n", type=int, default=10, help="number of items (default 10)")
    d.add_argument("--type", action="store_true", help="type answers instead of say-and-self-grade")
    d.add_argument("--seed", type=int, default=None, help="fix the random seed (for tests)")
    d.add_argument("--data", type=Path, default=DEFAULT_DATA, help="progress file (default data/progress.json)")
    d.set_defaults(func=cmd_drill)

    for name, func in (("stats", cmd_stats), ("stars", cmd_stars)):
        sp = sub.add_parser(name, help=f"show {name}")
        sp.add_argument("--data", type=Path, default=DEFAULT_DATA)
        sp.set_defaults(func=func)
    ls = sub.add_parser("list", help="list drills and groups")
    ls.set_defaults(func=cmd_list)
    return p


def main(argv: list[str] | None = None, ask=input, say=print) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args, ask, say)
