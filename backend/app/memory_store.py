"""Iteration 3: everything in Python dicts. Data is lost on restart (fixed in iteration 4)."""
import copy
import itertools
import threading
from .store import Store


class MemoryStore(Store):
    def __init__(self):
        self._id = itertools.count(1)
        self.lock = threading.RLock()
        self.users, self.sessions, self.quizzes, self.games, self.players, self.answers = {}, {}, {}, {}, {}, []

    def _new(self, table, **row):
        row["id"] = next(self._id)
        table[row["id"]] = row
        return copy.deepcopy(row)

    def add_user(self, email, name, password_hash):
        return self._new(self.users, email=email, name=name, password_hash=password_hash)
    def user_by_email(self, email):
        return next((copy.deepcopy(u) for u in self.users.values() if u["email"] == email), None)
    def user_by_token(self, token):
        uid = self.sessions.get(token)
        return copy.deepcopy(self.users.get(uid)) if uid else None
    def add_session(self, token, user_id):
        self.sessions[token] = user_id
    def delete_session(self, token):
        self.sessions.pop(token, None)

    def add_quiz(self, owner_id, title, description, questions, updated_at):
        return self._new(self.quizzes, owner_id=owner_id, title=title, description=description, questions=copy.deepcopy(questions), updated_at=updated_at)
    def update_quiz(self, quiz_id, title, description, questions, updated_at):
        self.quizzes[quiz_id].update(title=title, description=description, questions=copy.deepcopy(questions), updated_at=updated_at)
        return copy.deepcopy(self.quizzes[quiz_id])
    def delete_quiz(self, quiz_id):
        self.quizzes.pop(quiz_id, None)
    def quiz(self, quiz_id):
        return copy.deepcopy(self.quizzes.get(quiz_id))
    def quizzes_of(self, owner_id):
        return [copy.deepcopy(q) for q in self.quizzes.values() if q["owner_id"] == owner_id]

    def add_game(self, **fields):
        return self._new(self.games, **copy.deepcopy(fields))
    def game(self, game_id):
        return copy.deepcopy(self.games.get(game_id))
    def open_game_by_pin(self, pin):
        return next((copy.deepcopy(g) for g in self.games.values() if g["pin"] == pin and g["status"] != "finished"), None)
    def update_game(self, game_id, **fields):
        self.games[game_id].update(fields)
    def games_of(self, host_id):
        return [copy.deepcopy(g) for g in self.games.values() if g["host_id"] == host_id]

    def add_player(self, game_id, nickname, token):
        return self._new(self.players, game_id=game_id, nickname=nickname, token=token, score=0, streak=0, last_points=0)
    def players_of(self, game_id):
        return [copy.deepcopy(p) for p in self.players.values() if p["game_id"] == game_id]
    def player_by_token(self, game_id, token):
        return next((copy.deepcopy(p) for p in self.players.values() if p["game_id"] == game_id and p["token"] == token), None)
    def update_player(self, player_id, **fields):
        self.players[player_id].update(fields)
    def add_answer(self, **fields):
        self.answers.append(dict(fields))
    def answers_of(self, game_id, question_index=None):
        return [dict(a) for a in self.answers if a["game_id"] == game_id and (question_index is None or a["question_index"] == question_index)]
