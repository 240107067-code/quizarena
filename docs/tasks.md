# Backlog

Labels: `mvp` (ships before the deadline), `post-mvp` (later), `user-test-bug` (found by really using the app).
Iterations follow "Build and Ship a Full-Stack App": frontend + mock → openapi.yaml → backend in memory → SQLite (SQLAlchemy) → connect.

## 1. Frontend scaffold and design tokens  [mvp] → issue #1
Goal: A React + TypeScript app builds and runs with the QuizArena look.
Description: Build setup, hash router, app shell, design tokens from docs/design.md (game screens vs calm editor).

## 2. Service layer with a mock backend  [mvp] → issue #14
Goal: Every backend call goes through one interface that runs fully mocked.
Description: QuizApi interface, mock implementation sharing state between a host tab and phone tabs, demo seed data.

## 3. Teacher login and registration  [mvp] → issue #15
Goal: A teacher can create an account and log in.
Description: Register/login screens, token kept in the browser, protected teacher pages, log out.

## 4. Quiz list and quiz builder  [mvp] → issue #16
Goal: A teacher can create, edit and delete quizzes with 4-option questions.
Description: List of my quizzes; editor with title, description, questions, 4 answers, correct answer, 10/20/30 s timer, reorder.

## 5. Host screens  [mvp] → issue #7
Goal: The projector shows the whole game: lobby, questions, results, podium.
Description: Lobby with PIN, join link, QR and live players; question with countdown and answer counter; reveal with chart; leaderboard; podium.

## 6. Join page and phone controller  [mvp] → issue #2
Goal: A student joins with PIN + nickname and answers on the phone.
Description: /join and /join/<PIN>; four big coloured shape buttons; correct/wrong feedback, points and rank.

## 7. Scoring  [mvp] → issue #3
Goal: Points reward correct and fast answers and streaks.
Description: 500–1000 by speed, +100 per previous correct in a row (max +500), shared ranks on ties.

## 8. Reports, history and CSV  [mvp] → issue #4
Goal: After a game the teacher sees what the class did not understand.
Description: Report with per-question % correct and distribution, final leaderboard, game history, CSV export.

## 9. OpenAPI contract  [mvp] → issue #5
Goal: Frontend and backend agree on one written contract.
Description: openapi.yaml from the frontend service layer: every endpoint, body, response and auth rule.

## 10. Backend with an in-memory store  [mvp] → issue #6
Goal: A real backend implements openapi.yaml.
Description: Routers, service, store, auth (hashed passwords, bearer tokens, player tokens), tests; data in memory for now.

## 11. SQLite through an ORM  [mvp] → issue #8
Goal: Data survives a restart and the DB can be swapped later.
Description: SQLAlchemy models, DATABASE_URL, no SQLite-only features, the full test suite on SQLite + a restart test.

## 12. Connect frontend and backend  [mvp] → issue #17
Goal: The app runs end to end on the real backend.
Description: HTTP implementation of the service layer, backend serves the built frontend, CORS, Makefile.

## 13. End-to-end test  [mvp] → issue #9
Goal: One command proves a whole game works for a teacher and two phones.
Description: Browser test against the running app covering join, answering, timeout, reload, podium, report and history.

## user-test-bug (found while testing)
- QR code is a broken image without internet → issue #10
- CSV export has empty question columns → issue #18

## post-mvp (issues #11, #12, #13, #19)
- Student accounts and progress over time
- True/false, multiple-correct and image questions
- WebSocket live updates instead of polling
- Team mode, kicking players, nickname filter
