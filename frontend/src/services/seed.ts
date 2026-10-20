import { Engine, type Db } from './engine';
// Demo data: teacher demo@quizarena.kz / demo1234 with one quiz.
export function seed(db: Db): Db {
  const e = new Engine(db);
  const { token } = e.register('demo@quizarena.kz', 'demo1234', 'Demo Teacher');
  e.createQuiz(token, {
    title: 'Web basics', description: 'Warm-up for the web front course',
    questions: [
      { text: 'Which HTML tag creates a link?', options: ['<a>', '<link>', '<href>', '<url>'], correct: 0, timeLimit: 20 },
      { text: 'Which CSS property changes text colour?', options: ['font-color', 'text-color', 'color', 'foreground'], correct: 2, timeLimit: 20 },
      { text: 'What does HTTP status 404 mean?', options: ['Server error', 'Not found', 'Forbidden', 'Redirect'], correct: 1, timeLimit: 10 },
    ],
  });
  e.logout(token);
  return e.db;
}
