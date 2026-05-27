# Predictions API — Frontend Integration Guide

POST endpoints exposed by `admissions-backend-apis` that proxy to the Python ML predictors (deployed as ECR-image Lambdas).

| Endpoint                         | Method | Purpose                                                     |
| -------------------------------- | ------ | ----------------------------------------------------------- |
| `/predict-percentile`            | POST   | Convert board exam marks → predicted percentile per board   |
| `/predict-college`               | POST   | Suggest colleges/branches reachable for a given merit rank  |
| `/predict-marks`                 | POST   | Suggest colleges/branches reachable for a given merit marks |
| `/suggest-marks`                 | POST   | Cross-branch suggestions (marks-based) closest to the user  |
| `/merit-wise-college`            | POST   | Paginated list of colleges ranked by toughness (marks)      |

Base URL:

- Local (`serverless offline`): `http://localhost:4802/dev`
- Deployed: the API Gateway URL printed by `npx serverless deploy`

All responses are JSON. All requests must send `Content-Type: application/json`.

---

## 1. `POST /predict-percentile`

Predicts each board's percentile from marks. Used by the percentile-converter screen so a candidate from any board can compare with GUJCET.

### Request body

```ts
type PercentileBoardId = 'gujcet' | 'cbse' | 'gseb' | 'isce';

interface PercentilePredictRequest {
  boards: PercentileBoardId[];   // 1..N unique board ids
  gujcet_marks?: number;         // required iff "gujcet" is in boards
  cbse_marks?: number;           // required iff "cbse"   is in boards
  gseb_marks?: number;           // required iff "gseb"   is in boards
  isce_marks?: number;           // required iff "isce"   is in boards
}
```

Rules:

- For every board listed in `boards`, the matching `<board>_marks` field **must** be a finite number.
- Unknown boards return `400`.
- `guject_marks` is accepted as an alias for `gujcet_marks` (typo-tolerant — prefer `gujcet_marks`).

### Example request

```http
POST /predict-percentile
Content-Type: application/json

{
  "boards": ["gujcet", "cbse"],
  "gujcet_marks": 95,
  "cbse_marks": 92.4
}
```

### Success response — `200`

```ts
interface PercentileBoardResult {
  predicted_percentile?: number;  // 0..100, rounded to 2 dp
  input_marks: number;
  error?: string;                 // present only when board model unavailable
}

interface PercentilePredictResponse {
  input_marks_by_board: Record<string, number>;
  boards: Record<string, PercentileBoardResult>;
  note?: string;
}
```

```json
{
  "input_marks_by_board": { "gujcet": 95, "cbse": 92.4 },
  "boards": {
    "gujcet": { "predicted_percentile": 99.21, "input_marks": 95 },
    "cbse":   { "predicted_percentile": 97.88, "input_marks": 92.4 }
  },
  "note": "..."
}
```

---

## 2. `POST /predict-college`

Given a candidate's merit rank, branch and category, returns the colleges where they have a SAFE / MODERATE / RISKY chance based on YoY cutoff trends.

### Request body

```ts
interface CollegePredictRequest {
  user_rank: number;       // > 0, candidate merit rank (lower is better)
  user_branch: Branch;     // see enum below — case-insensitive, canonical UPPER form
  user_category: Category; // see enum below — case-insensitive, canonical UPPER form
  top_n?: number;          // 1..500, default 50
}
```

### Example request

```http
POST /predict-college
Content-Type: application/json

{
  "user_rank": 8500,
  "user_branch": "COMPUTER ENGINEERING",
  "user_category": "OPEN",
  "top_n": 30
}
```

### Success response — `200`

