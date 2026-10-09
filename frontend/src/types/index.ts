export interface TopPrediction { sport: string; confidence: number }

export interface PredictionRecord {
  id: number;
  image_filename: string;
  predicted_sport: string;
  confidence: number;
  top_predictions: TopPrediction[];
  created_at: string;
  low_confidence: boolean;
  threshold: number;
  is_unknown?: boolean;
  invalid_image?: boolean;
}
export interface PredictionResult extends PredictionRecord { probabilities: Record<string, number> }

export interface BatchItem extends Partial<PredictionRecord> { filename: string; success: boolean; error?: string }

export interface HistoryPage { items: PredictionRecord[]; total: number; page: number; pages: number; sports: string[] }
export interface HistoryQuery { page: number; search: string; sport: string; sort: "asc" | "desc" }

export interface Analytics {
  total: number; unique_sports: number; avg_confidence: number; today: number;
  most_detected: { sport: string; count: number } | null;
  highest: PredictionRecord | null; lowest: PredictionRecord | null;
  by_sport: { sport: string; count: number }[];
  top_sports: { sport: string; count: number }[];
  confidence_distribution: { range: string; count: number }[];
  daily: { date: string; count: number }[];
  weekly: { week: string; count: number }[];
  recent: PredictionRecord[];
}

export interface ModelInfo {
  model_loaded: boolean; model_error: string | null; class_error: string | null;
  num_classes: number; image_size: number[]; normalization: string; confidence_threshold: number;
  metrics: Record<string, number> | null;
  training_history: Record<string, number[]> | null;
  has_confusion_matrix: boolean;
}

