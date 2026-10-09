import { useEffect, useState } from "react";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
import ImagePicker from "../components/ImagePicker";
import ResultView from "../components/ResultView";
import { btnGhost, btnPrimary, Card, ErrorBox, PageHeader } from "../components/ui";
import { api } from "../services/api";
import type { PredictionResult } from "../types";

export default function Predict() {
  const [file, setFile] = useState<File | null>(null);
  const [isCameraCapture, setIsCameraCapture] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const clear = () => { setFile(null); setIsCameraCapture(false); setResult(null); setError(null); };

  const analyze = async () => {
    if (!file) return setError("Please upload an image.");
    setBusy(true); setError(null); setResult(null);
    try { setResult(await (isCameraCapture ? api.predictCamera(file) : api.predict(file))); }
    catch (e) { setError((e as Error).message || "Prediction failed. Please try again."); }
    finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Predict" subtitle="Upload, drop or capture a sports image" />
      <div className="space-y-5">
        {error && <ErrorBox message={error} />}
        {!file ? (
          <ImagePicker
            camera
            onError={setError}
            onFiles={([f]) => { setError(null); setResult(null); setIsCameraCapture(false); setFile(f); }}
            onCameraCapture={(f) => { setError(null); setResult(null); setIsCameraCapture(true); setFile(f); }}
          />
        ) : (
          <Card>
            <img src={preview ?? ""} alt="Preview" className="mx-auto max-h-80 rounded-lg object-contain" />
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button className={btnPrimary} disabled={busy} onClick={analyze}>
                {busy ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} Analyze Sports Image
              </button>
              <button className={btnGhost} disabled={busy} onClick={clear}><Trash2 size={16} /> Remove image</button>
            </div>
          </Card>
        )}
        {result && <ResultView r={result} />}
      </div>
    </>
  );
}
