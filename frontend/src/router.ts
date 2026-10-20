// Tiny hash router (decisions.md item 1). Pure parse function, unit-tested.
export type Route =
  | { name: 'home' } | { name: 'join'; pin?: string } | { name: 'play'; gameId: number }
  | { name: 'login' } | { name: 'register' } | { name: 'quizzes' } | { name: 'newQuiz' } | { name: 'editQuiz'; id: number }
  | { name: 'host'; gameId: number } | { name: 'games' } | { name: 'report'; gameId: number };

export function parseRoute(hash: string): Route {
  const p = hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean);
  const n = (s?: string) => (s && /^\d+$/.test(s) ? Number(s) : NaN);
  switch (p[0]) {
    case undefined: return { name: 'home' };
    case 'join': return p[1] && /^\d{6}$/.test(p[1]) ? { name: 'join', pin: p[1] } : { name: 'join' };
    case 'play': return Number.isFinite(n(p[1])) ? { name: 'play', gameId: n(p[1]) } : { name: 'home' };
    case 'login': return { name: 'login' };
    case 'register': return { name: 'register' };
    case 'quizzes':
      if (p[1] === 'new') return { name: 'newQuiz' };
      if (Number.isFinite(n(p[1])) && p[2] === 'edit') return { name: 'editQuiz', id: n(p[1]) };
      return { name: 'quizzes' };
    case 'host': return Number.isFinite(n(p[1])) ? { name: 'host', gameId: n(p[1]) } : { name: 'quizzes' };
    case 'games': return Number.isFinite(n(p[1])) ? { name: 'report', gameId: n(p[1]) } : { name: 'games' };
    default: return { name: 'home' };
  }
}
export const TEACHER_ROUTES = new Set(['quizzes', 'newQuiz', 'editQuiz', 'host', 'games', 'report']);
export const go = (hash: string) => { location.hash = hash; };
