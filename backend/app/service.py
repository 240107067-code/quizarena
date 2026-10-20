"""Game rules — the Python twin of frontend/src/services/engine.ts. Talks only to a Store."""
import hashlib
import hmac
import os
import random
import re
import secrets
import time
from datetime import datetime, timezone
from .scoring import points_for, rank
from .store import Store

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status, self.message = status, message


def fail(status, message):
    raise ApiError(status, message)


def now_ms():
    return int(time.time() * 1000)


def iso_now():
    return datetime.now(timezone.utc).isoformat()


def hash_password(pw: str) -> str:
    salt = os.urandom(16)
    return salt.hex() + ":" + hashlib.scrypt(pw.encode(), salt=salt, n=2**14, r=8, p=1).hex()


def check_password(pw: str, stored: str) -> bool:
    salt, h = stored.split(":")
    return hmac.compare_digest(hashlib.scrypt(pw.encode(), salt=bytes.fromhex(salt), n=2**14, r=8, p=1).hex(), h)


def validate_quiz(q) -> dict:
    if not isinstance(q, dict):
        fail(400, "Body must be a JSON object")
    title = str(q.get("title", "")).strip()
    desc = str(q.get("description", "") or "").strip()
    qs = q.get("questions")
    if not title or len(title) > 80:
        fail(400, "Title must be 1–80 characters")
    if len(desc) > 300:
        fail(400, "Description must be at most 300 characters")
    if not isinstance(qs, list) or len(qs) > 50:
        fail(400, "A quiz has at most 50 questions")
    out = []
    for i, x in enumerate(qs):
        n = f"Question {i + 1}: "
        if not isinstance(x, dict):
            fail(400, n + "must be an object")
        text = str(x.get("text", "")).strip()
        opts = x.get("options")
        if not text or len(text) > 200:
            fail(400, n + "text must be 1–200 characters")
        if not isinstance(opts, list) or len(opts) != 4 or any(not str(o).strip() or len(str(o).strip()) > 80 for o in opts):
            fail(400, n + "all 4 answers need 1–80 characters")
        if x.get("correct") not in (0, 1, 2, 3) or isinstance(x.get("correct"), bool):
            fail(400, n + "mark the correct answer")
        if x.get("timeLimit") not in (10, 20, 30) or isinstance(x.get("timeLimit"), bool):
            fail(400, n + "time limit must be 10, 20 or 30 s")
        out.append({"id": i + 1, "text": text, "options": [str(o).strip() for o in opts], "correct": x["correct"], "timeLimit": x["timeLimit"]})
    return {"title": title, "description": desc, "questions": out}


