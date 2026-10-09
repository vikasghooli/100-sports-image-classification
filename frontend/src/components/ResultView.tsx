import { CheckCircle2, AlertTriangle } from "lucide-react";
import { imageUrl } from "../services/api";
import type { PredictionRecord } from "../types";
import ConfidenceBar from "./ConfidenceBar";
import { Card } from "./ui";

export default function ResultView({ r }: { r: PredictionRecord }) {
  const isUnknown = r.is_unknown || r.low_confidence;
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card>
        <img src={imageUrl(r.image_filename)} alt="Uploaded" className="max-h-96 w-full rounded-lg object-contain" />
        <p className="mt-3 text-xs text-slate-400">{new Date(r.created_at).toLocaleString()}</p>
      </Card>
      <div className="space-y-5">
        <Card>
          {isUnknown ? (
            <div className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
              {r.invalid_image ? (
                <p className="flex items-center gap-2 font-semibold"><AlertTriangle size={16} /> Invalid image — this photo is not recognized in the 100 Sports Image Classification dataset.</p>
              ) : <>
              <p className="flex items-center gap-2 font-semibold"><AlertTriangle size={16} /> Sport not recognized — not one of the 100 supported sports</p>
              <p className="mt-1">Please use a clear image of one of the supported sports.</p>
              </>}
            </div>
          ) : (
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-600"><CheckCircle2 size={16} /> Sport detected</p>
          )}
          {!isUnknown && <><p className="text-sm text-slate-500">Predicted Sport</p>
          <p className="text-3xl font-extrabold uppercase text-slate-900">{r.predicted_sport}</p></>}
          <p className="mb-2 mt-3 text-sm text-slate-500">Confidence: <b className="text-slate-900">{r.confidence.toFixed(1)}%</b></p>
          <ConfidenceBar value={r.confidence} />
        </Card>
        {!isUnknown && <Card title="Top 5 Predictions">
          <div className="space-y-3">
            {r.top_predictions.map((t, i) => <ConfidenceBar key={t.sport} value={t.confidence} label={`${i + 1}. ${t.sport}`} />)}
          </div>
        </Card>}
      </div>
    </div>
  );
}
