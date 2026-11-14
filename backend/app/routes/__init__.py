from .auth import bp as auth_bp
from .master import vehicles_bp, drivers_bp
from .operations import trips_bp, fuel_bp, income_bp, expenses_bp
from .analytics import bp as analytics_bp

def register_routes(app):
    for bp in (auth_bp, vehicles_bp, drivers_bp, trips_bp, fuel_bp, income_bp, expenses_bp, analytics_bp):
        app.register_blueprint(bp, url_prefix="/api")
