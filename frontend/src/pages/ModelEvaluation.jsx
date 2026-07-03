import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";
import {
  ArrowLeft,
  Brain,
  FlaskConical,
  Loader2,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getModelEvaluation } from "../api/model";

export default function ModelEvaluation() {
  const { user } = useAuth();
  const [evalData, setEvalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isAdmin = user?.role === "admin";

  const fetchEvaluation = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getModelEvaluation();
      setEvalData(data);
    } catch (err) {
      setError(err.message || "Failed to load model evaluation.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchEvaluation();
  }, [isAdmin, fetchEvaluation]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-12 w-12 text-gray-300" />
          <h1 className="mt-4 font-serif text-2xl font-bold text-gray-900">
            Access Restricted
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Model evaluation is only available to administrators.
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
            / Model Evaluation
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/analytics"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Analytics
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-violet-100 p-2.5">
            <FlaskConical className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-serif">
              Model Evaluation
            </h1>
            {evalData && (
              <p className="text-sm text-gray-500">
                Version: {evalData.model_version} · {evalData.training_samples}{" "}
                train / {evalData.test_samples} test samples
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
            <TriangleAlert className="h-4 w-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-3 text-sm">Loading evaluation data…</span>
          </div>
        ) : evalData ? (
          <>
            {/* ─── Metrics Cards ─── */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <MetricCard
                label="Accuracy"
                value={`${(evalData.metrics.accuracy * 100).toFixed(1)}%`}
                color="text-emerald-600"
              />
              <MetricCard
                label="Precision"
                value={`${(evalData.metrics.precision * 100).toFixed(1)}%`}
                color="text-blue-600"
              />
              <MetricCard
                label="Recall"
                value={`${(evalData.metrics.recall * 100).toFixed(1)}%`}
                color="text-violet-600"
              />
              <MetricCard
                label="F1 Score"
                value={`${(evalData.metrics.f1_score * 100).toFixed(1)}%`}
                color="text-amber-600"
              />
              <MetricCard
                label="ROC AUC"
                value={`${(evalData.metrics.roc_auc * 100).toFixed(1)}%`}
                color="text-rose-600"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* ─── Confusion Matrix ─── */}
              <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="mb-6 text-lg font-bold text-gray-900">
                  Confusion Matrix
                </h2>
                <ConfusionMatrix data={evalData.confusion_matrix} />
              </section>

              {/* ─── ROC Curve ─── */}
              <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="mb-2 text-lg font-bold text-gray-900">
                  ROC Curve
                </h2>
                <p className="mb-4 text-xs text-gray-500">
                  AUC = {evalData.metrics.roc_auc.toFixed(4)}
                </p>
                <RocCurve data={evalData.roc_curve} />
              </section>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* ─── Feature Importance ─── */}
              <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="mb-6 text-lg font-bold text-gray-900">
                  Feature Importance
                </h2>
                <FeatureImportanceChart
                  data={evalData.feature_importances}
                />
              </section>

              {/* ─── Per-Class Metrics ─── */}
              <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="mb-6 text-lg font-bold text-gray-900">
                  Per-Class Performance
                </h2>
                <PerClassTable data={evalData.per_class_report} />
              </section>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────── */

function MetricCard({ label, value, color }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function ConfusionMatrix({ data }) {
  const { true_negatives: tn, false_positives: fp, false_negatives: fn, true_positives: tp, labels } = data;
  const total = tn + fp + fn + tp;

  const cells = [
    { value: tn, label: "TN", pct: ((tn / total) * 100).toFixed(1), bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    { value: fp, label: "FP", pct: ((fp / total) * 100).toFixed(1), bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
    { value: fn, label: "FN", pct: ((fn / total) * 100).toFixed(1), bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    { value: tp, label: "TP", pct: ((tp / total) * 100).toFixed(1), bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  ];

  return (
    <div>
      {/* Axis labels */}
      <div className="mb-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Predicted
      </div>
      <div className="flex">
        <div className="flex flex-col justify-center mr-2">
          <span
            className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Actual
          </span>
        </div>
        <div className="flex-1">
          {/* Column headers */}
          <div className="grid grid-cols-[80px_1fr_1fr] gap-2 mb-2">
            <div />
            <div className="text-center text-xs font-semibold text-gray-500">
              {labels?.[0] || "Negative"}
            </div>
            <div className="text-center text-xs font-semibold text-gray-500">
              {labels?.[1] || "Positive"}
            </div>
          </div>
          {/* Row 0 */}
          <div className="grid grid-cols-[80px_1fr_1fr] gap-2 mb-2">
            <div className="flex items-center justify-end pr-2 text-xs font-semibold text-gray-500">
              {labels?.[0] || "Neg"}
            </div>
            {cells.slice(0, 2).map((c, i) => (
              <div
                key={i}
                className={`rounded-xl border ${c.border} ${c.bg} p-4 text-center`}
              >
                <p className={`text-2xl font-bold ${c.text}`}>{c.value}</p>
                <p className="text-xs text-gray-500">
                  {c.label} · {c.pct}%
                </p>
              </div>
            ))}
          </div>
          {/* Row 1 */}
          <div className="grid grid-cols-[80px_1fr_1fr] gap-2">
            <div className="flex items-center justify-end pr-2 text-xs font-semibold text-gray-500">
              {labels?.[1] || "Pos"}
            </div>
            {cells.slice(2, 4).map((c, i) => (
              <div
                key={i}
                className={`rounded-xl border ${c.border} ${c.bg} p-4 text-center`}
              >
                <p className={`text-2xl font-bold ${c.text}`}>{c.value}</p>
                <p className="text-xs text-gray-500">
                  {c.label} · {c.pct}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RocCurve({ data }) {
  const chartData = data.fpr.map((fpr, i) => ({
    fpr: fpr,
    tpr: data.tpr[i],
  }));


  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="fpr"
            type="number"
            domain={[0, 1]}
            tick={{ fontSize: 11 }}
            label={{
              value: "False Positive Rate",
              position: "insideBottom",
              offset: -2,
              style: { fontSize: 11, fill: "#6b7280" },
            }}
          />
          <YAxis
            type="number"
            domain={[0, 1]}
            tick={{ fontSize: 11 }}
            label={{
              value: "True Positive Rate",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 11, fill: "#6b7280" },
            }}
          />
          <Tooltip
            formatter={(value, name) => [
              value.toFixed(4),
              name === "tpr" ? "TPR" : "FPR",
            ]}
          />
          <ReferenceLine
            segment={[
              { x: 0, y: 0 },
              { x: 1, y: 1 },
            ]}
            stroke="#d1d5db"
            strokeDasharray="5 5"
          />
          <Area
            type="monotone"
            dataKey="tpr"
            stroke="#8b5cf6"
            fill="#8b5cf6"
            fillOpacity={0.15}
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

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

function FeatureImportanceChart({ data }) {
  if (!data?.length) return null;

  const chartData = data.map((d) => ({
    name: FEATURE_LABELS[d.feature] || d.feature,
    importance: d.importance,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 90, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => v.toFixed(2)}
          />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fontSize: 12, fill: "#374151", fontWeight: 500 }}
            width={85}
          />
          <Tooltip
            formatter={(value) => [value.toFixed(4), "Importance"]}
          />
          <Bar dataKey="importance" radius={[0, 4, 4, 0]} barSize={20}>
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={index < 3 ? "#0a6847" : "#6ee7b7"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PerClassTable({ data }) {
  if (!data) return null;

  const rows = Object.values(data);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3 text-left">Class</th>
            <th className="px-4 py-3 text-right">Precision</th>
            <th className="px-4 py-3 text-right">Recall</th>
            <th className="px-4 py-3 text-right">F1 Score</th>
            <th className="px-4 py-3 text-right">Support</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-semibold text-gray-900">
                {row.label}
              </td>
              <td className="px-4 py-3 text-right font-medium text-gray-700">
                {(row.precision * 100).toFixed(1)}%
              </td>
              <td className="px-4 py-3 text-right font-medium text-gray-700">
                {(row.recall * 100).toFixed(1)}%
              </td>
              <td className="px-4 py-3 text-right font-medium text-gray-700">
                {(row.f1_score * 100).toFixed(1)}%
              </td>
              <td className="px-4 py-3 text-right text-gray-500">
                {row.support}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
