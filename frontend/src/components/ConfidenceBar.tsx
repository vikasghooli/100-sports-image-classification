export default function ConfidenceBar({ value, label }: { value: number; label?: string }) {
  const color = value >= 75 ? "bg-emerald-500" : value >= 50 ? "bg-amber-500" : "bg-red-400";
  return (
    <div>
      {label && (
        <div className="mb-1 flex justify-between text-sm">
          <span className="capitalize">{label}</span><span className="font-medium">{value.toFixed(1)}%</span>
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
      </div>
    </div>
  );
}
