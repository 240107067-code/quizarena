// In-browser game engine used by the mock service. Same rules as the backend.
import { ApiError, type Option, type Question, type QuizInput, type GameStatus, type HostState, type PlayerState, type GameInfo, type GameReport, type GameSummary, type Quiz } from '../types';
import { pointsFor, rank } from '../lib/scoring';
import { validateQuiz, isPin, validNickname } from '../lib/validation';

interface UserRow { id: number; email: string; name: string; pw: string }
interface QuizRow { id: number; ownerId: number; title: string; description: string; questions: Question[]; updatedAt: string }
interface GameRow { id: number; pin: string; hostId: number; quizTitle: string; questions: Question[]; status: GameStatus; currentIndex: number; questionStartedAt: number | null; createdAt: string }
interface PlayerRow { id: number; gameId: number; nickname: string; token: string; score: number; streak: number; lastPoints: number }
interface AnswerRow { gameId: number; playerId: number; questionIndex: number; option: Option; timeMs: number; correct: boolean; points: number }
export interface Db { seq: number; users: UserRow[]; sessions: Record<string, number>; quizzes: QuizRow[]; games: GameRow[]; players: PlayerRow[]; answers: AnswerRow[] }

export const emptyDb = (): Db => ({ seq: 1, users: [], sessions: {}, quizzes: [], games: [], players: [], answers: [] });
const fail = (status: number, msg: string): never => { throw new ApiError(status, msg); };
const rnd = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7).toString(16); // mock only

export class Engine {
  constructor(public db: Db, private now: () => number = Date.now) {}
  private id() { return this.db.seq++; }
  private user(token: string | null) { const id = token ? this.db.sessions[token] : undefined; return this.db.users.find((u) => u.id === id) ?? fail(401, 'Please log in'); }
  private ownQuiz(token: string | null, id: number) { const u = this.user(token); const q = this.db.quizzes.find((x) => x.id === id && x.ownerId === u.id); return q ?? fail(404, 'Quiz not found'); }
  private ownGame(token: string | null, id: number) { const u = this.user(token); return this.db.games.find((g) => g.id === id && g.hostId === u.id) ?? fail(404, 'Game not found'); }

  // ---- auth
  register(email: string, password: string, name: string) {
    email = email.trim().toLowerCase(); name = name.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Please enter a valid email');
    if (!name || name.length > 40) fail(400, 'Name must be 1–40 characters');
    if (password.length < 8) fail(400, 'Password must be at least 8 characters');
    if (this.db.users.some((u) => u.email === email)) fail(409, 'An account with this email already exists');
    const u = { id: this.id(), email, name, pw: hash(password) };
    this.db.users.push(u);
    return this.session(u);
  }
  login(email: string, password: string) {
    const u = this.db.users.find((x) => x.email === email.trim().toLowerCase());
    if (!u || u.pw !== hash(password)) fail(401, 'Wrong email or password');
    return this.session(u!);
  }
  private session(u: UserRow) { const token = rnd(); this.db.sessions[token] = u.id; return { token, user: { id: u.id, email: u.email, name: u.name } }; }
  me(token: string | null) { const u = this.user(token); return { id: u.id, email: u.email, name: u.name }; }
  logout(token: string | null) { if (token) delete this.db.sessions[token]; }

