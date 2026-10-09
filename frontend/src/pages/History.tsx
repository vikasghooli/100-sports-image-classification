import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, RefreshCw, Trash2 } from "lucide-react";
import { btnGhost, Card, Empty, ErrorBox, Loader, PageHeader } from "../components/ui";
import { useFetch } from "../hooks/useFetch";
import { api, imageUrl } from "../services/api";
import type { HistoryQuery } from "../types";

export default function HistoryPage() {
  const [q, setQ] = useState<HistoryQuery>({ page: 1, search: "", sport: "", sort: "desc" });
  const [text, setText] = useState("");
  const { data, error, loading, reload } = useFetch(() => api.history(q), [q]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ((p) => (p.search === text ? p : { ...p, search: text, page: 1 })), 300);
    return () => clearTimeout(t);
  }, [text]);

  const remove = async (id: number) => {
    if (!confirm("Delete this prediction?")) return;
    try { await api.deleteHistory(id); setErr(null); reload(); } catch (e) { setErr((e as Error).message); }
  };
  const input = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

  return (
    <>
      <PageHeader title="Prediction History" action={<button className={btnGhost} onClick={reload}><RefreshCw size={16} /> Refresh</button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <input className={`${input} flex-1`} placeholder="Search sport..." value={text} onChange={(e) => setText(e.target.value)} />
        <select className={input} value={q.sport} onChange={(e) => setQ({ ...q, sport: e.target.value, page: 1 })}>
          <option value="">All sports</option>
          {data?.sports.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={input} value={q.sort} onChange={(e) => setQ({ ...q, sort: e.target.value as "asc" | "desc" })}>
          <option value="desc">Newest first</option><option value="asc">Oldest first</option>
        </select>
      </div>
      {(error || err) && <ErrorBox message={(error || err)!} />}
      {loading && !data && <Loader />}
      {data && (data.items.length === 0 ? <Card><Empty text={data.total === 0 && !q.search && !q.sport ? "No predictions yet." : "No matching predictions."} /></Card> : (
        <Card>
          <ul className="divide-y">
            {data.items.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-3">
                <img src={imageUrl(r.image_filename)} className="h-14 w-14 rounded-lg object-cover" alt="" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold capitalize">{r.predicted_sport}</p>
                  <p className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <span className={`text-sm font-medium ${r.low_confidence ? "text-amber-600" : "text-emerald-600"}`}>{r.confidence.toFixed(1)}%</span>
                <Link to={`/history/${r.id}`} className="p-2 text-slate-500 hover:text-emerald-600" title="View details"><Eye size={18} /></Link>
                <button onClick={() => remove(r.id)} className="p-2 text-slate-500 hover:text-red-600" title="Delete"><Trash2 size={18} /></button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-slate-500">{data.total} result(s)</span>
            <div className="flex items-center gap-2">
              <button className={btnGhost} disabled={q.page <= 1} onClick={() => setQ({ ...q, page: q.page - 1 })}>Prev</button>
              <span>{q.page} / {Math.max(data.pages, 1)}</span>
              <button className={btnGhost} disabled={q.page >= data.pages} onClick={() => setQ({ ...q, page: q.page + 1 })}>Next</button>
            </div>
          </div>
        </Card>
      ))}
    </>
  );
}
