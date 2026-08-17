from datetime import datetime

from app.services.recurrence import compute_next_fire_at

ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]


def test_fixed_times_returns_next_time_same_day():
    after = datetime(2026, 8, 17, 7, 0)  # Monday 07:00
    result = compute_next_fire_at(
        recurrence_type="fixed_times",
        fixed_times=["08:00", "12:00", "19:00"],
        interval_hours=None,
        window_start=None,
        window_end=None,
        days_of_week=ALL_DAYS,
        after=after,
    )
    assert result == datetime(2026, 8, 17, 8, 0)


def test_fixed_times_rolls_to_next_day_when_all_times_passed():
    after = datetime(2026, 8, 17, 20, 0)  # Monday, after 19:00
    result = compute_next_fire_at(
        recurrence_type="fixed_times",
        fixed_times=["08:00", "12:00", "19:00"],
        interval_hours=None,
        window_start=None,
        window_end=None,
        days_of_week=ALL_DAYS,
        after=after,
    )
    assert result == datetime(2026, 8, 18, 8, 0)


def test_fixed_times_respects_days_of_week():
    after = datetime(2026, 8, 17, 20, 0)  # Monday
    result = compute_next_fire_at(
        recurrence_type="fixed_times",
        fixed_times=["08:00"],
        interval_hours=None,
        window_start=None,
        window_end=None,
        days_of_week=[2],  # Wednesday only
        after=after,
    )
    assert result == datetime(2026, 8, 19, 8, 0)
