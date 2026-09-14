from flask import Blueprint, request, jsonify
from math import radians, sin, cos, sqrt, atan2
from db import get_db_connection
from utils.auth_utils import token_required, roles_required
from routes.predict import calculate_prediction

redistribute_bp = Blueprint("redistribute", __name__, url_prefix="/api")


def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in km
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


@redistribute_bp.route("/shelters/<int:shelter_id>/redistribute", methods=["GET"])
@token_required
def suggest_redistribution(shelter_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM shelters WHERE id = %s", (shelter_id,))
        source = cursor.fetchone()
        if not source:
            return jsonify({"error": "Shelter not found"}), 404

        cursor.execute(
            "SELECT occupancy_count, logged_at FROM occupancy_logs WHERE shelter_id = %s ORDER BY logged_at DESC LIMIT 20",
            (shelter_id,),
        )
        logs = list(reversed(cursor.fetchall()))
        prediction = calculate_prediction(logs, source["total_capacity"], source["current_occupancy"])

        if prediction["risk_level"] not in ("medium", "high"):
            return jsonify({
                "shelter_id": shelter_id,
                "risk_level": prediction["risk_level"],
                "suggestions": [],
                "message": "This shelter isn't at risk right now, no redistribution needed.",
            })

        cursor.execute("SELECT * FROM shelters WHERE id != %s", (shelter_id,))
        others = cursor.fetchall()

        candidates = []
        for shelter in others:
            free_capacity = shelter["total_capacity"] - shelter["current_occupancy"]
            if free_capacity <= 0:
                continue
            distance_km = haversine_km(
                source["latitude"], source["longitude"], shelter["latitude"], shelter["longitude"]
            )
            candidates.append({
                "shelter_id": shelter["id"],
                "name": shelter["name"],
                "distance_km": round(distance_km, 2),
                "free_capacity": free_capacity,
                "total_capacity": shelter["total_capacity"],
            })

        candidates.sort(key=lambda c: (c["distance_km"], -c["free_capacity"]))

        return jsonify({
            "shelter_id": shelter_id,
            "risk_level": prediction["risk_level"],
            "suggestions": candidates[:3],
        })
    finally:
        cursor.close()
        conn.close()


@redistribute_bp.route("/redistribute/confirm", methods=["POST"])
@token_required
@roles_required("user", "admin")
def confirm_redistribution():
    data = request.get_json(silent=True) or {}
    from_shelter_id = data.get("from_shelter_id")
    to_shelter_id = data.get("to_shelter_id")
    people_count = data.get("people_count")

    if type(from_shelter_id) is not int or type(to_shelter_id) is not int:
        return jsonify({"error": "from_shelter_id and to_shelter_id must be positive integers"}), 400
    if from_shelter_id <= 0 or to_shelter_id <= 0:
        return jsonify({"error": "from_shelter_id and to_shelter_id must be positive integers"}), 400
    if from_shelter_id == to_shelter_id:
        return jsonify({"error": "Source and destination shelters must be different"}), 400
    if type(people_count) is not int or people_count <= 0:
        return jsonify({"error": "people_count must be a positive integer"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()

        # Lock both shelters before checking their occupancy so concurrent
        # confirmations cannot remove unavailable occupants or overbook capacity.
        cursor.execute(
            """SELECT id, current_occupancy
               FROM shelters WHERE id = %s FOR UPDATE""",
            (from_shelter_id,),
        )
        source = cursor.fetchone()
        if not source:
            conn.rollback()
            return jsonify({"error": "Source shelter not found"}), 404

        cursor.execute(
            """SELECT id, total_capacity, current_occupancy
               FROM shelters WHERE id = %s FOR UPDATE""",
            (to_shelter_id,),
        )
        destination = cursor.fetchone()
        if not destination:
            conn.rollback()
            return jsonify({"error": "Destination shelter not found"}), 404

        if source["current_occupancy"] < people_count:
            conn.rollback()
            return jsonify({
                "error": (
                    f"Source shelter has only {source['current_occupancy']} occupants; "
                    f"cannot redirect {people_count} people"
                )
            }), 400

        free_capacity = destination["total_capacity"] - destination["current_occupancy"]
        if free_capacity < people_count:
            conn.rollback()
            return jsonify({
                "error": (
                    f"Destination shelter has only {free_capacity} free capacity; "
                    f"cannot redirect {people_count} people"
                )
            }), 400

        cursor.execute(
            "UPDATE shelters SET current_occupancy = current_occupancy - %s WHERE id = %s",
            (people_count, from_shelter_id),
        )
        cursor.execute(
            "UPDATE shelters SET current_occupancy = current_occupancy + %s WHERE id = %s",
            (people_count, to_shelter_id),
        )
        cursor.execute(
            "INSERT INTO occupancy_logs (shelter_id, occupancy_count) VALUES (%s, %s)",
            (from_shelter_id, source["current_occupancy"] - people_count),
        )
        cursor.execute(
            "INSERT INTO occupancy_logs (shelter_id, occupancy_count) VALUES (%s, %s)",
            (to_shelter_id, destination["current_occupancy"] + people_count),
        )
        cursor.execute(
            """INSERT INTO redistribution_log
               (from_shelter_id, to_shelter_id, people_count, confirmed_by)
               VALUES (%s, %s, %s, %s)""",
            (from_shelter_id, to_shelter_id, people_count, request.user["id"]),
        )
        conn.commit()
        return jsonify({
            "message": "Redistribution confirmed and logged",
            "id": cursor.lastrowid,
            "from_shelter_id": from_shelter_id,
            "to_shelter_id": to_shelter_id,
            "people_count": people_count,
        }), 201
    except Exception:
        conn.rollback()
        return jsonify({"error": "Unable to confirm redistribution"}), 500
    finally:
        cursor.close()
        conn.close()


@redistribute_bp.route("/redistribute/log", methods=["GET"])
@token_required
@roles_required("user", "admin")
def get_redistribution_log():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT r.id, r.people_count, r.confirmed_at,
                   f.name AS from_shelter, t.name AS to_shelter, u.name AS confirmed_by
            FROM redistribution_log r
            JOIN shelters f ON r.from_shelter_id = f.id
            JOIN shelters t ON r.to_shelter_id = t.id
            JOIN users u ON r.confirmed_by = u.id
            ORDER BY r.confirmed_at DESC
        """)
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()
