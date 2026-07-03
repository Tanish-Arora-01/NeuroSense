const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const TOKEN_STORAGE_KEYS = [
  "token",
  "authToken",
  "accessToken",
  "jwt",
  "jwtToken",
];

function getAuthToken() {
  if (typeof window === "undefined") return null;

  for (const key of TOKEN_STORAGE_KEYS) {
    const localValue = window.localStorage?.getItem(key);
    if (localValue) return localValue;

    const sessionValue = window.sessionStorage?.getItem(key);
    if (sessionValue) return sessionValue;
  }

  return null;
}

function buildAuthHeaders(baseHeaders = {}) {
  const token = getAuthToken();
  if (!token) return baseHeaders;

  return {
    ...baseHeaders,
    Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
  };
}

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
 * Fetch paginated screening history.
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @param {string} [params.from]  ISO date string
 * @param {string} [params.to]    ISO date string
 * @param {string} [params.risk]  "low" | "moderate" | "high"
 */
export async function getDashboardHistory(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", params.page);
  if (params.limit) query.set("limit", params.limit);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.risk) query.set("risk", params.risk);

  const qs = query.toString();
  const url = `${API_BASE}/api/dashboard/history${qs ? `?${qs}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: buildAuthHeaders({
      Accept: "application/json",
    }),
  });

  return parseResponse(response);
}

export async function getDoctorPatientRecords(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", params.page);
  if (params.limit) query.set("limit", params.limit);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.risk) query.set("risk", params.risk);

  const qs = query.toString();
  const url = `${API_BASE}/api/dashboard/doctor/patients${qs ? `?${qs}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: buildAuthHeaders({
      Accept: "application/json",
    }),
  });

  return parseResponse(response);
}

/**
 * Fetch aggregate summary for the current user.
 */
export async function getDashboardSummary() {
  const response = await fetch(`${API_BASE}/api/dashboard/summary`, {
    method: "GET",
    credentials: "include",
    headers: buildAuthHeaders({
      Accept: "application/json",
    }),
  });

  return parseResponse(response);
}

/**
 * Fetch admin-level population overview (doctor/admin roles only).
 */
export async function getAdminOverview() {
  const response = await fetch(`${API_BASE}/api/dashboard/admin/overview`, {
    method: "GET",
    credentials: "include",
    headers: buildAuthHeaders({
      Accept: "application/json",
    }),
  });

  return parseResponse(response);
}

/**
 * Fetch cognitive decline analysis for the current user.
 */
export async function getDeclineAnalysis() {
  const response = await fetch(`${API_BASE}/api/dashboard/decline`, {
    method: "GET",
    credentials: "include",
    headers: buildAuthHeaders({
      Accept: "application/json",
    }),
  });

  return parseResponse(response);
}
