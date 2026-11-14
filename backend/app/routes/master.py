from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
from ..utils import admin_required, required

vehicles_bp = Blueprint("vehicles", __name__)
drivers_bp = Blueprint("drivers", __name__)

@vehicles_bp.get("/vehicles")
@admin_required
def list_vehicles():
    return jsonify(current_app.extensions["excel"].read_all("Vehicles"))

@vehicles_bp.post("/vehicles")
@admin_required
def create_vehicle():
    data = request.get_json(silent=True) or {}
    try: required(data, ["Registration_No", "Vehicle_Type"])
    except ValueError as e: return jsonify({"error": str(e)}), 400
    svc = current_app.extensions["excel"]
    reg = data["Registration_No"].strip().upper()
    if any((v.get("Registration_No") or "").upper() == reg for v in svc.read_all("Vehicles")):
        return jsonify({"error": "Registration number already exists"}), 409
    record = {"Vehicle_ID": svc.new_id("VEH"), "Registration_No": reg,
        "Vehicle_Type": data["Vehicle_Type"], "Model": data.get("Model", ""),
        "Capacity_Tons": data.get("Capacity_Tons", ""), "Status": data.get("Status", "Available"),
        "Notes": data.get("Notes", ""), "Created_At": datetime.now().isoformat(timespec="seconds")}
    if record["Status"] not in {"Available", "On Trip", "Maintenance", "Inactive"}:
        return jsonify({"error": "Invalid vehicle status"}), 400
    svc.append("Vehicles", record); svc.log("CREATE", "Vehicle", record["Vehicle_ID"])
    return jsonify(record), 201

@vehicles_bp.put("/vehicles/<vehicle_id>")
@admin_required
def update_vehicle(vehicle_id):
    data = request.get_json(silent=True) or {}
    allowed = {"Registration_No","Vehicle_Type","Model","Capacity_Tons","Status","Notes"}
    changes = {k:v for k,v in data.items() if k in allowed}
    if not changes: return jsonify({"error":"No valid fields supplied"}),400
    if "Status" in changes and changes["Status"] not in {"Available", "On Trip", "Maintenance", "Inactive"}:
        return jsonify({"error": "Invalid vehicle status"}), 400
    if "Registration_No" in changes:
        reg = str(changes["Registration_No"]).strip().upper()
        existing = current_app.extensions["excel"].read_all("Vehicles")
        if any((v.get("Registration_No") or "").upper() == reg and v.get("Vehicle_ID") != vehicle_id for v in existing):
            return jsonify({"error": "Registration number already exists"}), 409
        changes["Registration_No"] = reg
    ok = current_app.extensions["excel"].update("Vehicles","Vehicle_ID",vehicle_id,changes)
    return (jsonify({"message":"Updated"}),200) if ok else (jsonify({"error":"Vehicle not found"}),404)

@vehicles_bp.get("/vehicles/<vehicle_id>")
@admin_required
def get_vehicle(vehicle_id):
    vehicle = next((v for v in current_app.extensions["excel"].read_all("Vehicles") if v["Vehicle_ID"] == vehicle_id), None)
    return (jsonify(vehicle), 200) if vehicle else (jsonify({"error": "Vehicle not found"}), 404)

@vehicles_bp.delete("/vehicles/<vehicle_id>")
@admin_required
def delete_vehicle(vehicle_id):
    svc = current_app.extensions["excel"]
    vehicle = next((v for v in svc.read_all("Vehicles") if v["Vehicle_ID"] == vehicle_id), None)
    if not vehicle:
        return jsonify({"error": "Vehicle not found"}), 404
    has_trips = any(t.get("Vehicle_ID") == vehicle_id for t in svc.read_all("Trips"))
    has_fuel = any(f.get("Vehicle_ID") == vehicle_id for f in svc.read_all("Fuel_Expenses"))
    if has_trips or has_fuel:
        return jsonify({"error": "This vehicle has trip or fuel history and cannot be deleted. Set its status to Inactive instead."}), 409
    svc.delete("Vehicles", "Vehicle_ID", vehicle_id)
    svc.log("DELETE", "Vehicle", vehicle_id)
    return jsonify({"message": "Vehicle deleted"})

