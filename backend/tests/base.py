import unittest
from app.main import create_app
from app.memory_store import MemoryStore


class Clock:
    def __init__(self): self.t = 1_000_000
    def __call__(self): return self.t


class ApiCase(unittest.TestCase):
    """Runs every API test against a store; SQL tests subclass with make_store()."""
    def make_store(self):
        return MemoryStore()

    def setUp(self):
        self.clock = Clock()
        self.app = create_app(self.make_store(), clock=self.clock)
        self.c = self.app.test_client()

    def login(self, email="demo@quizarena.kz", pw="demo1234"):
        r = self.c.post("/api/auth/login", json={"email": email, "password": pw})
        return {"Authorization": "Bearer " + r.get_json()["token"]}

    def demo_quiz(self, h):
        return self.c.get("/api/quizzes", headers=h).get_json()[0]["id"]

    def lobby(self, *nicks):
        h = self.login(); g = self.c.post("/api/games", json={"quizId": self.demo_quiz(h)}, headers=h).get_json()
        players = [self.c.post(f"/api/play/{g['pin']}/join", json={"nickname": n}).get_json() for n in nicks]
        return h, g, players

    def ans(self, g, p, qi, opt):
        return self.c.post(f"/api/games/{g['id']}/answers", json={"questionIndex": qi, "option": opt}, headers={"X-Player-Token": p["playerToken"]})
