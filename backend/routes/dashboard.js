const router = require("express").Router();

const ensureAuth = require("../middleware/ensureAuth");
const ensureRole = require("../middleware/ensureRole");
const PredictionResult = require("../models/PredictionResult");
const logger = require("../config/logger");

// ─── Defaults ────────────────────────────────
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const clampInt = (value, min, max, fallback) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

const formatTrendPoint = (result) => {
  const dateValue = result.predictionDate || result.createdAt;
  const isoDate = new Date(dateValue).toISOString();

  return {
    id: String(result._id),
    patientId: result.patientId || "",
    timestamp: new Date(dateValue).getTime(),
    isoDate,
    dateLabel: isoDate.slice(0, 10),
    riskScore: result.riskScore,
    riskPercent: Number((result.riskScore * 100).toFixed(2)),
    riskLevel: result.riskLevel,
    confidence: result.confidence,
    modelVersion: result.modelVersion,
    cognitiveTests: {
      mmseScore: result.cognitiveTests?.mmseScore ?? null,
      cdrScore: result.cognitiveTests?.cdrScore ?? null,
      mocaScore: result.cognitiveTests?.mocaScore ?? null,
    },
  };
};

const ensureApprovedDoctor = (req, res, next) => {
  if (req.user?.role !== "doctor") {
    return res.status(403).json({ message: "Doctor access required." });
  }

  if (req.user.doctorApprovalStatus !== "approved") {
    return res.status(403).json({
      message: "Doctor account is pending admin approval.",
    });
  }

  return next();
};

