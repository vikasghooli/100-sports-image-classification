"""Loads YOUR trained model and class names, and runs predictions. No training happens here."""
import json
import logging
import threading

import numpy as np
from flask import current_app
from PIL import Image, ImageOps

import config

log = logging.getLogger(__name__)


class Predictor:
    def __init__(self) -> None:
        self.model = None
        self.class_names: list[str] = []
        self.model_error: str | None = None
        self.class_error: str | None = None
        self._lock = threading.Lock()
        self._load_class_names()
        self._load_model()

    @property
    def is_ready(self) -> bool:
        return self.model is not None and bool(self.class_names) and self.model_error is None

    def _load_class_names(self) -> None:
        try:
            if not config.CLASS_NAMES_PATH.exists():
                raise FileNotFoundError("class_names.json was not found in the model folder.")
            data = json.loads(config.CLASS_NAMES_PATH.read_text(encoding="utf-8"))
            if isinstance(data, dict):  # {"0": "archery", "1": "..."}
                data = [data[k] for k in sorted(data, key=lambda x: int(x))]
            self.class_names = [str(n) for n in data]
            if len(self.class_names) != 100 or len(set(self.class_names)) != len(self.class_names):
                raise ValueError("class_names.json must contain 100 unique classes in model-output order.")
        except Exception as exc:
            self.class_error = str(exc)
            log.warning("Class names not loaded: %s", exc)

    def _load_model(self) -> None:
        try:
            if not config.MODEL_PATH.exists():
                raise FileNotFoundError("Model file was not found. Check MODEL_PATH.")
            from tensorflow import keras  # imported lazily so the API still starts without a model

            self.model = keras.models.load_model(str(config.MODEL_PATH), compile=False)
            out = self.model.output_shape[-1]
            if self.class_names and out != len(self.class_names):
                raise ValueError(
                    f"Model outputs {out} classes but class_names.json has {len(self.class_names)}.")
            log.info("Model loaded from %s", config.MODEL_PATH.name)
        except Exception as exc:
            self.model = None
            self.model_error = str(exc)
            log.warning("Model not loaded: %s", exc)

    def preprocess(self, img: Image.Image) -> np.ndarray:
        # Camera JPEGs commonly store the display rotation in EXIF instead of
        # rotating their pixels. Apply it before the same RGB/224px conversion
        # used by the training generator.
        img = ImageOps.exif_transpose(img).convert("RGB")
        img = img.resize(config.IMAGE_SIZE, Image.Resampling.NEAREST)
        arr = np.asarray(img, dtype=np.float32)
        if config.NORMALIZATION == "0-1":
            arr = arr / 255.0
        elif config.NORMALIZATION == "-1-1":
            arr = arr / 127.5 - 1.0
        elif config.NORMALIZATION != "none":
            raise ValueError("NORMALIZATION must be '0-1', '-1-1' or 'none'.")
        return arr[np.newaxis, ...]

    def predict(self, img: Image.Image, confidence_threshold: float | None = None) -> dict:
        if not self.is_ready:
            raise RuntimeError("Model is not loaded.")
        x = self.preprocess(img)
        with self._lock:
            probs = np.asarray(self.model.predict(x, verbose=0))[0].astype(np.float64)
        if probs.min() < 0 or abs(probs.sum() - 1.0) > 1e-3:  # model returned logits
            e = np.exp(probs - probs.max())
            probs = e / e.sum()
        pct = probs * 100.0
        order = np.argsort(pct)[::-1]
        top = [{"sport": self.class_names[i], "confidence": round(float(pct[i]), 2)} for i in order[:5]]
        top_confidence = float(pct[order[0]])
        runner_up_confidence = float(pct[order[1]]) if len(order) > 1 else 0.0
        if confidence_threshold is not None:
            # Camera captures use the same trained model, preprocessing, and
            # class mapping, with only the caller's acceptance threshold.
            is_unknown = top_confidence < confidence_threshold
        else:
            is_unknown = (
                top_confidence < config.UNKNOWN_CONFIDENCE_THRESHOLD
                or top_confidence - runner_up_confidence < config.UNKNOWN_MARGIN_THRESHOLD
            )
        return {
            "predicted_sport": top[0]["sport"],
            "confidence": top[0]["confidence"],
            "top_predictions": top,
            "probabilities": {self.class_names[i]: round(float(pct[i]), 4) for i in range(len(pct))},
            "is_unknown": is_unknown,
        }


def get_predictor() -> Predictor:
    return current_app.extensions["predictor"]
