import type { ReactNode } from "react";
import { AlertCircle, Inbox, Loader2 } from "lucide-react";

export const Card = ({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) => (
  <div className={`rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 ${className}`}>
    {title && <h3 className="mb-3 font-semibold text-slate-700">{title}</h3>}
    {children}
  </div>
);

export const Stat = ({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) => (
  <Card>
    <p className="text-sm text-slate-500">{label}</p>
    <p className="mt-1 truncate text-2xl font-bold capitalize text-slate-900">{value}</p>
    {sub && <p className="text-xs text-slate-400">{sub}</p>}
  </Card>
);

export const PageHeader = ({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
    </div>
    {action}
  </div>
);

export const Loader = () => (
  <div className="flex items-center justify-center gap-2 p-10 text-slate-500"><Loader2 className="animate-spin" size={20} /> Loading...</div>
);

export const ErrorBox = ({ message }: { message: string }) => (
  <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
    <AlertCircle size={18} className="mt-0.5 shrink-0" /> <span>{message}</span>
  </div>
);

export const Empty = ({ text }: { text: string }) => (
  <div className="flex flex-col items-center gap-2 p-8 text-slate-400"><Inbox size={32} /><p>{text}</p></div>
);

export const btn = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
export const btnPrimary = `${btn} bg-emerald-600 text-white hover:bg-emerald-700`;
export const btnGhost = `${btn} bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50`;
