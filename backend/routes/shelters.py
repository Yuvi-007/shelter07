from flask import Blueprint, request, jsonify
from math import isfinite
from db import get_db_connection
from utils.auth_utils import token_required, roles_required

shelters_bp = Blueprint("shelters", __name__, url_prefix="/api/shelters")

SHELTER_FIELDS = (
    "name", "latitude", "longitude", "total_capacity", "current_occupancy",
    "has_food", "has_water", "has_medical",
)

SHELTER_SELECT = """
    SELECT s.*, (s.total_capacity - s.current_occupancy) AS available_capacity,
           u.id AS manager_id, u.name AS manager_name, u.is_active AS manager_is_active
    FROM shelters s
    LEFT JOIN users u ON u.id = (
        SELECT manager.id FROM users manager
        WHERE manager.shelter_id = s.id AND manager.role = 'manager'
        ORDER BY manager.id LIMIT 1
    )
"""


def is_finite_number(value):
    return type(value) in (int, float) and isfinite(value)


def validate_shelter_values(values):
    if "name" in values:
        if not isinstance(values["name"], str) or not values["name"].strip():
            return "name is required"
        values["name"] = values["name"].strip()
        if len(values["name"]) > 150:
            return "name must be at most 150 characters"
    if "total_capacity" in values and (type(values["total_capacity"]) is not int or values["total_capacity"] <= 0):
        return "total_capacity must be a positive integer"
    if "current_occupancy" in values and (type(values["current_occupancy"]) is not int or values["current_occupancy"] < 0):
        return "current_occupancy must be an integer greater than or equal to 0"
    if "latitude" in values and (not is_finite_number(values["latitude"]) or not -90 <= values["latitude"] <= 90):
        return "latitude must be between -90 and 90"
    if "longitude" in values and (not is_finite_number(values["longitude"]) or not -180 <= values["longitude"] <= 180):
        return "longitude must be between -180 and 180"
    for field in ("has_food", "has_water", "has_medical"):
        if field in values and type(values[field]) is not bool:
            return f"{field} must be a boolean"
    return None


@shelters_bp.route("", methods=["GET"])
@token_required
def list_shelters():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if request.user["role"] == "manager":
            cursor.execute(
                f"{SHELTER_SELECT} WHERE s.id = (SELECT shelter_id FROM users WHERE id = %s) ORDER BY s.name",
                (request.user["id"],),
            )
            assigned = cursor.fetchall()
            if assigned:
                return jsonify(assigned)
            # If manager has no shelter assigned yet, list all active shelters so they can select one
            cursor.execute(f"{SHELTER_SELECT} ORDER BY s.name")
            return jsonify(cursor.fetchall())

        cursor.execute(f"{SHELTER_SELECT} ORDER BY s.name")
        shelters = cursor.fetchall()
        return jsonify(shelters)
    finally:
        cursor.close()
        conn.close()