class Service:
    def __init__(self, store: Store, clock=now_ms):
        self.s, self.clock = store, clock

    # ---- auth
    def _session(self, u):
        token = secrets.token_hex(32)
        self.s.add_session(token, u["id"])
        return {"token": token, "user": {"id": u["id"], "email": u["email"], "name": u["name"]}}

    def register(self, email, password, name):
        email, name = str(email or "").strip().lower(), str(name or "").strip()
        if not EMAIL_RE.match(email):
            fail(400, "Please enter a valid email")
        if not name or len(name) > 40:
            fail(400, "Name must be 1–40 characters")
        if not isinstance(password, str) or len(password) < 8:
            fail(400, "Password must be at least 8 characters")
        if self.s.user_by_email(email):
            fail(409, "An account with this email already exists")
        return self._session(self.s.add_user(email, name, hash_password(password)))

    def login(self, email, password):
        u = self.s.user_by_email(str(email or "").strip().lower())
        if not u or not isinstance(password, str) or not check_password(password, u["password_hash"]):
            fail(401, "Wrong email or password")
        return self._session(u)

    def user(self, token):
        u = self.s.user_by_token(token) if token else None
        return u or fail(401, "Please log in")

    def me(self, token):
        u = self.user(token)
        return {"id": u["id"], "email": u["email"], "name": u["name"]}

    def logout(self, token):
        if token:
            self.s.delete_session(token)

    # ---- quizzes
    def _own_quiz(self, token, quiz_id):
        u = self.user(token)
        q = self.s.quiz(quiz_id)
        return q if q and q["owner_id"] == u["id"] else fail(404, "Quiz not found")

    @staticmethod
    def quiz_api(q):
        return {"id": q["id"], "title": q["title"], "description": q["description"], "questions": q["questions"], "updatedAt": q["updated_at"]}

    def list_quizzes(self, token):
        u = self.user(token)
        qs = sorted(self.s.quizzes_of(u["id"]), key=lambda q: q["updated_at"], reverse=True)
        return [{"id": q["id"], "title": q["title"], "description": q["description"], "questionCount": len(q["questions"]), "updatedAt": q["updated_at"]} for q in qs]

    def get_quiz(self, token, quiz_id):
        return self.quiz_api(self._own_quiz(token, quiz_id))

    def create_quiz(self, token, body):
        u = self.user(token)
        v = validate_quiz(body)
        return self.quiz_api(self.s.add_quiz(u["id"], v["title"], v["description"], v["questions"], iso_now()))

    def update_quiz(self, token, quiz_id, body):
        self._own_quiz(token, quiz_id)
        v = validate_quiz(body)
        return self.quiz_api(self.s.update_quiz(quiz_id, v["title"], v["description"], v["questions"], iso_now()))

    def delete_quiz(self, token, quiz_id):
        self._own_quiz(token, quiz_id)
        self.s.delete_quiz(quiz_id)

    # ---- games
    def _own_game(self, token, game_id):
        u = self.user(token)
        g = self.s.game(game_id)
        return g if g and g["host_id"] == u["id"] else fail(404, "Game not found")

    def _info(self, g):
        return {"id": g["id"], "pin": g["pin"], "status": g["status"], "quizTitle": g["quiz_title"], "currentIndex": g["current_index"],
                "totalQuestions": len(g["questions"]), "questionStartedAt": g["question_started_at"], "serverNow": self.clock()}

    def _board(self, game_id):
        return [{"playerId": p["id"], "nickname": p["nickname"], "score": p["score"], "rank": p["rank"], "lastPoints": p["last_points"]}
                for p in rank(self.s.players_of(game_id))]

    def create_game(self, token, quiz_id):
        q = self._own_quiz(token, quiz_id)
        if not q["questions"]:
            fail(400, "Add at least one question before hosting")
        while True:
            pin = str(random.randint(100000, 999999))
            if not self.s.open_game_by_pin(pin):
                break
        g = self.s.add_game(pin=pin, host_id=q["owner_id"], quiz_title=q["title"], questions=q["questions"], status="lobby",
                            current_index=-1, question_started_at=None, created_at=iso_now())
        return self._info(g)

    def host_state(self, token, game_id):
        g = self._own_game(token, game_id)
        players = self.s.players_of(game_id)
        live = g["current_index"] >= 0 and g["status"] in ("question", "reveal")
        q = g["questions"][g["current_index"]] if live else None
        answers = self.s.answers_of(game_id, g["current_index"]) if live else []
        reveal = g["status"] == "reveal"
        return {
            "game": self._info(g),
            "players": [{"id": p["id"], "nickname": p["nickname"]} for p in sorted(players, key=lambda p: p["id"])],
            "question": q and {"index": g["current_index"], "text": q["text"], "options": q["options"], "timeLimit": q["timeLimit"], "correct": q["correct"] if reveal else None},
            "answeredCount": len(answers),
            "distribution": [sum(1 for a in answers if a["option"] == o) for o in range(4)] if reveal else None,
            "leaderboard": self._board(game_id),
        }

    def _open(self, game_id, index):
        self.s.update_game(game_id, status="question", current_index=index, question_started_at=self.clock())

    def start(self, token, game_id):
        g = self._own_game(token, game_id)
        if g["status"] != "lobby":
            fail(409, "The game has already started")
        if not self.s.players_of(game_id):
            fail(409, "Wait for at least one player")
        self._open(game_id, 0)
        return self.host_state(token, game_id)

    def reveal(self, token, game_id):
        g = self._own_game(token, game_id)
        if g["status"] != "question":
            fail(409, "No open question to reveal")
        self.s.update_game(game_id, status="reveal")
        answered = {a["player_id"] for a in self.s.answers_of(game_id, g["current_index"])}
        for p in self.s.players_of(game_id):
            if p["id"] not in answered:
                self.s.update_player(p["id"], streak=0, last_points=0)
        return self.host_state(token, game_id)

    def next(self, token, game_id):
        g = self._own_game(token, game_id)
        if g["status"] != "reveal":
            fail(409, "Reveal the answer first")
        if g["current_index"] + 1 >= len(g["questions"]):
            self.s.update_game(game_id, status="finished", question_started_at=None)
        else:
            self._open(game_id, g["current_index"] + 1)
        return self.host_state(token, game_id)

    def list_games(self, token):
        u = self.user(token)
        out = []
        for g in sorted(self.s.games_of(u["id"]), key=lambda g: g["id"], reverse=True):
            board = self._board(g["id"])
            out.append({"id": g["id"], "pin": g["pin"], "quizTitle": g["quiz_title"], "status": g["status"], "createdAt": g["created_at"],
                        "playerCount": len(board), "winner": board[0]["nickname"] if g["status"] == "finished" and board else None})
        return out

    def report(self, token, game_id):
        g = self._own_game(token, game_id)
        players = self.s.players_of(game_id)
        answers = self.s.answers_of(game_id)
        questions = []
        for i, q in enumerate(g["questions"]):
            qa = [a for a in answers if a["question_index"] == i]
            dist = [sum(1 for a in qa if a["option"] == o) for o in range(4)]
            questions.append({"index": i, "text": q["text"], "options": q["options"], "correct": q["correct"], "distribution": dist,
                              "noAnswer": len(players) - len(qa), "percentCorrect": round(dist[q["correct"]] / len(players) * 100) if players else 0})
        def mine(pid, i):
            a = next((a for a in answers if a["player_id"] == pid and a["question_index"] == i), None)
            return None if a is None else bool(a["correct"])
        board = [{**r, "correctCount": sum(1 for a in answers if a["player_id"] == r["playerId"] and a["correct"]),
                  "answers": [mine(r["playerId"], i) for i in range(len(g["questions"]))]} for r in self._board(game_id)]
        return {"game": {**self._info(g), "createdAt": g["created_at"], "playerCount": len(players)}, "questions": questions, "leaderboard": board}

    # ---- players
    def find_game(self, pin):
        if not re.fullmatch(r"\d{6}", str(pin)):
            fail(400, "A game PIN has 6 digits")
        g = self.s.open_game_by_pin(pin) or fail(404, "No game with this PIN")
        return {"gameId": g["id"], "quizTitle": g["quiz_title"], "status": g["status"]}

    def join(self, pin, nickname):
        found = self.find_game(pin)
        g = self.s.game(found["gameId"])
        nick = str(nickname or "").strip()
        if not 1 <= len(nick) <= 20:
            fail(400, "Nickname must be 1–20 characters")
        if g["status"] != "lobby":
            fail(409, "This game has already started")
        if any(p["nickname"].lower() == nick.lower() for p in self.s.players_of(g["id"])):
            fail(409, "This nickname is taken in this game")
        p = self.s.add_player(g["id"], nick, secrets.token_hex(24))
        return {"gameId": g["id"], "playerId": p["id"], "playerToken": p["token"], "nickname": nick}

    def _player(self, game_id, token):
        p = self.s.player_by_token(game_id, token) if token else None
        return p or fail(401, "Unknown player")

    def player_state(self, game_id, token):
        p = self._player(game_id, token)
        g = self.s.game(game_id)
        live = g["status"] in ("question", "reveal")
        q = g["questions"][g["current_index"]] if live else None
        mine = next((a for a in self.s.answers_of(game_id, g["current_index"]) if a["player_id"] == p["id"]), None) if live else None
        board = self._board(game_id)
        return {
            "game": self._info(g), "nickname": p["nickname"], "score": p["score"], "playerCount": len(board),
            "rank": None if g["status"] == "lobby" else next(r["rank"] for r in board if r["playerId"] == p["id"]),
            "question": q and {"index": g["current_index"], "text": q["text"], "optionCount": 4, "timeLimit": q["timeLimit"]},
            "answered": mine is not None,
            "lastResult": {"correct": bool(mine and mine["correct"]), "points": mine["points"] if mine else 0, "correctOption": q["correct"]} if g["status"] == "reveal" else None,
        }

    def answer(self, game_id, token, question_index, option):
        p = self._player(game_id, token)
        g = self.s.game(game_id)
        if g["status"] != "question" or g["current_index"] != question_index:
            fail(409, "This question is closed")
        if option not in (0, 1, 2, 3) or isinstance(option, bool):
            fail(400, "Option must be 0–3")
        if any(a["player_id"] == p["id"] for a in self.s.answers_of(game_id, question_index)):
            fail(409, "You already answered")
        q = g["questions"][question_index]
        t = self.clock() - g["question_started_at"]
        if t > q["timeLimit"] * 1000 + 500:
            fail(409, "Time's up")
        correct = option == q["correct"]
        pts, streak = points_for(correct, t, q["timeLimit"], p["streak"])
        self.s.add_answer(game_id=game_id, player_id=p["id"], question_index=question_index, option=option, time_ms=t, correct=correct, points=pts)
        self.s.update_player(p["id"], score=p["score"] + pts, streak=streak, last_points=pts)
        return {"accepted": True}


def seed(svc: Service):
    """Demo teacher demo@quizarena.kz / demo1234 with one quiz (same as the frontend mock)."""
    if svc.s.user_by_email("demo@quizarena.kz"):
        return
    t = svc.register("demo@quizarena.kz", "demo1234", "Demo Teacher")["token"]
    svc.create_quiz(t, {"title": "Web basics", "description": "Warm-up for the web front course", "questions": [
        {"text": "Which HTML tag creates a link?", "options": ["<a>", "<link>", "<href>", "<url>"], "correct": 0, "timeLimit": 20},
        {"text": "Which CSS property changes text colour?", "options": ["font-color", "text-color", "color", "foreground"], "correct": 2, "timeLimit": 20},
        {"text": "What does HTTP status 404 mean?", "options": ["Server error", "Not found", "Forbidden", "Redirect"], "correct": 1, "timeLimit": 10},
    ]})
    svc.logout(t)
