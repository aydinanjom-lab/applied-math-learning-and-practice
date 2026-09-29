"""Command line: drill, stats, stars, list."""

from __future__ import annotations

import argparse
import random
from collections import defaultdict
from pathlib import Path
from statistics import mean

from .drills import DEFINITIONS, DRILLS, GROUPS, resolve
from .explain import explain
from .session import build_queue, run_session, show_intros
from .store import Attempt, Store
from .ui import auto

DEFAULT_DATA = Path("data/progress.json")


def summarize(results: list[Attempt], store: Store) -> str:
    if not results:
        return "No items answered."
    n_ok = sum(a.correct for a in results)
    avg = mean(a.seconds for a in results)
    lines = [f"{n_ok}/{len(results)} correct | {avg:.1f}s average | {len(store.stars)} starred"]
    if store.stars:
        lines.append("Starred for next time:")
        lines += [f"  - {it.prompt}" for it in store.starred_items()]
    return "\n".join(lines)


MENU_GROUPS = [
    ("poker", "Poker math (pot odds, outs, EV, implied odds, combos)"),
    ("interview", "Interview set (pot odds and outs only)"),
    ("quick", "Quick math (percentages, fractions, multiplication, growth, banking numbers)"),
    ("all", "Everything mixed"),
]


def _choose(ask, say, question: str, options: list[str], default: int) -> int:
    """Numbered menu. Enter takes the default. Returns a 0-based index."""
    say(question)
    for i, text in enumerate(options, 1):
        marker = " (default)" if i - 1 == default else ""
        say(f"  {i}. {text}{marker}")
    while True:
        raw = ask("  choice: ").strip()
        if raw == "":
            return default
        if raw.isdigit() and 1 <= int(raw) <= len(options):
            return int(raw) - 1
        say(f"  Type a number from 1 to {len(options)}, or press Enter for the default.")


def run_menu(args, ask, say) -> int:
    g = _choose(ask, say, "What do you want to drill?", [t for _, t in MENU_GROUPS], 0)
    m = _choose(ask, say, "How do you want to answer?",
                ["Say it out loud, press Enter, grade yourself", "Type the number (stricter; use weekly)"], 0)
    n = _choose(ask, say, "How many?", ["10 (about 5 minutes)", "5 (quick hit)", "20 (long session)"], 0)
    args.name = MENU_GROUPS[g][0]
    args.type = m == 1
    args.n = [10, 5, 20][n]
    args.seed = None
    return cmd_drill(args, ask, say)


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
    pal = auto() if say is print else None
    results = run_session(items, store, mode, ask, say, palette=pal)
    say("\n" + summarize(results, store))
    return 0


def cmd_explain(args, ask, say) -> int:
    text = explain(args.name)
    if text is None:
        say(f"No explanation for '{args.name}'. Try one of: {', '.join(GROUPS['poker'])}, or no name for the index card.")
        return 2
    say(text)
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
    p.add_argument("--data", type=Path, default=DEFAULT_DATA, help="progress file (default data/progress.json)")
    sub = p.add_subparsers(dest="command", required=False)

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
    ex = sub.add_parser("explain", help="one-screen explanation of a poker drill, or the index card")
    ex.add_argument("name", nargs="?", default=None)
    ex.set_defaults(func=cmd_explain)
    return p


def main(argv: list[str] | None = None, ask=input, say=print) -> int:
    args = build_parser().parse_args(argv)
    if args.command is None:
        return run_menu(args, ask, say)
    return args.func(args, ask, say)
