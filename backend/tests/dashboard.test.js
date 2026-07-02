const express = require("express");
const request = require("supertest");

jest.mock("../middleware/ensureAuth", () => (req, _res, next) => {
  req.user = {
    _id: "507f1f77bcf86cd799439011",
    name: "Test User",
    role: req.headers["x-test-role"] || "patient",
  };
  next();
});

jest.mock("../models/PredictionResult", () => {
  const mockModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    distinct: jest.fn(),
    aggregate: jest.fn(),
  };
  return mockModel;
});

const PredictionResult = require("../models/PredictionResult");
const dashboardRouter = require("../routes/dashboard");

const HISTORY_ENDPOINT = "/api/dashboard/history";
const SUMMARY_ENDPOINT = "/api/dashboard/summary";
const ADMIN_ENDPOINT = "/api/dashboard/admin/overview";

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/dashboard", dashboardRouter);
  return app;
};

// ─── Helpers ─────────────────────────────────

const mockFind = (results) => {
  const chainable = {};
  chainable.sort = jest.fn().mockReturnValue(chainable);
  chainable.skip = jest.fn().mockReturnValue(chainable);
  chainable.limit = jest.fn().mockReturnValue(chainable);
  chainable.lean = jest.fn().mockResolvedValue(results);
  PredictionResult.find.mockReturnValue(chainable);
  return chainable;
};

const mockFindOne = (result) => {
  const chainable = {};
  chainable.sort = jest.fn().mockReturnValue(chainable);
  chainable.lean = jest.fn().mockResolvedValue(result);
  PredictionResult.findOne.mockReturnValue(chainable);
  return chainable;
};

const SAMPLE_RESULT = {
  _id: "pred-001",
  patientId: "patient-001",
  riskScore: 0.72,
  riskLevel: "high",
  confidence: 0.88,
  modelVersion: "1.0.0",
  predictionDate: new Date("2026-04-05T10:00:00Z"),
  createdAt: new Date("2026-04-05T10:00:00Z"),
  cognitiveTests: {
    mmseScore: 22,
    cdrScore: 1,
    mocaScore: 18,
  },
};

describe("GET /api/dashboard/history", () => {
  let app;

  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();
  });

  it("returns paginated history with default params", async () => {
    mockFind([SAMPLE_RESULT]);
    PredictionResult.countDocuments.mockResolvedValue(1);

    const response = await request(app).get(HISTORY_ENDPOINT);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("page", 1);
    expect(response.body).toHaveProperty("limit", 20);
    expect(response.body).toHaveProperty("totalResults", 1);
    expect(response.body).toHaveProperty("totalPages", 1);
    expect(response.body).toHaveProperty("hasNextPage", false);
    expect(response.body).toHaveProperty("hasPrevPage", false);
    expect(response.body.trend).toHaveLength(1);
    expect(response.body.trend[0]).toMatchObject({
      id: "pred-001",
      patientId: "patient-001",
      riskScore: 0.72,
      riskLevel: "high",
    });
  });

  it("accepts page and limit query params", async () => {
    mockFind([]);
    PredictionResult.countDocuments.mockResolvedValue(50);

    const response = await request(app)
      .get(HISTORY_ENDPOINT)
      .query({ page: 3, limit: 10 });

    expect(response.status).toBe(200);
    expect(response.body.page).toBe(3);
    expect(response.body.limit).toBe(10);
    expect(response.body.totalPages).toBe(5);
    expect(response.body.hasNextPage).toBe(true);
    expect(response.body.hasPrevPage).toBe(true);
  });

  it("clamps limit to maximum of 100", async () => {
    mockFind([]);
    PredictionResult.countDocuments.mockResolvedValue(0);

    const response = await request(app)
      .get(HISTORY_ENDPOINT)
      .query({ limit: 500 });

    expect(response.status).toBe(200);
    expect(response.body.limit).toBe(100);
  });

  it("filters by risk level", async () => {
    mockFind([]);
    PredictionResult.countDocuments.mockResolvedValue(0);

    const response = await request(app)
      .get(HISTORY_ENDPOINT)
      .query({ risk: "high" });

    expect(response.status).toBe(200);
    // Verify the filter was applied (via the mock chain)
    const findCall = PredictionResult.find.mock.calls[0][0];
    expect(findCall).toHaveProperty("riskLevel", "high");
  });

  it("returns empty trend for users with no results", async () => {
    mockFind([]);
    PredictionResult.countDocuments.mockResolvedValue(0);

    const response = await request(app).get(HISTORY_ENDPOINT);

    expect(response.status).toBe(200);
    expect(response.body.totalResults).toBe(0);
    expect(response.body.trend).toHaveLength(0);
    expect(response.body.latest).toBeNull();
  });
});

