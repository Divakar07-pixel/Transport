import os, threading, tempfile, shutil
from datetime import datetime, date
from pathlib import Path
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
from werkzeug.security import generate_password_hash, check_password_hash

HEADERS = {
    "Users": ["User_ID", "Username", "Password_Hash", "Created_At"],
    "Vehicles": ["Vehicle_ID", "Registration_No", "Vehicle_Type", "Model", "Capacity_Tons", "Status", "Notes", "Created_At"],
    "Drivers": ["Driver_ID", "Name", "Phone", "Licence_No", "Licence_Expiry", "Employment_Status", "Availability", "Assigned_Vehicle_ID", "Created_At"],
    "Trips": ["Trip_ID", "Vehicle_ID", "Driver_ID", "Customer", "Goods_Description", "From_Location", "To_Location", "Trip_Date", "Start_Time", "Expected_Delivery", "End_Time", "Distance_KM", "Status", "Notes", "Created_At"],
    "Fuel_Expenses": ["Fuel_ID", "Trip_ID", "Vehicle_ID", "Driver_ID", "Fuel_Date", "Fuel_Type", "Litres", "Rate_Per_Litre", "Amount", "Odometer_KM", "Pump_Name", "Receipt_Ref", "Created_At"],
    "Trip_Income": ["Income_ID", "Trip_ID", "Customer", "Freight_Amount", "Additional_Charges", "Created_At"],
    "Payments": ["Payment_ID", "Trip_ID", "Payment_Date", "Amount", "Payment_Mode", "Reference", "Notes", "Created_At"],
    "Other_Expenses": ["Expense_ID", "Trip_ID", "Expense_Date", "Category", "Amount", "Description", "Created_At"],
    "Activity_Log": ["Log_ID", "Action", "Record_Type", "Record_ID", "Details", "Timestamp"]
}

class ExcelService:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()
        self.ensure_workbook()

    def ensure_workbook(self):
        with self.lock:
            if self.path.exists():
                wb = load_workbook(self.path)
                changed = False
                for sheet, headers in HEADERS.items():
                    if sheet not in wb.sheetnames:
                        ws = wb.create_sheet(sheet)
                        ws.append(headers); changed = True
                if changed: self._save(wb)
                wb.close()
                return
            wb = Workbook()
            ws = wb.active
            ws.title = list(HEADERS)[0]
            for sheet, headers in HEADERS.items():
                target = wb[sheet] if sheet in wb.sheetnames else wb.create_sheet(sheet)
                target.append(headers)
                target.freeze_panes = "A2"
                target.auto_filter.ref = f"A1:{get_column_letter(len(headers))}1"
                for cell in target[1]:
                    cell.font = Font(bold=True, color="FFFFFF")
                    cell.fill = PatternFill("solid", fgColor="14213D")
                    cell.alignment = Alignment(horizontal="center")
                for i, h in enumerate(headers, 1):
                    target.column_dimensions[get_column_letter(i)].width = max(14, min(25, len(h) + 3))
            self._save(wb)

    def _save(self, wb):
        fd, temp_name = tempfile.mkstemp(suffix=".xlsx", dir=str(self.path.parent))
        os.close(fd)
        try:
            wb.save(temp_name)
            os.replace(temp_name, self.path)
        finally:
            if os.path.exists(temp_name): os.remove(temp_name)
            wb.close()

    def read_all(self, sheet):
        if sheet not in HEADERS: raise ValueError("Unknown worksheet")
        with self.lock:
            wb = load_workbook(self.path, data_only=True)
            ws = wb[sheet]
            headers = [c.value for c in ws[1]]
            rows = []
            for values in ws.iter_rows(min_row=2, values_only=True):
                if all(v is None for v in values): continue
                rows.append({h: self._serialize(v) for h, v in zip(headers, values)})
            wb.close()
            return rows

    @staticmethod
    def _serialize(value):
        if isinstance(value, (datetime, date)): return value.isoformat()
        return value

    def append(self, sheet, record):
        if sheet not in HEADERS: raise ValueError("Unknown worksheet")
        with self.lock:
            wb = load_workbook(self.path)
            ws = wb[sheet]
            headers = [c.value for c in ws[1]]
            ws.append([record.get(h) for h in headers])
            self._save(wb)
            return record

    def update(self, sheet, key, key_value, changes):
        with self.lock:
            wb = load_workbook(self.path)
            ws = wb[sheet]
            headers = [c.value for c in ws[1]]
            key_col = headers.index(key) + 1
            found = False
            for row in range(2, ws.max_row + 1):
                if str(ws.cell(row, key_col).value) == str(key_value):
                    for field, value in changes.items():
                        if field in headers and field != key:
                            ws.cell(row, headers.index(field) + 1).value = value
                    found = True
                    break
            if found: self._save(wb)
            else: wb.close()
            return found

    def delete(self, sheet, key, key_value):
        if sheet not in HEADERS:
            raise ValueError("Unknown worksheet")
        with self.lock:
            wb = load_workbook(self.path)
            ws = wb[sheet]
            headers = [c.value for c in ws[1]]
            key_col = headers.index(key) + 1
            for row in range(2, ws.max_row + 1):
                if str(ws.cell(row, key_col).value) == str(key_value):
                    ws.delete_rows(row, 1)
                    self._save(wb)
                    return True
            wb.close()
            return False

    def log(self, action, record_type, record_id, details=""):
        self.append("Activity_Log", {
            "Log_ID": self.new_id("LOG"), "Action": action, "Record_Type": record_type,
            "Record_ID": record_id, "Details": details, "Timestamp": datetime.now().isoformat(timespec="seconds")
        })

    @staticmethod
    def new_id(prefix):
        import uuid
        return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"

    def initialize_admin(self, username, password):
        users = self.read_all("Users")
        if users:
            return
        sanitized_username = (username or "").strip()
        sanitized_password = (password or "").strip()
        if not sanitized_username or sanitized_username.lower() in {"admin", "root"}:
            raise RuntimeError("Set ADMIN_USERNAME in backend/.env to a non-default administrator name before starting the server.")
        blocked_passwords = {"admin", "password", "change-this-immediately", "admin@123", "admin123", "transportpro"}
        if not sanitized_password or sanitized_password.lower() in blocked_passwords or len(sanitized_password) < 12:
            raise RuntimeError("Set ADMIN_PASSWORD in backend/.env to a unique password of at least 12 characters before starting the server.")
        hashed = generate_password_hash(sanitized_password)
        self.append("Users", {"User_ID": "USR-001", "Username": sanitized_username, "Password_Hash": hashed, "Created_At": datetime.now().isoformat(timespec="seconds")})

    def verify_user(self, username, password):
        for user in self.read_all("Users"):
            if user["Username"] == username:
                try: return check_password_hash(user["Password_Hash"], password)
                except Exception: return False
        return False

    def change_password(self, username, password):
        hashed = generate_password_hash(password)
        return self.update("Users", "Username", username, {"Password_Hash": hashed})

    def backup(self, destination):
        with self.lock:
            shutil.copy2(self.path, destination)
