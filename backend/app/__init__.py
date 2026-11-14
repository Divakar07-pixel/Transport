import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from .services.excel_service import ExcelService
from .routes import register_routes

def create_app():
    load_dotenv()
    app = Flask(__name__)

    is_production = os.getenv("APP_ENV", "development").lower() == "production"
    secret_key = (os.getenv("SECRET_KEY") or "").strip()
    if not secret_key:
        if is_production:
            raise RuntimeError("SECRET_KEY must be configured in production.")
        secret_key = "local-development-only-change-before-deploy"
    app.config["SECRET_KEY"] = secret_key
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = os.getenv(
        "SESSION_COOKIE_SAMESITE", "Lax"
    )
    app.config["SESSION_COOKIE_SECURE"] = os.getenv(
        "COOKIE_SECURE", "false"
    ).lower() == "true"
    app.config["SESSION_PERMANENT"] = False

    origins = [
        origin.strip()
        for origin in os.getenv(
            "FRONTEND_ORIGIN",
            "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if origin.strip()
    ]
    CORS(app, origins=origins, supports_credentials=True)

    excel_path = os.getenv("EXCEL_FILE", "storage/Transport_Management.xlsx")
    if not os.path.isabs(excel_path):
        excel_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), excel_path
        )
    app.extensions["excel"] = ExcelService(excel_path)

    admin_username = os.getenv("ADMIN_USERNAME", "").strip()
    admin_password = os.getenv("ADMIN_PASSWORD", "")
    if is_production and (not admin_username or not admin_password):
        raise RuntimeError(
            "ADMIN_USERNAME and ADMIN_PASSWORD must be configured in production."
        )
    app.extensions["excel"].initialize_admin(
        admin_username or "local-admin",
        admin_password
    )

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "service": "TransportPro API"})

    register_routes(app)
    return app
