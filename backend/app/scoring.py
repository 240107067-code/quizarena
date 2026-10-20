"""Scoring rules (docs/spec.md §5) — mirrors frontend/src/lib/scoring.ts."""
MAX_STREAK_BONUS = 500


def points_for(correct: bool, time_ms: int, limit_sec: int, streak_before: int) -> tuple[int, int]:
    if not correct:
        return 0, 0
    t = min(max(time_ms, 0), limit_sec * 1000)
    base = round(1000 * (1 - 0.5 * (t / (limit_sec * 1000))))
    bonus = min(100 * streak_before, MAX_STREAK_BONUS)
    return base + bonus, streak_before + 1


def rank(rows: list[dict]) -> list[dict]:
    """Competition ranking (1, 1, 3) by score desc, nickname asc."""
    rows = sorted(rows, key=lambda r: (-r["score"], r["nickname"].lower()))
    out, last = [], 0
    for i, r in enumerate(rows):
        if i == 0 or rows[i - 1]["score"] != r["score"]:
            last = i + 1
        out.append({**r, "rank": last})
    return out