```ts
interface CollegePredictionRow {
  Institute: string;
  Branch: string;
  Category: string;
  Predicted_Cutoff: number;        // forecasted closing rank
  Last_Year_Rank: number;          // most recent observed closing rank
  Pct_Change: number;              // YoY % change used for the forecast
  Confidence: number;              // 0.0 .. 1.0
  Trend: 'INCREASING_DEMAND' | 'DECREASING_DEMAND' | 'STABLE';
  History: Record<string, number>; // { "2022": 12345, "2023": 11800, ... }
  Data_Points: number;             // # years used in trend
  Chance: 'SAFE' | 'MODERATE' | 'RISKY';
}

interface CollegePredictResponse {
  user_rank: number;
  user_branch: string;
  user_category: string;
  count: number;
  predictions: CollegePredictionRow[]; // sorted ascending by Predicted_Cutoff
}
```

### Chance bucket meaning

| Bucket   | Condition                              | UI hint               |
| -------- | -------------------------------------- | --------------------- |
| SAFE     | `user_rank ≤ Predicted_Cutoff * 0.80`  | High admit probability |
| MODERATE | `user_rank ≤ Predicted_Cutoff`         | Realistic target       |
| RISKY    | `user_rank ≤ Predicted_Cutoff * 1.15`  | Apply as a stretch     |
| —        | otherwise                              | Filtered out of response |

### Confidence interpretation

| Range     | Suggested label |
| --------- | --------------- |
| ≥ 0.7     | HIGH            |
| 0.4 – 0.7 | MEDIUM          |
| < 0.4     | LOW             |

---

## 3. `POST /predict-marks`

Marks-based variant of `/predict-college`. Given a candidate's merit **marks** (0–100, higher is better), branch and category, returns the colleges where they have a SAFE / MODERATE / RISKY chance based on YoY merit-marks trends.

### Request body

```ts
interface MarksPredictRequest {
  user_marks: number;      // 0..100, candidate merit marks (higher is better)
  user_branch: Branch;     // see enum
  user_category: Category; // see enum
  top_n?: number;          // 1..500, default 50
}
```

### Example request

```http
POST /predict-marks
Content-Type: application/json

{
  "user_marks": 92.5,
  "user_branch": "COMPUTER ENGINEERING",
  "user_category": "OPEN",
  "top_n": 30
}
```

### Success response — `200`

```ts
interface MarksPredictionRow {
  Institute: string;
  Branch: string;
  Category: string;
  Predicted_Cutoff: number;        // forecasted closing marks (0..100)
  Last_Year_Marks: number;         // most recent observed closing marks
  Pct_Change: number;              // YoY % change used for the forecast
  Confidence: number;              // 0.0 .. 1.0
  Trend: 'INCREASING_DEMAND' | 'DECREASING_DEMAND' | 'STABLE';
  History: Record<string, number>; // { "2022": 89.5, "2023": 91.2, ... }
  Data_Points: number;
  Chance: 'SAFE' | 'MODERATE' | 'RISKY';
}

interface MarksPredictResponse {
  user_marks: number;
  user_branch: string;
  user_category: string;
  count: number;
  predictions: MarksPredictionRow[]; // sorted DESC by Predicted_Cutoff (toughest first)
}
```

### Chance bucket meaning (marks)

| Bucket   | Condition                                       |
| -------- | ----------------------------------------------- |
| SAFE     | `user_marks - Predicted_Cutoff ≥ 10`            |
| MODERATE | `user_marks - Predicted_Cutoff ≥ 5`             |
| RISKY    | `user_marks - Predicted_Cutoff ≥ -2.5`          |
| —        | otherwise (filtered out)                        |

---

## 4. `POST /suggest-marks`

Marks-based cross-branch suggestions. Returns (college, branch) combos in the requested category whose predicted merit-cutoff is closest to the user's marks.

### Request body

```ts
interface MarksSuggestRequest {
  user_marks: number;      // 0..100
  user_category: Category;
  top_n?: number;          // 1..200, default 20
}
```

### Success response — `200`

```ts
interface MarksSuggestResponse {
  user_marks: number;
  user_category: string;
  count: number;
  suggestions: MarksPredictionRow[]; // sorted by |Predicted_Cutoff - user_marks| asc
}
```

