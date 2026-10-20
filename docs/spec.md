# QuizArena — Specification

A live quiz game for classrooms. A teacher hosts a quiz on the big screen; students join
from their phones with a PIN, answer against the clock and race up a live leaderboard.
Source: `docs/chat-brainstorm.md`.

## Problem

Ordinary tests are quiet and slow to grade. Teachers want a fast, fun check of
understanding at the end of a lesson — and instant data on which questions the class
got wrong. Kahoot-style tools exist but are paywalled and not localised; QuizArena is a
simple, free, self-hostable alternative (a freemium SaaS path: free for one class,
paid for schools — see trustmrr.com-style edtech products).

## Users

- **Teacher (host)** — has an account (email + password); creates quizzes, hosts games, sees reports
- **Student (player)** — no account in the MVP; joins with a PIN + nickname on a phone

## Core concepts

| Concept | Meaning |
|---|---|
| Quiz | title, description, ordered questions; owned by a teacher |
| Question | text, 4 answer options, exactly one correct, time limit (10 / 20 / 30 s) |
| Game | one live run of a quiz: 6-digit PIN, status `lobby → question → reveal → finished` |
| Player | nickname in one game (unique per game, case-insensitive), score, streak |
| Answer | player × question: chosen option, time taken (ms), correct?, points |

## Features (MVP)

### 1. Teacher accounts
- Register, log in, log out; bearer token auth; passwords hashed

### 2. Quiz builder
- List my quizzes; create, edit, delete a quiz
- Add / edit / reorder / delete questions: text (1–200 chars), 4 options (1–80 chars each),
  exactly one correct, time limit 10 / 20 / 30 s
- A quiz needs at least 1 question to be hosted

### 3. Hosting a game
- "Host" a quiz → a game with a unique **6-digit PIN**
- Lobby screen (projector): PIN in large type, **join link** `/join/<PIN>` and its **QR code**,
  live list of joined nicknames, Start button (enabled with ≥ 1 player)
- Teacher drives the game: question → reveal → leaderboard → next question … → podium

### 4. Joining and playing (students, phone-first)
- `/join` page: PIN + nickname; `/join/<PIN>` pre-fills the PIN (link / QR)
- Nickname 1–20 chars, unique in the game; joining a finished or unknown game is refused
- During a question the phone shows 4 big coloured buttons (▲ ◆ ● ■) and a timer;
  one answer per question, no changes after answering
- After the reveal the phone shows correct / wrong, points gained, current rank

### 5. Scoring
- Wrong or no answer: 0 points and the streak resets
- Correct: `round(1000 × (1 − 0.5 × t / limit))` → 500…1000 (faster = more)
- Streak bonus: +100 for each consecutive correct answer after the first, capped at +500
- Ties on the leaderboard: same score shares the rank; ordered by nickname for display

### 6. Live updates
- Host screen and phones update live (players joining, answer counter, reveal,
  leaderboard) — WebSocket preferred, polling every ~1 s acceptable in the MVP

### 7. Results and reports
- End of game: podium (top 3) + full final leaderboard
- Report per game: per-question % correct and answer distribution, per-player results
- Game history: list of my past games (quiz, date, players, winner) → report
- CSV export of the final results

## Out of scope (MVP) → post-mvp
- Student accounts and progress over time
- True/false and multiple-correct questions; images in questions
- Team mode, kicking players, profanity filter for nicknames
- Importing quizzes (CSV / AI-generated questions)

## Technical decisions (from the two articles)
- Frontend: React + TypeScript, all backend calls in one `services/` layer with a
  **mock implementation** first; design references in `docs/design.md`
- Contract: `openapi.yaml` generated from the frontend service layer
- Backend: in-memory store first, then **SQLite via SQLAlchemy ORM**
  (DB URL from an env var, no SQLite-only features → Postgres-ready)
- Layout: `/frontend`, `/backend`, `/docs`, `AGENTS.md`, `openapi.yaml`, `Makefile`
