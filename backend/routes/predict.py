from flask import Blueprint, jsonify
from db import get_db_connection
from utils.auth_utils import token_required, optional_token

predict_bp = Blueprint("predict", __name__, url_prefix="/api/shelters")

HIGH_RISK_RATIO = 0.85
MEDIUM_RISK_RATIO = 0.60


def calculate_prediction(logs, total_capacity, current_occupancy):
    """Very simple linear trend projection -- no ML needed for the MVP.
    Uses the earliest and latest of the last few occupancy log points to
    estimate people/hour, then projects when the shelter hits capacity."""
    occupancy_ratio = (current_occupancy / total_capacity) if total_capacity else 0

    if len(logs) < 2:
        risk_level = "high" if occupancy_ratio >= HIGH_RISK_RATIO else (
            "medium" if occupancy_ratio >= MEDIUM_RISK_RATIO else "low"
        )
        return {
            "occupancy_ratio": round(occupancy_ratio, 2),
            "trend_people_per_hour": None,
            "projected_hours_to_capacity": None,
            "risk_level": risk_level,
            "note": "Not enough occupancy history yet for a trend projection.",
        }

    first, last = logs[0], logs[-1]
    hours_elapsed = max((last["logged_at"] - first["logged_at"]).total_seconds() / 3600, 0.01)
    people_change = last["occupancy_count"] - first["occupancy_count"]
    rate_per_hour = people_change / hours_elapsed

    remaining_capacity = total_capacity - current_occupancy
    if rate_per_hour > 0 and remaining_capacity > 0:
        hours_to_capacity = remaining_capacity / rate_per_hour
    elif remaining_capacity <= 0:
        hours_to_capacity = 0
    else:
        hours_to_capacity = None  # occupancy flat or falling -- not filling up

    # Risk combines current fill ratio with how soon it will be full
    if occupancy_ratio >= HIGH_RISK_RATIO or (hours_to_capacity is not None and hours_to_capacity <= 3):
        risk_level = "high"
    elif occupancy_ratio >= MEDIUM_RISK_RATIO or (hours_to_capacity is not None and hours_to_capacity <= 8):
        risk_level = "medium"
    else:
        risk_level = "low"

    return {
        "occupancy_ratio": round(occupancy_ratio, 2),
        "trend_people_per_hour": round(rate_per_hour, 1),
        "projected_hours_to_capacity": round(hours_to_capacity, 1) if hours_to_capacity is not None else None,
        "risk_level": risk_level,
    }


@predict_bp.route("/<int:shelter_id>/predict", methods=["GET"])
@optional_token
def predict(shelter_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM shelters WHERE id = %s", (shelter_id,))
        shelter = cursor.fetchone()
        if not shelter:
            return jsonify({"error": "Shelter not found"}), 404

        cursor.execute(
            "SELECT occupancy_count, logged_at FROM occupancy_logs WHERE shelter_id = %s ORDER BY logged_at DESC LIMIT 20",
            (shelter_id,),
        )
        logs = list(reversed(cursor.fetchall()))

        result = calculate_prediction(logs, shelter["total_capacity"], shelter["current_occupancy"])
        result["shelter_id"] = shelter_id
        return jsonify(result)
    finally:
        cursor.close()
        conn.close()
