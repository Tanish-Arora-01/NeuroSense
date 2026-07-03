// ──────────────────────────────────────────────
// NeuroSense Backend — Analytics Aggregation API
// Population-level insights for doctor/admin roles
// ──────────────────────────────────────────────
const router = require("express").Router();

const ensureAuth = require("../middleware/ensureAuth");
const ensureRole = require("../middleware/ensureRole");
const PredictionResult = require("../models/PredictionResult");
const logger = require("../config/logger");

// Population analytics are restricted to internal admins.
router.use(ensureAuth, ensureRole("admin"));

// ══════════════════════════════════════════════
//  GET /api/analytics/overview
//  Combined summary: totals, averages, high-risk %
// ══════════════════════════════════════════════
router.get("/overview", async (req, res) => {
  try {
    const [stats] = await PredictionResult.aggregate([
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalScreenings: { $sum: 1 },
                avgRiskScore: { $avg: "$riskScore" },
                minRiskScore: { $min: "$riskScore" },
                maxRiskScore: { $max: "$riskScore" },
              },
            },
          ],
          uniqueUsers: [
            { $group: { _id: "$user" } },
            { $count: "count" },
          ],
          highRisk: [
            { $match: { riskLevel: "high" } },
            { $count: "count" },
          ],
        },
      },
    ]);

    const totals = stats.totals[0] || {
      totalScreenings: 0,
      avgRiskScore: 0,
      minRiskScore: 0,
      maxRiskScore: 0,
    };

    const totalUsers = stats.uniqueUsers[0]?.count || 0;
    const highRiskCount = stats.highRisk[0]?.count || 0;
    const highRiskPercentage =
      totals.totalScreenings > 0
        ? Number(((highRiskCount / totals.totalScreenings) * 100).toFixed(2))
        : 0;

    return res.json({
      totalScreenings: totals.totalScreenings,
      totalUsers,
      avgRiskScore: Number((totals.avgRiskScore || 0).toFixed(4)),
      minRiskScore: Number((totals.minRiskScore || 0).toFixed(4)),
      maxRiskScore: Number((totals.maxRiskScore || 0).toFixed(4)),
      highRiskCount,
      highRiskPercentage,
    });
  } catch (err) {
    logger.error({ err, reqId: req.id }, "Analytics overview error");
    return res.status(500).json({ message: "Failed to fetch analytics overview." });
  }
});

