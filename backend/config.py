"""All settings. Override any of them with environment variables."""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent

# Keep secrets in backend/.env for local development. Environment variables still
# take precedence, which makes this safe for production deployments.
load_dotenv(BASE_DIR / ".env")


def _path(env: str, default: Path) -> Path:
    value = os.getenv(env)
    if not value:
        return default
    p = Path(value)
    return p if p.is_absolute() else ROOT_DIR / p  # relative paths are relative to project root


# ---- Model files (put your trained files in backend/model/) ----
MODEL_PATH = _path("MODEL_PATH", BASE_DIR / "model" / "model.keras")  # .keras, .h5 or SavedModel folder
CLASS_NAMES_PATH = _path("CLASS_NAMES_PATH", BASE_DIR / "model" / "class_names.json")
METRICS_PATH = _path("METRICS_PATH", BASE_DIR / "model" / "model_metrics.json")
HISTORY_PATH = _path("HISTORY_PATH", BASE_DIR / "model" / "training_history.json")
CONFUSION_MATRIX_PATH = _path("CONFUSION_MATRIX_PATH", BASE_DIR / "model" / "confusion_matrix.png")

# ---- Preprocessing: MUST match what you used when training ----
_size = int(os.getenv("IMAGE_SIZE", "224"))
IMAGE_SIZE = (_size, _size)
# "0-1"  -> pixels / 255            (typical for models without an internal preprocessing layer)
# "-1-1" -> pixels / 127.5 - 1      (MobileNet / Xception style)
# "none" -> raw 0-255 pixels        (use when your model has a Rescaling/preprocess layer inside)
# The improved EfficientNet contains Rescaling and Normalization layers, so
# prediction must pass raw 0-255 RGB pixels to the model.
NORMALIZATION = os.getenv("NORMALIZATION", "none")

# ---- Prediction behaviour ----
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "50"))  # percent
# A prediction must also be sufficiently separated from its runner-up before it
# is presented as one of the supported sports. These settings do not alter the
# model output; they only mark uncertain inputs as unrecognized.
UNKNOWN_CONFIDENCE_THRESHOLD = float(os.getenv("UNKNOWN_CONFIDENCE_THRESHOLD", str(CONFIDENCE_THRESHOLD)))
UNKNOWN_MARGIN_THRESHOLD = float(os.getenv("UNKNOWN_MARGIN_THRESHOLD", "10"))

# ---- Uploads / DB ----
UPLOAD_DIR = _path("UPLOAD_DIR", BASE_DIR / "uploads")
DATABASE_PATH = _path("DATABASE_PATH", ROOT_DIR / "database" / "sports_predictions.db")
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png"}
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "10"))
MAX_BATCH_FILES = int(os.getenv("MAX_BATCH_FILES", "50"))

# ---- Server ----
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "5000"))
CORS_ORIGINS = [o.strip() for o in os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]
