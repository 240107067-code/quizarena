from flask import Blueprint, current_app, jsonify
from .common import body, bearer
bp = Blueprint("quizzes", __name__, url_prefix="/api/quizzes")
svc = lambda: current_app.config["SERVICE"]

@bp.get("")
def list_quizzes():
    return jsonify(svc().list_quizzes(bearer()))

@bp.post("")
def create():
    return svc().create_quiz(bearer(), body()), 201

@bp.get("/<int:quiz_id>")
def get(quiz_id):
    return svc().get_quiz(bearer(), quiz_id)

@bp.put("/<int:quiz_id>")
def update(quiz_id):
    return svc().update_quiz(bearer(), quiz_id, body())

@bp.delete("/<int:quiz_id>")
def delete(quiz_id):
    svc().delete_quiz(bearer(), quiz_id); return "", 204
