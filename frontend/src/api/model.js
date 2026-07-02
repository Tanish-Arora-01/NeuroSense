// ──────────────────────────────────────────────
// Frontend API client — Model Info / Evaluation
// Restricted to doctor/admin roles on the backend
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
 * GET /api/model/info
 */
export async function getModelInfo() {
  const response = await fetch(`${API_BASE}/api/model/info`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return parseResponse(response);
}

/**
 * GET /api/model/evaluation
 */
export async function getModelEvaluation() {
  const response = await fetch(`${API_BASE}/api/model/evaluation`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return parseResponse(response);
}
