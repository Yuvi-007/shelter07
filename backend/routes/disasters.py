from datetime import datetime

from flask import Blueprint, jsonify, request

from db import get_db_connection
from utils.auth_utils import roles_required, token_required


disasters_bp = Blueprint("disasters", __name__, url_prefix="/api/disasters")

DISASTER_FIELDS = ("name", "disaster_type", "location", "description", "start_date", "status")
STATUS_VALUES = ("active", "closed")
FIELD_LIMITS = {"name": 150, "disaster_type": 100, "location": 150, "description": 5000}
DISASTER_SELECT = """
    SELECT id, name, disaster_type, location, description,
           DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date, status, created_at, updated_at
    FROM disasters
"""


def validate_disaster_values(values, creating=False):
    required_fields = ("name", "disaster_type", "location", "start_date") if creating else ()
    for field in required_fields:
        if field not in values:
            return f"{field.replace('_', ' ').capitalize()} is required"

    for field in ("name", "disaster_type", "location"):
        if field in values:
            if not isinstance(values[field], str) or not values[field].strip():
                return f"{field.replace('_', ' ').capitalize()} is required"
            values[field] = values[field].strip()
            if len(values[field]) > FIELD_LIMITS[field]:
                return f"{field.replace('_', ' ').capitalize()} is too long"

    if "description" in values:
        if values["description"] is not None and not isinstance(values["description"], str):
            return "Description must be text"
        values["description"] = values["description"].strip() if values["description"] else None
        if values["description"] and len(values["description"]) > FIELD_LIMITS["description"]:
            return "Description is too long"

    if "start_date" in values:
        if not isinstance(values["start_date"], str):
            return "Start date must be a valid date"
        try:
            values["start_date"] = datetime.strptime(values["start_date"], "%Y-%m-%d").date()
        except ValueError:
            return "Start date must be a valid date in YYYY-MM-DD format"

    if "status" in values and values["status"] not in STATUS_VALUES:
        return "Status must be active or closed"
    return None


@disasters_bp.route("", methods=["GET"])
@token_required
def list_disasters():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(f"{DISASTER_SELECT} ORDER BY start_date DESC, id DESC")
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


@disasters_bp.route("/<int:disaster_id>", methods=["GET"])
@token_required
def get_disaster(disaster_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(f"{DISASTER_SELECT} WHERE id = %s", (disaster_id,))
        disaster = cursor.fetchone()
        if not disaster:
            return jsonify({"error": "Disaster not found"}), 404
        return jsonify(disaster)
    finally:
        cursor.close()
        conn.close()


@disasters_bp.route("", methods=["POST"])
@token_required
@roles_required("admin")
def create_disaster():
    data = request.get_json(silent=True) or {}
    values = {field: data[field] for field in DISASTER_FIELDS if field in data}
    values.setdefault("status", "active")
    validation_error = validate_disaster_values(values, creating=True)
    if validation_error:
        return jsonify({"error": validation_error}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """INSERT INTO disasters (name, disaster_type, location, description, start_date, status)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (values["name"], values["disaster_type"], values["location"], values.get("description"), values["start_date"], values["status"]),
        )
        disaster_id = cursor.lastrowid
        conn.commit()
        cursor.execute(f"{DISASTER_SELECT} WHERE id = %s", (disaster_id,))
        return jsonify(cursor.fetchone()), 201
    except Exception:
        conn.rollback()
        return jsonify({"error": "Unable to create disaster"}), 500
    finally:
        cursor.close()
        conn.close()


@disasters_bp.route("/<int:disaster_id>", methods=["PATCH"])
@token_required
@roles_required("admin")
def update_disaster(disaster_id):
    data = request.get_json(silent=True) or {}
    values = {field: data[field] for field in DISASTER_FIELDS if field in data}
    if not values:
        return jsonify({"error": "No valid fields to update"}), 400
    validation_error = validate_disaster_values(values)
    if validation_error:
        return jsonify({"error": validation_error}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        set_clause = ", ".join(f"{field} = %s" for field in values)
        cursor.execute(f"UPDATE disasters SET {set_clause} WHERE id = %s", list(values.values()) + [disaster_id])
        if cursor.rowcount == 0:
            conn.rollback()
            return jsonify({"error": "Disaster not found"}), 404
        conn.commit()
        cursor.execute(f"{DISASTER_SELECT} WHERE id = %s", (disaster_id,))
        return jsonify(cursor.fetchone())
    except Exception:
        conn.rollback()
        return jsonify({"error": "Unable to update disaster"}), 500
    finally:
        cursor.close()
        conn.close()


@disasters_bp.route("/<int:disaster_id>/status", methods=["PATCH"])
@token_required
@roles_required("admin")
def update_disaster_status(disaster_id):
    data = request.get_json(silent=True) or {}
    status = data.get("status")
    if status not in STATUS_VALUES:
        return jsonify({"error": "Status must be active or closed"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("UPDATE disasters SET status = %s WHERE id = %s", (status, disaster_id))
        if cursor.rowcount == 0:
            conn.rollback()
            return jsonify({"error": "Disaster not found"}), 404
        conn.commit()
        cursor.execute(f"{DISASTER_SELECT} WHERE id = %s", (disaster_id,))
        return jsonify(cursor.fetchone())
    except Exception:
        conn.rollback()
        return jsonify({"error": "Unable to update disaster status"}), 500
    finally:
        cursor.close()
        conn.close()


@disasters_bp.route("/<int:disaster_id>", methods=["DELETE"])
@token_required
@roles_required("admin")
def delete_disaster(disaster_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM disasters WHERE id = %s", (disaster_id,))
        if cursor.rowcount == 0:
            conn.rollback()
            return jsonify({"error": "Disaster not found"}), 404
        conn.commit()
        return jsonify({"message": "Disaster deleted"})
    except Exception:
        conn.rollback()
        return jsonify({"error": "Unable to delete disaster"}), 500
    finally:
        cursor.close()
        conn.close()
