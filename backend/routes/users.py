from flask import Blueprint, request, jsonify
from db import get_db_connection
from utils.auth_utils import token_required, roles_required

users_bp = Blueprint("users", __name__, url_prefix="/api/users")


@users_bp.route("", methods=["GET"])
@token_required
@roles_required("admin")
def list_users():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, name, email, role, shelter_id, created_at FROM users ORDER BY created_at DESC")
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


@users_bp.route("/<int:user_id>/assign-shelter", methods=["PUT"])
@token_required
@roles_required("admin")
def assign_shelter(user_id):
    data = request.get_json(silent=True) or {}
    shelter_id = data.get("shelter_id")

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if shelter_id is not None:
            cursor.execute("SELECT id FROM shelters WHERE id = %s", (shelter_id,))
            if not cursor.fetchone():
                return jsonify({"error": "Shelter not found"}), 404

        cursor.execute("UPDATE users SET shelter_id = %s WHERE id = %s AND role = 'manager'", (shelter_id, user_id))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Manager not found (only managers can be assigned a shelter)"}), 404
        return jsonify({"message": "Shelter assigned", "user_id": user_id, "shelter_id": shelter_id})
    finally:
        cursor.close()
        conn.close()
