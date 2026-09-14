import re

from flask import Blueprint, request, jsonify
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash
from db import get_db_connection
from utils.auth_utils import generate_token, token_required

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
NAME_MAX_LENGTH = 100
EMAIL_MAX_LENGTH = 150


def _request_json():
    """Return a JSON object, or a client-safe validation response."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not data:
        return None, (jsonify({"error": "Request body must contain valid JSON."}), 400)
    return data, None


def _normalize_and_validate_email(value):
    if not isinstance(value, str) or not value.strip():
        return None, "Email is required."

    email = value.strip().lower()
    if len(email) > EMAIL_MAX_LENGTH or not EMAIL_PATTERN.fullmatch(email):
        return None, "Please enter a valid email address."
    return email, None


@auth_bp.route("/signup", methods=["POST"])
def signup():
    data, error_response = _request_json()
    if error_response:
        return error_response

    name = data.get("name")
    email, email_error = _normalize_and_validate_email(data.get("email"))
    password = data.get("password")
    confirm_password = data.get("confirm_password")

    if not isinstance(name, str) or not name.strip():
        return jsonify({"error": "Name is required."}), 400
    name = name.strip()
    if len(name) < 2:
        return jsonify({"error": "Name must be at least 2 characters long."}), 400
    if len(name) > NAME_MAX_LENGTH:
        return jsonify({"error": f"Name must be at most {NAME_MAX_LENGTH} characters long."}), 400
    if email_error:
        return jsonify({"error": email_error}), 400
    if not isinstance(password, str) or not password:
        return jsonify({"error": "Password is required."}), 400
    if not (
        len(password) >= 8
        and any(character.isupper() for character in password)
        and any(character.islower() for character in password)
        and any(character.isdigit() for character in password)
    ):
        return jsonify({"error": "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number."}), 400
    if not isinstance(confirm_password, str) or not confirm_password:
        return jsonify({"error": "Confirm password is required."}), 400
    if password != confirm_password:
        return jsonify({"error": "Passwords do not match."}), 400

    password_hash = generate_password_hash(password)
    # Public signup is strictly for citizens / standard users. Other roles are provisioned by admin.
    role = "user"
    shelter_id = None
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({"error": "An account with this email already exists."}), 409

        cursor.execute(
            "INSERT INTO users (name, email, password_hash, role, shelter_id) VALUES (%s, %s, %s, %s, %s)",
            (name, email, password_hash, role, shelter_id),
        )
        conn.commit()
        user_id = cursor.lastrowid

        user = {"id": user_id, "name": name, "email": email, "role": role, "shelter_id": shelter_id}
        token = generate_token(user)
        return jsonify({"token": token, "user": user}), 201
    except mysql.connector.Error as exc:
        if getattr(exc, "errno", None) == 1062:
            return jsonify({"error": "An account with this email already exists."}), 409
        return jsonify({"error": "Unable to create account. Please try again later."}), 500
    except Exception:
        return jsonify({"error": "Unable to create account. Please try again later."}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@auth_bp.route("/login", methods=["POST"])
def login():
    data, error_response = _request_json()
    if error_response:
        return error_response

    email, email_error = _normalize_and_validate_email(data.get("email"))
    password = data.get("password")

    if email_error:
        return jsonify({"error": email_error}), 400
    if not isinstance(password, str) or not password:
        return jsonify({"error": "Password is required."}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        if not user or not check_password_hash(user["password_hash"], password):
            return jsonify({"error": "Invalid email or password."}), 401

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
    except mysql.connector.Error:
        return jsonify({"error": "Unable to log in. Please try again later."}), 500
    except Exception:
        return jsonify({"error": "Unable to log in. Please try again later."}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
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
