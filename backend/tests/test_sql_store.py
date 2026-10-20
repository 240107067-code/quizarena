"""Iteration 4: the whole API suite again on SQLite via SQLAlchemy, plus a restart test."""
import os
import tempfile
import unittest
from tests import test_api
from tests.base import Clock
from app.main import create_app
from app.sql_store import SqlStore

URL = lambda: "sqlite:///" + os.path.join(tempfile.mkdtemp(), "t.db")


class SqlAuth(test_api.AuthTests):
    def make_store(self): return SqlStore(URL())


class SqlQuiz(test_api.QuizTests):
    def make_store(self): return SqlStore(URL())


class SqlGame(test_api.GameTests):
    def make_store(self): return SqlStore(URL())


class Persistence(unittest.TestCase):
    def test_data_survives_a_restart(self):
        url = URL()
        c = create_app(SqlStore(url), clock=Clock()).test_client()
        h = {"Authorization": "Bearer " + c.post("/api/auth/login", json={"email": "demo@quizarena.kz", "password": "demo1234"}).get_json()["token"]}
        c.post("/api/quizzes", json=test_api.QUIZ, headers=h)
        c2 = create_app(SqlStore(url), clock=Clock()).test_client()  # "restart": new engine, same file
        self.assertEqual(len(c2.get("/api/quizzes", headers=h).get_json()), 2, "quiz and session persisted")
        self.assertEqual(c2.get("/api/auth/me", headers=h).status_code, 200)