describe("GET /api/dashboard/summary", () => {
  let app;

  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();
  });

  it("returns aggregate summary for authenticated user", async () => {
    PredictionResult.countDocuments.mockResolvedValue(5);
    PredictionResult.aggregate.mockResolvedValue([
      { _id: "low", count: 2 },
      { _id: "high", count: 3 },
    ]);
    mockFindOne(SAMPLE_RESULT);

    const response = await request(app).get(SUMMARY_ENDPOINT);

    expect(response.status).toBe(200);
    expect(response.body.totalScreenings).toBe(5);
    expect(response.body.riskDistribution).toEqual({
      low: 2,
      moderate: 0,
      high: 3,
    });
    expect(response.body.latest).toBeTruthy();
    expect(response.body.latest.riskScore).toBe(0.72);
  });
});

describe("GET /api/dashboard/admin/overview", () => {
  let app;

  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();
  });

  it("returns 403 for patient role", async () => {
    const response = await request(app)
      .get(ADMIN_ENDPOINT)
      .set("x-test-role", "patient");

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/insufficient permissions/i);
  });

  it("returns 403 for caregiver role", async () => {
    const response = await request(app)
      .get(ADMIN_ENDPOINT)
      .set("x-test-role", "caregiver");

    expect(response.status).toBe(403);
  });

  it("returns overview for doctor role", async () => {
    PredictionResult.countDocuments.mockResolvedValue(100);
    PredictionResult.distinct.mockResolvedValue([
      "user1",
      "user2",
      "user3",
    ]);
    PredictionResult.aggregate.mockResolvedValue([
      { _id: "low", count: 40 },
      { _id: "moderate", count: 35 },
      { _id: "high", count: 25 },
    ]);

    const findChain = {};
    findChain.sort = jest.fn().mockReturnValue(findChain);
    findChain.limit = jest.fn().mockReturnValue(findChain);
    findChain.lean = jest.fn().mockReturnValue(findChain);
    findChain.then = jest.fn((fn) => Promise.resolve(fn([SAMPLE_RESULT])));
    // Use a fresh chain for the find() call so `.then()` works
    PredictionResult.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            then: (fn) => Promise.resolve(fn([SAMPLE_RESULT])),
          }),
        }),
      }),
    });

    const response = await request(app)
      .get(ADMIN_ENDPOINT)
      .set("x-test-role", "doctor");

    expect(response.status).toBe(200);
    expect(response.body.totalScreenings).toBe(100);
    expect(response.body.totalUsers).toBe(3);
    expect(response.body.riskDistribution).toEqual({
      low: 40,
      moderate: 35,
      high: 25,
    });
  });

  it("returns overview for admin role", async () => {
    PredictionResult.countDocuments.mockResolvedValue(0);
    PredictionResult.distinct.mockResolvedValue([]);
    PredictionResult.aggregate.mockResolvedValue([]);
    PredictionResult.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            then: (fn) => Promise.resolve(fn([])),
          }),
        }),
      }),
    });

    const response = await request(app)
      .get(ADMIN_ENDPOINT)
      .set("x-test-role", "admin");

    expect(response.status).toBe(200);
    expect(response.body.totalScreenings).toBe(0);
  });
});
