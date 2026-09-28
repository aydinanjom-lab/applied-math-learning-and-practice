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
