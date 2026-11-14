from flask import Blueprint, jsonify, current_app, send_file
from ..utils import admin_required
from datetime import datetime
import os

bp = Blueprint("analytics", __name__)


def _to_float(value):
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


@bp.get("/dashboard")
@admin_required
def dashboard():
    s = current_app.extensions["excel"]
    vehicles = s.read_all("Vehicles")
    drivers = s.read_all("Drivers")
    trips = s.read_all("Trips")
    fuel = s.read_all("Fuel_Expenses")
    income = s.read_all("Trip_Income")
    payments = s.read_all("Payments")
    expenses = s.read_all("Other_Expenses")

    completed_trips = [t for t in trips if t.get("Status") == "Completed"]
    completed_ids = {t["Trip_ID"] for t in completed_trips}
    revenue = sum(_to_float(item["Freight_Amount"]) + _to_float(item["Additional_Charges"]) for item in income if item.get("Trip_ID") in completed_ids)
    fuel_cost = sum(_to_float(item["Amount"]) for item in fuel if item.get("Trip_ID") in completed_ids)
    other_cost = sum(_to_float(item["Amount"]) for item in expenses if item.get("Trip_ID") in completed_ids)
    total_paid = sum(_to_float(item["Amount"]) for item in payments)
    outstanding_payments = max(revenue - total_paid, 0.0)

    return jsonify({
        "total_vehicles": len(vehicles),
        "active_vehicles": sum(v.get("Status") in {"Available", "On Trip"} for v in vehicles),
        "available_vehicles": sum(v.get("Status") == "Available" for v in vehicles),
        "total_drivers": len(drivers),
        "available_drivers": sum(d.get("Availability") == "Available" and d.get("Employment_Status") == "Active" for d in drivers),
        "total_trips": len(trips),
        "active_trips": sum(t.get("Status") == "In Progress" for t in trips),
        "completed_trips": len(completed_trips),
        "total_revenue": round(revenue, 2),
        "revenue": round(revenue, 2),
        "fuel_expenses": round(sum(_to_float(item["Amount"]) for item in fuel), 2),
        "other_expenses": round(sum(_to_float(item["Amount"]) for item in expenses), 2),
        "outstanding_payments": round(outstanding_payments, 2),
        "trip_expenses": round(fuel_cost + other_cost, 2),
        "trip_profit": round(revenue - fuel_cost - other_cost, 2),
        "total_profit": round(revenue - fuel_cost - other_cost, 2),
        "recent_trips": trips[-8:][::-1],
    })


@bp.get("/reports")
@admin_required
def reports():
    s = current_app.extensions["excel"]
    return jsonify({
        "vehicles": s.read_all("Vehicles"),
        "drivers": s.read_all("Drivers"),
        "trips": s.read_all("Trips"),
        "fuel": s.read_all("Fuel_Expenses"),
        "income": s.read_all("Trip_Income"),
        "payments": s.read_all("Payments"),
        "expenses": s.read_all("Other_Expenses"),
    })


@bp.get("/export/excel")
@admin_required
def export_excel():
    path = current_app.extensions["excel"].path
    return send_file(path, as_attachment=True, download_name="Transport_Management.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


@bp.post("/backup")
@admin_required
def backup():
    s = current_app.extensions["excel"]
    folder = os.path.join(os.path.dirname(str(s.path)), "backups")
    os.makedirs(folder, exist_ok=True)
    target = os.path.join(folder, "Transport_Management_" + datetime.now().strftime("%Y%m%d_%H%M%S") + ".xlsx")
    s.backup(target)
    return jsonify({"message": "Backup created", "filename": os.path.basename(target)})
