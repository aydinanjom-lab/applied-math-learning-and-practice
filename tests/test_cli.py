from pathlib import Path

from applied_math.cli import main, stats_lines
from applied_math.items import Item
from applied_math.store import Attempt, Store


def scripted(answers):
    answers = list(answers)
    out = []

    def ask(prompt):
        return answers.pop(0)

    def say(text=""):
        out.append(str(text))

    return ask, say, out


def test_drill_runs_and_summarizes(tmp_path: Path):
    ask, say, out = scripted(["-999"] * 3)  # three wrong typed answers
    rc = main(["drill", "poker", "-n", "3", "--type", "--data", str(tmp_path / "p.json"), "--seed", "1"], ask=ask, say=say)
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
    ask, say, out1 = scripted(["-999"])
    main(["drill", "pot_odds", "-n", "1", "--type", "--data", data], ask=ask, say=say)
    ask, say, out2 = scripted(["-999"])
    main(["drill", "pot_odds", "-n", "1", "--type", "--data", data], ask=ask, say=say)
    assert any("Pot odds:" in line for line in out1)
    assert not any("Pot odds:" in line for line in out2)


def test_stats_lines_per_drill(tmp_path: Path):
    s = Store(tmp_path / "p.json")
    it = Item("pot_odds:1:1", "pot_odds", "?", 1.0, "e")
    s.record(it, Attempt(it.key, "pot_odds", True, 2.0, "type", 0.0))
    s.record(it, Attempt(it.key, "pot_odds", False, 4.0, "type", 0.0))
    assert stats_lines(s) == ["pot_odds: 2 attempts | 50% correct | 3.0s average"]


def test_stats_and_stars_commands(tmp_path: Path):
    data = str(tmp_path / "p.json")
    ask, say, _ = scripted(["-999"])
    main(["drill", "pot_odds", "-n", "1", "--type", "--data", data], ask=ask, say=say)
    ask, say, out = scripted([])
    assert main(["stats", "--data", data], ask=ask, say=say) == 0
    assert any("pot_odds: 1 attempts" in line for line in out)
    ask, say, out = scripted([])
    assert main(["stars", "--data", data], ask=ask, say=say) == 0
    assert any("There is $" in line for line in out)


def test_list_command_names_groups_and_drills():
    ask, say, out = scripted([])
    assert main(["list"], ask=ask, say=say) == 0
    text = "\n".join(out)
    assert "poker" in text and "outs_equity" in text


def test_no_args_opens_menu_and_runs_chosen_drill(tmp_path: Path):
    # menu: 1 = poker, 2 = type mode, 2 = five items; then five typed answers
    ask, say, out = scripted(["1", "2", "2"] + ["-999"] * 5)
    rc = main(["--data", str(tmp_path / "p.json")], ask=ask, say=say)
    assert rc == 0
    text = "\n".join(out)
    assert "What do you want to drill?" in text
    assert "0/5 correct" in text


def test_menu_enter_takes_defaults(tmp_path: Path):
    # Enter, Enter, Enter = poker, say mode, 10 items; then 10 say-mode items (Enter, y)
    ask, say, out = scripted(["", "", ""] + ["", "y"] * 10)
    rc = main(["--data", str(tmp_path / "p.json")], ask=ask, say=say)
    assert rc == 0
    assert "10/10 correct" in "\n".join(out)


def test_menu_rejects_bad_choice_and_reasks(tmp_path: Path):
    ask, say, out = scripted(["9", "1", "2", "2"] + ["-999"] * 5)
    rc = main(["--data", str(tmp_path / "p.json")], ask=ask, say=say)
    assert rc == 0
    assert any("1 to" in line for line in out)


def test_session_summary_lists_starred_prompts(tmp_path: Path):
    ask, say, out = scripted(["-999"])
    main(["drill", "pot_odds", "-n", "1", "--type", "--data", str(tmp_path / "p.json"), "--seed", "2"], ask=ask, say=say)
    text = "\n".join(out)
    assert "Starred for next time" in text and "There is $" in text.split("Starred for next time")[1]


def test_explain_command_prints_index_card():
    ask, say, out = scripted([])
    assert main(["explain", "pot_odds"], ask=ask, say=say) == 0
    text = "\n".join(out)
    assert "25%" in text and "$10" in text
    ask, say, out = scripted([])
    assert main(["explain", "nope"], ask=ask, say=say) == 2
    ask, say, out = scripted([])
    assert main(["explain"], ask=ask, say=say) == 0
    assert "35%" in "\n".join(out), "the no-argument version prints the whole poker index card"


def test_interview_group():
    from applied_math.drills import resolve
    assert resolve("interview") == ["pot_odds", "outs_equity"]
