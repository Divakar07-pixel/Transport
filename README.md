# TransportPro — Goods Transport Management System

A single-admin transport operations application using React + Vite + Tailwind, Flask REST API, and an Excel `.xlsx` workbook managed by OpenPyXL.

## Features
- Admin authentication with hashed password and server-side sessions
- Vehicle and driver master data
- Trip creation with one-trip-per-vehicle-per-day rule and overlapping-driver protection
- Fuel entries (petrol/diesel), litres, rate, amount, odometer
- Trip income, multiple/partial payments, other expenses
- Dashboard KPIs and charts
- Reports and Excel workbook download
- Workbook backup endpoint and activity log
- Responsive dark-sidebar admin UI

## Important storage note
Excel is the requested primary data store. This implementation serializes workbook writes with a process-level lock and writes through a temporary file before replacing the workbook. Keep the workbook on a persistent disk and run **one backend worker**. This is suitable for a small, low-concurrency, single-admin business, not high-volume or multi-user transactional workloads. Back up the workbook frequently. If the host cannot provide persistent disk storage, do not deploy with ephemeral local storage.

## Requirements
- Python 3.10+
- Node.js 20+
- npm

## 1. Backend setup (Windows PowerShell)
```powershell
cd TransportPro/backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```
Edit `.env`. Generate a strong `SECRET_KEY`; set `ADMIN_USERNAME` and `ADMIN_PASSWORD` to unique values. The admin account is initialized on first backend start and its password is stored only as a hash in the workbook.

Start backend:
```powershell
python run.py
```
Backend: `http://127.0.0.1:5000`

## 2. Frontend setup
In a second terminal:
```powershell
cd TransportPro/frontend
npm install
Copy-Item .env.example .env
npm run dev
```
Frontend: `http://localhost:5173`

## 3. First login
Use the username and password configured in `backend/.env`. Change the password after first login using Settings. Do not commit `.env` files.

## 4. Excel workbook
On first run, the backend creates:
`backend/storage/Transport_Management.xlsx`

Worksheets:
- Users
- Vehicles
- Drivers
- Trips
- Fuel_Expenses
- Trip_Income
- Payments
- Other_Expenses
- Activity_Log

The workbook is generated automatically. Do not open and edit it while the server is running. Use the application or stop the backend first.

## 5. Production deployment
- Deploy frontend as a static site.
- Deploy Flask backend on a service with a **persistent mounted disk**.
- Set `EXCEL_FILE` to a path on that disk, e.g. `/var/data/Transport_Management.xlsx`.
- Set `SECRET_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `FRONTEND_ORIGIN`, and `COOKIE_SECURE=true`.
- Serve backend behind HTTPS.
- Set `CORS`/frontend origin to the exact production frontend URL.
- Run a single backend worker (e.g. one Gunicorn worker). Multiple processes do not share the in-process Excel lock.
- Schedule workbook backups and test restore before real business use.
- Never expose the workbook as a public static asset.

## Business rules
- One vehicle can have at most one non-cancelled trip per calendar day.
- A driver cannot have overlapping active trip intervals. If times are omitted, same-day assignments are treated as conflicting.
- A vehicle in Maintenance or Inactive status cannot be assigned.
- An unavailable or inactive driver cannot be assigned.
- Trip income and payments are separate records. Partial payments are supported.
- Profit is calculated as trip income less fuel and other trip expenses. It is a trip-level operating estimate, not statutory net profit.
- Cancelled trips remain in the workbook and are excluded from completed-trip revenue/profit summaries.

## API
All endpoints are under `/api`. Except login and health, they require an authenticated admin session.

## GitHub Pages frontend preview
GitHub Pages can host only the static React frontend. It cannot run the Flask API or store the Excel workbook, so this preview disables login and live data. The full application requires a separate Flask host with persistent disk storage.

To publish the preview:
1. Push the `main` branch to the `Divakar07-pixel/Transport` GitHub repository.
2. In the repository, open **Settings → Pages** and select **GitHub Actions** as the build and deployment source.
3. The workflow at `.github/workflows/pages.yml` builds and deploys the frontend. The public preview URL will be `https://divakar07-pixel.github.io/Transport/`.

The workflow and Vite configuration use the repository path `/Transport/`. Do not add the backend `.env` file or Excel workbook to the repository.
