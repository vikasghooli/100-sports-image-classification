import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import { imageUrl } from "../services/api";
import type { Analytics } from "../types";
import { Card, Empty } from "./ui";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#ec4899", "#64748b", "#94a3b8"];
const box = "h-72";

export function Charts({ a }: { a: Analytics }) {
  const [mode, setMode] = useState<"daily" | "weekly">("daily");
  const pie = a.by_sport.slice(0, 8).map((s) => ({ name: s.sport, value: s.count }));
  const rest = a.by_sport.slice(8).reduce((n, s) => n + s.count, 0);
  if (rest) pie.push({ name: "Other", value: rest });
  const series = mode === "daily" ? a.daily.map((d) => ({ label: d.date.slice(5), count: d.count }))
    : a.weekly.map((w) => ({ label: w.week.slice(5), count: w.count }));

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Predictions by Sport">
        <div className={box}><ResponsiveContainer><PieChart>
          <Pie data={pie} dataKey="value" nameKey="name" outerRadius="75%">
            {pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie><Tooltip /><Legend />
        </PieChart></ResponsiveContainer></div>
      </Card>
      <Card title="Top Detected Sports">
        <div className={box}><ResponsiveContainer><BarChart data={a.top_sports} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="sport" width={90} tick={{ fontSize: 12 }} /><Tooltip />
          <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
        </BarChart></ResponsiveContainer></div>
      </Card>
      <Card title="Confidence Distribution (%)">
        <div className={box}><ResponsiveContainer><BarChart data={a.confidence_distribution}>
          <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="range" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart></ResponsiveContainer></div>
      </Card>
      <Card title="Prediction Activity">
        <div className="mb-2 flex gap-2 text-xs">
          {(["daily", "weekly"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`rounded-full px-3 py-1 ${mode === m ? "bg-emerald-600 text-white" : "bg-slate-100"}`}>{m}</button>
          ))}
        </div>
        <div className="h-64"><ResponsiveContainer><BarChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={18} />
          <YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" name="Predictions" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart></ResponsiveContainer></div>
      </Card>
    </div>
  );
}

export function Recent({ a }: { a: Analytics }) {
  return (
    <Card title="Recent Predictions">
      {a.recent.length === 0 ? <Empty text="No predictions yet." /> : (
        <ul className="divide-y">
          {a.recent.map((r) => (
            <li key={r.id}>
              <Link to={`/history/${r.id}`} className="flex items-center gap-3 py-2 hover:bg-slate-50">
                <img src={imageUrl(r.image_filename)} className="h-12 w-12 rounded object-cover" alt="" />
                <span className="flex-1 font-medium capitalize">{r.predicted_sport}</span>
                <span className="text-sm text-slate-500">{r.confidence.toFixed(1)}%</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
