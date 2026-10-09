import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import ImagePicker from "../components/ImagePicker";
import { btnGhost, btnPrimary, Card, ErrorBox, PageHeader } from "../components/ui";
import { api, imageUrl } from "../services/api";
import type { BatchItem } from "../types";

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

export default function Batch() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<BatchItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!files.length) return setError("Please upload an image.");
    setBusy(true); setError(null); setResults([]);
    try { setResults(await api.predictBatch(files)); }
    catch (e) { setError((e as Error).message || "Prediction failed. Please try again."); }
    finally { setBusy(false); }
  };

  const downloadCsv = () => {
    const rows = [["Image", "Predicted Sport", "Confidence (%)", "Status"],
      ...results.map((r) => [r.filename, r.is_unknown ? "Sport not recognized — not one of the 100 supported sports" : r.predicted_sport ?? "", r.confidence ?? "", r.success ? (r.is_unknown || r.low_confidence ? "Not recognized" : "OK") : r.error ?? "Error"])];
    const blob = new Blob([rows.map((r) => r.map(csvCell).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "batch_predictions.csv"; a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <PageHeader title="Batch Prediction" subtitle="Classify many images at once" />
      <div className="space-y-5">
        {error && <ErrorBox message={error} />}
        <ImagePicker multiple onError={setError} onFiles={(f) => { setError(null); setResults([]); setFiles((p) => [...p, ...f]); }} />
        {files.length > 0 && (
          <Card>
            <p className="mb-3 text-sm text-slate-600">{files.length} image(s) selected</p>
            <div className="flex flex-wrap gap-2">
              <button className={btnPrimary} disabled={busy} onClick={run}>
                {busy && <Loader2 className="animate-spin" size={16} />} Classify {files.length} image(s)
              </button>
              <button className={btnGhost} disabled={busy} onClick={() => { setFiles([]); setResults([]); }}>Clear all</button>
            </div>
          </Card>
        )}
        {results.length > 0 && (
          <Card title="Results">
            <button className={`${btnGhost} mb-3`} onClick={downloadCsv}><Download size={16} /> Download Results as CSV</button>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b text-slate-500"><tr><th className="p-2">Image</th><th className="p-2">Predicted Sport</th><th className="p-2">Confidence</th></tr></thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="flex items-center gap-2 p-2">
                        {r.image_filename && <img src={imageUrl(r.image_filename)} className="h-10 w-10 rounded object-cover" alt="" />}
                        <span className="max-w-[160px] truncate">{r.filename}</span>
                      </td>
                      {r.success ? (<>
                        <td className="p-2 font-medium capitalize">{r.is_unknown ? "Sport not recognized — not one of the 100 supported sports" : r.predicted_sport}{(r.is_unknown || r.low_confidence) && <span className="ml-2 text-xs text-amber-600">(not recognized)</span>}</td>
                        <td className="p-2">{r.confidence!.toFixed(1)}%</td>
                      </>) : <td colSpan={2} className="p-2 text-red-600">{r.error}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
