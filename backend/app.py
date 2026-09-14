from flask import Flask, jsonify
from flask_cors import CORS
from config import Config

from routes.auth import auth_bp
from routes.shelters import shelters_bp
from routes.occupancy import occupancy_bp
from routes.predict import predict_bp
from routes.redistribute import redistribute_bp
from routes.users import users_bp
from routes.role_requests import role_requests_bp
from routes.disasters import disasters_bp
from routes.shelter_requests import shelter_requests_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, resources={r"/api/*": {"origins": Config.FRONTEND_ORIGINS}})

    app.register_blueprint(auth_bp)
    app.register_blueprint(shelters_bp)
    app.register_blueprint(occupancy_bp)
    app.register_blueprint(predict_bp)
    app.register_blueprint(redistribute_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(role_requests_bp)
    app.register_blueprint(disasters_bp)
    app.register_blueprint(shelter_requests_bp)

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "service": "shelterx-backend"})

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=(Config.FLASK_ENV == "development"), port=5000)
