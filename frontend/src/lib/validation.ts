import type { QuizInput } from '../types';
// Same rules as the backend (openapi.yaml): returns an error message or null.
export function validateQuiz(q: QuizInput): string | null {
  if (!q.title.trim() || q.title.trim().length > 80) return 'Title must be 1–80 characters';
  if (q.description.length > 300) return 'Description must be at most 300 characters';
  if (q.questions.length > 50) return 'A quiz has at most 50 questions';
  for (const [i, x] of q.questions.entries()) {
    const n = `Question ${i + 1}: `;
    if (!x.text.trim() || x.text.trim().length > 200) return n + 'text must be 1–200 characters';
    if (x.options.length !== 4 || x.options.some((o) => !o.trim() || o.trim().length > 80)) return n + 'all 4 answers need 1–80 characters';
    if (![0, 1, 2, 3].includes(x.correct)) return n + 'mark the correct answer';
    if (![10, 20, 30].includes(x.timeLimit)) return n + 'time limit must be 10, 20 or 30 s';
  }
  return null;
}
export const isPin = (s: string) => /^\d{6}$/.test(s);
export function validNickname(s: string): string | null {
  const n = s.trim();
  return n.length >= 1 && n.length <= 20 ? null : 'Nickname must be 1–20 characters';
}
