import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Brain,
  CheckCircle2,
  Clock3,
  FlaskConical,
  Loader2,
  ShieldCheck,
  TriangleAlert,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getAdminDoctors,
  getAdminOverview,
  updateDoctorApproval,
} from "../api/admin";

export default function AdminPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  const isAdmin = user?.role === "admin";

  const loadAdminData = useCallback(async () => {
    if (!isAdmin) return;

    setLoading(true);
    setError("");
    try {
      const [overviewData, doctorsData] = await Promise.all([
        getAdminOverview(),
        getAdminDoctors(filter),
      ]);
      setOverview(overviewData);
      setDoctors(Array.isArray(doctorsData?.doctors) ? doctorsData.doctors : []);
    } catch (err) {
      setError(err.message || "Failed to load admin console.");
    } finally {
      setLoading(false);
    }
  }, [filter, isAdmin]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleApproval = async (doctorId, status) => {
    setUpdatingId(doctorId);
    setError("");
    try {
      await updateDoctorApproval(doctorId, status);
      await loadAdminData();
    } catch (err) {
      setError(err.message || "Failed to update doctor approval.");
    } finally {
      setUpdatingId("");
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-lg rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-12 w-12 text-gray-300" />
          <h1 className="mt-4 font-serif text-2xl font-bold text-gray-900">
            Admin Access Required
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Doctor approvals and platform analytics are available only to
            internal administrators.
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
      <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6 lg:px-8">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <Brain className="h-8 w-8 text-green-primary" />
          <span className="hidden font-serif text-xl font-bold tracking-tight text-gray-900 sm:block">
            NeuroSense
          </span>
          <span className="text-sm font-medium text-gray-400">
            / Admin Console
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/analytics"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Link>
          <Link
            to="/admin/model-evaluation"
            className="inline-flex items-center gap-2 rounded-lg bg-green-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-dark"
          >
            <FlaskConical className="h-4 w-4" />
            Model Eval
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-gray-900">
            Admin Console
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Review doctor registrations, approve clinical access, and jump into
            platform analytics.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <TriangleAlert className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            icon={<Clock3 className="h-5 w-5" />}
            label="Pending Doctors"
            value={overview?.pendingDoctors ?? 0}
            accent="bg-amber-50 text-amber-600"
          />
          <StatCard
            icon={<UserCheck className="h-5 w-5" />}
            label="Approved Doctors"
            value={overview?.approvedDoctors ?? 0}
            accent="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Patients"
            value={overview?.patients ?? 0}
            accent="bg-indigo-50 text-indigo-600"
          />
          <StatCard
            icon={<BarChart3 className="h-5 w-5" />}
            label="Screenings"
            value={overview?.totalScreenings ?? 0}
            accent="bg-sky-50 text-sky-600"
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Referred Records"
            value={overview?.assignedScreenings ?? 0}
            accent="bg-violet-50 text-violet-600"
          />
        </div>

        <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 p-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Doctor Approvals
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Doctors must be approved before they can access referred patient
                records.
              </p>
            </div>
            <div className="flex rounded-lg border border-gray-200 p-0.5">
              {["pending", "approved", "rejected"].map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${
                    filter === item
                      ? "bg-green-primary text-white"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="ml-2 text-sm">Loading doctors...</span>
            </div>
          ) : doctors.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {doctors.map((doctor) => (
                <article
                  key={doctor.id}
                  className="grid gap-5 p-6 lg:grid-cols-[1fr_auto]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-bold text-gray-900">
                        {doctor.name}
                      </h3>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-gray-500">
                        {doctor.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {doctor.email} | {doctor.phone || "No phone"}
                    </p>
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <Info label="License" value={doctor.doctorProfile?.licenseNumber} />
                      <Info label="Specialization" value={doctor.doctorProfile?.specialization} />
                      <Info label="Clinic" value={doctor.doctorProfile?.clinicName} />
                      <Info label="City" value={doctor.doctorProfile?.city} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 lg:justify-end">
                    <button
                      onClick={() => handleApproval(doctor.id, "approved")}
                      disabled={updatingId === doctor.id}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {updatingId === doctor.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => handleApproval(doctor.id, "rejected")}
                      disabled={updatingId === doctor.id}
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-gray-500">
              No {filter} doctors found.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className={`mb-4 inline-flex rounded-xl p-3 ${accent}`}>{icon}</div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-1 font-medium text-gray-800">{value || "N/A"}</p>
    </div>
  );
}
