from flask import Blueprint, current_app, jsonify
from .common import body, bearer, player_token
from ..service import fail
bp = Blueprint("games", __name__, url_prefix="/api")
svc = lambda: current_app.config["SERVICE"]

@bp.get("/games")
def history():
    return jsonify(svc().list_games(bearer()))

@bp.post("/games")
def create():
    qid = body().get("quizId")
    if not isinstance(qid, int) or isinstance(qid, bool):
        fail(400, "quizId must be an integer")
    return svc().create_game(bearer(), qid), 201

@bp.get("/games/<int:game_id>/host")
def host(game_id):
    return svc().host_state(bearer(), game_id)

@bp.post("/games/<int:game_id>/start")
def start(game_id):
    return svc().start(bearer(), game_id)

@bp.post("/games/<int:game_id>/reveal")
def reveal(game_id):
    return svc().reveal(bearer(), game_id)

@bp.post("/games/<int:game_id>/next")
def next_(game_id):
    return svc().next(bearer(), game_id)

@bp.get("/games/<int:game_id>/report")
def report(game_id):
    return svc().report(bearer(), game_id)

@bp.get("/play/<pin>")
def find(pin):
    return svc().find_game(pin)

@bp.post("/play/<pin>/join")
def join(pin):
    return svc().join(pin, body().get("nickname")), 201

@bp.get("/games/<int:game_id>/player")
def player(game_id):
    return svc().player_state(game_id, player_token())

@bp.post("/games/<int:game_id>/answers")
def answer(game_id):
    b = body()
    qi = b.get("questionIndex")
    if not isinstance(qi, int) or isinstance(qi, bool):
        fail(400, "questionIndex must be an integer")
    return svc().answer(game_id, player_token(), qi, b.get("option")), 201
