# Decisions

1. **Frontend: React 19 + TypeScript bundled with esbuild.** The build machine had no
   network access, and React, TypeScript and esbuild were available offline. No router
   library: a tiny hash router (`src/router.ts`).
2. **Service layer** `src/services/api.ts` (interface) with `mockApi.ts` (iteration 1,
   state in `localStorage`, so a host tab and phone tabs share one game) and `httpApi.ts`
   (iteration 5). Selected at build time with `API=mock|http`.
3. **Live updates by polling** every 700 ms (spec allows it for the MVP). WebSockets → post-mvp (#12).
4. **Backend: Flask** instead of FastAPI (FastAPI could not be installed offline); same
   structure as the article: routers (blueprints), service, store, auth.
5. **ORM: SQLAlchemy 2**, `DATABASE_URL` env var (default `sqlite:///quizarena.db`),
   only portable column types → Postgres-ready.
6. **Auth:** teachers get a bearer token after login; players get a per-game player token.
7. **QR code** rendered by the public `api.qrserver.com` image endpoint, with an offline
   fallback text (#10).
