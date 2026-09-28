from applied_math.items import Item, parse_answer, fmt


def make(answer=12.0, **kw):
    return Item(key="t:1", drill="t", prompt="?", answer=answer, explanation="e", **kw)


def test_exact_item_accepts_small_rounding():
    assert make(0.375).is_correct(0.375)
    assert make(0.375).is_correct(0.38) is False  # abs_tol 0.005 rejects 0.38


def test_estimation_item_uses_relative_tolerance():
    it = make(1000.0, rel_tol=0.05)
    assert it.is_correct(1040)
    assert it.is_correct(1060) is False


def test_round_trip_dict():
    it = make(3.5, rel_tol=0.1)
    assert Item.from_dict(it.to_dict()) == it


def test_parse_answer_handles_symbols_and_suffixes():
    assert parse_answer(" 1,200 ") == 1200
    assert parse_answer("$45.5") == 45.5
    assert parse_answer("25%") == 25
    assert parse_answer("1.2k") == 1200
    assert parse_answer("3M") == 3_000_000
    assert parse_answer("2b") == 2_000_000_000
    assert parse_answer("twelve") is None
    assert parse_answer("") is None


def test_fmt_strips_trailing_zeros():
    assert fmt(12.0) == "12"
    assert fmt(0.375) == "0.375"
    assert fmt(1234567.0) == "1,234,567"
    assert fmt(33.333333) == "33.333"
