from tests.base import ApiCase

QUIZ = {"title": "T", "description": "", "questions": [{"text": "Q", "options": ["a", "b", "c", "d"], "correct": 1, "timeLimit": 10}]}


class AuthTests(ApiCase):
    def test_register_login_me_logout(self):
        r = self.c.post("/api/auth/register", json={"email": "A@B.kz ", "password": "password1", "name": "Ann"})
        self.assertEqual(r.status_code, 201)
        h = {"Authorization": "Bearer " + r.get_json()["token"]}
        self.assertEqual(self.c.get("/api/auth/me", headers=h).get_json()["email"], "a@b.kz")
        self.assertEqual(self.c.post("/api/auth/logout", headers=h).status_code, 204)
        self.assertEqual(self.c.get("/api/auth/me", headers=h).status_code, 401)

    def test_register_validation_and_duplicates(self):
        bad = [{"email": "x", "password": "password1", "name": "A"}, {"email": "x@y.kz", "password": "short", "name": "A"}, {"email": "x@y.kz", "password": "password1", "name": ""}]
        for b in bad:
            self.assertEqual(self.c.post("/api/auth/register", json=b).status_code, 400, b)
        self.assertEqual(self.c.post("/api/auth/register", json={"email": "DEMO@quizarena.kz", "password": "password1", "name": "A"}).status_code, 409)

    def test_wrong_password_and_malformed_json(self):
        self.assertEqual(self.c.post("/api/auth/login", json={"email": "demo@quizarena.kz", "password": "nope"}).status_code, 401)
        self.assertEqual(self.c.post("/api/auth/login", data="{bad", content_type="application/json").status_code, 400)


class QuizTests(ApiCase):
    def test_crud_and_ownership(self):
        h = self.login()
        q = self.c.post("/api/quizzes", json=QUIZ, headers=h)
        self.assertEqual(q.status_code, 201)
        qid = q.get_json()["id"]
        self.assertEqual(len(self.c.get("/api/quizzes", headers=h).get_json()), 2)
        up = self.c.put(f"/api/quizzes/{qid}", json={**QUIZ, "title": "T2"}, headers=h)
        self.assertEqual(up.get_json()["title"], "T2")
        other = {"Authorization": "Bearer " + self.c.post("/api/auth/register", json={"email": "o@o.kz", "password": "password1", "name": "O"}).get_json()["token"]}
        self.assertEqual(self.c.get(f"/api/quizzes/{qid}", headers=other).status_code, 404)
        self.assertEqual(self.c.delete(f"/api/quizzes/{qid}", headers=h).status_code, 204)
        self.assertEqual(self.c.get(f"/api/quizzes/{qid}", headers=h).status_code, 404)
        self.assertEqual(self.c.get("/api/quizzes").status_code, 401)

    def test_quiz_validation(self):
        h = self.login()
        for bad in [{**QUIZ, "title": ""}, {**QUIZ, "questions": [{**QUIZ["questions"][0], "options": ["a", "b"]}]},
                    {**QUIZ, "questions": [{**QUIZ["questions"][0], "correct": 4}]}, {**QUIZ, "questions": [{**QUIZ["questions"][0], "timeLimit": 15}]}]:
            self.assertEqual(self.c.post("/api/quizzes", json=bad, headers=h).status_code, 400)


