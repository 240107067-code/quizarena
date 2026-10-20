from flask import Blueprint, current_app
from .common import body, bearer
bp = Blueprint("auth", __name__, url_prefix="/api/auth")
svc = lambda: current_app.config["SERVICE"]

@bp.post("/register")
def register():
    b = body(); return svc().register(b.get("email"), b.get("password"), b.get("name")), 201

@bp.post("/login")
def login():
    b = body(); return svc().login(b.get("email"), b.get("password"))

@bp.get("/me")
def me():
    return svc().me(bearer())

@bp.post("/logout")
def logout():
    svc().logout(bearer()); return "", 204
