import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  CheckCircle2,
  ChartLine,
  Home,
  Loader2,
  LocateFixed,
  RefreshCcw,
  Stethoscope,
  TriangleAlert,
  Brain,
} from "lucide-react";
import { getSpecialists } from "../api/recommendations";

const toPercent = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "N/A";
  return `${(numeric * 100).toFixed(1)}%`;
};

const FEATURE_LABELS = {
  age: "Age",
  mmse_score: "MMSE Score",
  cdr_score: "CDR Score",
  moca_score: "MoCA Score",
  education_years: "Education (yrs)",
  speech_rate: "Speech Rate",
  number_of_pauses: "Pause Count",
  pitch_variation: "Pitch Variation",
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
      <p className="text-sm font-semibold text-gray-900">{d.name}</p>
      <p className="text-xs text-gray-500">
        Input value: <span className="font-medium">{d.value}</span>
      </p>
      <p
        className={`text-xs font-semibold ${d.contribution >= 0 ? "text-red-600" : "text-green-600"}`}
      >
        {d.contribution >= 0 ? "↑ Increases" : "↓ Decreases"} risk by{" "}
        {Math.abs(d.contribution).toFixed(4)}
      </p>
    </div>
  );
};

function ShapWaterfallChart({ shapExplanation }) {
  if (!shapExplanation || !shapExplanation.shap_values?.length) return null;

  const chartData = shapExplanation.shap_values.map((sv) => ({
    name: FEATURE_LABELS[sv.feature] || sv.feature,
    contribution: sv.contribution,
    value: sv.value,
    fill: sv.contribution >= 0 ? "#ef4444" : "#22c55e",
  }));

  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-full bg-violet-100 p-2.5">
          <Brain className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h2 className="font-serif text-xl font-bold text-gray-900 sm:text-2xl">
            Why This Prediction?
          </h2>
          <p className="text-sm text-gray-500">
            SHAP values show how each factor influenced your risk score
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 flex items-center gap-6 text-xs font-medium">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-red-500" />
          Increases risk
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-green-500" />
          Decreases risk
        </span>
      </div>

      {/* Base value info */}
      <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-xs text-gray-600">
        Base prediction (population average):{" "}
        <span className="font-semibold text-gray-900">
          {(shapExplanation.base_value * 100).toFixed(1)}%
        </span>
      </div>

      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickFormatter={(v) => (v >= 0 ? `+${v.toFixed(3)}` : v.toFixed(3))}
            />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fontSize: 12, fill: "#374151", fontWeight: 500 }}
              width={95}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={0} stroke="#9ca3af" strokeWidth={1.5} />
            <Bar dataKey="contribution" radius={[4, 4, 4, 4]} barSize={24}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-gray-400">
        SHAP (SHapley Additive exPlanations) decomposes the model's prediction
        into individual feature contributions. Each bar shows how much a
        specific input moved the risk score above or below the base rate.
      </p>
    </section>
  );
}

