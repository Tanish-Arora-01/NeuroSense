// ──────────────────────────────────────────────
// Tests for /api/analytics/* endpoints
// ──────────────────────────────────────────────

const express = require("express");
const request = require("supertest");

// ── Mock auth middleware ───────────────────────
jest.mock("../middleware/ensureAuth", () => (req, _res, next) => {
  req.user = req._testUser || {
    _id: "mock-user-id",
    name: "Test Admin",
    role: "admin",
  };
  next();
});

jest.mock("../middleware/ensureRole", () => {
  return (...roles) => (req, res, next) => {
    const userRole = req.user?.role || "patient";
    if (!roles.includes(userRole)) {
      return res.status(403).json({ message: "Insufficient permissions." });
    }
    next();
  };
});

// ── Mock PredictionResult ─────────────────────
const mockAggregate = jest.fn();
jest.mock("../models/PredictionResult", () => ({
  aggregate: mockAggregate,
}));

const analyticsRouter = require("../routes/analytics");

function createApp(user) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (user) req._testUser = user;
    next();
  });
  app.use("/api/analytics", analyticsRouter);
  return app;
}

// ══════════════════════════════════════════════
//  RBAC enforcement
// ══════════════════════════════════════════════
describe("Analytics RBAC", () => {
  const patientApp = createApp({
    _id: "patient-id",
    name: "Test Patient",
    role: "patient",
  });

  const endpoints = [
    "/api/analytics/overview",
    "/api/analytics/risk-distribution",
    "/api/analytics/volume",
    "/api/analytics/cognitive-trends",
  ];

  endpoints.forEach((endpoint) => {
    it(`rejects patient role on ${endpoint}`, async () => {
      const res = await request(patientApp).get(endpoint);
      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Insufficient permissions.");
    });
  });
});

// ══════════════════════════════════════════════
//  GET /api/analytics/overview
// ══════════════════════════════════════════════
describe("GET /api/analytics/overview", () => {
  const app = createApp({
    _id: "admin-id",
    name: "Admin Test",
    role: "admin",
  });

  beforeEach(() => mockAggregate.mockReset());

  it("returns aggregated overview stats", async () => {
    mockAggregate.mockResolvedValue([
      {
        totals: [
          {
            totalScreenings: 100,
            avgRiskScore: 0.45,
            minRiskScore: 0.05,
            maxRiskScore: 0.95,
          },
        ],
        uniqueUsers: [{ count: 25 }],
        highRisk: [{ count: 30 }],
      },
    ]);

    const res = await request(app).get("/api/analytics/overview");
    expect(res.status).toBe(200);
    expect(res.body.totalScreenings).toBe(100);
    expect(res.body.totalUsers).toBe(25);
    expect(res.body.highRiskCount).toBe(30);
    expect(res.body.highRiskPercentage).toBe(30);
    expect(res.body.avgRiskScore).toBe(0.45);
  });

  it("handles empty database", async () => {
    mockAggregate.mockResolvedValue([
      {
        totals: [],
        uniqueUsers: [],
        highRisk: [],
      },
    ]);

    const res = await request(app).get("/api/analytics/overview");
    expect(res.status).toBe(200);
    expect(res.body.totalScreenings).toBe(0);
    expect(res.body.totalUsers).toBe(0);
    expect(res.body.highRiskPercentage).toBe(0);
  });

  it("handles aggregation errors", async () => {
    mockAggregate.mockRejectedValue(new Error("DB error"));

    const res = await request(app).get("/api/analytics/overview");
    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Failed to fetch analytics overview.");
  });
});

