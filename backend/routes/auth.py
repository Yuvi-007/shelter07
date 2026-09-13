from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from db import get_db_connection
from utils.auth_utils import generate_token, token_required

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "user")
    shelter_id = data.get("shelter_id")  # only meaningful for managers

    if not name or not email or not password:
        return jsonify({"error": "name, email and password are required"}), 400
    if role not in ("admin", "manager", "user"):
        return jsonify({"error": "role must be admin, manager or user"}), 400

    password_hash = generate_password_hash(password)

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({"error": "An account with this email already exists"}), 409

        cursor.execute(
            "INSERT INTO users (name, email, password_hash, role, shelter_id) VALUES (%s, %s, %s, %s, %s)",
            (name, email, password_hash, role, shelter_id),
        )
        conn.commit()
        user_id = cursor.lastrowid

        user = {"id": user_id, "name": name, "email": email, "role": role, "shelter_id": shelter_id}
        token = generate_token(user)
        return jsonify({"token": token, "user": user}), 201
    finally:
        cursor.close()
        conn.close()


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        if not user or not check_password_hash(user["password_hash"], password):
            return jsonify({"error": "Invalid email or password"}), 401

        token = generate_token(user)
        return jsonify({
            "token": token,
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
                "shelter_id": user["shelter_id"],
            },
        })
    finally:
        cursor.close()
        conn.close()


@auth_bp.route("/me", methods=["GET"])
@token_required
def get_current_user():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, name, email, role, shelter_id FROM users WHERE id = %s",
            (request.user["id"],),
        )
        user = cursor.fetchone()
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify(user)
    finally:
        cursor.close()
        conn.close()
