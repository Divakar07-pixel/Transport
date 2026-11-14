from functools import wraps
from flask import session, jsonify
from datetime import datetime, time

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get("admin"):
            return jsonify({"error": "Authentication required"}), 401
        return fn(*args, **kwargs)
    return wrapper

def required(data, fields):
    missing = [f for f in fields if data.get(f) in (None, "")]
    if missing:
        raise ValueError("Missing required fields: " + ", ".join(missing))

def number(value, field, minimum=0):
    try:
        n = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field} must be a number")
    if n < minimum:
        raise ValueError(f"{field} must be at least {minimum}")
    return n

def date_value(value, field="date"):
    if value in (None, ""):
        raise ValueError(f"{field} must use YYYY-MM-DD format")
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        raise ValueError(f"{field} must use YYYY-MM-DD format")


def time_value(value, field="time"):
    if value in (None, ""):
        return None
    if isinstance(value, time):
        return value
    for fmt in ("%H:%M", "%H:%M:%S", "%I:%M %p", "%I:%M%p"):
        try:
            return datetime.strptime(str(value), fmt).time()
        except ValueError:
            continue
    raise ValueError(f"{field} must use HH:MM format")


def ranges_overlap(start_a, end_a, start_b, end_b):
    if start_a is None or end_a is None or start_b is None or end_b is None:
        return False
    return max(start_a, start_b) < min(end_a, end_b)
