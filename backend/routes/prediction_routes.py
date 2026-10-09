import io
import json
import logging
import uuid

from PIL import Image
from flask import Blueprint, jsonify, request
from werkzeug.utils import secure_filename

import config
from database import db
from errors import ApiError
from models import Prediction
from predictor import get_predictor

bp = Blueprint("predict", __name__)
log = logging.getLogger(__name__)
CAMERA_CONFIDENCE_THRESHOLD = 40.0


def process_file(file, *, camera: bool = False) -> dict:
    name = secure_filename(file.filename or "")
    if not name:
        raise ApiError("Please upload an image.", 400)
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    if ext not in config.ALLOWED_EXTENSIONS:
        raise ApiError("Only JPG, JPEG and PNG images are supported.", 415)
    data = file.read()
    if not data:
        raise ApiError("The uploaded file is empty.", 400)
    if len(data) > config.MAX_UPLOAD_MB * 1024 * 1024:
        raise ApiError(f"Image is too large (max {config.MAX_UPLOAD_MB} MB).", 413)
    try:
        Image.open(io.BytesIO(data)).verify()
        img = Image.open(io.BytesIO(data))
        img.load()
        if img.format not in ("JPEG", "PNG"):
            raise ValueError("bad format")
    except Exception:
        raise ApiError("Invalid image file.", 400)

    predictor = get_predictor()
    if not predictor.is_ready:
        raise ApiError("ML model is not loaded.", 503)
    try:
        result = predictor.predict(
            img,
            confidence_threshold=CAMERA_CONFIDENCE_THRESHOLD if camera else None,
        )
    except Exception:
        log.exception("Prediction failed")
        raise ApiError("Prediction failed. Please try again.", 500)

    stored = f"{uuid.uuid4().hex}.{'jpg' if ext == 'jpeg' else ext}"
    path = config.UPLOAD_DIR / stored
    path.write_bytes(data)
    try:
        rec = Prediction(
            image_filename=stored,
            predicted_sport=result["predicted_sport"],
            confidence=result["confidence"],
            top_predictions=json.dumps(result["top_predictions"]),
        )
        db.session.add(rec)
        db.session.commit()
    except Exception:
        db.session.rollback()
        path.unlink(missing_ok=True)
        log.exception("Saving prediction failed")
        raise ApiError("Could not save the prediction.", 500)
    payload = {
        **rec.to_dict(),
        "probabilities": result["probabilities"],
        "is_unknown": result["is_unknown"],
    }
    if camera:
        # The database schema remains unchanged; this response reflects the
        # camera feature's 40% display threshold.
        payload.update(
            low_confidence=result["is_unknown"],
            threshold=CAMERA_CONFIDENCE_THRESHOLD,
            invalid_image=result["is_unknown"],
        )
    return payload


@bp.post("/predict")
def predict():
    file = request.files.get("image")
    if file is None:
        raise ApiError("Please upload an image.", 400)
    return jsonify(process_file(file)), 201


@bp.post("/predict/camera")
def predict_camera():
    file = request.files.get("image")
    if file is None:
        raise ApiError("Please capture an image.", 400)
    return jsonify(process_file(file, camera=True)), 201


@bp.post("/predict/batch")
def predict_batch():
    files = request.files.getlist("images")
    if not files:
        raise ApiError("Please upload at least one image.", 400)
    if len(files) > config.MAX_BATCH_FILES:
        raise ApiError(f"Too many images (max {config.MAX_BATCH_FILES}).", 400)
    if not get_predictor().is_ready:
        raise ApiError("ML model is not loaded.", 503)
    results = []
    for f in files:
        try:
            r = process_file(f)
            r.pop("probabilities", None)
            results.append({"filename": f.filename, "success": True, **r})
        except ApiError as e:
            results.append({"filename": f.filename, "success": False, "error": e.message})
    return jsonify({"results": results})


@bp.get("/history")
def history():
    page = max(request.args.get("page", 1, type=int), 1)
    per_page = min(max(request.args.get("per_page", 12, type=int), 1), 100)
    q = Prediction.query
    if s := request.args.get("search", "").strip():
        q = q.filter(Prediction.predicted_sport.ilike(f"%{s}%"))
    if sport := request.args.get("sport", "").strip():
        q = q.filter(Prediction.predicted_sport == sport)
    order = Prediction.created_at.asc() if request.args.get("sort") == "asc" else Prediction.created_at.desc()
    p = db.paginate(q.order_by(order, Prediction.id.desc()), page=page, per_page=per_page, error_out=False)
    sports = [r[0] for r in db.session.query(Prediction.predicted_sport).distinct().order_by(Prediction.predicted_sport)]
    return jsonify({"items": [i.to_dict() for i in p.items], "total": p.total,
                    "page": page, "pages": p.pages, "sports": sports})


@bp.get("/history/<int:pid>")
def history_item(pid: int):
    rec = db.session.get(Prediction, pid)
    if rec is None:
        raise ApiError("Prediction not found.", 404)
    return jsonify(rec.to_dict())


@bp.delete("/history/<int:pid>")
def delete_item(pid: int):
    rec = db.session.get(Prediction, pid)
    if rec is None:
        raise ApiError("Prediction not found.", 404)
    (config.UPLOAD_DIR / rec.image_filename).unlink(missing_ok=True)
    db.session.delete(rec)
    db.session.commit()
    return jsonify({"deleted": pid})
