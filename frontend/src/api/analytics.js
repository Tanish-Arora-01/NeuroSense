// ──────────────────────────────────────────────
// Frontend API client — Analytics endpoints
// Population-level insights (doctor/admin only)
// ──────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function parseResponse(response) {
  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      (typeof payload === "object" && payload?.message) ||
      (typeof payload === "string" && payload) ||
      `Request failed (${response.status})`;

    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

/**
 * GET /api/analytics/overview
 */
export async function getAnalyticsOverview() {
  const response = await fetch(`${API_BASE}/api/analytics/overview`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return parseResponse(response);
}

/**
 * GET /api/analytics/risk-distribution
 */
export async function getRiskDistribution() {
  const response = await fetch(`${API_BASE}/api/analytics/risk-distribution`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return parseResponse(response);
}

/**
 * GET /api/analytics/volume
 * @param {Object} params
 * @param {string} [params.granularity] "day"|"week"|"month"
 * @param {string} [params.from] ISO date
 * @param {string} [params.to]   ISO date
 */
export async function getScreeningVolume(params = {}) {
  const query = new URLSearchParams();
  if (params.granularity) query.set("granularity", params.granularity);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);

  const qs = query.toString();
  const url = `${API_BASE}/api/analytics/volume${qs ? `?${qs}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return parseResponse(response);
}

/**
 * GET /api/analytics/cognitive-trends
 */
export async function getCognitiveTrends() {
  const response = await fetch(`${API_BASE}/api/analytics/cognitive-trends`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return parseResponse(response);
}

/**
 * GET /api/analytics/decline-summary
 */
export async function getDeclineSummary() {
  const response = await fetch(`${API_BASE}/api/analytics/decline-summary`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return parseResponse(response);
}
