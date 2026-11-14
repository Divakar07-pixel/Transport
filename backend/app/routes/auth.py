from flask import Blueprint, request, jsonify, session, current_app
from ..utils import admin_required

bp = Blueprint("auth", __name__)

@bp.post("/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    username, password = data.get("username", ""), data.get("password", "")
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
    if not current_app.extensions["excel"].verify_user(username, password):
        return jsonify({"error": "Invalid username or password"}), 401
    session.clear()
    session["admin"] = username
    return jsonify({"user": {"username": username}})

@bp.post("/auth/logout")
@admin_required
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})

@bp.get("/auth/me")
@admin_required
def me():
    return jsonify({"user": {"username": session["admin"]}})

@bp.post("/auth/change-password")
@admin_required
def change_password():
    data = request.get_json(silent=True) or {}
    new_password = data.get("new_password", "")
    if len(new_password) < 12:
        return jsonify({"error": "New password must be at least 12 characters"}), 400
    current_app.extensions["excel"].change_password(session["admin"], new_password)
    return jsonify({"message": "Password updated"})
