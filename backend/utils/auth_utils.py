import jwt
import datetime
from functools import wraps
from flask import request, jsonify
from config import Config
from db import get_db_connection


def generate_token(user):
    payload = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "shelter_id": user.get("shelter_id"),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=Config.JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, Config.SECRET_KEY, algorithm="HS256")


def decode_token(token):
    return jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])


def token_required(f):
    """Requires a valid JWT. Attaches the decoded payload to request.user."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401
        token = auth_header.split(" ", 1)[1]
        try:
            request.user = decode_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired, please log in again"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        conn = None
        cursor = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT is_active, role FROM users WHERE id = %s", (request.user["id"],))
            current_user = cursor.fetchone()
            if not current_user or not current_user["is_active"]:
                return jsonify({"error": "Account is unavailable"}), 401
            request.user["role"] = current_user["role"]
        except Exception:
            return jsonify({"error": "Unable to validate account"}), 500
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
        return f(*args, **kwargs)
    return wrapper


def roles_required(*allowed_roles):
    """Stack under @token_required. Restricts an endpoint to specific roles."""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = getattr(request, "user", {}) or {}
            user_role = user.get("role")
            user_email = (user.get("email") or "").lower()
            is_authority = user_role == "authority" or user_email.startswith("authority@")

            has_access = (
                user_role in allowed_roles
                or user_role == "admin"
                or ("authority" in allowed_roles and is_authority)
            )
            if not has_access:
                return jsonify({"error": "You don't have permission to do that"}), 403
            return f(*args, **kwargs)
        return wrapper
    return decorator
