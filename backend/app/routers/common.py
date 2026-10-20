from flask import request
from ..service import fail

def body() -> dict:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        fail(400, "Body must be a JSON object")
    return data

def bearer():
    h = request.headers.get("Authorization", "")
    return h[7:] if h.startswith("Bearer ") else None

def player_token():
    return request.headers.get("X-Player-Token")
