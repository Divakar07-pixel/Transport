from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
from ..utils import admin_required, required, number, date_value, time_value, ranges_overlap

trips_bp = Blueprint("trips", __name__)
fuel_bp = Blueprint("fuel", __name__)
income_bp = Blueprint("income", __name__)
expenses_bp = Blueprint("expenses", __name__)


def svc():
    return current_app.extensions["excel"]


def _trip_time_windows(trip):
    start = time_value(trip.get("Start_Time"), "Start_Time")
    end = time_value(trip.get("End_Time"), "End_Time")
    return start, end


def _trip_conflicts_with_existing(existing, vehicle_id, driver_id, trip_date, start_time, end_time):
    if existing.get("Status") == "Cancelled":
        return False
    existing_trip_date = existing.get("Trip_Date")
    if not existing_trip_date or existing_trip_date != trip_date:
        return False
    same_vehicle = existing.get("Vehicle_ID") == vehicle_id
    same_driver = existing.get("Driver_ID") == driver_id
    if not same_vehicle and not same_driver:
        return False

    existing_start, existing_end = _trip_time_windows(existing)
    if start_time is None or end_time is None or existing_start is None or existing_end is None:
        return True
    if same_vehicle and ranges_overlap(start_time, end_time, existing_start, existing_end):
        return True
    if same_driver and ranges_overlap(start_time, end_time, existing_start, existing_end):
        return True
    return False


@trips_bp.get("/trips")
@admin_required
def list_trips():
    return jsonify(svc().read_all("Trips"))


@trips_bp.post("/trips")
@admin_required
def create_trip():
    d = request.get_json(silent=True) or {}
    try:
        required(d, ["Vehicle_ID", "Driver_ID", "From_Location", "To_Location", "Trip_Date"])
        trip_day = date_value(d["Trip_Date"], "Trip_Date")
        start_time = time_value(d.get("Start_Time"), "Start_Time")
        end_time = time_value(d.get("End_Time"), "End_Time")
        if start_time and end_time and start_time >= end_time:
            raise ValueError("End_Time must be later than Start_Time")
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    vehicles = svc().read_all("Vehicles")
    drivers = svc().read_all("Drivers")
    trips = svc().read_all("Trips")
    vehicle = next((x for x in vehicles if x["Vehicle_ID"] == d["Vehicle_ID"]), None)
    driver = next((x for x in drivers if x["Driver_ID"] == d["Driver_ID"]), None)
    if not vehicle:
        return jsonify({"error": "Vehicle not found"}), 404
    if not driver:
        return jsonify({"error": "Driver not found"}), 404
    if vehicle["Status"] in ("Maintenance", "Inactive"):
        return jsonify({"error": "Vehicle is not available for assignment"}), 409
    if driver["Employment_Status"] != "Active" or driver["Availability"] != "Available":
        return jsonify({"error": "Driver is not available"}), 409

    for trip in trips:
        if _trip_conflicts_with_existing(trip, d["Vehicle_ID"], d["Driver_ID"], trip_day.isoformat(), start_time, end_time):
            record_type = "vehicle" if trip.get("Vehicle_ID") == d["Vehicle_ID"] else "driver"
            message = "This vehicle already has a trip scheduled during the same period" if record_type == "vehicle" else "This driver already has a trip scheduled during the same period"
            return jsonify({"error": message}), 409

    record = {
        "Trip_ID": svc().new_id("TRP"),
        "Vehicle_ID": d["Vehicle_ID"],
        "Driver_ID": d["Driver_ID"],
        "Customer": d.get("Customer", ""),
        "Goods_Description": d.get("Goods_Description", ""),
        "From_Location": d["From_Location"],
        "To_Location": d["To_Location"],
        "Trip_Date": trip_day.isoformat(),
        "Start_Time": d.get("Start_Time", ""),
        "Expected_Delivery": d.get("Expected_Delivery", ""),
        "End_Time": d.get("End_Time", ""),
        "Distance_KM": d.get("Distance_KM", ""),
        "Status": d.get("Status", "Scheduled"),
        "Notes": d.get("Notes", ""),
        "Created_At": datetime.now().isoformat(timespec="seconds"),
    }
    svc().append("Trips", record)
    svc().log("CREATE", "Trip", record["Trip_ID"])
    return jsonify(record), 201


