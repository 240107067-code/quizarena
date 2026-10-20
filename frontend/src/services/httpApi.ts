// Iteration 5: the real backend (openapi.yaml). Same interface as mockApi.
import type { QuizApi } from './api';
import { auth } from './api';
import { ApiError } from '../types';

const BASE = ''; // same origin: the backend serves frontend/dist (make run)

async function call<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  const h: Record<string, string> = { ...headers };
  if (body !== undefined) h['Content-Type'] = 'application/json';
  if (auth.token && !h['X-Player-Token']) h.Authorization = `Bearer ${auth.token}`;
  let res: Response;
  try { res = await fetch(BASE + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }); }
  catch { throw new ApiError(0, 'Cannot reach the server — check your connection'); }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error || `Request failed (${res.status})`);
  return data as T;
}
const player = (token: string) => ({ 'X-Player-Token': token });

export const httpApi: QuizApi = {
  register: (email, password, name) => call('POST', '/api/auth/register', { email, password, name }),
  login: (email, password) => call('POST', '/api/auth/login', { email, password }),
  me: () => call('GET', '/api/auth/me'),
  logout: () => call('POST', '/api/auth/logout'),
  listQuizzes: () => call('GET', '/api/quizzes'),
  getQuiz: (id) => call('GET', `/api/quizzes/${id}`),
  createQuiz: (input) => call('POST', '/api/quizzes', input),
  updateQuiz: (id, input) => call('PUT', `/api/quizzes/${id}`, input),
  deleteQuiz: (id) => call('DELETE', `/api/quizzes/${id}`),
  createGame: (quizId) => call('POST', '/api/games', { quizId }),
  hostState: (id) => call('GET', `/api/games/${id}/host`),
  startGame: (id) => call('POST', `/api/games/${id}/start`),
  reveal: (id) => call('POST', `/api/games/${id}/reveal`),
  next: (id) => call('POST', `/api/games/${id}/next`),
  listGames: () => call('GET', '/api/games'),
  report: (id) => call('GET', `/api/games/${id}/report`),
  findGame: (pin) => call('GET', `/api/play/${encodeURIComponent(pin)}`),
  join: (pin, nickname) => call('POST', `/api/play/${encodeURIComponent(pin)}/join`, { nickname }),
  playerState: (gameId, token) => call('GET', `/api/games/${gameId}/player`, undefined, player(token)),
  answer: (gameId, token, questionIndex, option) => call('POST', `/api/games/${gameId}/answers`, { questionIndex, option }, player(token)),
};
