import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Award, CircleGauge, Layers3, Trophy } from "lucide-react";
import { Card, Empty, ErrorBox, Loader, PageHeader } from "../components/ui";
import { useFetch } from "../hooks/useFetch";
import { api } from "../services/api";
import type { PredictionRecord } from "../types";

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6", "#64748b", "#94a3b8"];
const confidenceColors = ["#ef4444", "#f59e0b", "#10b981"];

async function loadAllHistory(): Promise<PredictionRecord[]> {
  const first = await api.history({ page: 1, search: "", sport: "", sort: "asc" });
  if (first.pages <= 1) return first.items;
  const remaining = await Promise.all(
    Array.from({ length: first.pages - 1 }, (_, index) =>
      api.history({ page: index + 2, search: "", sport: "", sort: "asc" })),
  );
  return [first, ...remaining].flatMap((page) => page.items);
}

export default function Analytics() {
  const { data: analytics, error: analyticsError, loading: analyticsLoading } = useFetch(api.analytics);
  const { data: records, error: recordsError, loading: recordsLoading } = useFetch(loadAllHistory);
  const [trendMode, setTrendMode] = useState<"daily" | "weekly">("daily");
  const loading = analyticsLoading || recordsLoading;
  const error = analyticsError || recordsError;

  if (loading) return <><PageHeader title="Analytics" subtitle="Detailed insights from your real prediction history" /><Loader /></>;
  if (error) return <><PageHeader title="Analytics" subtitle="Detailed insights from your real prediction history" /><ErrorBox message={error} /></>;
  if (!analytics || !records || analytics.total === 0) {
    return <><PageHeader title="Analytics" subtitle="Detailed insights from your real prediction history" /><Card><Empty text="No predictions yet." /></Card></>;
  }

  const sportStats = new Map<string, { sport: string; count: number; totalConfidence: number }>();
  const confidenceBands = [
    { name: "Low (<50%)", count: 0 },
    { name: "Medium (50–79.9%)", count: 0 },
    { name: "High (≥80%)", count: 0 },
  ];
  for (const record of records) {
    const current = sportStats.get(record.predicted_sport) ?? {
      sport: record.predicted_sport, count: 0, totalConfidence: 0,
    };
    current.count += 1;
    current.totalConfidence += record.confidence;
    sportStats.set(record.predicted_sport, current);
    if (record.confidence < 50) confidenceBands[0].count += 1;
    else if (record.confidence < 80) confidenceBands[1].count += 1;
    else confidenceBands[2].count += 1;
  }

  const sportRows = [...sportStats.values()].map((row) => ({
    sport: row.sport,
    count: row.count,
    average: Number((row.totalConfidence / row.count).toFixed(1)),
    share: Number(((row.count / records.length) * 100).toFixed(1)),
  }));
  const mostPredicted = [...sportRows].sort((a, b) => b.count - a.count || a.sport.localeCompare(b.sport));
  const leastPredicted = [...sportRows].sort((a, b) => a.count - b.count || a.sport.localeCompare(b.sport)).slice(0, 10);
  const confidenceBySport = [...sportRows].sort((a, b) => b.count - a.count).slice(0, 10);
  const distribution = mostPredicted.slice(0, 7).map((row) => ({ name: row.sport, value: row.count }));
  const other = mostPredicted.slice(7).reduce((sum, row) => sum + row.count, 0);
  if (other) distribution.push({ name: "Other sports", value: other });
  const trend = trendMode === "daily"
    ? analytics.daily.map((day) => ({ date: day.date.slice(5), predictions: day.count }))
    : analytics.weekly.map((week) => ({ date: week.week.slice(5), predictions: week.count }));
  const highConfidence = confidenceBands[2].count;
  const lowConfidence = confidenceBands[0].count;

  return (
    <>
      <PageHeader title="Analytics" subtitle="Detailed analysis of every saved prediction" />
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-l-4 border-emerald-500">
            <div className="flex items-center justify-between"><p className="text-sm text-slate-500">High-confidence predictions</p><Award size={18} className="text-emerald-600" /></div>
            <p className="mt-1 text-3xl font-bold text-slate-900">{highConfidence}</p>
            <p className="mt-1 text-xs text-slate-400">{((highConfidence / records.length) * 100).toFixed(1)}% of all predictions</p>
          </Card>
          <Card className="border-l-4 border-amber-500">
            <div className="flex items-center justify-between"><p className="text-sm text-slate-500">Average confidence</p><CircleGauge size={18} className="text-amber-600" /></div>
            <p className="mt-1 text-3xl font-bold text-slate-900">{analytics.avg_confidence.toFixed(1)}%</p>
            <p className="mt-1 text-xs text-slate-400">Across {records.length} saved predictions</p>
          </Card>
          <Card className="border-l-4 border-rose-500">
            <div className="flex items-center justify-between"><p className="text-sm text-slate-500">Low-confidence predictions</p><CircleGauge size={18} className="text-rose-500" /></div>
            <p className="mt-1 text-3xl font-bold text-slate-900">{lowConfidence}</p>
            <p className="mt-1 text-xs text-slate-400">{((lowConfidence / records.length) * 100).toFixed(1)}% of all predictions</p>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <div className="flex items-center justify-between"><p className="text-sm text-slate-500">Predictions analyzed</p><Layers3 size={18} className="text-slate-400" /></div>
            <p className="mt-1 text-2xl font-bold text-slate-900">{records.length}</p>
            <p className="mt-1 text-xs text-slate-400">Every saved prediction</p>
          </Card>
          <Card>
            <div className="flex items-center justify-between"><p className="text-sm text-slate-500">Sports represented</p><Trophy size={18} className="text-emerald-600" /></div>
            <p className="mt-1 text-2xl font-bold text-slate-900">{analytics.unique_sports}</p>
            <p className="mt-1 truncate text-xs capitalize text-slate-400">Most: {analytics.most_detected?.sport ?? "—"} ({analytics.most_detected?.count ?? 0})</p>
          </Card>
          {analytics.highest && <Link to={`/history/${analytics.highest.id}`} className="block transition hover:-translate-y-0.5">
            <Card><div className="flex items-center justify-between"><p className="text-sm text-slate-500">Highest confidence</p><Award size={18} className="text-blue-600" /></div><p className="mt-1 text-2xl font-bold text-slate-900">{analytics.highest.confidence.toFixed(1)}%</p><p className="mt-1 truncate text-xs capitalize text-slate-400">{analytics.highest.predicted_sport}</p></Card>
          </Link>}
          {analytics.lowest && <Link to={`/history/${analytics.lowest.id}`} className="block transition hover:-translate-y-0.5">
            <Card><div className="flex items-center justify-between"><p className="text-sm text-slate-500">Lowest confidence</p><CircleGauge size={18} className="text-rose-500" /></div><p className="mt-1 text-2xl font-bold text-slate-900">{analytics.lowest.confidence.toFixed(1)}%</p><p className="mt-1 truncate text-xs capitalize text-slate-400">{analytics.lowest.predicted_sport}</p></Card>
          </Link>}
        </div>

        <div className="grid gap-5 xl:grid-cols-5">
          <Card title="Sport-wise prediction distribution" className="xl:col-span-2">
            <div className="h-80"><ResponsiveContainer><PieChart>
              <Pie data={distribution} dataKey="value" nameKey="name" innerRadius="48%" outerRadius="76%" paddingAngle={2}>
                {distribution.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value} predictions`, "Count"]} />
            </PieChart></ResponsiveContainer></div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600">
              {distribution.map((item, index) => <div key={item.name} className="flex items-center gap-1.5 truncate"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />{item.name} ({item.value})</div>)}
            </div>
          </Card>
          <Card title="Confidence-level mix" className="xl:col-span-3">
            <div className="h-80"><ResponsiveContainer><BarChart data={confidenceBands} layout="vertical" margin={{ left: 25, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => [`${value} predictions`, "Count"]} />
              <Bar dataKey="count" radius={[0, 5, 5, 0]}>
                {confidenceBands.map((_, index) => <Cell key={index} fill={confidenceColors[index]} />)}
              </Bar>
            </BarChart></ResponsiveContainer></div>
            <p className="text-xs text-slate-400">High: 80% or above · Medium: 50%–79.9% · Low: below 50%</p>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card title="Top 10 most predicted sports">
            <div className="h-96"><ResponsiveContainer><BarChart data={mostPredicted.slice(0, 10)} layout="vertical" margin={{ left: 24, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="sport" width={105} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => [`${value} predictions`, "Count"]} />
              <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart></ResponsiveContainer></div>
          </Card>
          <Card title="Average confidence by sport">
            <div className="h-96"><ResponsiveContainer><BarChart data={confidenceBySport} layout="vertical" margin={{ left: 24, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} unit="%" />
              <YAxis type="category" dataKey="sport" width={105} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => [`${value}%`, "Average confidence"]} />
              <Bar dataKey="average" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart></ResponsiveContainer></div>
            <p className="text-xs text-slate-400">Shown for the 10 most frequently predicted sports.</p>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-5">
          <Card title={`Prediction trend — ${trendMode === "daily" ? "last 30 days" : "last 12 weeks"}`} className="xl:col-span-3">
            <div className="mb-2 flex items-center justify-between gap-3"><p className="text-xs text-slate-400">Activity based on saved prediction timestamps</p><div className="flex rounded-lg bg-slate-100 p-0.5 text-xs"><button onClick={() => setTrendMode("daily")} className={`rounded-md px-3 py-1.5 transition ${trendMode === "daily" ? "bg-white font-medium text-emerald-700 shadow-sm" : "text-slate-500"}`}>Daily</button><button onClick={() => setTrendMode("weekly")} className={`rounded-md px-3 py-1.5 transition ${trendMode === "weekly" ? "bg-white font-medium text-emerald-700 shadow-sm" : "text-slate-500"}`}>Weekly</button></div></div>
            <div className="h-72"><ResponsiveContainer><AreaChart data={trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs><linearGradient id="predictionTrend" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.35} /><stop offset="95%" stopColor="#10b981" stopOpacity={0.03} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={20} /><YAxis allowDecimals={false} />
              <Tooltip formatter={(value: number) => [`${value} predictions`, "Count"]} />
              <Area type="monotone" dataKey="predictions" stroke="#059669" strokeWidth={2} fill="url(#predictionTrend)" />
            </AreaChart></ResponsiveContainer></div>
          </Card>
          <Card title="Least predicted sports" className="xl:col-span-2">
            <p className="mb-3 text-xs text-slate-400">Sports with at least one real prediction, ordered from least frequent.</p>
            <div className="space-y-2.5">
              {leastPredicted.map((sport) => <div key={sport.sport}>
                <div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate capitalize text-slate-700">{sport.sport}</span><span className="shrink-0 font-medium text-slate-500">{sport.count}</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-400" style={{ width: `${Math.max((sport.count / mostPredicted[0].count) * 100, 3)}%` }} /></div>
              </div>)}
            </div>
          </Card>
        </div>

        <Card title="All detected sports — distribution and confidence">
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b text-xs uppercase tracking-wide text-slate-400"><tr><th className="pb-2 font-medium">Sport</th><th className="pb-2 font-medium">Predictions</th><th className="pb-2 font-medium">Share</th><th className="pb-2 font-medium">Average confidence</th></tr></thead>
            <tbody className="divide-y">
              {mostPredicted.map((sport) => <tr key={sport.sport}>
                <td className="py-2.5 font-medium capitalize text-slate-700">{sport.sport}</td><td className="py-2.5 text-slate-600">{sport.count}</td><td className="py-2.5 text-slate-600">{sport.share}%</td><td className="py-2.5 text-slate-600">{sport.average}%</td>
              </tr>)}
            </tbody>
          </table></div>
        </Card>
      </div>
    </>
  );
}
