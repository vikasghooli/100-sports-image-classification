import json
from datetime import datetime

import config
from database import db


class Prediction(db.Model):
    __tablename__ = "predictions"

    id = db.Column(db.Integer, primary_key=True)
    image_filename = db.Column(db.String(255), nullable=False)
    predicted_sport = db.Column(db.String(100), nullable=False, index=True)
    confidence = db.Column(db.Float, nullable=False)
    top_predictions = db.Column(db.Text, nullable=False, default="[]")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now, index=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "image_filename": self.image_filename,
            "predicted_sport": self.predicted_sport,
            "confidence": self.confidence,
            "top_predictions": json.loads(self.top_predictions or "[]"),
            "created_at": self.created_at.isoformat(),
            "low_confidence": self.confidence < config.CONFIDENCE_THRESHOLD,
            "threshold": config.CONFIDENCE_THRESHOLD,
        }
