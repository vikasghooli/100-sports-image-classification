import type {
  Analytics, BatchItem, HistoryPage, HistoryQuery, ModelInfo, PredictionRecord, PredictionResult,
} from "../types";

export const API_URL: string = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) { super(message); this.status = status; }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiError("Unable to connect to the prediction server.");
  }
  let data: any = null;
  try { data = await res.json(); } catch { /* non-JSON body */ }
  if (!res.ok) throw new ApiError(data?.error || `Request failed (${res.status}).`, res.status);
  return data as T;
}

export const imageUrl = (filename: string) => `${API_URL}/images/${encodeURIComponent(filename)}`;
export const confusionMatrixUrl = `${API_URL}/model-assets/confusion-matrix`;

export const api = {
  health: () => request<{ status: string; model_loaded: boolean }>("/health"),
  predict: (file: File) => {
    const fd = new FormData();
    fd.append("image", file);
    return request<PredictionResult>("/predict", { method: "POST", body: fd });
  },
  predictCamera: (file: File) => {
    const fd = new FormData();
    fd.append("image", file);
    return request<PredictionResult>("/predict/camera", { method: "POST", body: fd });
  },
  predictBatch: async (files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("images", f));
    return (await request<{ results: BatchItem[] }>("/predict/batch", { method: "POST", body: fd })).results;
  },
  history: (q: HistoryQuery) => {
    const p = new URLSearchParams({ page: String(q.page), per_page: "12", sort: q.sort });
    if (q.search) p.set("search", q.search);
    if (q.sport) p.set("sport", q.sport);
    return request<HistoryPage>(`/history?${p}`);
  },
  historyItem: (id: number) => request<PredictionRecord>(`/history/${id}`),
  deleteHistory: (id: number) => request<{ deleted: number }>(`/history/${id}`, { method: "DELETE" }),
  analytics: () => request<Analytics>("/analytics"),
  sports: () => request<{ count: number; sports: string[] }>("/sports"),
  modelInfo: () => request<ModelInfo>("/model-info"),
};