@trips_bp.put("/trips/<trip_id>")
@admin_required
def update_trip(trip_id):
    d = request.get_json(silent=True) or {}
    allowed = {"Vehicle_ID", "Driver_ID", "Customer", "Goods_Description", "From_Location", "To_Location", "Trip_Date", "Start_Time", "Expected_Delivery", "End_Time", "Distance_KM", "Status", "Notes"}
    changes = {k: v for k, v in d.items() if k in allowed}
    if not changes:
        return jsonify({"error": "No valid fields supplied"}), 400
    if changes.get("Status") not in (None, "Scheduled", "In Progress", "Completed", "Cancelled", "Delayed"):
        return jsonify({"error": "Invalid trip status"}), 400

    trips = svc().read_all("Trips")
    original = next((t for t in trips if t["Trip_ID"] == trip_id), None)
    if not original:
        return jsonify({"error": "Trip not found"}), 404

    updated = dict(original)
    updated.update(changes)
    if "Trip_Date" in changes:
        try:
            date_value(changes["Trip_Date"], "Trip_Date")
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
    if "Start_Time" in changes or "End_Time" in changes:
        try:
            start_time = time_value(changes.get("Start_Time", original.get("Start_Time")), "Start_Time")
            end_time = time_value(changes.get("End_Time", original.get("End_Time")), "End_Time")
            if start_time and end_time and start_time >= end_time:
                raise ValueError("End_Time must be later than Start_Time")
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    vehicle_id = changes.get("Vehicle_ID", original.get("Vehicle_ID"))
    driver_id = changes.get("Driver_ID", original.get("Driver_ID"))
    trip_date = changes.get("Trip_Date", original.get("Trip_Date"))
    start_time = time_value(changes.get("Start_Time", original.get("Start_Time")), "Start_Time")
    end_time = time_value(changes.get("End_Time", original.get("End_Time")), "End_Time")

    vehicles = svc().read_all("Vehicles")
    drivers = svc().read_all("Drivers")
    vehicle = next((v for v in vehicles if v["Vehicle_ID"] == vehicle_id), None)
    driver = next((d for d in drivers if d["Driver_ID"] == driver_id), None)
    if not vehicle:
        return jsonify({"error": "Vehicle not found"}), 404
    if not driver:
        return jsonify({"error": "Driver not found"}), 404
    if vehicle["Status"] in ("Maintenance", "Inactive"):
        return jsonify({"error": "Vehicle is not available for assignment"}), 409
    if driver["Employment_Status"] != "Active" or driver["Availability"] != "Available":
        return jsonify({"error": "Driver is not available"}), 409

    for trip in trips:
        if trip["Trip_ID"] == trip_id:
            continue
        if _trip_conflicts_with_existing(trip, vehicle_id, driver_id, trip_date, start_time, end_time):
            record_type = "vehicle" if trip.get("Vehicle_ID") == vehicle_id else "driver"
            message = "This vehicle already has a trip scheduled during the same period" if record_type == "vehicle" else "This driver already has a trip scheduled during the same period"
            return jsonify({"error": message}), 409

    ok = svc().update("Trips", "Trip_ID", trip_id, changes)
    return (jsonify({"message": "Trip updated"}), 200) if ok else (jsonify({"error": "Trip not found"}), 404)


@fuel_bp.get("/fuel")
@admin_required
def list_fuel():
    return jsonify(svc().read_all("Fuel_Expenses"))