@drivers_bp.get("/drivers")
@admin_required
def list_drivers():
    return jsonify(current_app.extensions["excel"].read_all("Drivers"))

@drivers_bp.post("/drivers")
@admin_required
def create_driver():
    data = request.get_json(silent=True) or {}
    try: required(data, ["Name", "Phone"])
    except ValueError as e: return jsonify({"error":str(e)}),400
    svc = current_app.extensions["excel"]
    licence_no = str(data.get("Licence_No", "")).strip()
    if licence_no and any((d.get("Licence_No") or "").strip().upper() == licence_no.upper() for d in svc.read_all("Drivers")):
        return jsonify({"error": "Licence number already exists"}), 409
    record = {"Driver_ID":svc.new_id("DRV"),"Name":data["Name"].strip(),"Phone":data["Phone"].strip(),
        "Licence_No":licence_no,"Licence_Expiry":data.get("Licence_Expiry",""),
        "Employment_Status":data.get("Employment_Status","Active"),"Availability":data.get("Availability","Available"),
        "Assigned_Vehicle_ID":data.get("Assigned_Vehicle_ID",""),"Created_At":datetime.now().isoformat(timespec="seconds")}
    if record["Employment_Status"] not in {"Active", "Inactive"}:
        return jsonify({"error": "Invalid employment status"}), 400
    if record["Availability"] not in {"Available", "On Trip", "Unavailable", "Inactive"}:
        return jsonify({"error": "Invalid driver availability"}), 400
    svc.append("Drivers",record); svc.log("CREATE","Driver",record["Driver_ID"])
    return jsonify(record),201

@drivers_bp.put("/drivers/<driver_id>")
@admin_required
def update_driver(driver_id):
    data=request.get_json(silent=True) or {}
    allowed={"Name","Phone","Licence_No","Licence_Expiry","Employment_Status","Availability","Assigned_Vehicle_ID"}
    changes={k:v for k,v in data.items() if k in allowed}
    if not changes:return jsonify({"error":"No valid fields supplied"}),400
    if "Employment_Status" in changes and changes["Employment_Status"] not in {"Active", "Inactive"}:
        return jsonify({"error": "Invalid employment status"}), 400
    if "Availability" in changes and changes["Availability"] not in {"Available", "On Trip", "Unavailable", "Inactive"}:
        return jsonify({"error": "Invalid driver availability"}), 400
    if "Licence_No" in changes:
        licence_no = str(changes["Licence_No"]).strip()
        if licence_no and any((d.get("Licence_No") or "").strip().upper() == licence_no.upper() and d.get("Driver_ID") != driver_id for d in current_app.extensions["excel"].read_all("Drivers")):
            return jsonify({"error": "Licence number already exists"}), 409
        changes["Licence_No"] = licence_no
    ok=current_app.extensions["excel"].update("Drivers","Driver_ID",driver_id,changes)
    return (jsonify({"message":"Updated"}),200) if ok else (jsonify({"error":"Driver not found"}),404)

@drivers_bp.get("/drivers/<driver_id>")
@admin_required
def get_driver(driver_id):
    driver = next((d for d in current_app.extensions["excel"].read_all("Drivers") if d["Driver_ID"] == driver_id), None)
    return (jsonify(driver), 200) if driver else (jsonify({"error": "Driver not found"}), 404)

@drivers_bp.delete("/drivers/<driver_id>")
@admin_required
def delete_driver(driver_id):
    svc = current_app.extensions["excel"]
    driver = next((d for d in svc.read_all("Drivers") if d["Driver_ID"] == driver_id), None)
    if not driver:
        return jsonify({"error": "Driver not found"}), 404
    has_trips = any(t.get("Driver_ID") == driver_id for t in svc.read_all("Trips"))
    has_fuel = any(f.get("Driver_ID") == driver_id for f in svc.read_all("Fuel_Expenses"))
    if has_trips or has_fuel:
        return jsonify({"error": "This driver has trip or fuel history and cannot be deleted. Set the driver to Inactive instead."}), 409
    svc.delete("Drivers", "Driver_ID", driver_id)
    svc.log("DELETE", "Driver", driver_id)
    return jsonify({"message": "Driver deleted"})
