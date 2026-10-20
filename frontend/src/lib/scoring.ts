// Scoring rules from docs/spec.md §5 — mirrored 1:1 in backend/app/scoring.py.
export const MAX_STREAK_BONUS = 500;

/** Points for one answer. `streakBefore` = consecutive correct answers before this one. */
export function pointsFor(correct: boolean, timeMs: number, limitSec: number, streakBefore: number): { points: number; streak: number } {
  if (!correct) return { points: 0, streak: 0 };
  const t = Math.min(Math.max(timeMs, 0), limitSec * 1000);
  const base = Math.round(1000 * (1 - 0.5 * (t / (limitSec * 1000))));
  const bonus = Math.min(100 * streakBefore, MAX_STREAK_BONUS);
  return { points: base + bonus, streak: streakBefore + 1 };
}

/** Competition ranking: equal scores share a rank (1, 1, 3). Sorted by score desc, nickname asc. */
export function rank<T extends { score: number; nickname: string }>(rows: T[]): (T & { rank: number })[] {
  const sorted = [...rows].sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname));
  let last = 0;
  return sorted.map((r, i) => {
    if (i === 0 || sorted[i - 1].score !== r.score) last = i + 1;
    return { ...r, rank: last };
  });
}