The returned rows additionally include a `Match_Distance` number (absolute marks gap, rounded to 2 dp).

---

## 5. `POST /merit-wise-college`

Paginated list of every (college, branch) row sorted by **highest predicted merit cutoff first** — useful for browsing colleges ranked by toughness. Optional category filter.

### Request body

```ts
interface MeritWiseCollegeRequest {
  user_category?: Category; // optional filter
  page?: number;            // 1-indexed, default 1
  page_size?: number;       // 1..200, default 50
}
```

An empty body is allowed and behaves as `{ page: 1, page_size: 50 }` over all categories.

### Success response — `200`

```ts
interface MeritWiseCollegeResponse {
  user_category?: string;
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  count: number;
  colleges: MarksPredictionRow[];
}
```

---

## Enums

> Submit values exactly as listed (canonical UPPER case). Backend uppercases & trims before comparison, but for type-safe frontends use these constants as the source of truth.

### `Category`

```ts
export const CATEGORIES = [
  'OPEN',
  'EWS',
  'SC',
  'ST',
  'SEBC',
  'TFWS',
  'DEFENSE',
  'ESM',
  'DS',
] as const;
export type Category = (typeof CATEGORIES)[number];
```

### `Branch`

```ts
export const BRANCHES = [
  'AERONAUTICAL ENGINEERING',
  'AGRICULTURAL ENGINEERING',
  'AGRICULTURAL TECHNOLOGY',
  'AIRCRAFT MAINTENANCE ENGINEERING',
  'ARTIFICIAL INTELLIGENCE',
  'ARTIFICIAL INTELLIGENCE (AI) AND MACHINE LEARNING',
  'ARTIFICIAL INTELLIGENCE AND DATA SCIENCE',
  'AUTOMOBILE ENGINEERING',
  'BIOINFORMATICS',
  'BIOMEDICAL ENGINEERING',
  'BIOTECHNOLOGY',
  'CHEMICAL & BIOCHEMICAL ENGINEERING',
  'CHEMICAL & ENVIRONMENTAL ENGINEERING',
  'CHEMICAL ENGINEERING',
  'CHEMICAL ENGINEERING (GREEN TECHNOLOGY AND SUSTAINABILITY ENGINEERING)',
  'CHEMICAL TECHNOLOGY',
  'CIVIL & INFRASTRUCTURE ENGINEERING',
  'CIVIL ENGINEERING',
  'CIVIL ENGINEERING (HONS)',
  'CIVIL IRRIGATION WATER MANAGEMENT',
  'CLIMATE CHANGE',
  'CLOUD TECH &INFORMATION SECURITY',
  'COMPUTER ENGINEERING',
  'COMPUTER ENGINEERING & APPLICATION',
  'COMPUTER ENGINEERING (ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING)',
  'COMPUTER ENGINEERING (ARTIFICIAL INTELLIGENCE)',
  'COMPUTER ENGINEERING (CLOUD TECH. & INFO.SEC.)',
  'COMPUTER ENGINEERING (DATA SCIENCE)',
  'COMPUTER ENGINEERING (MACHINE LEARNING & ARTIFICIAL INTELLIGENCE)',
  'COMPUTER ENGINEERING (SOFTWARE ENGINEERING)',
  'COMPUTER ENGINEERING- GUJARATI',
  'COMPUTER SCIENCE & BIOSCIENCES',
  'COMPUTER SCIENCE & BUSINESS SYSTEMS',
  'COMPUTER SCIENCE & DESIGN',
  'COMPUTER SCIENCE & ENGINEERING',
  'COMPUTER SCIENCE & ENGINEERING (ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING)',
  'COMPUTER SCIENCE & ENGINEERING (ARTIFICIAL INTELLIGENCE)',
  'COMPUTER SCIENCE & ENGINEERING (BIG DATA ANALYTICS)',
  'COMPUTER SCIENCE & ENGINEERING (BLOCK CHAIN TECHNOLOGY)',
  'COMPUTER SCIENCE & ENGINEERING (CLOUD BASED APPLICATIONS)',
  'COMPUTER SCIENCE & ENGINEERING (CLOUD COMPUTING)',
  'COMPUTER SCIENCE & ENGINEERING (CYBER SECURITY)',
  'COMPUTER SCIENCE & ENGINEERING (DATA SCIENCE)',
  'COMPUTER SCIENCE & ENGINEERING (INTERNET OF THINGS & CYBER SECURITY INCLUDING BLOCK CHAIN TECHNOLOGY)',
  'COMPUTER SCIENCE & ENGINEERING (INTERNET OF THINGS)',
  'COMPUTER SCIENCE & ENGINEERING (IOT)',
  'COMPUTER SCIENCE & ENGINEERING (NETWORKS)',
  'COMPUTER SCIENCE & ENGINEERING - M.TECH INTEGRATED',
  'COMPUTER SCIENCE & INFORMATION TECHNOLOGY',
  'COMPUTER SCIENCE & TECHNOLOGY',
  'COMPUTER TECHNOLOGY',
  'CYBER SECURITY',
  'DAIRY TECHNOLOGY',
  'ELECTRICAL AND ELECTRONICS ENGINEERING',
  'ELECTRICAL ENGINEERING',
  'ELECTRONICS & COMMUNICATION (COMMUNICATION SYSTEM ENGG.)',
  'ELECTRONICS & COMMUNICATION ENGINEERING',
  'ELECTRONICS & INSTRUMENTATION ENGINEERING',
  'ELECTRONICS ENGINEERING',
  'ELECTRONICS ENGINEERING (VLSI DESIGN AND TECHNOLOGY)',
  'ENVIRONMENTAL ENGINEERING',
  'ENVIRONMENTAL SCIENCE & TECHNOLOGY',
  'FIRE & SAFETY ENGINEERING',
  'FIRE AND ENVIRONMENT, HEALTH, SAFETY ENGINEERING',
  'FOOD ENGINEERING & TECHNOLOGY',
  'FOOD PROCESSING TECHNOLOGY',
  'FOOD TECHNOLOGY',
  'HONS. IN ICT WITH MINOR IN COMPUTATIONAL SCIENCE (CS)',
  'INFORMATION & COMMUNICATION TECHNOLOGY',
  'INFORMATION TECHNOLOGY',
  'INFORMATION TECHNOLOGY & ENGINEERING',
  'INFORMATION TECHNOLOGY (ARTIFICIAL INTELLIGENCE)',
  'INFORMATION TECHNOLOGY (CYBER SECURITY)',
  'INSTRUMENTATION & CONTROL ENGINEERING',
  'MARINE ENGINEERING',
  'MATHEMATICS AND COMPUTING',
  'MECHANICAL ENGINEERING',
  'MECHANICAL ENGINEERING (CAD & ADV. CNC.)',
  'MECHATRONICS',
  'MECHATRONICS ENGINEERING',
  'METALLURGICAL AND MATERIALS ENGINEERING',
  'METALLURGY',
  'MINING ENGINEERING',
  'NANO TECHNOLOGY',
  'PETROCHEMICAL ENGINEERING',
  'PETROLEUM ENGINEERING',
  'PHARMACEUTICAL ENGINEERING',
  'PLASTIC ENGINEERING',
  'PLASTIC TECHNOLOGY',
  'POWER ELECTRONICS',
  'PRODUCTION ENGINEERING',
  'ROBOTICS & ARTIFICIAL INTELLIGENCE',
  'ROBOTICS AND AUTOMATION',
  'RUBBER TECHNOLOGY',
  'TEXTILE ENGINEERING',
  'TEXTILE PROCESSING',
  'TEXTILE TECHNOLOGY',
  'WATER MANAGEMENT',
] as const;
export type Branch = (typeof BRANCHES)[number];
```

