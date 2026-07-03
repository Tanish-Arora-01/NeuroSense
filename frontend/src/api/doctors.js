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
    throw new Error(message);
  }

  return payload;
}

export async function getApprovedDoctors() {
  const response = await fetch(`${API_BASE}/api/doctors`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  return parseResponse(response);
}