  // ---- quizzes
  listQuizzes(token: string | null) {
    const u = this.user(token);
    return this.db.quizzes.filter((q) => q.ownerId === u.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((q) => ({ id: q.id, title: q.title, description: q.description, questionCount: q.questions.length, updatedAt: q.updatedAt }));
  }
  getQuiz(token: string | null, id: number): Quiz { const q = this.ownQuiz(token, id); return { id: q.id, title: q.title, description: q.description, questions: q.questions, updatedAt: q.updatedAt }; }
  createQuiz(token: string | null, input: QuizInput) {
    const u = this.user(token); const err = validateQuiz(input); if (err) fail(400, err);
    const q: QuizRow = { id: this.id(), ownerId: u.id, ...this.clean(input), updatedAt: new Date(this.now()).toISOString() };
    this.db.quizzes.push(q); return this.getQuiz(token, q.id);
  }
  updateQuiz(token: string | null, id: number, input: QuizInput) {
    const q = this.ownQuiz(token, id); const err = validateQuiz(input); if (err) fail(400, err);
    Object.assign(q, this.clean(input), { updatedAt: new Date(this.now()).toISOString() }); return this.getQuiz(token, id);
  }
  deleteQuiz(token: string | null, id: number) { const q = this.ownQuiz(token, id); this.db.quizzes = this.db.quizzes.filter((x) => x !== q); }
  private clean(i: QuizInput) {
    return { title: i.title.trim(), description: i.description.trim(),
      questions: i.questions.map((x, n) => ({ id: n + 1, text: x.text.trim(), options: x.options.map((o) => o.trim()) as Question['options'], correct: x.correct, timeLimit: x.timeLimit })) };
  }

  // ---- games (host)
  createGame(token: string | null, quizId: number): GameInfo {
    const q = this.ownQuiz(token, quizId);
    if (!q.questions.length) fail(400, 'Add at least one question before hosting');
    let pin: string;
    do { pin = String(100000 + Math.floor(Math.random() * 900000)); } while (this.db.games.some((g) => g.pin === pin && g.status !== 'finished'));
    const g: GameRow = { id: this.id(), pin, hostId: q.ownerId, quizTitle: q.title, questions: structuredClone(q.questions), status: 'lobby', currentIndex: -1, questionStartedAt: null, createdAt: new Date(this.now()).toISOString() };
    this.db.games.push(g); return this.info(g);
  }
  private info(g: GameRow): GameInfo { return { id: g.id, pin: g.pin, status: g.status, quizTitle: g.quizTitle, currentIndex: g.currentIndex, totalQuestions: g.questions.length, questionStartedAt: g.questionStartedAt, serverNow: this.now() }; }
  private playersOf(g: GameRow) { return this.db.players.filter((p) => p.gameId === g.id); }
  private board(g: GameRow) { return rank(this.playersOf(g)).map((p) => ({ playerId: p.id, nickname: p.nickname, score: p.score, rank: p.rank, lastPoints: p.lastPoints })); }
  hostState(token: string | null, id: number): HostState {
    const g = this.ownGame(token, id); const players = this.playersOf(g);
    const q = g.currentIndex >= 0 && g.status !== 'finished' ? g.questions[g.currentIndex] : null;
    const answers = this.db.answers.filter((a) => a.gameId === g.id && a.questionIndex === g.currentIndex);
    return {
      game: this.info(g), players: players.map((p) => ({ id: p.id, nickname: p.nickname })),
      question: q && { index: g.currentIndex, text: q.text, options: q.options, timeLimit: q.timeLimit, correct: g.status === 'reveal' ? q.correct : null },
      answeredCount: answers.length,
      distribution: g.status === 'reveal' ? [0, 1, 2, 3].map((o) => answers.filter((a) => a.option === o).length) : null,
      leaderboard: this.board(g),
    };
  }
  startGame(token: string | null, id: number) {
    const g = this.ownGame(token, id);
    if (g.status !== 'lobby') fail(409, 'The game has already started');
    if (!this.playersOf(g).length) fail(409, 'Wait for at least one player');
    this.openQuestion(g, 0); return this.hostState(token, id);
  }
  private openQuestion(g: GameRow, i: number) { g.status = 'question'; g.currentIndex = i; g.questionStartedAt = this.now(); }
  reveal(token: string | null, id: number) {
    const g = this.ownGame(token, id);
    if (g.status !== 'question') fail(409, 'No open question to reveal');
    g.status = 'reveal';
    for (const p of this.playersOf(g)) { // players who did not answer lose their streak
      if (!this.db.answers.some((a) => a.gameId === g.id && a.playerId === p.id && a.questionIndex === g.currentIndex)) { p.streak = 0; p.lastPoints = 0; }
    }
    return this.hostState(token, id);
  }
  next(token: string | null, id: number) {
    const g = this.ownGame(token, id);
    if (g.status !== 'reveal') fail(409, 'Reveal the answer first');
    if (g.currentIndex + 1 >= g.questions.length) { g.status = 'finished'; g.questionStartedAt = null; }
    else this.openQuestion(g, g.currentIndex + 1);
    return this.hostState(token, id);
  }
  listGames(token: string | null): GameSummary[] {
    const u = this.user(token);
    return this.db.games.filter((g) => g.hostId === u.id).sort((a, b) => b.id - a.id).map((g) => {
      const top = this.board(g)[0];
      return { id: g.id, pin: g.pin, quizTitle: g.quizTitle, status: g.status, createdAt: g.createdAt, playerCount: this.playersOf(g).length, winner: g.status === 'finished' && top ? top.nickname : null };
    });
  }
  report(token: string | null, id: number): GameReport {
    const g = this.ownGame(token, id); const players = this.playersOf(g);
    const answers = this.db.answers.filter((a) => a.gameId === g.id);
    return {
      game: { ...this.info(g), createdAt: g.createdAt, playerCount: players.length },
      questions: g.questions.map((q, i) => {
        const qa = answers.filter((a) => a.questionIndex === i);
        const distribution = [0, 1, 2, 3].map((o) => qa.filter((a) => a.option === o).length);
        return { index: i, text: q.text, options: q.options, correct: q.correct, distribution, noAnswer: players.length - qa.length,
          percentCorrect: players.length ? Math.round((distribution[q.correct] / players.length) * 100) : 0 };
      }),
      leaderboard: this.board(g).map((r) => ({ ...r, correctCount: answers.filter((a) => a.playerId === r.playerId && a.correct).length,
        answers: g.questions.map((_, i) => answers.find((a) => a.playerId === r.playerId && a.questionIndex === i)?.correct ?? null) })),
    };
  }

  // ---- players
  findGame(pin: string) {
    if (!isPin(pin)) fail(400, 'A game PIN has 6 digits');
    const g = this.db.games.find((x) => x.pin === pin && x.status !== 'finished') ?? fail(404, 'No game with this PIN');
    return { gameId: g.id, quizTitle: g.quizTitle, status: g.status };
  }
  join(pin: string, nickname: string) {
    const { gameId } = this.findGame(pin); const g = this.db.games.find((x) => x.id === gameId)!;
    const err = validNickname(nickname); if (err) fail(400, err);
    const nick = nickname.trim();
    if (g.status !== 'lobby') fail(409, 'This game has already started');
    if (this.playersOf(g).some((p) => p.nickname.toLowerCase() === nick.toLowerCase())) fail(409, 'This nickname is taken in this game');
    const p: PlayerRow = { id: this.id(), gameId, nickname: nick, token: rnd(), score: 0, streak: 0, lastPoints: 0 };
    this.db.players.push(p);
    return { gameId, playerId: p.id, playerToken: p.token, nickname: nick };
  }
  private player(gameId: number, token: string) { return this.db.players.find((p) => p.gameId === gameId && p.token === token) ?? fail(401, 'Unknown player'); }
  playerState(gameId: number, token: string): PlayerState {
    const p = this.player(gameId, token); const g = this.db.games.find((x) => x.id === gameId)!;
    const q = g.status === 'question' || g.status === 'reveal' ? g.questions[g.currentIndex] : null;
    const mine = this.db.answers.find((a) => a.gameId === gameId && a.playerId === p.id && a.questionIndex === g.currentIndex);
    const board = this.board(g);
    return {
      game: this.info(g), nickname: p.nickname, score: p.score, playerCount: board.length,
      rank: g.status === 'lobby' ? null : board.find((r) => r.playerId === p.id)!.rank,
      question: q && { index: g.currentIndex, text: q.text, optionCount: 4, timeLimit: q.timeLimit },
      answered: !!mine,
      lastResult: g.status === 'reveal' && q ? { correct: !!mine?.correct, points: mine?.points ?? 0, correctOption: q.correct } : null,
    };
  }
  answer(gameId: number, token: string, questionIndex: number, option: Option) {
    const p = this.player(gameId, token); const g = this.db.games.find((x) => x.id === gameId)!;
    if (g.status !== 'question' || g.currentIndex !== questionIndex) fail(409, 'This question is closed');
    if (![0, 1, 2, 3].includes(option)) fail(400, 'Option must be 0–3');
    if (this.db.answers.some((a) => a.gameId === gameId && a.playerId === p.id && a.questionIndex === questionIndex)) fail(409, 'You already answered');
    const q = g.questions[questionIndex]; const timeMs = this.now() - g.questionStartedAt!;
    if (timeMs > q.timeLimit * 1000 + 500) fail(409, "Time's up");
    const correct = option === q.correct; const { points, streak } = pointsFor(correct, timeMs, q.timeLimit, p.streak);
    this.db.answers.push({ gameId, playerId: p.id, questionIndex, option, timeMs, correct, points });
    p.score += points; p.streak = streak; p.lastPoints = points;
    return { accepted: true as const };
  }
}
