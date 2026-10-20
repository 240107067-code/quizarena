import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pointsFor, rank } from './scoring';
test('wrong answer gives 0 and resets the streak', () => assert.deepEqual(pointsFor(false, 1000, 20, 3), { points: 0, streak: 0 }));
test('instant correct answer gives 1000, last moment 500', () => {
  assert.equal(pointsFor(true, 0, 20, 0).points, 1000);
  assert.equal(pointsFor(true, 20000, 20, 0).points, 500);
  assert.equal(pointsFor(true, 10000, 20, 0).points, 750);
  assert.equal(pointsFor(true, 99999, 20, 0).points, 500, 'late answers are clamped');
});
test('streak bonus +100 per previous correct answer, capped at +500', () => {
  assert.deepEqual(pointsFor(true, 0, 10, 1), { points: 1100, streak: 2 });
  assert.equal(pointsFor(true, 0, 10, 9).points, 1500);
});
test('competition ranking shares ranks on ties', () => {
  const r = rank([{ nickname: 'b', score: 10 }, { nickname: 'a', score: 10 }, { nickname: 'c', score: 5 }]);
  assert.deepEqual(r.map((x) => [x.nickname, x.rank]), [['a', 1], ['b', 1], ['c', 3]]);
});