### Branch equivalence groups

The backend treats every member of a group as the same branch when filtering — searching for any one returns matches for **all** of them. Helpful when building dropdowns (e.g. show one combined "Computer Engineering / CSE" option):

```ts
export const BRANCH_EQUIVALENCE_GROUPS: ReadonlyArray<ReadonlyArray<Branch>> = [
  [
    'COMPUTER ENGINEERING',
    'COMPUTER SCIENCE & ENGINEERING',
    'COMPUTER SCIENCE & TECHNOLOGY',
    'COMPUTER TECHNOLOGY',
  ],
  [
    'INFORMATION TECHNOLOGY',
    'INFORMATION & COMMUNICATION TECHNOLOGY',
    'INFORMATION TECHNOLOGY & ENGINEERING',
  ],
  [
    'ELECTRONICS & COMMUNICATION ENGINEERING',
    'ELECTRONICS ENGINEERING',
  ],
];
```

> The canonical source of these enums lives at `admissions-predictoins/college-predictor/branches_enum.ts` — copy from there when the predictor dataset grows.

---

## Error responses

| HTTP | When                                                                 | Body                                                          |
| ---- | -------------------------------------------------------------------- | ------------------------------------------------------------- |
| 400  | Body is not JSON                                                     | `{ "error": "Invalid JSON body" }`                            |
| 400  | Missing/invalid field, unknown board, etc.                           | `{ "error": "<human-readable reason>" }`                      |
| 4xx  | Upstream predictor rejected the request                              | `{ "error": "Upstream rejected request", "details": <body> }` |
| 502  | Upstream predictor Lambda unreachable / 5xx                          | `{ "error": "<Percentile\|College> predictor unavailable" }`  |
| 500  | Unexpected error                                                     | `{ "error": "Internal server error" }`                        |

