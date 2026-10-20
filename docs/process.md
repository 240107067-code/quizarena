# Process

## Work
- GitHub issues are the only backlog. Labels: `mvp` (must ship), `post-mvp` (later),
  `user-test-bug` (found while really using the app)
- One issue at a time; commit messages reference the issue, e.g. `Add lobby screen (#7)`
- Every step leaves a comment, so each issue tells its whole story

## Iterations (from "Build and Ship a Full-Stack App")
1. Frontend with a **mock service layer** (`frontend/src/services/mockApi.ts`)
2. `openapi.yaml` — the contract, written from `frontend/src/services/api.ts`
3. Backend implementing the contract with an **in-memory store**
4. Backend with **SQLite through SQLAlchemy** (`DATABASE_URL`, DB-agnostic)
5. Frontend switched to the real backend (build flag `API=http`)

## Roles
- PM — grooms an issue (`docs/team/pm.md`)
- Engineer — implements one groomed issue (`docs/team/software-engineer.md`)
- QA — verifies against the acceptance criteria **and closes the issue** (`docs/team/qa-engineer.md`)

## Lifecycle
1. Lowest-numbered open `mvp` / `user-test-bug` issue
2. PM grooms it → body in task-template format + `**Groomed:**` comment
3. Engineer implements → `**Implemented:**` comment (commits, what, tests)
4. QA verifies → `## QA: PASS` / `## QA: FAIL`; on FAIL back to 3
5. On PASS **QA closes the issue** with a closing comment

## Real testing (user-test-bug)
After each iteration the app is run for real (Playwright: one host browser + phone
browsers). Every bug found becomes an issue labelled `user-test-bug` with
**Goal** and **Description**; PM grooms it, QA adds test cases for it, then the normal
lifecycle applies.
