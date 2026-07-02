import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowLeft,
  Brain,
  ChartLine,
  Download,
  Loader2,
  TrendingDown,
  TrendingUp,
  Minus,
  Users,
  TriangleAlert,
  ShieldCheck,
  FlaskConical,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getAnalyticsOverview,
  getRiskDistribution,
  getScreeningVolume,
  getCognitiveTrends,
  getDeclineSummary,
} from "../api/analytics";

const RISK_COLORS = {
  low: "#10b981",
  moderate: "#f59e0b",
  high: "#f43f5e",
};

const DECLINE_COLORS = {
  improving: "#10b981",
  stable: "#3b82f6",
  declining: "#f43f5e",
};

export default function AdminAnalytics() {
  const { user } = useAuth();

  const [overview, setOverview] = useState(null);
  const [riskDist, setRiskDist] = useState(null);
  const [volume, setVolume] = useState(null);
  const [cognitive, setCognitive] = useState(null);
  const [decline, setDecline] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [granularity, setGranularity] = useState("month");

  const [exportCsvLoading, setExportCsvLoading] = useState(false);

  const isAdmin =
    user?.role === "doctor" || user?.role === "admin";

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [ov, rd, vol, cog, dec] = await Promise.all([
        getAnalyticsOverview(),
        getRiskDistribution(),
        getScreeningVolume({ granularity }),
        getCognitiveTrends(),
        getDeclineSummary(),
      ]);
      setOverview(ov);
      setRiskDist(rd);
      setVolume(vol);
      setCognitive(cog);
      setDecline(dec);
    } catch (err) {
      setError(err.message || "Failed to load analytics data.");
    } finally {
      setLoading(false);
    }
  }, [granularity]);

  useEffect(() => {
    if (isAdmin) fetchAll();
  }, [isAdmin, fetchAll]);

  // Refetch volume when granularity changes
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const vol = await getScreeningVolume({ granularity });
        setVolume(vol);
      } catch {
        /* keep existing data */
      }
    })();
  }, [granularity, isAdmin]);

  const handleExportCsv = async () => {
    setExportCsvLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/reports/export/csv`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) throw new Error("Failed to export CSV");

      const blob = await response.blob();
      let fileName = "neurosense-export.csv";
      const disposition = response.headers.get("content-disposition");
      if (disposition && disposition.includes("filename=")) {
        fileName = disposition.split("filename=")[1].replace(/"/g, "");
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(err);
      alert("Could not export CSV data.");
    } finally {
      setExportCsvLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-12 w-12 text-gray-300" />
          <h1 className="mt-4 font-serif text-2xl font-bold text-gray-900">
            Access Restricted
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            This page is only available to doctors and administrators.
          </p>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-green-primary px-6 py-3 text-sm font-semibold text-white hover:bg-green-dark"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <Brain className="h-8 w-8 text-green-primary" />
            <span className="hidden sm:block font-serif text-xl font-bold tracking-tight text-gray-900">
              NeuroSense
            </span>
          </Link>
          <span className="text-sm font-medium text-gray-400">
            / Population Analytics
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            disabled={exportCsvLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 shadow-sm"
          >
            {exportCsvLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export CSV
          </button>
          <Link
            to="/admin/model-evaluation"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            <FlaskConical className="h-4 w-4" />
            Model Eval
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <h1 className="text-2xl font-bold text-gray-900 font-serif">
          Population Analytics
        </h1>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
            <TriangleAlert className="h-4 w-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-3 text-sm">Loading analytics…</span>
          </div>
        ) : (
          <>
            {/* ─── Overview Cards ─── */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<Activity className="h-6 w-6" />}
                iconBg="bg-green-light text-green-primary"
                label="Total Screenings"
                value={overview?.totalScreenings ?? 0}
              />
              <StatCard
                icon={<Users className="h-6 w-6" />}
                iconBg="bg-indigo-50 text-indigo-600"
                label="Unique Patients"
                value={overview?.totalUsers ?? 0}
              />
              <StatCard
                icon={<ChartLine className="h-6 w-6" />}
                iconBg="bg-sky-50 text-sky-600"
                label="Avg Risk Score"
                value={
                  overview?.avgRiskScore != null
                    ? `${(overview.avgRiskScore * 100).toFixed(1)}%`
                    : "N/A"
                }
              />
              <StatCard
                icon={<TriangleAlert className="h-6 w-6" />}
                iconBg="bg-rose-50 text-rose-600"
                label="High Risk %"
                value={
                  overview?.highRiskPercentage != null
                    ? `${overview.highRiskPercentage}%`
                    : "N/A"
                }
              />
            </div>

            {/* ─── Charts Row 1 ─── */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Risk Distribution */}
              <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-900">
                  <span className="h-2 w-2 rounded-full bg-green-primary" />
                  Risk Distribution
                </h2>
                {riskDist ? (
                  <div className="flex flex-col items-center">
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              {
                                name: "Low",
                                value: riskDist.byLevel?.low || 0,
                              },
                              {
                                name: "Moderate",
                                value: riskDist.byLevel?.moderate || 0,
                              },
                              {
                                name: "High",
                                value: riskDist.byLevel?.high || 0,
                              },
                            ].filter((d) => d.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            <Cell fill={RISK_COLORS.low} />
                            <Cell fill={RISK_COLORS.moderate} />
                            <Cell fill={RISK_COLORS.high} />
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Histogram */}
                    {riskDist.histogram?.length > 0 && (
                      <div className="mt-4 h-40 w-full">
                        <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Score Histogram
                        </p>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={riskDist.histogram}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#e5e7eb"
                            />
                            <XAxis
                              dataKey="label"
                              tick={{ fontSize: 10 }}
                            />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                              {riskDist.histogram.map((entry, i) => (
                                <Cell
                                  key={i}
                                  fill={
                                    entry.rangeStart < 0.3
                                      ? RISK_COLORS.low
                                      : entry.rangeStart < 0.7
                                        ? RISK_COLORS.moderate
                                        : RISK_COLORS.high
                                  }
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState />
                )}
              </section>

              {/* Screening Volume */}
              <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                    Screening Volume
                  </h2>
                  <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5">
                    {["day", "week", "month"].map((g) => (
                      <button
                        key={g}
                        onClick={() => setGranularity(g)}
                        className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                          granularity === g
                            ? "bg-green-primary text-white"
                            : "text-gray-500 hover:text-gray-900"
                        }`}
                      >
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                {volume?.data?.length > 0 ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={volume.data}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e5e7eb"
                        />
                        <XAxis
                          dataKey="period"
                          tick={{ fontSize: 10 }}
                          interval="preserveStartEnd"
                        />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(value, name) => {
                            if (name === "avgRiskScore")
                              return [
                                `${(value * 100).toFixed(1)}%`,
                                "Avg Risk",
                              ];
                            return [value, "Screenings"];
                          }}
                        />
                        <Bar
                          dataKey="count"
                          fill="#0a6847"
                          radius={[4, 4, 0, 0]}
                          name="Screenings"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState />
                )}
              </section>
            </div>

            {/* ─── Charts Row 2 ─── */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Cognitive Trends */}
              <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-900">
                  <span className="h-2 w-2 rounded-full bg-violet-500" />
                  Cognitive Score Trends
                </h2>
                {cognitive?.data?.length > 0 ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={cognitive.data}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e5e7eb"
                        />
                        <XAxis
                          dataKey="period"
                          tick={{ fontSize: 10 }}
                          interval="preserveStartEnd"
                        />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="avgMmse"
                          name="MMSE"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="avgCdr"
                          name="CDR"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="avgMoca"
                          name="MoCA"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState />
                )}
              </section>

              {/* Decline Summary */}
              <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-900">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Patient Trajectory Analysis
                </h2>
                {decline && decline.totalPatientsAnalyzed > 0 ? (
                  <div className="space-y-6">
                    <p className="text-sm text-gray-500">
                      Patients with 2+ screenings:{" "}
                      <span className="font-semibold text-gray-900">
                        {decline.totalPatientsAnalyzed}
                      </span>
                    </p>

                    {/* Mini donut */}
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              {
                                name: "Improving",
                                value: decline.improving || 0,
                              },
                              { name: "Stable", value: decline.stable || 0 },
                              {
                                name: "Declining",
                                value: decline.declining || 0,
                              },
                            ].filter((d) => d.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            <Cell fill={DECLINE_COLORS.improving} />
                            <Cell fill={DECLINE_COLORS.stable} />
                            <Cell fill={DECLINE_COLORS.declining} />
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <TrendCard
                        icon={<TrendingDown className="h-4 w-4" />}
                        label="Improving"
                        value={decline.improving}
                        color="text-emerald-600"
                        bg="bg-emerald-50"
                      />
                      <TrendCard
                        icon={<Minus className="h-4 w-4" />}
                        label="Stable"
                        value={decline.stable}
                        color="text-blue-600"
                        bg="bg-blue-50"
                      />
                      <TrendCard
                        icon={<TrendingUp className="h-4 w-4" />}
                        label="Declining"
                        value={decline.declining}
                        color="text-rose-600"
                        bg="bg-rose-50"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-sm text-gray-500">
                    <Activity className="h-8 w-8 text-gray-300 mb-3" />
                    Not enough longitudinal data yet.
                    <span className="text-xs text-gray-400 mt-1">
                      Requires patients with 2+ screenings.
                    </span>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, iconBg, label, value }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className={`flex p-3 rounded-xl ${iconBg}`}>{icon}</div>
      <div>
        <p className="text-sm font-semibold tracking-wide text-gray-500">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function TrendCard({ icon, label, value, color, bg }) {
  return (
    <div
      className={`rounded-xl ${bg} p-3 text-center`}
    >
      <div className={`flex items-center justify-center gap-1 ${color} mb-1`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className={`text-xs font-semibold ${color}`}>{label}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
      No data available yet.
    </div>
  );
}
