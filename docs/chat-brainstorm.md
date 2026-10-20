# Brainstorm chat — QuizArena (Part II)

Chat assistant: Claude (claude.ai). Flow from "AI-Native Development: Specifications…":
vague idea → the assistant asks ONE question at a time with short options → the student
answers → everything is saved to `docs/spec.md`. The original chat was in Kazakh; each
turn is given in Kazakh (original) and English. Deadline was 2 hours away, so the
brainstorm was kept to 5 questions.

---

**Assistant** offered four non-trivial ideas in the spirit of trustmrr.com (products that
make money): a live quiz battle, a ҰБТ (national exam) mock-exam platform, a waitlist +
feedback SaaS for indie makers, and a lab/room booking tool with conflict detection.

**Q1. Қай идеяны жасаймыз? / Which idea do we build?**

**A1:** Live quiz battle — мұғалім сұрақ жібереді, оқушылар телефоннан жауап береді, лайв рейтинг (Kahoot сияқты) —
*A live quiz battle: the teacher sends questions, students answer from their phones, live ranking (like Kahoot).*

---

**Q2. Оқушылар ойынға қалай кіреді? / How do students join a game?**
Options: 6-digit PIN + nickname, no account · QR code / link + nickname · students also create accounts

**A2:** барлығын қарастыр — *"Consider all of them."*

**Assistant:** MVP: the main way is a **6-digit PIN + nickname** (no account); a **link and a
QR code** pre-fill the PIN. Student accounts go to **post-mvp** (in the MVP only teachers have accounts).

---

**Q3. Ұпай қалай есептеледі? / How is scoring done?**
Options: correct + speed (max 1000) · correct + speed + streak bonus · number of correct answers only

**A3:** Дұрыс + жылдамдық + серия бонусы (streak) — *Correct + speed + streak bonus.*

---

**Q4. Сұрақ түрлері? / Question types?**
Options: 4 options, one correct · + true/false · + multiple correct

**A4:** 4 нұсқалы, бір дұрыс жауап — *Four options, exactly one correct.*

---

**Q5. Ойын біткен соң мұғалім не көреді? / What does the teacher see after the game?**
Options: podium + per-question % correct + history of past games · only podium and final ranking · podium + analytics + CSV export

**A5:** барлығын — *"All of it"* (podium, final leaderboard, per-question analytics, game history, CSV export).

---

**Assistant:** The brainstorm is complete. Following the article ("Save everything to a markdown
file"), all decisions are saved to `docs/spec.md`.
