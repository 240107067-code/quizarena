import type { GameReport } from '../types';
const cell = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
/** Final results as CSV: rank, nickname, score, correct answers, then one column per question (1 = correct, 0 = wrong, empty = no answer). */
export function reportCsv(r: GameReport): string {
  const head = ['Rank', 'Nickname', 'Score', 'Correct', ...r.questions.map((q) => `Q${q.index + 1}`)];
  const rows = r.leaderboard.map((p) => [p.rank, p.nickname, p.score, `${p.correctCount}/${r.questions.length}`,
    ...r.questions.map((_, i) => { const v = p.answers[i]; return v == null ? '' : v ? '1' : '0'; })]);
  return [head, ...rows].map((row) => row.map(cell).join(',')).join('\n') + '\n';
}
