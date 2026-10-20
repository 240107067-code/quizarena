"""Flask app factory. STORE=memory (iteration 3) or sql (iteration 4, DATABASE_URL)."""
import os
from pathlib import Path
from flask import Flask, jsonify, send_from_directory, request
from .service import Service, ApiError, seed
from .routers import auth, quizzes, games

DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


def make_store():
    if os.environ.get("STORE", "sql") == "memory":
        from .memory_store import MemoryStore
        return MemoryStore()
    from .sql_store import SqlStore
    return SqlStore(os.environ.get("DATABASE_URL", "sqlite:///quizarena.db"))


def create_app(store=None, clock=None):
    app = Flask(__name__, static_folder=None)
    svc = Service(store or make_store(), **({"clock": clock} if clock else {}))
    seed(svc)
    app.config["SERVICE"] = svc
    for bp in (auth.bp, quizzes.bp, games.bp):
        app.register_blueprint(bp)

    @app.errorhandler(ApiError)
    def api_error(e):
        return jsonify(error=e.message), e.status

    @app.errorhandler(404)
    def not_found(e):
        return jsonify(error="Not found"), 404

    @app.errorhandler(405)
    def not_allowed(e):
        return jsonify(error="Method not allowed"), 405

    @app.after_request
    def cors(resp):  # the dev frontend may run on another port
        resp.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Player-Token"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        return resp

    @app.route("/api/<path:_>", methods=["OPTIONS"])
    def preflight(_):
        return "", 204

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    @app.get("/")
    @app.get("/<path:path>")
    def spa(path="index.html"):  # serves the built frontend (make frontend-http)
        if path.startswith("api/"):
            return jsonify(error="Not found"), 404
        return send_from_directory(DIST, path if (DIST / path).is_file() else "index.html")

    return app


if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=int(os.environ.get("PORT", 8091)), threaded=True)
