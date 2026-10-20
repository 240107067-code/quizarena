import type { AuthResult, User, Quiz, QuizSummary, QuizInput, HostState, JoinResult, PlayerState, GameReport, GameSummary, GameInfo, Option } from '../types';

/** The ONLY way the UI talks to a backend. mockApi.ts (iteration 1) and httpApi.ts (iteration 5) implement it. */
export interface QuizApi {
  // auth (teacher)
  register(email: string, password: string, name: string): Promise<AuthResult>;
  login(email: string, password: string): Promise<AuthResult>;
  me(): Promise<User>;
  logout(): Promise<void>;
  // quizzes (teacher)
  listQuizzes(): Promise<QuizSummary[]>;
  getQuiz(id: number): Promise<Quiz>;
  createQuiz(input: QuizInput): Promise<Quiz>;
  updateQuiz(id: number, input: QuizInput): Promise<Quiz>;
  deleteQuiz(id: number): Promise<void>;
  // hosting (teacher)
  createGame(quizId: number): Promise<GameInfo>;
  hostState(gameId: number): Promise<HostState>;
  startGame(gameId: number): Promise<HostState>;
  reveal(gameId: number): Promise<HostState>;
  next(gameId: number): Promise<HostState>;
  listGames(): Promise<GameSummary[]>;
  report(gameId: number): Promise<GameReport>;
  // players (no account)
  findGame(pin: string): Promise<{ gameId: number; quizTitle: string; status: string }>;
  join(pin: string, nickname: string): Promise<JoinResult>;
  playerState(gameId: number, playerToken: string): Promise<PlayerState>;
  answer(gameId: number, playerToken: string, questionIndex: number, option: Option): Promise<{ accepted: true }>;
}

let token: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem('qa_token') : null;
export const auth = {
  get token() { return token; },
  set(t: string | null) { token = t; if (t) localStorage.setItem('qa_token', t); else localStorage.removeItem('qa_token'); },
};
