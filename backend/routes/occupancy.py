from flask import Blueprint, request, jsonify
from db import get_db_connection
from utils.auth_utils import token_required, roles_required

occupancy_bp = Blueprint("occupancy", __name__, url_prefix="/api/shelters")


@occupancy_bp.route("/<int:shelter_id>/occupancy", methods=["POST"])
@token_required
@roles_required("manager", "admin")
def update_occupancy(shelter_id):
    data = request.get_json(silent=True) or {}
    occupancy_count = data.get("occupancy_count")
    if type(occupancy_count) is not int:
        return jsonify({"error": "occupancy_count must be an integer"}), 400
    if occupancy_count < 0:
        return jsonify({"error": "occupancy_count must be greater than or equal to 0"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()

        # Read the current assignment from the database rather than the JWT,
        # whose shelter_id claim may predate an admin assignment.
        if request.user["role"] == "manager":
            cursor.execute("SELECT shelter_id FROM users WHERE id = %s", (request.user["id"],))
            manager = cursor.fetchone()
            if not manager or manager["shelter_id"] != shelter_id:
                conn.rollback()
                return jsonify({"error": "You can only update your assigned shelter"}), 403

        # This lock serializes occupancy updates with redistribution confirmations.
        cursor.execute(
            "SELECT id, total_capacity FROM shelters WHERE id = %s FOR UPDATE",
            (shelter_id,),
        )
        shelter = cursor.fetchone()
        if not shelter:
            conn.rollback()
            return jsonify({"error": "Shelter not found"}), 404
        if occupancy_count > shelter["total_capacity"]:
            conn.rollback()
            return jsonify({
                "error": f"Occupancy cannot exceed this shelter's capacity of {shelter['total_capacity']}"
            }), 400

        cursor.execute(
            "UPDATE shelters SET current_occupancy = %s WHERE id = %s",
            (occupancy_count, shelter_id),
        )
        cursor.execute(
            "INSERT INTO occupancy_logs (shelter_id, occupancy_count) VALUES (%s, %s)",
            (shelter_id, occupancy_count),
        )
        conn.commit()
        return jsonify({"message": "Occupancy updated", "shelter_id": shelter_id, "occupancy_count": occupancy_count})
    except Exception:
        conn.rollback()
        return jsonify({"error": "Unable to update occupancy"}), 500
    finally:
        cursor.close()
        conn.close()


@occupancy_bp.route("/<int:shelter_id>/logs", methods=["GET"])
@token_required
def get_occupancy_logs(shelter_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, occupancy_count, logged_at FROM occupancy_logs WHERE shelter_id = %s ORDER BY logged_at ASC",
            (shelter_id,),
        )
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()