---

## Frontend usage examples

### fetch (browser)

```ts
async function predictPercentile(marks: { gujcet?: number; cbse?: number; gseb?: number; isce?: number }) {
  const boards = (Object.keys(marks) as Array<keyof typeof marks>).filter((k) => marks[k] != null);
  const payload: Record<string, unknown> = { boards };
  for (const b of boards) payload[`${b}_marks`] = marks[b];

  const res = await fetch(`${API_BASE}/predict-percentile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
  return res.json() as Promise<PercentilePredictResponse>;
}
```

```ts
async function predictColleges(req: CollegePredictRequest) {
  const res = await fetch(`${API_BASE}/predict-college`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
  return res.json() as Promise<CollegePredictResponse>;
}
```

### curl (local serverless-offline)

```bash
curl -X POST http://localhost:4802/dev/predict-percentile \
  -H 'Content-Type: application/json' \
  -d '{"boards":["gujcet","cbse"],"gujcet_marks":95,"cbse_marks":92}'

curl -X POST http://localhost:4802/dev/predict-college \
  -H 'Content-Type: application/json' \
  -d '{"user_rank":8500,"user_branch":"COMPUTER ENGINEERING","user_category":"OPEN","top_n":30}'
```

---

## Operational notes

- All endpoints have a **29 s** Lambda timeout (API Gateway hard ceiling). First request after idle may see ~5–15 s cold start while the ECR-image predictor Lambdas warm up.
- The backend reads upstream URLs from these env vars (set at deploy time):
  - `PERCENTILE_PREDICTOR_URL` — base URL of the percentile predictor Lambda (e.g. `https://<id>.lambda-url.<region>.on.aws`)
  - `COLLEGE_PREDICTOR_URL` — base URL of the college predictor Lambda
  - `MARKS_PREDICTOR_URL` — base URL of the marks predictor Lambda
- If a 502 is returned, check CloudWatch for the predictor Lambda — most likely a cold-start timeout or missing CSV in the image.
