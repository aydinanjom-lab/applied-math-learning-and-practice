import random
from pathlib import Path

from applied_math.items import Item
from applied_math.session import build_queue, run_session, show_intros
from applied_math.store import Attempt, Store


def starred_item(key="pot_odds:30:10"):
    return Item(key=key, drill="pot_odds", prompt="Pot is $30 and it's $10 to call. Break-even equity (%)?", answer=25.0, explanation="e", abs_tol=0.6)


def test_starred_items_come_first_and_queue_has_no_duplicates(tmp_path: Path):
    s = Store(tmp_path / "p.json")
    s.record(starred_item(), Attempt("pot_odds:30:10", "pot_odds", False, 1.0, "type", 0.0))
    q = build_queue(s, ["pot_odds", "combos"], 10, random.Random(3))
    assert q[0].key == "pot_odds:30:10"
    assert len(q) == 10
    assert len({i.key for i in q}) == 10


def test_starred_items_from_other_drills_are_left_out(tmp_path: Path):
    s = Store(tmp_path / "p.json")
    s.record(starred_item(), Attempt("pot_odds:30:10", "pot_odds", False, 1.0, "type", 0.0))
    q = build_queue(s, ["combos"], 3, random.Random(3))
    assert all(i.drill == "combos" for i in q)


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
    items = [starred_item(), Item("t:2", "pot_odds", "Pot is $40 and it's $40 to call. Break-even equity (%)?", 50.0, "e2")]
    ask, say, out = scripted(["25", "41"])
    results = run_session(items, s, "type", ask, say, clock=FakeClock(), now=lambda: 99.0)
    assert [a.correct for a in results] == [True, False]
    assert results[0].seconds == 2.5 and results[0].mode == "type" and results[0].ts == 99.0
    assert [i.key for i in s.starred_items()] == ["t:2"]
    assert (tmp_path / "p.json").exists(), "session saves at the end"
    assert any("Answer: 50" in line for line in out)


def test_say_mode_uses_self_grade(tmp_path: Path):
    s = Store(tmp_path / "p.json")
    ask, say, out = scripted(["", "y", "", "n"])
    results = run_session([starred_item(), starred_item("t:2")], s, "say", ask, say, clock=FakeClock(), now=lambda: 0.0)
    assert [a.correct for a in results] == [True, False]


def test_non_number_counts_as_miss(tmp_path: Path):
    s = Store(tmp_path / "p.json")
    ask, say, out = scripted(["twenty five"])
    results = run_session([starred_item()], s, "type", ask, say, clock=FakeClock(), now=lambda: 0.0)
    assert results[0].correct is False
    assert any("not a number" in line for line in out)


def test_intro_shown_once(tmp_path: Path):
    s = Store(tmp_path / "p.json")
    ask, say, out = scripted([])
    show_intros(["pot_odds"], s, say)
    show_intros(["pot_odds"], s, say)
    assert sum("pot_odds" in line for line in out) == 1
    assert s.intro_shown == ["pot_odds"]
