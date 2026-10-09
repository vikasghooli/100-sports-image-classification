import { Card, ErrorBox, Loader, PageHeader } from "../components/ui";
import { useFetch } from "../hooks/useFetch";
import { api } from "../services/api";

const pct = (v: number) => `${(v <= 1 ? v * 100 : v).toFixed(2)}%`;
const pick = (m: Record<string, number>, ...keys: string[]) => keys.map((key) => m[key]).find((value) => typeof value === "number");

const metricDetails = [
  { key: "accuracy", label: "Test accuracy", keys: ["accuracy", "test_accuracy"] },
  { key: "precision", label: "Precision", keys: ["precision", "precision_macro"] },
  { key: "recall", label: "Recall", keys: ["recall", "recall_macro"] },
  { key: "f1", label: "F1 score", keys: ["f1_score", "f1_score_macro", "f1"] },
] as const;

function MetricCard({ label, value }: { label: string; value?: number }) {
  return (
    <Card className="border-t-4 border-t-emerald-500">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{value == null ? "—" : pct(value)}</p>
    </Card>
  );
}

function TrainingSummary({ history }: { history: Record<string, number[]> }) {
  const values = (key: string) => history[key] ?? [];
  const last = (key: string) => {
    const series = values(key);
    return series.length ? series[series.length - 1] : undefined;
  };
  const best = (key: string) => values(key).length ? Math.max(...values(key)) : undefined;
  const epochs = Math.max(...["accuracy", "val_accuracy", "loss", "val_loss"].map((key) => values(key).length));
  const items = [
    { label: "Best training accuracy", value: best("accuracy"), format: pct },
    { label: "Best validation accuracy", value: best("val_accuracy"), format: pct },
    { label: "Final training accuracy", value: last("accuracy"), format: pct },
    { label: "Final validation accuracy", value: last("val_accuracy"), format: pct },
    { label: "Final training loss", value: last("loss"), format: (value: number) => value.toFixed(4) },
    { label: "Final validation loss", value: last("val_loss"), format: (value: number) => value.toFixed(4) },
  ];

  return (
    <Card title="Training / Validation Summary">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => <div key={item.label} className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
          <p className="text-xs font-medium text-slate-500">{item.label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{item.value == null ? "—" : item.format(item.value)}</p>
        </div>)}
        <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
          <p className="text-xs font-medium text-slate-500">Epochs completed</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{epochs || "—"}</p>
        </div>
      </div>
    </Card>
  );
}

export default function ModelPerformance() {
  const { data: info, error, loading } = useFetch(api.modelInfo);
  const metrics = info?.metrics;
  const testSamples = metrics && pick(metrics, "test_samples");
  const correct = metrics && pick(metrics, "correct_predictions");
  const incorrect = metrics && pick(metrics, "incorrect_predictions");

  return (
    <>
      <PageHeader title="Model Performance" subtitle="All values below are read from the trained model's existing evaluation files." />
      {loading && <Loader />}
      {error && <ErrorBox message={error} />}
      {info && (
        <div className="space-y-5">
          {!info.model_loaded && <ErrorBox message={`ML model is not loaded.${info.model_error ? " " + info.model_error : ""}`} />}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Evaluation metrics</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metricDetails.map((metric) => <MetricCard key={metric.key} label={metric.label} value={metrics ? pick(metrics, ...metric.keys) : undefined} />)}
            </div>
          </section>
          {!metrics && <Card><p className="text-slate-500">Model performance metrics have not been provided yet.</p></Card>}
          {metrics && (testSamples != null || correct != null || incorrect != null) && (
            <Card title="Test-set results">
              <div className="grid grid-cols-3 divide-x divide-slate-200 text-center">
                <div><p className="text-2xl font-bold text-slate-900">{testSamples ?? "—"}</p><p className="text-xs text-slate-500">Test samples</p></div>
                <div><p className="text-2xl font-bold text-emerald-600">{correct ?? "—"}</p><p className="text-xs text-slate-500">Correct</p></div>
                <div><p className="text-2xl font-bold text-rose-600">{incorrect ?? "—"}</p><p className="text-xs text-slate-500">Incorrect</p></div>
              </div>
            </Card>
          )}
          <Card title="Model input">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">Classes</dt><dd className="mt-1 font-semibold text-slate-900">{info.num_classes || "—"}</dd></div>
              <div><dt className="text-slate-500">Input size</dt><dd className="mt-1 font-semibold text-slate-900">{info.image_size.join(" × ")}</dd></div>
            </dl>
          </Card>
          {info.training_history && <TrainingSummary history={info.training_history} />}
        </div>
      )}
    </>
  );
}
