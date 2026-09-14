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
        cursor.execute("SELECT id, name, email, role, is_active, shelter_id, created_at FROM users ORDER BY created_at DESC")
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


@users_bp.route("/<int:user_id>/status", methods=["PATCH"])
@token_required
@roles_required("admin")
def update_user_status(user_id):
    data = request.get_json(silent=True) or {}
    is_active = data.get("is_active")
    if type(is_active) is not bool:
        return jsonify({"error": "is_active must be a boolean"}), 400
    if user_id == request.user["id"]:
        return jsonify({"error": "Administrators cannot change their own account status"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        if not cursor.fetchone():
            return jsonify({"error": "User not found"}), 404

        cursor.execute("UPDATE users SET is_active = %s WHERE id = %s", (is_active, user_id))
        conn.commit()
        return jsonify({"message": "User status updated", "user_id": user_id, "is_active": is_active})
    except Exception:
        conn.rollback()
        return jsonify({"error": "Unable to update user status"}), 500
    finally:
        cursor.close()
        conn.close()


@users_bp.route("/<int:user_id>", methods=["DELETE"])
@token_required
@roles_required("admin")
def delete_user(user_id):
    if user_id == request.user["id"]:
        return jsonify({"error": "Administrators cannot delete their own account"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        cursor.execute("SELECT id FROM users WHERE id = %s FOR UPDATE", (user_id,))
        if not cursor.fetchone():
            return jsonify({"error": "User not found"}), 404

        # Preserve historical redistribution records instead of triggering their
        # confirmed_by ON DELETE CASCADE relationship.
        cursor.execute("SELECT id FROM redistribution_log WHERE confirmed_by = %s LIMIT 1", (user_id,))
        if cursor.fetchone():
            return jsonify({"error": "Users with redistribution history cannot be deleted"}), 400

        cursor.execute("SELECT id FROM role_requests WHERE user_id = %s LIMIT 1", (user_id,))
        if cursor.fetchone():
            return jsonify({"error": "Users with role request history cannot be deleted"}), 400

        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        return jsonify({"message": "User deleted", "user_id": user_id})
    except Exception:
        conn.rollback()
        return jsonify({"error": "Unable to delete user"}), 500
    finally:
        cursor.close()
        conn.close()


@users_bp.route("/<int:user_id>/assign-shelter", methods=["PUT"])
@token_required
@roles_required("admin")
def assign_shelter(user_id):
    data = request.get_json(silent=True) or {}
    shelter_id = data.get("shelter_id")
    if shelter_id is not None and (type(shelter_id) is not int or shelter_id <= 0):
        return jsonify({"error": "shelter_id must be a positive integer or null"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        cursor.execute(
            "SELECT id FROM users WHERE id = %s AND role = 'manager' AND is_active = 1 FOR UPDATE",
            (user_id,),
        )
        if not cursor.fetchone():
            conn.rollback()
            return jsonify({"error": "Only active manager accounts can be assigned a shelter"}), 400
        if shelter_id is not None:
            cursor.execute("SELECT id FROM shelters WHERE id = %s FOR UPDATE", (shelter_id,))
            if not cursor.fetchone():
                conn.rollback()
                return jsonify({"error": "Shelter not found"}), 404

        if shelter_id is not None:
            cursor.execute("UPDATE users SET shelter_id = NULL WHERE shelter_id = %s AND role = 'manager'", (shelter_id,))
        cursor.execute("UPDATE users SET shelter_id = %s WHERE id = %s", (shelter_id, user_id))
        conn.commit()
        return jsonify({"message": "Shelter assigned", "user_id": user_id, "shelter_id": shelter_id})
    except Exception:
        conn.rollback()
        return jsonify({"error": "Unable to assign shelter"}), 500
    finally:
        cursor.close()
        conn.close()