@shelters_bp.route("/<int:shelter_id>", methods=["GET"])
@token_required
def get_shelter(shelter_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if request.user["role"] == "manager":
            cursor.execute("SELECT shelter_id FROM users WHERE id = %s", (request.user["id"],))
            manager = cursor.fetchone()
            if manager and manager["shelter_id"] and manager["shelter_id"] != shelter_id:
                return jsonify({"error": "You can only view your assigned shelter"}), 403

        cursor.execute(f"{SHELTER_SELECT} WHERE s.id = %s", (shelter_id,))
        shelter = cursor.fetchone()
        if not shelter:
            return jsonify({"error": "Shelter not found"}), 404
        return jsonify(shelter)
    finally:
        cursor.close()
        conn.close()


@shelters_bp.route("", methods=["POST"])
@token_required
@roles_required("admin")
def create_shelter():
    data = request.get_json(silent=True) or {}
    required = ["name", "latitude", "longitude", "total_capacity"]
    missing = [f for f in required if data.get(f) is None]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    values = {field: data[field] for field in SHELTER_FIELDS if field in data}
    values.setdefault("current_occupancy", 0)
    values.setdefault("has_food", True)
    values.setdefault("has_water", True)
    values.setdefault("has_medical", False)
    validation_error = validate_shelter_values(values)
    if validation_error:
        return jsonify({"error": validation_error}), 400
    if values["current_occupancy"] > values["total_capacity"]:
        return jsonify({"error": "current_occupancy cannot exceed total_capacity"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """INSERT INTO shelters
               (name, latitude, longitude, total_capacity, current_occupancy, has_food, has_water, has_medical)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                values["name"], values["latitude"], values["longitude"], values["total_capacity"], values["current_occupancy"],
                int(values["has_food"]), int(values["has_water"]), int(values["has_medical"]),
            ),
        )
        conn.commit()
        cursor.execute(f"{SHELTER_SELECT} WHERE s.id = %s", (cursor.lastrowid,))
        return jsonify(cursor.fetchone()), 201
    finally:
        cursor.close()
        conn.close()


@shelters_bp.route("/<int:shelter_id>", methods=["PUT"])
@token_required
@roles_required("admin")
def update_shelter(shelter_id):
    data = request.get_json(silent=True) or {}
    updates = {field: data[field] for field in SHELTER_FIELDS if field in data}
    if not updates:
        return jsonify({"error": "No valid fields to update"}), 400

    validation_error = validate_shelter_values(updates)
    if validation_error:
        return jsonify({"error": validation_error}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        cursor.execute(
            "SELECT total_capacity, current_occupancy FROM shelters WHERE id = %s FOR UPDATE",
            (shelter_id,),
        )
        existing_shelter = cursor.fetchone()
        if not existing_shelter:
            conn.rollback()
            return jsonify({"error": "Shelter not found"}), 404

        effective_capacity = updates.get("total_capacity", existing_shelter["total_capacity"])
        effective_occupancy = updates.get("current_occupancy", existing_shelter["current_occupancy"])
        if effective_occupancy > effective_capacity:
            conn.rollback()
            return jsonify({"error": "current_occupancy cannot exceed total_capacity"}), 400

        set_clause = ", ".join(f"{f} = %s" for f in updates)
        values = list(updates.values()) + [shelter_id]
        cursor.execute(f"UPDATE shelters SET {set_clause} WHERE id = %s", values)
        if "current_occupancy" in updates:
            cursor.execute(
                "INSERT INTO occupancy_logs (shelter_id, occupancy_count) VALUES (%s, %s)",
                (shelter_id, updates["current_occupancy"]),
            )
        cursor.execute(f"{SHELTER_SELECT} WHERE s.id = %s", (shelter_id,))
        shelter = cursor.fetchone()
        conn.commit()
        return jsonify(shelter)
    except Exception:
        conn.rollback()
        return jsonify({"error": "Unable to update shelter"}), 500
    finally:
        cursor.close()
        conn.close()


@shelters_bp.route("/<int:shelter_id>", methods=["DELETE"])
@token_required
@roles_required("admin")
def delete_shelter(shelter_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        cursor.execute("SELECT id FROM shelters WHERE id = %s FOR UPDATE", (shelter_id,))
        if not cursor.fetchone():
            conn.rollback()
            return jsonify({"error": "Shelter not found"}), 404

        # Clear user assignments and dependent logs before deleting shelter
        cursor.execute("UPDATE users SET shelter_id = NULL WHERE shelter_id = %s", (shelter_id,))
        cursor.execute("DELETE FROM occupancy_logs WHERE shelter_id = %s", (shelter_id,))
        cursor.execute("DELETE FROM redistribution_log WHERE from_shelter_id = %s OR to_shelter_id = %s", (shelter_id, shelter_id))
        cursor.execute("DELETE FROM shelters WHERE id = %s", (shelter_id,))
        conn.commit()
        return jsonify({"message": "Shelter deleted"})
    except Exception:
        conn.rollback()
        return jsonify({"error": "Unable to delete shelter"}), 500
    finally:
        cursor.close()
        conn.close()


@shelters_bp.route("/<int:shelter_id>/manager", methods=["PATCH"])
@token_required
@roles_required("admin")
def assign_manager(shelter_id):
    data = request.get_json(silent=True) or {}
    manager_id = data.get("manager_id")
    if manager_id is not None and (type(manager_id) is not int or manager_id <= 0):
        return jsonify({"error": "manager_id must be a positive integer or null"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        cursor.execute("SELECT id FROM shelters WHERE id = %s FOR UPDATE", (shelter_id,))
        if not cursor.fetchone():
            conn.rollback()
            return jsonify({"error": "Shelter not found"}), 404

        if manager_id is not None:
            cursor.execute(
                "SELECT id, name FROM users WHERE id = %s AND role = 'manager' AND is_active = 1 FOR UPDATE",
                (manager_id,),
            )
            manager = cursor.fetchone()
            if not manager:
                conn.rollback()
                return jsonify({"error": "Only active manager accounts can be assigned"}), 400

        # A shelter has one visible manager. Clearing first also safely moves a
        # manager from their prior shelter because users.shelter_id is singular.
        cursor.execute("UPDATE users SET shelter_id = NULL WHERE shelter_id = %s AND role = 'manager'", (shelter_id,))
        if manager_id is not None:
            cursor.execute("UPDATE users SET shelter_id = %s WHERE id = %s", (shelter_id, manager_id))
        cursor.execute(f"{SHELTER_SELECT} WHERE s.id = %s", (shelter_id,))
        shelter = cursor.fetchone()
        conn.commit()
        return jsonify(shelter)
    except Exception:
        conn.rollback()
        return jsonify({"error": "Unable to update manager assignment"}), 500
    finally:
        cursor.close()
        conn.close()


@shelters_bp.route("/<int:shelter_id>/claim", methods=["POST"])
@token_required
def claim_shelter(shelter_id):
    if request.user["role"] not in ("manager", "admin"):
        return jsonify({"error": "Only managers and administrators can claim a shelter facility"}), 403

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, name FROM shelters WHERE id = %s", (shelter_id,))
        shelter = cursor.fetchone()
        if not shelter:
            return jsonify({"error": "Shelter not found"}), 404

        cursor.execute("UPDATE users SET shelter_id = %s WHERE id = %s", (shelter_id, request.user["id"]))
        conn.commit()
        return jsonify({"message": f"Successfully assigned to {shelter['name']}", "shelter_id": shelter_id})
    except Exception:
        conn.rollback()
        return jsonify({"error": "Unable to claim shelter"}), 500
    finally:
        cursor.close()
        conn.close()

