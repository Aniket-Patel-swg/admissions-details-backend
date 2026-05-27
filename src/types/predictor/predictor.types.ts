/** Supported board IDs accepted by the percentile predictor ECR Lambda. */
export type PercentileBoardId = 'gujcet' | 'cbse' | 'gseb' | 'isce';

/** Incoming request body for POST /predict-percentile (mirrors the FastAPI `PredictBody` schema). */
export interface PercentilePredictRequest {
  boards: PercentileBoardId[];
  gujcet_marks?: number | null;
  guject_marks?: number | null;
  cbse_marks?: number | null;
  gseb_marks?: number | null;
  isce_marks?: number | null;
}

export interface PercentileBoardResult {
  predicted_percentile?: number;
  input_marks: number;
  error?: string;
}

export interface PercentilePredictResponse {
  input_marks_by_board: Record<string, number>;
  boards: Record<string, PercentileBoardResult>;
  note?: string;
}

/** Incoming request body for POST /predict-college (mirrors the FastAPI `PredictRequest` schema). */
export interface CollegePredictRequest {
  user_rank: number;
  user_branch: string;
  user_category: string;
  top_n?: number;
}

export interface CollegePredictionRow {
  Institute: string;
  Branch: string;
  Category: string;
  Predicted_Cutoff: number;
  Last_Year_Rank: number;
  Pct_Change: number;
  Confidence: number;
  Trend: string;
  History: Record<string, number>;
  Data_Points: number;
  Chance: string;
}

export interface CollegePredictResponse {
  user_rank: number;
  user_branch: string;
  user_category: string;
  count: number;
  predictions: CollegePredictionRow[];
}
