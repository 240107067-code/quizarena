"""Iteration 4: SQLite through the SQLAlchemy ORM. DB-agnostic: the URL comes from
DATABASE_URL and only portable types are used (Integer, String, Boolean, JSON, BigInteger),
so the same code runs on Postgres (decisions.md item 5)."""
import threading
from sqlalchemy import BigInteger, Boolean, ForeignKey, Integer, JSON, String, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column
from .store import Store


class Base(DeclarativeBase):
    pass


class UserRow(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    name: Mapped[str] = mapped_column(String(40))
    password_hash: Mapped[str] = mapped_column(String(200))


class SessionRow(Base):
    __tablename__ = "sessions"
    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))


class QuizRow(Base):
    __tablename__ = "quizzes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(String(300), default="")
    questions: Mapped[list] = mapped_column(JSON)
    updated_at: Mapped[str] = mapped_column(String(40))


class GameRow(Base):
    __tablename__ = "games"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pin: Mapped[str] = mapped_column(String(6), index=True)
    host_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    quiz_title: Mapped[str] = mapped_column(String(80))
    questions: Mapped[list] = mapped_column(JSON)  # snapshot: editing the quiz never changes a played game
    status: Mapped[str] = mapped_column(String(10))
    current_index: Mapped[int] = mapped_column(Integer)
    question_started_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[str] = mapped_column(String(40))


class PlayerRow(Base):
    __tablename__ = "players"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"), index=True)
    nickname: Mapped[str] = mapped_column(String(20))
    token: Mapped[str] = mapped_column(String(64), unique=True)
    score: Mapped[int] = mapped_column(Integer, default=0)
    streak: Mapped[int] = mapped_column(Integer, default=0)
    last_points: Mapped[int] = mapped_column(Integer, default=0)


class AnswerRow(Base):
    __tablename__ = "answers"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"), index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id", ondelete="CASCADE"))
    question_index: Mapped[int] = mapped_column(Integer)
    option: Mapped[int] = mapped_column(Integer)
    time_ms: Mapped[int] = mapped_column(Integer)
    correct: Mapped[bool] = mapped_column(Boolean)
    points: Mapped[int] = mapped_column(Integer)


def _d(row):
    return None if row is None else {c.name: getattr(row, c.name) for c in row.__table__.columns}


class SqlStore(Store):
    def __init__(self, url: str):
        kw = {"connect_args": {"check_same_thread": False}} if url.startswith("sqlite") else {}
        self.engine = create_engine(url, **kw)
        Base.metadata.create_all(self.engine)
        self.lock = threading.RLock()

    def _get(self, model, **where):
        with Session(self.engine) as s:
            return _d(s.scalars(select(model).filter_by(**where)).first())

    def _all(self, model, *conds):
        with Session(self.engine) as s:
            return [_d(r) for r in s.scalars(select(model).where(*conds).order_by(model.id if hasattr(model, "id") else None))]

    def _add(self, row):
        with Session(self.engine) as s:
            s.add(row); s.commit(); s.refresh(row); return _d(row)

    def _update(self, model, pk, **fields):
        with Session(self.engine) as s:
            row = s.get(model, pk)
            for k, v in fields.items():
                setattr(row, k, v)
            s.commit(); return _d(row)

    def add_user(self, email, name, password_hash): return self._add(UserRow(email=email, name=name, password_hash=password_hash))
    def user_by_email(self, email): return self._get(UserRow, email=email)
    def user_by_token(self, token):
        sess = self._get(SessionRow, token=token)
        return self._get(UserRow, id=sess["user_id"]) if sess else None
    def add_session(self, token, user_id): self._add(SessionRow(token=token, user_id=user_id))
    def delete_session(self, token):
        with Session(self.engine) as s:
            row = s.get(SessionRow, token)
            if row: s.delete(row); s.commit()

    def add_quiz(self, owner_id, title, description, questions, updated_at):
        return self._add(QuizRow(owner_id=owner_id, title=title, description=description, questions=questions, updated_at=updated_at))
    def update_quiz(self, quiz_id, title, description, questions, updated_at):
        return self._update(QuizRow, quiz_id, title=title, description=description, questions=questions, updated_at=updated_at)
    def delete_quiz(self, quiz_id):
        with Session(self.engine) as s:
            row = s.get(QuizRow, quiz_id)
            if row: s.delete(row); s.commit()
    def quiz(self, quiz_id): return self._get(QuizRow, id=quiz_id)
    def quizzes_of(self, owner_id): return self._all(QuizRow, QuizRow.owner_id == owner_id)

    def add_game(self, **fields): return self._add(GameRow(**fields))
    def game(self, game_id): return self._get(GameRow, id=game_id)
    def open_game_by_pin(self, pin):
        with Session(self.engine) as s:
            return _d(s.scalars(select(GameRow).where(GameRow.pin == pin, GameRow.status != "finished")).first())
    def update_game(self, game_id, **fields): self._update(GameRow, game_id, **fields)
    def games_of(self, host_id): return self._all(GameRow, GameRow.host_id == host_id)

    def add_player(self, game_id, nickname, token): return self._add(PlayerRow(game_id=game_id, nickname=nickname, token=token, score=0, streak=0, last_points=0))
    def players_of(self, game_id): return self._all(PlayerRow, PlayerRow.game_id == game_id)
    def player_by_token(self, game_id, token): return self._get(PlayerRow, game_id=game_id, token=token)
    def update_player(self, player_id, **fields): self._update(PlayerRow, player_id, **fields)
    def add_answer(self, **fields): self._add(AnswerRow(**fields))
    def answers_of(self, game_id, question_index=None):
        conds = [AnswerRow.game_id == game_id] + ([AnswerRow.question_index == question_index] if question_index is not None else [])
        return [{k: v for k, v in a.items() if k != "id"} for a in self._all(AnswerRow, *conds)]