// ══════════════════════════════════════════════
//  GET /api/dashboard/history
//  Returns paginated, filterable screening history
//  for the currently authenticated user.
//
//  Query params:
//    page   – page number (default 1)
//    limit  – results per page (default 20, max 100)
//    from   – ISO date string, inclusive start
//    to     – ISO date string, inclusive end
//    risk   – filter by risk level (low | moderate | high)
// ══════════════════════════════════════════════
router.get("/history", ensureAuth, async (req, res) => {
  try {
    const page = clampInt(req.query.page, 1, 10000, DEFAULT_PAGE);
    const limit = clampInt(req.query.limit, 1, MAX_LIMIT, DEFAULT_LIMIT);
    const skip = (page - 1) * limit;

    // ── Build filter ──────────────────────────
    const filter = { user: req.user._id };

    if (req.query.from || req.query.to) {
      filter.predictionDate = {};
      if (req.query.from) {
        const fromDate = new Date(req.query.from);
        if (!Number.isNaN(fromDate.getTime())) {
          filter.predictionDate.$gte = fromDate;
        }
      }
      if (req.query.to) {
        const toDate = new Date(req.query.to);
        if (!Number.isNaN(toDate.getTime())) {
          filter.predictionDate.$lte = toDate;
        }
      }
      // Remove empty date filter
      if (Object.keys(filter.predictionDate).length === 0) {
        delete filter.predictionDate;
      }
    }

    if(
      req.query.risk &&
      ["low", "moderate", "high"].includes(req.query.risk.toLowerCase())
    ) {
      filter.riskLevel = req.query.risk.toLowerCase();
    }

    // ── Execute query ─────────────────────────
    const [results, totalResults] = await Promise.all([
      PredictionResult.find(filter)
        .sort({ predictionDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PredictionResult.countDocuments(filter),
    ]);

    const trend = results.map(formatTrendPoint);
    const totalPages = Math.ceil(totalResults / limit);

    return res.json({
      user: {
        id: String(req.user._id),
        name: req.user.name,
      },
      totalResults,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      latest: trend.length > 0 ? trend[0] : null,
      trend,
      chart: {
        labels: trend.map((point) => point.dateLabel),
        datasets: [
          {
            key: "riskScore",
            label: "Dementia Risk Score",
            data: trend.map((point) => point.riskScore),
          },
        ],
      },
    });
  } catch (err) {
    logger.error({ err, reqId: req.id }, "Dashboard history error");
    return res.status(500).json({ message: "Failed to load screening history." });
  }
});

// ══════════════════════════════════════════════
//  GET /api/dashboard/summary
//  Returns aggregate statistics for the current user.
//  Available to all authenticated users.
// ══════════════════════════════════════════════
router.get("/summary", ensureAuth, async (req, res) => {
  try {
    const filter = { user: req.user._id };

    const [totalScreenings, riskDistribution, latestResult] = await Promise.all(
      [
        PredictionResult.countDocuments(filter),
        PredictionResult.aggregate([
          { $match: filter },
          { $group: { _id: "$riskLevel", count: { $sum: 1 } } },
        ]),
        PredictionResult.findOne(filter)
          .sort({ predictionDate: -1, createdAt: -1 })
          .lean(),
      ],
    );

    const distribution = { low: 0, moderate: 0, high: 0 };
    for (const bucket of riskDistribution) {
      if (bucket._id in distribution) {
        distribution[bucket._id] = bucket.count;
      }
    }

    return res.json({
      totalScreenings,
      riskDistribution: distribution,
      latest: latestResult ? formatTrendPoint(latestResult) : null,
    });
  } catch (err) {
    logger.error({ err, reqId: req.id }, "Dashboard summary error");
    return res.status(500).json({ message: "Failed to load dashboard summary." });
  }
});

// ══════════════════════════════════════════════
//  GET /api/dashboard/admin/overview
//  Population-level statistics. Restricted to doctor/admin roles.
// ══════════════════════════════════════════════
router.get(
  "/admin/overview",
  ensureAuth,
  ensureRole("admin"),
  async (req, res) => {
    try {
      const [totalScreenings, totalUsers, riskDistribution, recentScreenings] =
        await Promise.all([
          PredictionResult.countDocuments(),
          PredictionResult.distinct("user").then((ids) => ids.length),
          PredictionResult.aggregate([
            { $group: { _id: "$riskLevel", count: { $sum: 1 } } },
          ]),
          PredictionResult.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .lean()
            .then((results) => results.map(formatTrendPoint)),
        ]);

      const distribution = { low: 0, moderate: 0, high: 0 };
      for (const bucket of riskDistribution) {
        if (bucket._id in distribution) {
          distribution[bucket._id] = bucket.count;
        }
      }

      return res.json({
        totalScreenings,
        totalUsers,
        riskDistribution: distribution,
        recentScreenings,
      });
    } catch (err) {
      logger.error({ err, reqId: req.id }, "Admin overview error");
      return res
        .status(500)
        .json({ message: "Failed to load admin overview." });
    }
  },
);

router.get(
  "/doctor/patients",
  ensureAuth,
  ensureApprovedDoctor,
  async (req, res) => {
    try {
      const page = clampInt(req.query.page, 1, 10000, DEFAULT_PAGE);
      const limit = clampInt(req.query.limit, 1, MAX_LIMIT, DEFAULT_LIMIT);
      const skip = (page - 1) * limit;

      const filter = { doctorRef: req.user._id };

      if (req.query.from || req.query.to) {
        filter.predictionDate = {};
        if (req.query.from) {
          const fromDate = new Date(req.query.from);
          if (!Number.isNaN(fromDate.getTime())) {
            filter.predictionDate.$gte = fromDate;
          }
        }
        if (req.query.to) {
          const toDate = new Date(req.query.to);
          if (!Number.isNaN(toDate.getTime())) {
            filter.predictionDate.$lte = toDate;
          }
        }
        if (Object.keys(filter.predictionDate).length === 0) {
          delete filter.predictionDate;
        }
      }

      if (
        req.query.risk &&
        ["low", "moderate", "high"].includes(req.query.risk.toLowerCase())
      ) {
        filter.riskLevel = req.query.risk.toLowerCase();
      }

      const [results, totalResults] = await Promise.all([
        PredictionResult.find(filter)
          .populate("user", "name email phone")
          .sort({ predictionDate: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        PredictionResult.countDocuments(filter),
      ]);

      const records = results.map((result) => ({
        ...formatTrendPoint(result),
        patient: result.user
          ? {
              id: String(result.user._id),
              name: result.user.name,
              email: result.user.email,
              phone: result.user.phone,
            }
          : null,
      }));

      const totalPages = Math.ceil(totalResults / limit);

      return res.json({
        doctor: {
          id: String(req.user._id),
          name: req.user.name,
        },
        totalResults,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        latest: records.length > 0 ? records[0] : null,
        trend: records,
        chart: {
          labels: records.map((point) => point.dateLabel),
          datasets: [
            {
              key: "riskScore",
              label: "Assigned Patient Risk Score",
              data: records.map((point) => point.riskScore),
            },
          ],
        },
      });
    } catch (err) {
      logger.error({ err, reqId: req.id }, "Doctor patient records error");
      return res
        .status(500)
        .json({ message: "Failed to load assigned patient records." });
    }
  },
);

// ══════════════════════════════════════════════
//  GET /api/dashboard/decline
//  Cognitive decline rate analysis for the
//  currently authenticated user.
//  Requires >= 2 screenings to compute trend.
// ══════════════════════════════════════════════
router.get("/decline", ensureAuth, async (req, res) => {
  try {
    const results = await PredictionResult.find({ user: req.user._id })
      .sort({ predictionDate: 1 })
      .select("riskScore predictionDate cognitiveTests")
      .lean();

    if (results.length < 2) {
      return res.json({
        status: "insufficient_data",
        message:
          "At least 2 screenings are needed to calculate cognitive trends.",
        totalScreenings: results.length,
      });
    }

    // ── Simple linear regression on risk score vs. time ──
    const points = results.map((r) => ({
      t: new Date(r.predictionDate).getTime(),
      risk: r.riskScore,
      mmse: r.cognitiveTests?.mmseScore ?? null,
      cdr: r.cognitiveTests?.cdrScore ?? null,
      moca: r.cognitiveTests?.mocaScore ?? null,
    }));

    const first = points[0];
    const last = points[points.length - 1];

    const slope = linearRegressionSlope(
      points.map((p) => p.t),
      points.map((p) => p.risk),
    );

    // Normalize slope to monthly change rate
    const msPerMonth = 30.44 * 24 * 60 * 60 * 1000;
    const monthlyChangeRate = slope * msPerMonth;

    // Classify trend
    let trend;
    if (monthlyChangeRate < -0.01) {
      trend = "improving";
    } else if (monthlyChangeRate > 0.01) {
      trend = "declining";
    } else {
      trend = "stable";
    }

    const percentChange =
      first.risk > 0
        ? Number((((last.risk - first.risk) / first.risk) * 100).toFixed(2))
        : 0;

    // ── Cognitive sub-score trends ──
    const cognitiveSlopes = {};
    for (const key of ["mmse", "cdr", "moca"]) {
      const validPoints = points.filter((p) => p[key] !== null);
      if (validPoints.length >= 2) {
        const s = linearRegressionSlope(
          validPoints.map((p) => p.t),
          validPoints.map((p) => p[key]),
        );
        cognitiveSlopes[key] = {
          monthlyChange: Number((s * msPerMonth).toFixed(4)),
          firstValue: validPoints[0][key],
          lastValue: validPoints[validPoints.length - 1][key],
        };
      }
    }

    return res.json({
      status: "ok",
      trend,
      totalScreenings: results.length,
      monthlyChangeRate: Number(monthlyChangeRate.toFixed(4)),
      percentChange,
      firstScreening: {
        date: first.t,
        riskScore: first.risk,
      },
      lastScreening: {
        date: last.t,
        riskScore: last.risk,
      },
      cognitiveSlopes,
    });
  } catch (err) {
    logger.error({ err, reqId: req.id }, "Decline analysis error");
    return res
      .status(500)
      .json({ message: "Failed to compute decline analysis." });
  }
});

/**
 * Simple linear regression slope: Σ((xi - x̄)(yi - ȳ)) / Σ((xi - x̄)²)
 */
function linearRegressionSlope(xs, ys) {
  const n = xs.length;
  if (n < 2) return 0;

  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - xMean;
    numerator += dx * (ys[i] - yMean);
    denominator += dx * dx;
  }

  return denominator === 0 ? 0 : numerator / denominator;
}

module.exports = router;
