import express from "express";

import { admissionsDeadline } from "./handlers/admissions-deadline-handler.js";
import {
  admissionsAuCalendar,
  admissionsAuUgFees,
} from "./handlers/au/admissions-handler.js";
import { placementsBvmPlacementDetails } from "./handlers/bvm/placement-handler.js";
import { admissionsDaiictSection } from "./handlers/daiict/admissions-handler.js";
import { admissionsDduBtechCategory } from "./handlers/ddu/admissions-handler.js";
import { admissionsGcetDetails } from "./handlers/gcet/admissions-handler.js";
import { hello } from "./handlers/httpHandler.js";
import { admissionsLdceUgPrograms } from "./handlers/ldce/admissions-handler.js";
import { admissionsNirmaBtechSection } from "./handlers/nirma/admissions-handler.js";
import {
  placementsNirmaBtechStatistics,
  placementsNirmaReports,
} from "./handlers/nirma/placement-handler.js";
import {
  admissionsPdeuAllIndia,
  admissionsPdeuPrograms,
} from "./handlers/pdeu/admissions-handler.js";
import {
  meritWiseCollegeHandler,
  predictMarksHandler,
  suggestMarksHandler,
} from "./handlers/predictor/marks-predictor-handler.js";
import {
  predictCollegeHandler,
  predictPercentileHandler,
} from "./handlers/predictor/predictor-handler.js";
import { lambdaToExpress } from "./lib/lambda-express-adapter.js";

const app = express();

// Body parsing: use `text` so handlers can JSON.parse themselves
// (they expect APIGatewayProxyEvent.body as a string).
app.use(express.text({ type: "*/*", limit: "1mb" }));

// Health check for AWS Lambda Web Adapter readiness probe.
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// GET routes
app.get("/hello", lambdaToExpress(hello));
app.get("/admissions-deadline", lambdaToExpress(admissionsDeadline));
app.get("/admissions/pdeu/all_india", lambdaToExpress(admissionsPdeuAllIndia));
app.get("/admissions/pdeu/programs", lambdaToExpress(admissionsPdeuPrograms));
app.get(
  "/admissions/nirma/btech/:section",
  lambdaToExpress(admissionsNirmaBtechSection),
);
app.get(
  "/placements/bvm/placement-details",
  lambdaToExpress(placementsBvmPlacementDetails),
);
app.get("/placements/nirma/reports", lambdaToExpress(placementsNirmaReports));
app.get(
  "/placements/nirma/btech-statistics",
  lambdaToExpress(placementsNirmaBtechStatistics),
);
app.get("/admissions/au/calendar", lambdaToExpress(admissionsAuCalendar));
app.get("/admissions/au/ug-fees", lambdaToExpress(admissionsAuUgFees));
app.get(
  "/admissions/daiict/:category/:section",
  lambdaToExpress(admissionsDaiictSection),
);
app.get(
  "/admissions/ldce/ug-programs",
  lambdaToExpress(admissionsLdceUgPrograms),
);
app.get("/admissions/gcet/details", lambdaToExpress(admissionsGcetDetails));
app.get(
  "/admissions/ddu/btech/:category",
  lambdaToExpress(admissionsDduBtechCategory),
);

// POST routes (predictor proxy endpoints)
app.post("/predict-percentile", lambdaToExpress(predictPercentileHandler));
app.post("/predict-college", lambdaToExpress(predictCollegeHandler));
app.post("/predict-marks", lambdaToExpress(predictMarksHandler));
app.post("/suggest-marks", lambdaToExpress(suggestMarksHandler));
app.post("/merit-wise-college", lambdaToExpress(meritWiseCollegeHandler));

// 404 + error handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  },
);

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => {
  console.log(`admissions-backend-apis listening on :${port}`);
});

export default app;