@fuel_bp.post("/fuel")
@admin_required
def create_fuel():
    d = request.get_json(silent=True) or {}
    try:
        required(d, ["Vehicle_ID", "Fuel_Date", "Fuel_Type", "Litres", "Rate_Per_Litre"])
        date_value(d["Fuel_Date"], "Fuel_Date")
        litres = number(d["Litres"], "Litres", 0.001)
        rate = number(d["Rate_Per_Litre"], "Rate_Per_Litre", 0)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    if d["Fuel_Type"] not in {"Petrol", "Diesel"}:
        return jsonify({"error": "Fuel_Type must be Petrol or Diesel"}), 400
    vehicle = next((x for x in svc().read_all("Vehicles") if x["Vehicle_ID"] == d["Vehicle_ID"]), None)
    if not vehicle:
        return jsonify({"error": "Vehicle not found"}), 404
    if d.get("Driver_ID") and not any(driver["Driver_ID"] == d["Driver_ID"] for driver in svc().read_all("Drivers")):
        return jsonify({"error": "Driver not found"}), 404
    if d.get("Trip_ID") and not any(trip["Trip_ID"] == d["Trip_ID"] for trip in svc().read_all("Trips")):
        return jsonify({"error": "Trip not found"}), 404
    amount = round(litres * rate, 2)
    record = {
        "Fuel_ID": svc().new_id("FUL"),
        "Trip_ID": d.get("Trip_ID", ""),
        "Vehicle_ID": d["Vehicle_ID"],
        "Driver_ID": d.get("Driver_ID", ""),
        "Fuel_Date": d["Fuel_Date"],
        "Fuel_Type": d["Fuel_Type"],
        "Litres": litres,
        "Rate_Per_Litre": rate,
        "Amount": amount,
        "Odometer_KM": d.get("Odometer_KM", ""),
        "Pump_Name": d.get("Pump_Name", ""),
        "Receipt_Ref": d.get("Receipt_Ref", ""),
        "Created_At": datetime.now().isoformat(timespec="seconds"),
    }
    svc().append("Fuel_Expenses", record)
    svc().log("CREATE", "Fuel", record["Fuel_ID"])
    return jsonify(record), 201


@fuel_bp.get("/fuel/<fuel_id>")
@admin_required
def get_fuel(fuel_id):
    record = next((f for f in svc().read_all("Fuel_Expenses") if f["Fuel_ID"] == fuel_id), None)
    return (jsonify(record), 200) if record else (jsonify({"error": "Fuel entry not found"}), 404)


@fuel_bp.put("/fuel/<fuel_id>")
@admin_required
def update_fuel(fuel_id):
    service = svc()
    existing = next((f for f in service.read_all("Fuel_Expenses") if f["Fuel_ID"] == fuel_id), None)
    if not existing:
        return jsonify({"error": "Fuel entry not found"}), 404

    data = request.get_json(silent=True) or {}
    allowed = {"Vehicle_ID", "Trip_ID", "Driver_ID", "Fuel_Date", "Fuel_Type", "Litres",
               "Rate_Per_Litre", "Odometer_KM", "Pump_Name", "Receipt_Ref"}
    changes = {key: value for key, value in data.items() if key in allowed}
    if not changes:
        return jsonify({"error": "No valid fields supplied"}), 400
    updated = dict(existing)
    updated.update(changes)
    try:
        required(updated, ["Vehicle_ID", "Fuel_Date", "Fuel_Type", "Litres", "Rate_Per_Litre"])
        date_value(updated["Fuel_Date"], "Fuel_Date")
        litres = number(updated["Litres"], "Litres", 0.001)
        rate = number(updated["Rate_Per_Litre"], "Rate_Per_Litre", 0)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if updated["Fuel_Type"] not in {"Petrol", "Diesel"}:
        return jsonify({"error": "Fuel_Type must be Petrol or Diesel"}), 400
    if not any(v["Vehicle_ID"] == updated["Vehicle_ID"] for v in service.read_all("Vehicles")):
        return jsonify({"error": "Vehicle not found"}), 404
    if updated.get("Driver_ID") and not any(d["Driver_ID"] == updated["Driver_ID"] for d in service.read_all("Drivers")):
        return jsonify({"error": "Driver not found"}), 404
    if updated.get("Trip_ID") and not any(t["Trip_ID"] == updated["Trip_ID"] for t in service.read_all("Trips")):
        return jsonify({"error": "Trip not found"}), 404
    changes["Litres"] = litres
    changes["Rate_Per_Litre"] = rate
    changes["Amount"] = round(litres * rate, 2)
    service.update("Fuel_Expenses", "Fuel_ID", fuel_id, changes)
    service.log("UPDATE", "Fuel", fuel_id)
    return jsonify({"message": "Fuel entry updated", "Amount": changes["Amount"]})


