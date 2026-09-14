from flask import Blueprint, request, jsonify
from db import get_db_connection
from utils.auth_utils import token_required, roles_required

role_requests_bp = Blueprint("role_requests", __name__, url_prefix="/api/role-requests")

REQUESTED_ROLES = ("manager", "authority")
REQUEST_STATUSES = ("pending", "approved", "rejected")


@role_requests_bp.route("", methods=["POST"])
@token_required
def create_role_request():
    data = request.get_json(silent=True) or {}
    requested_role = data.get("requested_role")
    if requested_role not in REQUESTED_ROLES:
        return jsonify({"error": "requested_role must be manager or authority"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        cursor.execute("SELECT id, role, is_active FROM users WHERE id = %s FOR UPDATE", (request.user["id"],))
        user = cursor.fetchone()
        if not user or not user["is_active"]:
            conn.rollback()
            return jsonify({"error": "Account is unavailable"}), 401
        if user["role"] != "user":
            conn.rollback()
            return jsonify({"error": "Only standard users can request role access"}), 403

        cursor.execute(
            "SELECT id FROM role_requests WHERE user_id = %s AND requested_role = %s AND status = 'pending'",
            (user["id"], requested_role),
        )
        if cursor.fetchone():
            conn.rollback()
            return jsonify({"error": "A pending request already exists for this role"}), 409

        cursor.execute(
            "INSERT INTO role_requests (user_id, requested_role) VALUES (%s, %s)",
            (user["id"], requested_role),
        )
        request_id = cursor.lastrowid
        conn.commit()
        return jsonify({"id": request_id, "requested_role": requested_role, "status": "pending"}), 201
    except Exception:
        conn.rollback()
        return jsonify({"error": "Unable to create role request"}), 500
    finally:
        cursor.close()
        conn.close()


@role_requests_bp.route("/my", methods=["GET"])
@token_required
def list_my_role_requests():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """SELECT id, requested_role, status, created_at, reviewed_at
               FROM role_requests WHERE user_id = %s ORDER BY created_at DESC""",
            (request.user["id"],),
        )
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


@role_requests_bp.route("", methods=["GET"])
@token_required
@roles_required("admin")
def list_role_requests():
    status = request.args.get("status")
    requested_role = request.args.get("requested_role")
    if status is not None and status not in REQUEST_STATUSES:
        return jsonify({"error": "Invalid status filter"}), 400
    if requested_role is not None and requested_role not in REQUESTED_ROLES:
        return jsonify({"error": "Invalid requested_role filter"}), 400

    clauses = []
    values = []
    if status:
        clauses.append("rr.status = %s")
        values.append(status)
    if requested_role:
        clauses.append("rr.requested_role = %s")
        values.append(requested_role)
    where_clause = f"WHERE {' AND '.join(clauses)}" if clauses else ""

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            f"""SELECT rr.id, rr.user_id, u.name AS user_name, u.email AS user_email,
                       rr.requested_role, rr.status, rr.created_at, rr.reviewed_at, rr.reviewed_by
                FROM role_requests rr
                JOIN users u ON u.id = rr.user_id
                {where_clause}
                ORDER BY rr.created_at DESC""",
            values,
        )
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


def review_role_request(request_id, new_status):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        cursor.execute(
            "SELECT id, user_id, requested_role, status FROM role_requests WHERE id = %s FOR UPDATE",
            (request_id,),
        )
        role_request = cursor.fetchone()
        if not role_request:
            conn.rollback()
            return jsonify({"error": "Role request not found"}), 404
        if role_request["status"] != "pending":
            conn.rollback()
            return jsonify({"error": "Only pending role requests can be reviewed"}), 400

        if new_status == "approved":
            cursor.execute("SELECT id FROM users WHERE id = %s FOR UPDATE", (role_request["user_id"],))
            if not cursor.fetchone():
                conn.rollback()
                return jsonify({"error": "Requesting user not found"}), 404
            cursor.execute(
                "UPDATE users SET role = %s WHERE id = %s",
                (role_request["requested_role"], role_request["user_id"]),
            )

        cursor.execute(
            """UPDATE role_requests
               SET status = %s, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = %s
               WHERE id = %s""",
            (new_status, request.user["id"], request_id),
        )
        conn.commit()
        return jsonify({"message": f"Role request {new_status}", "id": request_id, "status": new_status})
    except Exception:
        conn.rollback()
        return jsonify({"error": "Unable to review role request"}), 500
    finally:
        cursor.close()
        conn.close()


@role_requests_bp.route("/<int:request_id>/approve", methods=["PATCH"])
@token_required
@roles_required("admin")
def approve_role_request(request_id):
    return review_role_request(request_id, "approved")


@role_requests_bp.route("/<int:request_id>/reject", methods=["PATCH"])
@token_required
@roles_required("admin")
def reject_role_request(request_id):
    return review_role_request(request_id, "rejected")