export default function ResultsPage() {
  const location = useLocation();
  const result = location.state?.result || null;

  const riskScore = result?.riskScore ?? result?.risk_score;
  const riskLevel = result?.riskLevel ?? result?.risk_level;
  const confidence = result?.confidence;
  const shapExplanation =
    result?.shapExplanation ?? result?.shap_explanation ?? null;

  // ─── Nearby Care State ───
  const [specialists, setSpecialists] = useState([]);
  const [specialistsLoading, setSpecialistsLoading] = useState(false);
  const [specialistsError, setSpecialistsError] = useState("");
  const [locationLabel, setLocationLabel] = useState("");

  const findNearbyCare = useCallback(() => {
    setSpecialistsError("");

    if (!window.navigator?.geolocation) {
      setSpecialistsError("Geolocation is not supported by this browser.");
      return;
    }

    setSpecialistsLoading(true);

    window.navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setLocationLabel(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);

        try {
          const response = await getSpecialists(latitude, longitude);
          const list = Array.isArray(response?.specialists)
            ? response.specialists
            : [];

          setSpecialists(list);
        } catch (error) {
          setSpecialistsError(
            error.message ||
              "Failed to fetch nearby specialist recommendations.",
          );
        } finally {
          setSpecialistsLoading(false);
        }
      },
      (error) => {
        setSpecialistsLoading(false);

        if (error.code === 1) {
          setSpecialistsError(
            "Location permission denied. Please allow location access and try again.",
          );
          return;
        }

        if (error.code === 2) {
          setSpecialistsError("Unable to determine your current location.");
          return;
        }

        setSpecialistsError("Location request timed out. Please try again.");
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
      },
    );
  }, []);

  // Auto-fetch nearby care on page load.
  useEffect(() => {
    findNearbyCare();
  }, [findNearbyCare]);

  return (
    <div className="min-h-screen bg-cream px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* ─── Assessment Result Card ─── */}
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-10">
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-full bg-green-light p-2.5">
              <ChartLine className="h-5 w-5 text-green-primary" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-gray-900 sm:text-3xl">
              Assessment Result
            </h1>
          </div>

          {result ? (
            <div className="space-y-6">
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Screening submitted successfully.
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Risk Level
                  </p>
                  <p className="mt-1 text-lg font-bold text-gray-900">
                    {riskLevel || "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Risk Score
                  </p>
                  <p className="mt-1 text-lg font-bold text-gray-900">
                    {toPercent(riskScore)}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Confidence
                  </p>
                  <p className="mt-1 text-lg font-bold text-gray-900">
                    {toPercent(confidence)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 rounded-full bg-green-dark px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-primary"
                >
                  <ChartLine className="h-4 w-4" />
                  Open Dashboard
                </Link>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-full bg-green-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-dark"
                >
                  <Home className="h-4 w-4" />
                  Back to Home
                </Link>
                <Link
                  to="/#assessment"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-green-primary hover:text-green-primary"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Start New Test
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                No assessment result was found in this session.
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full bg-green-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-dark"
              >
                <Home className="h-4 w-4" />
                Go to Home
              </Link>
            </div>
          )}
        </div>

        {/* ─── SHAP Waterfall Chart ─── */}
        {shapExplanation && <ShapWaterfallChart shapExplanation={shapExplanation} />}

        {/* ─── Nearby Care Section ─── */}
        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-10">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Stethoscope className="h-5 w-5 text-green-primary" />
              Nearby Hospitals & Neurologists
            </h2>
            <button
              type="button"
              onClick={findNearbyCare}
              disabled={specialistsLoading}
              className="inline-flex items-center gap-2 rounded-full bg-green-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-dark disabled:opacity-60"
            >
              {specialistsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LocateFixed className="h-4 w-4" />
              )}
              Find Nearby
            </button>
          </div>

          {locationLabel && (
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
              Using location: {locationLabel}
            </p>
          )}

          {specialistsError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <TriangleAlert className="h-4 w-4" />
              {specialistsError}
            </div>
          )}

          {specialistsLoading && specialists.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="ml-2 text-sm">
                Searching nearby facilities...
              </span>
            </div>
          ) : specialists.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {specialists.map((specialist, index) => {
                const isBadgeAccent =
                  specialist.category === "neurologist" ||
                  specialist.category === "doctor";

                return (
                  <article
                    key={specialist.id || `${specialist.name}-${index}`}
                    className="rounded-2xl border border-gray-200 p-4 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold text-gray-900">
                        {specialist.name}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          isBadgeAccent
                            ? "bg-indigo-50 text-indigo-600"
                            : "bg-green-light text-green-primary"
                        }`}
                      >
                        {specialist.category || "medical"}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-gray-600">
                      {specialist.address || "Address unavailable"}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>{specialist.distanceKm ?? "N/A"} km away</span>
                      <span>
                        📞 {specialist.contact?.phone || "Not available"}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {specialist.contact?.website && (
                        <a
                          href={specialist.contact.website}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:border-green-primary hover:text-green-primary"
                        >
                          Website
                        </a>
                      )}
                      {specialist.contact?.mapsUrl && (
                        <a
                          href={specialist.contact.mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:border-green-primary hover:text-green-primary"
                        >
                          Open Map
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              {result
                ? "Searching for nearby hospitals, clinics, and neurologists..."
                : "Complete a screening to automatically see nearby care options, or tap Find Nearby."}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