// ══════════════════════════════════════════════
//  GET /api/analytics/risk-distribution
//  Histogram of risk scores across all patients
// ══════════════════════════════════════════════
router.get("/risk-distribution", async (req, res) => {
  try {
    // Bucket by risk level
    const byLevel = await PredictionResult.aggregate([
      {
        $group: {
          _id: "$riskLevel",
          count: { $sum: 1 },
          avgScore: { $avg: "$riskScore" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Histogram: 10 buckets from 0.0 to 1.0
    const histogram = await PredictionResult.aggregate([
      {
        $bucket: {
          groupBy: "$riskScore",
          boundaries: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.01],
          default: "other",
          output: {
            count: { $sum: 1 },
          },
        },
      },
    ]);

    const distribution = { low: 0, moderate: 0, high: 0 };
    const avgScores = { low: 0, moderate: 0, high: 0 };
    for (const bucket of byLevel) {
      if (bucket._id in distribution) {
        distribution[bucket._id] = bucket.count;
        avgScores[bucket._id] = Number((bucket.avgScore || 0).toFixed(4));
      }
    }

    // Map histogram to chart-ready format
    const histogramData = histogram
      .filter((b) => b._id !== "other")
      .map((b) => ({
        rangeStart: b._id,
        rangeEnd: Number((b._id + 0.1).toFixed(1)),
        label: `${(b._id * 100).toFixed(0)}–${((b._id + 0.1) * 100).toFixed(0)}%`,
        count: b.count,
      }));

    return res.json({
      byLevel: distribution,
      avgScores,
      histogram: histogramData,
    });
  } catch (err) {
    logger.error({ err, reqId: req.id }, "Analytics risk-distribution error");
    return res
      .status(500)
      .json({ message: "Failed to fetch risk distribution." });
  }
});

// ══════════════════════════════════════════════
//  GET /api/analytics/volume
//  Screening counts grouped by day/week/month
//  Query: ?granularity=day|week|month (default: day)
//         ?from=ISO_DATE  &to=ISO_DATE
// ══════════════════════════════════════════════
router.get("/volume", async (req, res) => {
  try {
    const granularity = ["day", "week", "month"].includes(req.query.granularity)
      ? req.query.granularity
      : "day";

    // Date filter
    const matchStage = {};
    if (req.query.from || req.query.to) {
      matchStage.predictionDate = {};
      if (req.query.from) {
        const fromDate = new Date(req.query.from);
        if (!Number.isNaN(fromDate.getTime())) {
          matchStage.predictionDate.$gte = fromDate;
        }
      }
      if (req.query.to) {
        const toDate = new Date(req.query.to);
        if (!Number.isNaN(toDate.getTime())) {
          matchStage.predictionDate.$lte = toDate;
        }
      }
      if (Object.keys(matchStage.predictionDate).length === 0) {
        delete matchStage.predictionDate;
      }
    }

    // Date grouping expression
    const dateGroupExpression = {
      day: {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$predictionDate",
        },
      },
      week: {
        $dateToString: {
          format: "%Y-W%V",
          date: "$predictionDate",
        },
      },
      month: {
        $dateToString: {
          format: "%Y-%m",
          date: "$predictionDate",
        },
      },
    };

    const pipeline = [];
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    pipeline.push(
      {
        $group: {
          _id: dateGroupExpression[granularity],
          count: { $sum: 1 },
          avgRiskScore: { $avg: "$riskScore" },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 365 },
    );

    const volumeData = await PredictionResult.aggregate(pipeline);

    return res.json({
      granularity,
      data: volumeData.map((item) => ({
        period: item._id,
        count: item.count,
        avgRiskScore: Number((item.avgRiskScore || 0).toFixed(4)),
      })),
    });
  } catch (err) {
    logger.error({ err, reqId: req.id }, "Analytics volume error");
    return res
      .status(500)
      .json({ message: "Failed to fetch screening volume." });
  }
});

// ══════════════════════════════════════════════
//  GET /api/analytics/cognitive-trends
//  Average cognitive scores (MMSE, CDR, MoCA)
//  over time, grouped by month
// ══════════════════════════════════════════════
router.get("/cognitive-trends", async (req, res) => {
  try {
    const trends = await PredictionResult.aggregate([
      {
        $match: {
          "cognitiveTests.mmseScore": { $ne: null },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m",
              date: "$predictionDate",
            },
          },
          avgMmse: { $avg: "$cognitiveTests.mmseScore" },
          avgCdr: { $avg: "$cognitiveTests.cdrScore" },
          avgMoca: { $avg: "$cognitiveTests.mocaScore" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 120 },
    ]);

    return res.json({
      data: trends.map((item) => ({
        period: item._id,
        avgMmse: item.avgMmse !== null ? Number(item.avgMmse.toFixed(2)) : null,
        avgCdr: item.avgCdr !== null ? Number(item.avgCdr.toFixed(2)) : null,
        avgMoca: item.avgMoca !== null ? Number(item.avgMoca.toFixed(2)) : null,
        sampleSize: item.count,
      })),
    });
  } catch (err) {
    logger.error({ err, reqId: req.id }, "Analytics cognitive-trends error");
    return res
      .status(500)
      .json({ message: "Failed to fetch cognitive trends." });
  }
});

// ══════════════════════════════════════════════
//  GET /api/analytics/decline-summary
//  Population-level cognitive decline analysis.
//  Counts patients as improving / stable / declining.
// ══════════════════════════════════════════════
router.get("/decline-summary", async (req, res) => {
  try {
    // Get all users who have 2+ screenings
    const usersWithMultiple = await PredictionResult.aggregate([
      { $group: { _id: "$user", count: { $sum: 1 } } },
      { $match: { count: { $gte: 2 } } },
    ]);

    if (usersWithMultiple.length === 0) {
      return res.json({
        totalPatientsAnalyzed: 0,
        improving: 0,
        stable: 0,
        declining: 0,
        avgMonthlyChangeRate: 0,
      });
    }

    const userIds = usersWithMultiple.map((u) => u._id);

    // Fetch all results for these users, sorted by date
    const allResults = await PredictionResult.find({ user: { $in: userIds } })
      .sort({ user: 1, predictionDate: 1 })
      .select("user riskScore predictionDate")
      .lean();

    // Group by user
    const byUser = {};
    for (const r of allResults) {
      const uid = String(r.user);
      if (!byUser[uid]) byUser[uid] = [];
      byUser[uid].push({
        t: new Date(r.predictionDate).getTime(),
        risk: r.riskScore,
      });
    }

    const msPerMonth = 30.44 * 24 * 60 * 60 * 1000;
    let improving = 0;
    let stable = 0;
    let declining = 0;
    let totalRate = 0;

    for (const points of Object.values(byUser)) {
      if (points.length < 2) continue;

      const slope = linearRegressionSlope(
        points.map((p) => p.t),
        points.map((p) => p.risk),
      );
      const monthlyRate = slope * msPerMonth;
      totalRate += monthlyRate;

      if (monthlyRate < -0.01) improving++;
      else if (monthlyRate > 0.01) declining++;
      else stable++;
    }

    const analyzed = improving + stable + declining;

    return res.json({
      totalPatientsAnalyzed: analyzed,
      improving,
      stable,
      declining,
      avgMonthlyChangeRate:
        analyzed > 0 ? Number((totalRate / analyzed).toFixed(4)) : 0,
    });
  } catch (err) {
    logger.error({ err, reqId: req.id }, "Analytics decline-summary error");
    return res
      .status(500)
      .json({ message: "Failed to fetch decline summary." });
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
