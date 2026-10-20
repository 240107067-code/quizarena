import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Engine, emptyDb } from './engine';
import { seed } from './seed';
import { parseRoute } from '../router';
import { reportCsv } from '../lib/csv';
import { validateQuiz } from '../lib/validation';

function setup() {
  let t = 1_000_000; const e = new Engine(seed(emptyDb()), () => t);
  const { token } = e.login('demo@quizarena.kz', 'demo1234');
  const quizId = e.listQuizzes(token)[0].id;
  return { e, token, quizId, tick: (ms: number) => { t += ms; } };
}

test('seeded demo teacher has the demo quiz', () => {
  const { e, token } = setup();
  assert.deepEqual(e.listQuizzes(token).map((q) => [q.title, q.questionCount]), [['Web basics', 3]]);
});
test('full game: join, answer, reveal, next, finish, report', () => {
  const { e, token, quizId, tick } = setup();
  const g = e.createGame(token, quizId);
  assert.match(g.pin, /^\d{6}$/);
  const a = e.join(g.pin, 'Aru'); const d = e.join(g.pin, 'Dana');
  assert.throws(() => e.join(g.pin, 'aru'), /taken/);
  e.startGame(token, g.id);
  tick(2000); e.answer(g.id, a.playerToken, 0, 0); // correct, fast
  tick(8000); e.answer(g.id, d.playerToken, 0, 1); // wrong
  assert.throws(() => e.answer(g.id, a.playerToken, 0, 0), /already/);
  const r = e.reveal(token, g.id);
  assert.deepEqual(r.distribution, [1, 1, 0, 0]);
  assert.equal(r.leaderboard[0].nickname, 'Aru');
  assert.equal(r.leaderboard[0].score, 950);
  e.next(token, g.id); e.reveal(token, g.id); e.next(token, g.id); e.reveal(token, g.id);
  const end = e.next(token, g.id);
  assert.equal(end.game.status, 'finished');
  const rep = e.report(token, g.id);
  assert.equal(rep.questions[0].percentCorrect, 50);
  assert.equal(rep.questions[1].noAnswer, 2);
  assert.equal(e.listGames(token)[0].winner, 'Aru');
  assert.match(reportCsv(rep), /^Rank,Nickname,Score,Correct,Q1,Q2,Q3\n1,Aru,950,1\/3,1,,\n2,Dana,0,0\/3,0,,\n$/); // #18: per-question cells filled
});
test('answers after the time limit are refused; players cannot join a started game', () => {
  const { e, token, quizId, tick } = setup();
  const g = e.createGame(token, quizId); const a = e.join(g.pin, 'Aru'); e.startGame(token, g.id);
  assert.throws(() => e.join(g.pin, 'Late'), /already started/);
  tick(21_000); assert.throws(() => e.answer(g.id, a.playerToken, 0, 0), /Time's up/);
});
test('teachers only see their own quizzes and games', () => {
  const { e, quizId } = setup();
  const other = e.register('x@y.kz', 'password1', 'X').token;
  assert.throws(() => e.getQuiz(other, quizId), /not found/);
  assert.deepEqual(e.listQuizzes(other), []);
});
test('quiz validation', () => {
  assert.equal(validateQuiz({ title: '', description: '', questions: [] }), 'Title must be 1–80 characters');
  assert.match(validateQuiz({ title: 'T', description: '', questions: [{ text: 'Q', options: ['a', '', 'c', 'd'], correct: 0, timeLimit: 20 }] })!, /all 4 answers/);
});
test('router', () => {
  assert.deepEqual(parseRoute('#/join/123456'), { name: 'join', pin: '123456' });
  assert.deepEqual(parseRoute('#/host/7'), { name: 'host', gameId: 7 });
  assert.deepEqual(parseRoute('#/quizzes/3/edit'), { name: 'editQuiz', id: 3 });
  assert.deepEqual(parseRoute('#/nope'), { name: 'home' });
});
