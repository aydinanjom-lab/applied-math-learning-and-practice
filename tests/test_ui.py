from applied_math.ui import Palette, plain, colored


def test_plain_palette_adds_no_escape_codes():
    p = plain()
    assert p.ok("x") == "x" and p.miss("x") == "x" and p.dim("x") == "x" and p.bold("x") == "x"


def test_colored_palette_wraps_and_resets():
    p = colored()
    assert p.ok("x").startswith("\x1b[") and p.ok("x").endswith("\x1b[0m") and "x" in p.ok("x")
