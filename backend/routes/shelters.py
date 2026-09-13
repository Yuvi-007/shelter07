from flask import Blueprint, request, jsonify
from math import isfinite
from db import get_db_connection
from utils.auth_utils import token_required, roles_required

shelters_bp = Blueprint("shelters", __name__, url_prefix="/api/shelters")


def is_finite_number(value):
    return type(value) in (int, float) and isfinite(value)


@shelters_bp.route("", methods=["GET"])
@token_required
def list_shelters():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM shelters ORDER BY name")
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
        cursor.execute("SELECT * FROM shelters WHERE id = %s", (shelter_id,))
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

    total_capacity = data["total_capacity"]
    current_occupancy = data.get("current_occupancy", 0)
    latitude = data["latitude"]
    longitude = data["longitude"]

    if type(total_capacity) is not int or total_capacity <= 0:
        return jsonify({"error": "total_capacity must be a positive integer"}), 400
    if type(current_occupancy) is not int or current_occupancy < 0:
        return jsonify({"error": "current_occupancy must be an integer greater than or equal to 0"}), 400
    if current_occupancy > total_capacity:
        return jsonify({"error": "current_occupancy cannot exceed total_capacity"}), 400
    if not is_finite_number(latitude) or not -90 <= latitude <= 90:
        return jsonify({"error": "latitude must be between -90 and 90"}), 400
    if not is_finite_number(longitude) or not -180 <= longitude <= 180:
        return jsonify({"error": "longitude must be between -180 and 180"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """INSERT INTO shelters
               (name, latitude, longitude, total_capacity, current_occupancy, has_food, has_water, has_medical)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                data["name"], latitude, longitude, total_capacity, current_occupancy,
                int(bool(data.get("has_food", True))),
                int(bool(data.get("has_water", True))),
                int(bool(data.get("has_medical", False))),
            ),
        )
        conn.commit()
        cursor.execute("SELECT * FROM shelters WHERE id = %s", (cursor.lastrowid,))
        return jsonify(cursor.fetchone()), 201
    finally:
        cursor.close()
        conn.close()


@shelters_bp.route("/<int:shelter_id>", methods=["PUT"])
@token_required
@roles_required("admin")
def update_shelter(shelter_id):
    data = request.get_json(silent=True) or {}
    fields = [
        "name", "latitude", "longitude", "total_capacity", "current_occupancy",
        "has_food", "has_water", "has_medical",
    ]
    updates = {f: data[f] for f in fields if f in data}
    if not updates:
        return jsonify({"error": "No valid fields to update"}), 400

    if "total_capacity" in updates and (
        type(updates["total_capacity"]) is not int or updates["total_capacity"] <= 0
    ):
        return jsonify({"error": "total_capacity must be a positive integer"}), 400
    if "current_occupancy" in updates and (
        type(updates["current_occupancy"]) is not int or updates["current_occupancy"] < 0
    ):
        return jsonify({"error": "current_occupancy must be an integer greater than or equal to 0"}), 400
    if "latitude" in updates and (
        not is_finite_number(updates["latitude"]) or not -90 <= updates["latitude"] <= 90
    ):
        return jsonify({"error": "latitude must be between -90 and 90"}), 400
    if "longitude" in updates and (
        not is_finite_number(updates["longitude"]) or not -180 <= updates["longitude"] <= 180
    ):
        return jsonify({"error": "longitude must be between -180 and 180"}), 400

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
        cursor.execute("SELECT * FROM shelters WHERE id = %s", (shelter_id,))
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
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM shelters WHERE id = %s", (shelter_id,))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Shelter not found"}), 404
        return jsonify({"message": "Shelter deleted"})
    finally:
        cursor.close()
        conn.close()
