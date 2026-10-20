// Iteration 1: the whole app runs without a backend. State lives in localStorage, so a
// host tab and player tabs in the same browser share one game (decisions.md item 2).
import type { QuizApi } from './api';
import { auth } from './api';
import { Engine, emptyDb, type Db } from './engine';
import { seed } from './seed';

const KEY = 'quizarena-mock-db';
const load = (): Db => { try { return JSON.parse(localStorage.getItem(KEY) || '') as Db; } catch { const db = seed(emptyDb()); localStorage.setItem(KEY, JSON.stringify(db)); return db; } };
async function run<T>(fn: (e: Engine) => T): Promise<T> {
  await new Promise((r) => setTimeout(r, 60)); // feel like a network
  const e = new Engine(load()); const out = fn(e); localStorage.setItem(KEY, JSON.stringify(e.db)); return structuredClone(out);
}

export const mockApi: QuizApi = {
  register: (email, pw, name) => run((e) => e.register(email, pw, name)),
  login: (email, pw) => run((e) => e.login(email, pw)),
  me: () => run((e) => e.me(auth.token)),
  logout: () => run((e) => e.logout(auth.token)),
  listQuizzes: () => run((e) => e.listQuizzes(auth.token)),
  getQuiz: (id) => run((e) => e.getQuiz(auth.token, id)),
  createQuiz: (i) => run((e) => e.createQuiz(auth.token, i)),
  updateQuiz: (id, i) => run((e) => e.updateQuiz(auth.token, id, i)),
  deleteQuiz: (id) => run((e) => e.deleteQuiz(auth.token, id)),
  createGame: (id) => run((e) => e.createGame(auth.token, id)),
  hostState: (id) => run((e) => e.hostState(auth.token, id)),
  startGame: (id) => run((e) => e.startGame(auth.token, id)),
  reveal: (id) => run((e) => e.reveal(auth.token, id)),
  next: (id) => run((e) => e.next(auth.token, id)),
  listGames: () => run((e) => e.listGames(auth.token)),
  report: (id) => run((e) => e.report(auth.token, id)),
  findGame: (pin) => run((e) => e.findGame(pin)),
  join: (pin, nick) => run((e) => e.join(pin, nick)),
  playerState: (g, t) => run((e) => e.playerState(g, t)),
  answer: (g, t, i, o) => run((e) => e.answer(g, t, i, o)),
};