class GameTests(ApiCase):
    def test_full_game_scoring_report_history(self):
        h, g, (aru, dana) = self.lobby("Aru", "Dana")
        self.assertRegex(g["pin"], r"^\d{6}$")
        self.assertEqual(self.c.post(f"/api/games/{g['id']}/start", headers=h).get_json()["game"]["status"], "question")
        self.clock.t += 2000; self.assertEqual(self.ans(g, aru, 0, 0).status_code, 201)
        self.clock.t += 8000; self.ans(g, dana, 0, 1)
        self.assertEqual(self.ans(g, aru, 0, 0).status_code, 409)  # already answered
        st = self.c.get(f"/api/games/{g['id']}/player", headers={"X-Player-Token": aru["playerToken"]}).get_json()
        self.assertIsNone(st["lastResult"]); self.assertNotIn("correct", st["question"])
        r = self.c.post(f"/api/games/{g['id']}/reveal", headers=h).get_json()
        self.assertEqual(r["distribution"], [1, 1, 0, 0]); self.assertEqual(r["leaderboard"][0]["score"], 950)
        for _ in range(2):
            self.c.post(f"/api/games/{g['id']}/next", headers=h); self.c.post(f"/api/games/{g['id']}/reveal", headers=h)
        self.assertEqual(self.c.post(f"/api/games/{g['id']}/next", headers=h).get_json()["game"]["status"], "finished")
        rep = self.c.get(f"/api/games/{g['id']}/report", headers=h).get_json()
        self.assertEqual(rep["questions"][0]["percentCorrect"], 50)
        self.assertEqual(rep["leaderboard"][0]["correctCount"], 1)
        self.assertEqual(rep["leaderboard"][0]["answers"], [True, None, None])  # #18 regression
        self.assertEqual(rep["leaderboard"][1]["answers"], [False, None, None])
        self.assertEqual(self.c.get("/api/games", headers=h).get_json()[0]["winner"], "Aru")
        self.assertEqual(self.c.get(f"/api/play/{g['pin']}").status_code, 404)  # finished games are not joinable

    def test_join_rules(self):
        h, g, (aru,) = self.lobby("Aru")
        self.assertEqual(self.c.post(f"/api/play/{g['pin']}/join", json={"nickname": "aru"}).status_code, 409)
        self.assertEqual(self.c.post(f"/api/play/{g['pin']}/join", json={"nickname": "x" * 21}).status_code, 400)
        self.assertEqual(self.c.get("/api/play/12ab").status_code, 400)
        self.assertEqual(self.c.get("/api/play/000000").status_code, 404)
        self.c.post(f"/api/games/{g['id']}/start", headers=h)
        self.assertEqual(self.c.post(f"/api/play/{g['pin']}/join", json={"nickname": "Late"}).status_code, 409)

    def test_timing_and_state_rules(self):
        h, g, (aru,) = self.lobby("Aru")
        self.assertEqual(self.c.post(f"/api/games/{g['id']}/reveal", headers=h).status_code, 409)
        self.c.post(f"/api/games/{g['id']}/start", headers=h)
        self.clock.t += 21_000
        self.assertEqual(self.ans(g, aru, 0, 0).status_code, 409)  # time's up
        self.assertEqual(self.ans(g, {"playerToken": "nope"}, 0, 0).status_code, 401)
        self.assertEqual(self.ans(g, aru, 0, 7).status_code, 400)  # invalid option

    def test_start_needs_a_player_and_host_needs_ownership(self):
        h, g, _ = self.lobby()
        self.assertEqual(self.c.post(f"/api/games/{g['id']}/start", headers=h).status_code, 409)
        other = {"Authorization": "Bearer " + self.c.post("/api/auth/register", json={"email": "o@o.kz", "password": "password1", "name": "O"}).get_json()["token"]}
        self.assertEqual(self.c.get(f"/api/games/{g['id']}/host", headers=other).status_code, 404)

    def test_streak_bonus(self):
        h, g, (aru,) = self.lobby("Aru")
        self.c.post(f"/api/games/{g['id']}/start", headers=h)
        self.ans(g, aru, 0, 0); self.c.post(f"/api/games/{g['id']}/reveal", headers=h); self.c.post(f"/api/games/{g['id']}/next", headers=h)
        self.ans(g, aru, 1, 2)
        lb = self.c.post(f"/api/games/{g['id']}/reveal", headers=h).get_json()["leaderboard"]
        self.assertEqual(lb[0]["score"], 1000 + 1100)
