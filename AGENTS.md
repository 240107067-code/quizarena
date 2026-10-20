# AGENTS.md — QuizArena

Kahoot-style live quiz for classrooms. Spec: `docs/spec.md`. Process: `docs/process.md`.

## Layout
```
/frontend     React 19 + TypeScript, bundled with esbuild (no network needed)
/backend      Flask API + SQLAlchemy (SQLite by default) — pip/uv
/docs         spec, brainstorm, process, roles, design, decisions
openapi.yaml  the contract between frontend and backend
Makefile      make test | make frontend | make backend | make run
```

## Commands
- `make test` — frontend unit tests (`tsx --test`) + backend tests (`python -m unittest`)
- `make frontend` — build `frontend/dist/` (esbuild)
- `make run` — backend on http://localhost:8091 serving the built frontend
- `API=mock` (default during iteration 1) / `API=http` selects the service implementation

## Rules
- Every backend call goes through `frontend/src/services/api.ts` (one interface,
  `mockApi.ts` and `httpApi.ts` implement it)
- `openapi.yaml` is the contract — change it first, then both sides
- Backend storage goes through the repository interface; SQLAlchemy only, no SQLite-only SQL
- Commit after every meaningful step with `(#issue)` in the message
- Read `docs/design.md` before any UI change and `docs/team/*.md` for your role
