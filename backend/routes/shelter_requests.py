from flask import Blueprint, jsonify, request

from db import get_db_connection
from utils.auth_utils import roles_required, token_required


shelter_requests_bp = Blueprint("shelter_requests", __name__, url_prefix="/api/shelter-requests")

REQUEST_STATUSES = ("pending", "approved", "rejected")
REQUEST_SELECT = """
    SELECT sr.id, sr.user_id, u.name AS user_name, u.email AS user_email,
           sr.shelter_id, s.name AS shelter_name, sr.contact_name, sr.contact_phone,
           sr.preferred_location, sr.people_count, sr.special_requirements,
           sr.status, sr.created_at, sr.updated_at
    FROM shelter_requests sr
    JOIN users u ON u.id = sr.user_id
    JOIN shelters s ON s.id = sr.shelter_id
"""


@shelter_requests_bp.route("", methods=["POST"])
@token_required
@roles_required("user")
def create_shelter_request():
    data = request.get_json(silent=True) or {}
    shelter_id = data.get("shelter_id")
    people_count = data.get("people_count")
    contact_name = data.get("contact_name")
    contact_phone = data.get("contact_phone")
    preferred_location = data.get("preferred_location")
    special_requirements = data.get("special_requirements")

    if type(shelter_id) is not int or shelter_id <= 0:
        return jsonify({"error": "shelter_id must be a positive integer"}), 400
    if type(people_count) is not int or people_count <= 0:
        return jsonify({"error": "people_count must be a positive integer"}), 400
    if not isinstance(contact_name, str) or not contact_name.strip() or len(contact_name.strip()) > 100:
        return jsonify({"error": "contact_name is required and must be at most 100 characters"}), 400
    if not isinstance(contact_phone, str) or not contact_phone.strip() or len(contact_phone.strip()) > 50:
        return jsonify({"error": "contact_phone is required and must be at most 50 characters"}), 400
    if preferred_location is not None and (not isinstance(preferred_location, str) or len(preferred_location) > 255):
        return jsonify({"error": "preferred_location must be text of at most 255 characters"}), 400
    if special_requirements is not None and (not isinstance(special_requirements, str) or len(special_requirements) > 5000):
        return jsonify({"error": "special_requirements must be text of at most 5000 characters"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM shelters WHERE id = %s", (shelter_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Shelter not found"}), 404

        cursor.execute(
            """INSERT INTO shelter_requests
               (user_id, shelter_id, contact_name, contact_phone, preferred_location, people_count, special_requirements)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (
                request.user["id"], shelter_id, contact_name.strip(), contact_phone.strip(),
                preferred_location.strip() if isinstance(preferred_location, str) and preferred_location.strip() else None,
                people_count,
                special_requirements.strip() if isinstance(special_requirements, str) and special_requirements.strip() else None,
            ),
        )
        request_id = cursor.lastrowid
        conn.commit()
        cursor.execute(f"{REQUEST_SELECT} WHERE sr.id = %s", (request_id,))
        return jsonify(cursor.fetchone()), 201
    except Exception:
        conn.rollback()
        return jsonify({"error": "Unable to submit shelter request"}), 500
    finally:
        cursor.close()
        conn.close()


@shelter_requests_bp.route("/manager", methods=["GET"])
@token_required
@roles_required("manager")
def list_manager_shelter_requests():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if request.user["role"] == "admin":
            cursor.execute(f"{REQUEST_SELECT} ORDER BY sr.created_at DESC")
        else:
            cursor.execute("SELECT shelter_id FROM users WHERE id = %s", (request.user["id"],))
            manager = cursor.fetchone()
            if not manager or not manager["shelter_id"]:
                return jsonify([])
            cursor.execute(
                f"{REQUEST_SELECT} WHERE sr.shelter_id = %s ORDER BY sr.created_at DESC",
                (manager["shelter_id"],),
            )
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


@shelter_requests_bp.route("/<int:request_id>/status", methods=["PATCH"])
@token_required
@roles_required("manager")
def update_shelter_request_status(request_id):
    data = request.get_json(silent=True) or {}
    status = data.get("status")
    if status not in REQUEST_STATUSES:
        return jsonify({"error": "status must be pending, approved, or rejected"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        cursor.execute("SELECT shelter_id FROM shelter_requests WHERE id = %s FOR UPDATE", (request_id,))
        shelter_request = cursor.fetchone()
        if not shelter_request:
            conn.rollback()
            return jsonify({"error": "Shelter request not found"}), 404

        if request.user["role"] != "admin":
            cursor.execute("SELECT shelter_id FROM users WHERE id = %s", (request.user["id"],))
            manager = cursor.fetchone()
            if not manager or manager["shelter_id"] != shelter_request["shelter_id"]:
                conn.rollback()
                return jsonify({"error": "You can only manage requests for your assigned shelter"}), 403

        cursor.execute("UPDATE shelter_requests SET status = %s WHERE id = %s", (status, request_id))
        conn.commit()
        cursor.execute(f"{REQUEST_SELECT} WHERE sr.id = %s", (request_id,))
        return jsonify(cursor.fetchone())
    except Exception:
        conn.rollback()
        return jsonify({"error": "Unable to update shelter request"}), 500
    finally:
        cursor.close()
        conn.close()
