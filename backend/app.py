import logging

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

import config
import models  # noqa: F401  (registers tables)
from database import db
from errors import ApiError
from predictor import Predictor, get_predictor
from routes import analytics_routes, prediction_routes, sports_routes

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


def create_app() -> Flask:
    config.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    config.DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)

    app = Flask(__name__)
    app.config.update(
        SQLALCHEMY_DATABASE_URI=f"sqlite:///{config.DATABASE_PATH.as_posix()}",
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        MAX_CONTENT_LENGTH=config.MAX_UPLOAD_MB * 1024 * 1024 * config.MAX_BATCH_FILES,
    )
    CORS(app, resources={r"/api/*": {"origins": config.CORS_ORIGINS}})
    db.init_app(app)
    with app.app_context():
        db.create_all()  # tables are created automatically
    app.extensions["predictor"] = Predictor()

    for bp in (prediction_routes.bp, analytics_routes.bp, sports_routes.bp):
        app.register_blueprint(bp, url_prefix="/api")

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "model_loaded": get_predictor().is_ready})

    @app.get("/api/images/<path:filename>")
    def image(filename: str):
        return send_from_directory(config.UPLOAD_DIR, filename)

    @app.errorhandler(ApiError)
    def api_error(e: ApiError):
        return jsonify({"error": e.message}), e.status

    @app.errorhandler(HTTPException)
    def http_error(e: HTTPException):
        msg = "Image is too large." if e.code == 413 else e.description
        return jsonify({"error": msg}), e.code

    @app.errorhandler(Exception)
    def unexpected(e: Exception):
        app.logger.exception("Unhandled error")
        return jsonify({"error": "Internal server error."}), 500

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host=config.HOST, port=config.PORT, debug=False)