@fuel_bp.delete("/fuel/<fuel_id>")
@admin_required
def delete_fuel(fuel_id):
    service = svc()
    if not any(f["Fuel_ID"] == fuel_id for f in service.read_all("Fuel_Expenses")):
        return jsonify({"error": "Fuel entry not found"}), 404
    service.delete("Fuel_Expenses", "Fuel_ID", fuel_id)
    service.log("DELETE", "Fuel", fuel_id)
    return jsonify({"message": "Fuel entry deleted"})


@income_bp.get("/income")
@admin_required
def list_income():
    return jsonify({"income": svc().read_all("Trip_Income"), "payments": svc().read_all("Payments")})


@income_bp.post("/income")
@admin_required
def create_income():
    d = request.get_json(silent=True) or {}
    try:
        required(d, ["Trip_ID", "Freight_Amount"])
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    if not any(t["Trip_ID"] == d["Trip_ID"] for t in svc().read_all("Trips")):
        return jsonify({"error": "Trip not found"}), 404
    freight = number(d["Freight_Amount"], "Freight_Amount")
    extra = number(d.get("Additional_Charges", 0), "Additional_Charges")
    r = {
        "Income_ID": svc().new_id("INC"),
        "Trip_ID": d["Trip_ID"],
        "Customer": d.get("Customer", ""),
        "Freight_Amount": freight,
        "Additional_Charges": extra,
        "Created_At": datetime.now().isoformat(timespec="seconds"),
    }
    svc().append("Trip_Income", r)
    return jsonify(r), 201


@income_bp.post("/payments")
@admin_required
def create_payment():
    d = request.get_json(silent=True) or {}
    try:
        required(d, ["Trip_ID", "Payment_Date", "Amount", "Payment_Mode"])
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    incomes = [x for x in svc().read_all("Trip_Income") if x["Trip_ID"] == d["Trip_ID"]]
    if not incomes:
        return jsonify({"error": "Add trip income before recording a payment"}), 409
    total = sum(float(x["Freight_Amount"] or 0) + float(x["Additional_Charges"] or 0) for x in incomes)
    paid = sum(float(x["Amount"] or 0) for x in svc().read_all("Payments") if x["Trip_ID"] == d["Trip_ID"])
    amount = number(d["Amount"], "Amount", 0.01)
    if paid + amount > total + 0.001:
        return jsonify({"error": "Payment exceeds outstanding amount"}), 409
    r = {
        "Payment_ID": svc().new_id("PAY"),
        "Trip_ID": d["Trip_ID"],
        "Payment_Date": d["Payment_Date"],
        "Amount": amount,
        "Payment_Mode": d["Payment_Mode"],
        "Reference": d.get("Reference", ""),
        "Notes": d.get("Notes", ""),
        "Created_At": datetime.now().isoformat(timespec="seconds"),
    }
    svc().append("Payments", r)
    return jsonify(r), 201


@expenses_bp.get("/expenses")
@admin_required
def list_expenses():
    return jsonify(svc().read_all("Other_Expenses"))


@expenses_bp.post("/expenses")
@admin_required
def create_expense():
    d = request.get_json(silent=True) or {}
    try:
        required(d, ["Trip_ID", "Expense_Date", "Category", "Amount"])
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    if not any(t["Trip_ID"] == d["Trip_ID"] for t in svc().read_all("Trips")):
        return jsonify({"error": "Trip not found"}), 404
    amount = number(d["Amount"], "Amount", 0.01)
    r = {
        "Expense_ID": svc().new_id("EXP"),
        "Trip_ID": d["Trip_ID"],
        "Expense_Date": d["Expense_Date"],
        "Category": d["Category"],
        "Amount": amount,
        "Description": d.get("Description", ""),
        "Created_At": datetime.now().isoformat(timespec="seconds"),
    }
    svc().append("Other_Expenses", r)
    return jsonify(r), 201
