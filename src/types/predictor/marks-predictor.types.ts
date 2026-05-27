/** Incoming request body for POST /predict-marks (mirrors marks_predictor.py `PredictRequest`). */
export interface MarksPredictRequest {
  user_marks: number;
  user_branch: string;
  user_category: string;
  top_n?: number;
}

/** Incoming request body for POST /suggest-marks (mirrors marks_predictor.py `SuggestRequest`). */
export interface MarksSuggestRequest {
  user_marks: number;
  user_category: string;
  top_n?: number;
}

/** Incoming request body for POST /merit-wise-college (mirrors marks_predictor.py `MeritWiseRequest`). */
export interface MeritWiseCollegeRequest {
  user_category?: string | null;
  page?: number;
  page_size?: number;
}

export interface MarksPredictionRow {
  Institute: string;
  Branch: string;
  Category: string;
  Predicted_Cutoff: number;
  Last_Year_Marks: number;
  Pct_Change: number;
  Confidence: number;
  Trend: string;
  History: Record<string, number>;
  Data_Points: number;
  Chance: string;
  Match_Distance?: number;
}

export interface MarksPredictResponse {
  user_marks: number;
  user_branch: string;
  user_category: string;
  count: number;
  predictions: MarksPredictionRow[];
}

export interface MarksSuggestResponse {
  user_marks: number;
  user_category: string;
  count: number;
  suggestions: MarksPredictionRow[];
}

export interface MeritWiseCollegeResponse {
  user_category?: string | null;
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  count: number;
  colleges: MarksPredictionRow[];
}
