import json

from flask import Blueprint, jsonify, send_file

import config
from errors import ApiError
from predictor import get_predictor

bp = Blueprint("sports", __name__)


def _read_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None
    except Exception:
        return None


@bp.get("/sports")
def sports():
    p = get_predictor()
    if not p.class_names:
        raise ApiError(p.class_error or "class_names.json is not available.", 503)
    return jsonify({"count": len(p.class_names), "sports": p.class_names})


@bp.get("/model-info")
def model_info():
    p = get_predictor()
    return jsonify({
        "model_loaded": p.is_ready,
        "model_error": p.model_error if not p.is_ready else None,
        "class_error": p.class_error,
        "num_classes": len(p.class_names),
        "image_size": list(config.IMAGE_SIZE),
        "normalization": config.NORMALIZATION,
        "confidence_threshold": config.CONFIDENCE_THRESHOLD,
        "metrics": _read_json(config.METRICS_PATH),
        "training_history": _read_json(config.HISTORY_PATH),
        "has_confusion_matrix": config.CONFUSION_MATRIX_PATH.exists(),
    })


@bp.get("/model-assets/confusion-matrix")
def confusion_matrix():
    if not config.CONFUSION_MATRIX_PATH.exists():
        raise ApiError("Confusion matrix not provided.", 404)
    return send_file(config.CONFUSION_MATRIX_PATH, mimetype="image/png")
