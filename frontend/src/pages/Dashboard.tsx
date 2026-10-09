import { Charts, Recent } from "../components/AnalyticsParts";
import { Empty, ErrorBox, Loader, PageHeader, Stat, Card } from "../components/ui";
import { useFetch } from "../hooks/useFetch";
import { api } from "../services/api";

export default function Dashboard() {
  const { data: a, error, loading } = useFetch(api.analytics);
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Live statistics from your prediction history" />
      {loading && <Loader />}
      {error && <ErrorBox message={error} />}
      {a && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Stat label="Total Predictions" value={a.total} />
            <Stat label="Unique Sports" value={a.unique_sports} />
            <Stat label="Avg Confidence" value={a.total ? `${a.avg_confidence.toFixed(1)}%` : "—"} />
            <Stat label="Most Detected" value={a.most_detected?.sport ?? "—"} sub={a.most_detected ? `${a.most_detected.count} times` : undefined} />
            <Stat label="Today" value={a.today} />
          </div>
          {a.total === 0 ? <Card><Empty text="No predictions yet." /></Card> : (<><Charts a={a} /><Recent a={a} /></>)}
        </div>
      )}
    </>
  );
}
