from collections import Counter
from datetime import date, timedelta

from flask import Blueprint, jsonify

from models import Prediction

bp = Blueprint("analytics", __name__)


@bp.get("/analytics")
def analytics():
    rows = Prediction.query.order_by(Prediction.created_at.desc(), Prediction.id.desc()).all()
    total = len(rows)
    base = {"total": total, "unique_sports": 0, "avg_confidence": 0, "today": 0,
            "most_detected": None, "highest": None, "lowest": None, "by_sport": [], "top_sports": [],
            "confidence_distribution": [{"range": f"{i}-{i + 10}", "count": 0} for i in range(0, 100, 10)],
            "daily": [], "weekly": [], "recent": []}
    if total == 0:
        return jsonify(base)

    counts = Counter(r.predicted_sport for r in rows)
    by_sport = [{"sport": s, "count": c} for s, c in counts.most_common()]
    dist = [0] * 10
    for r in rows:
        dist[min(int(r.confidence // 10), 9)] += 1
    today = date.today()
    per_day = Counter(r.created_at.date() for r in rows)
    monday = today - timedelta(days=today.weekday())
    per_week = Counter(r.created_at.date() - timedelta(days=r.created_at.weekday()) for r in rows)
    base.update({
        "unique_sports": len(counts),
        "avg_confidence": round(sum(r.confidence for r in rows) / total, 2),
        "today": per_day.get(today, 0),
        "most_detected": by_sport[0],
        "highest": max(rows, key=lambda r: r.confidence).to_dict(),
        "lowest": min(rows, key=lambda r: r.confidence).to_dict(),
        "by_sport": by_sport, "top_sports": by_sport[:10],
        "confidence_distribution": [{"range": f"{i * 10}-{i * 10 + 10}", "count": dist[i]} for i in range(10)],
        "daily": [{"date": (today - timedelta(days=n)).isoformat(), "count": per_day.get(today - timedelta(days=n), 0)}
                  for n in range(29, -1, -1)],
        "weekly": [{"week": (monday - timedelta(weeks=n)).isoformat(), "count": per_week.get(monday - timedelta(weeks=n), 0)}
                   for n in range(11, -1, -1)],
        "recent": [r.to_dict() for r in rows[:5]],
    })
    return jsonify(base)