// ══════════════════════════════════════════════
//  GET /api/analytics/risk-distribution
// ══════════════════════════════════════════════
describe("GET /api/analytics/risk-distribution", () => {
  const app = createApp({
    _id: "admin-id",
    name: "Admin User",
    role: "admin",
  });

  beforeEach(() => mockAggregate.mockReset());

  it("returns risk distribution with histogram", async () => {
    // First call: byLevel aggregation
    mockAggregate
      .mockResolvedValueOnce([
        { _id: "low", count: 40, avgScore: 0.15 },
        { _id: "moderate", count: 35, avgScore: 0.5 },
        { _id: "high", count: 25, avgScore: 0.85 },
      ])
      // Second call: histogram aggregation
      .mockResolvedValueOnce([
        { _id: 0, count: 10 },
        { _id: 0.1, count: 15 },
        { _id: 0.2, count: 15 },
        { _id: 0.3, count: 10 },
        { _id: 0.4, count: 12 },
        { _id: 0.5, count: 13 },
        { _id: 0.6, count: 8 },
        { _id: 0.7, count: 7 },
        { _id: 0.8, count: 6 },
        { _id: 0.9, count: 4 },
      ]);

    const res = await request(app).get("/api/analytics/risk-distribution");
    expect(res.status).toBe(200);
    expect(res.body.byLevel).toEqual({ low: 40, moderate: 35, high: 25 });
    expect(res.body.histogram).toBeInstanceOf(Array);
    expect(res.body.histogram.length).toBe(10);
    expect(res.body.histogram[0]).toHaveProperty("rangeStart");
    expect(res.body.histogram[0]).toHaveProperty("count");
  });
});

// ══════════════════════════════════════════════
//  GET /api/analytics/volume
// ══════════════════════════════════════════════
describe("GET /api/analytics/volume", () => {
  const app = createApp({
    _id: "admin-id",
    name: "Admin Test",
    role: "admin",
  });

  beforeEach(() => mockAggregate.mockReset());

  it("returns daily volume by default", async () => {
    mockAggregate.mockResolvedValue([
      { _id: "2026-06-28", count: 5, avgRiskScore: 0.4 },
      { _id: "2026-06-29", count: 8, avgRiskScore: 0.55 },
    ]);

    const res = await request(app).get("/api/analytics/volume");
    expect(res.status).toBe(200);
    expect(res.body.granularity).toBe("day");
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toEqual({
      period: "2026-06-28",
      count: 5,
      avgRiskScore: 0.4,
    });
  });

  it("accepts granularity query param", async () => {
    mockAggregate.mockResolvedValue([
      { _id: "2026-06", count: 50, avgRiskScore: 0.42 },
    ]);

    const res = await request(app).get("/api/analytics/volume?granularity=month");
    expect(res.status).toBe(200);
    expect(res.body.granularity).toBe("month");
  });

  it("defaults invalid granularity to day", async () => {
    mockAggregate.mockResolvedValue([]);

    const res = await request(app).get("/api/analytics/volume?granularity=invalid");
    expect(res.status).toBe(200);
    expect(res.body.granularity).toBe("day");
  });
});

// ══════════════════════════════════════════════
//  GET /api/analytics/cognitive-trends
// ══════════════════════════════════════════════
describe("GET /api/analytics/cognitive-trends", () => {
  const app = createApp({
    _id: "admin-id",
    name: "Admin Test",
    role: "admin",
  });

  beforeEach(() => mockAggregate.mockReset());

  it("returns cognitive score trends", async () => {
    mockAggregate.mockResolvedValue([
      { _id: "2026-05", avgMmse: 24.5, avgCdr: 0.8, avgMoca: 22.1, count: 30 },
      { _id: "2026-06", avgMmse: 23.8, avgCdr: 1.0, avgMoca: 21.5, count: 45 },
    ]);

    const res = await request(app).get("/api/analytics/cognitive-trends");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toEqual({
      period: "2026-05",
      avgMmse: 24.5,
      avgCdr: 0.8,
      avgMoca: 22.1,
      sampleSize: 30,
    });
  });

  it("handles empty cognitive data", async () => {
    mockAggregate.mockResolvedValue([]);

    const res = await request(app).get("/api/analytics/cognitive-trends");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
