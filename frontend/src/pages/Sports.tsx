import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ErrorBox, Loader, PageHeader, Empty } from "../components/ui";
import { useFetch } from "../hooks/useFetch";
import { api } from "../services/api";

export default function Sports() {
  const { data, error, loading } = useFetch(api.sports);
  const [q, setQ] = useState("");
  const list = useMemo(() => (data?.sports ?? []).filter((s) => s.toLowerCase().includes(q.toLowerCase())), [data, q]);
  return (
    <>
      <PageHeader title="100 Sports" subtitle={data ? `${data.count} classes loaded from class_names.json` : undefined} />
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-3 text-slate-400" />
        <input className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm" placeholder="Search sports..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {loading && <Loader />}
      {error && <ErrorBox message={error} />}
      {data && (list.length === 0 ? <Empty text="No sports match your search." /> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {list.map((s) => (
            <div key={s} className="rounded-xl bg-white p-4 text-center text-sm font-medium capitalize shadow-sm ring-1 ring-slate-200">{s}</div>
          ))}
        </div>
      ))}
    </>
  );
}
