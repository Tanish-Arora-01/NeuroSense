// ──────────────────────────────────────────────
// NeuroSense Backend — Model Info Proxy Routes
// Forwards model metadata/evaluation requests to the ML service.
// Restricted to doctor/admin roles.
// ──────────────────────────────────────────────
const router = require("express").Router();

const ensureAuth = require("../middleware/ensureAuth");
const ensureRole = require("../middleware/ensureRole");
const logger = require("../config/logger");

const ML_SERVICE_BASE =
  process.env.ML_SERVICE_BASE_URL || "http://localhost:8001";
const ML_SERVICE_API_KEY =
  process.env.ML_SERVICE_API_KEY || process.env.SECRET_KEY || "";
const ML_REQUEST_TIMEOUT_MS =
  Number(process.env.ML_REQUEST_TIMEOUT_MS) || 15000;

// Model evaluation is part of the internal admin console.
router.use(ensureAuth, ensureRole("admin"));

// ══════════════════════════════════════════════
//  GET /api/model/info
//  Proxy to ML service /api/model/info
// ══════════════════════════════════════════════
router.get("/info", async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ML_REQUEST_TIMEOUT_MS);

    const response = await fetch(`${ML_SERVICE_BASE}/api/model/info`, {
      method: "GET",
      headers: {
        "x-api-key": ML_SERVICE_API_KEY,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.json(data);
  } catch (err) {
    if (err.name === "AbortError") {
      logger.error({ reqId: req.id }, "Model info request timed out");
      return res.status(504).json({ message: "ML service request timed out." });
    }
    logger.error({ err, reqId: req.id }, "Model info proxy error");
    return res
      .status(502)
      .json({ message: "Failed to fetch model information." });
  }
});

// ══════════════════════════════════════════════
//  GET /api/model/evaluation
//  Proxy to ML service /api/model/evaluation
// ══════════════════════════════════════════════
router.get("/evaluation", async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ML_REQUEST_TIMEOUT_MS);

    const response = await fetch(`${ML_SERVICE_BASE}/api/model/evaluation`, {
      method: "GET",
      headers: {
        "x-api-key": ML_SERVICE_API_KEY,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.json(data);
  } catch (err) {
    if (err.name === "AbortError") {
      logger.error({ reqId: req.id }, "Model evaluation request timed out");
      return res.status(504).json({ message: "ML service request timed out." });
    }
    logger.error({ err, reqId: req.id }, "Model evaluation proxy error");
    return res
      .status(502)
      .json({ message: "Failed to fetch model evaluation." });
  }
});

module.exports = router;
