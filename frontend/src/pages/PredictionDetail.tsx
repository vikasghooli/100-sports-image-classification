import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import ResultView from "../components/ResultView";
import { btnGhost, ErrorBox, Loader, PageHeader } from "../components/ui";
import { useFetch } from "../hooks/useFetch";
import { api } from "../services/api";

export default function PredictionDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data, error, loading } = useFetch(() => api.historyItem(Number(id)), [id]);
  const [err, setErr] = useState<string | null>(null);

  const remove = async () => {
    if (!data || !confirm("Delete this prediction?")) return;
    try { await api.deleteHistory(data.id); nav("/history"); } catch (e) { setErr((e as Error).message); }
  };

  return (
    <>
      <PageHeader title="Prediction Details" action={
        <div className="flex gap-2">
          <Link to="/history" className={btnGhost}><ArrowLeft size={16} /> Back</Link>
          {data && <button className={btnGhost} onClick={remove}><Trash2 size={16} /> Delete</button>}
        </div>} />
      {loading && <Loader />}
      {(error || err) && <ErrorBox message={(error || err)!} />}
      {data && <div className="space-y-5"><ResultView r={data} /></div>}
    </>
  );
}
