TSX=node node_modules/tsx/dist/cli.mjs
.PHONY: test frontend frontend-http backend run
test:
	cd frontend && $(TSX:frontend/%=%) --test src/lib/*.test.ts src/services/*.test.ts
	cd backend && python3 -m unittest discover -s tests -q
frontend:
	cd frontend && node build.mjs
frontend-http:
	cd frontend && API=http node build.mjs
backend:
	cd backend && python3 -m app.main
run: frontend-http backend
