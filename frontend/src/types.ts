// Shared shapes — exactly what openapi.yaml describes.
export type Option = 0 | 1 | 2 | 3;
export interface User { id: number; email: string; name: string }
export interface AuthResult { token: string; user: User }
export interface Question { id?: number; text: string; options: [string, string, string, string]; correct: Option; timeLimit: 10 | 20 | 30 }
export interface Quiz { id: number; title: string; description: string; questions: Question[]; updatedAt: string }
export interface QuizSummary { id: number; title: string; description: string; questionCount: number; updatedAt: string }
export interface QuizInput { title: string; description: string; questions: Question[] }
export type GameStatus = 'lobby' | 'question' | 'reveal' | 'finished';
export interface GameInfo { id: number; pin: string; status: GameStatus; quizTitle: string; currentIndex: number; totalQuestions: number; questionStartedAt: number | null; serverNow: number }
export interface LeaderRow { playerId: number; nickname: string; score: number; rank: number; lastPoints: number }
export interface HostQuestion { index: number; text: string; options: string[]; timeLimit: number; correct: Option | null }
export interface HostState { game: GameInfo; players: { id: number; nickname: string }[]; question: HostQuestion | null; answeredCount: number; distribution: number[] | null; leaderboard: LeaderRow[] }
export interface JoinResult { gameId: number; playerId: number; playerToken: string; nickname: string }
export interface PlayerState {
  game: GameInfo; nickname: string; score: number; rank: number | null; playerCount: number;
  question: { index: number; text: string; optionCount: number; timeLimit: number } | null;
  answered: boolean; lastResult: { correct: boolean; points: number; correctOption: Option } | null;
}
export interface QuestionReport { index: number; text: string; options: string[]; correct: Option; distribution: number[]; noAnswer: number; percentCorrect: number }
export interface GameReport { game: GameInfo & { createdAt: string; playerCount: number }; questions: QuestionReport[]; leaderboard: (LeaderRow & { correctCount: number; answers: (boolean | null)[] })[] }
export interface GameSummary { id: number; pin: string; quizTitle: string; status: GameStatus; createdAt: string; playerCount: number; winner: string | null }
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
