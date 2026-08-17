from datetime import datetime, timedelta


def compute_next_fire_at(
    recurrence_type: str,
    fixed_times: list[str] | None,
    interval_hours: float | None,
    window_start: str | None,
    window_end: str | None,
    days_of_week: list[int],
    after: datetime,
) -> datetime:
    """
    Returns the next datetime (naive, local wall-clock) strictly after `after`
    at which this reminder should fire, given its recurrence rule.

    Searches up to 8 days ahead so it always finds an answer even when every
    slot on the current day has already passed.
    """
    if recurrence_type == "fixed_times":
        return _next_fixed_time(fixed_times or [], days_of_week, after)
    if recurrence_type == "interval":
        return _next_interval_time(
            interval_hours or 0, window_start, window_end, days_of_week, after
        )
    raise ValueError(f"recurrence_type inválido: {recurrence_type}")


def _next_fixed_time(
    fixed_times: list[str], days_of_week: list[int], after: datetime
) -> datetime:
    sorted_times = sorted(_parse_hhmm(t) for t in fixed_times)
    for day_offset in range(8):
        candidate_date = (after + timedelta(days=day_offset)).date()
        if candidate_date.weekday() not in days_of_week:
            continue
        for hour, minute in sorted_times:
            candidate = datetime(
                candidate_date.year, candidate_date.month, candidate_date.day,
                hour, minute,
            )
            if candidate > after:
                return candidate
    raise ValueError("Não foi possível calcular o próximo horário (fixed_times vazio?).")


def _next_interval_time(
    interval_hours: float,
    window_start: str | None,
    window_end: str | None,
    days_of_week: list[int],
    after: datetime,
) -> datetime:
    if not interval_hours or interval_hours <= 0:
        raise ValueError("interval_hours deve ser maior que zero.")
    start_h, start_m = _parse_hhmm(window_start or "00:00")
    end_h, end_m = _parse_hhmm(window_end or "23:59")
    step = timedelta(hours=interval_hours)

    for day_offset in range(8):
        candidate_date = (after + timedelta(days=day_offset)).date()
        if candidate_date.weekday() not in days_of_week:
            continue
        window_start_dt = datetime(
            candidate_date.year, candidate_date.month, candidate_date.day, start_h, start_m
        )
        window_end_dt = datetime(
            candidate_date.year, candidate_date.month, candidate_date.day, end_h, end_m
        )
        candidate = window_start_dt
        while candidate <= window_end_dt:
            if candidate > after:
                return candidate
            candidate += step
    raise ValueError("Não foi possível calcular o próximo horário (janela/intervalo inválidos).")


def _parse_hhmm(value: str) -> tuple[int, int]:
    hour_str, minute_str = value.split(":")
    return int(hour_str), int(minute_str)
