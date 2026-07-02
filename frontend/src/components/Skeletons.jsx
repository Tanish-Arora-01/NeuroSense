/**
 * Reusable skeleton loading components for shimmer placeholders.
 * Uses Tailwind's `animate-pulse` for the loading animation.
 */

/* ── Base Skeleton Block ─────────────────────── */

export function Skeleton({ className = "", ...props }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded-lg ${className}`}
      {...props}
    />
  );
}

/* ── Skeleton Text Lines ─────────────────────── */

export function SkeletonText({ lines = 3, className = "" }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}

/* ── Skeleton Card ───────────────────────────── */

export function SkeletonCard({ className = "" }) {
  return (
    <div
      className={`bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-md ${className}`}
    >
      <Skeleton className="h-5 w-1/3 mb-4" />
      <SkeletonText lines={3} />
      <Skeleton className="h-10 w-full mt-6" />
    </div>
  );
}

/* ── Skeleton Chart ──────────────────────────── */

export function SkeletonChart({ className = "" }) {
  return (
    <div
      className={`bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-md ${className}`}
    >
      <Skeleton className="h-5 w-1/4 mb-6" />
      <div className="flex items-end gap-2 h-40">
        {[40, 65, 30, 80, 55, 70, 45, 60, 35, 75, 50, 90].map(
          (height, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t-md"
              style={{ height: `${height}%` }}
            />
          ),
        )}
      </div>
    </div>
  );
}

/* ── Skeleton Dashboard Page ─────────────────── */

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-dark to-green-primary p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* Chart area */}
        <SkeletonChart />

        {/* Table area */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-md">
          <Skeleton className="h-5 w-1/5 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Skeleton Results Page ───────────────────── */

export function ResultsSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-dark to-green-primary p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />

        {/* Risk score card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-md text-center">
          <Skeleton className="h-24 w-24 rounded-full mx-auto mb-4" />
          <Skeleton className="h-6 w-40 mx-auto mb-2" />
          <Skeleton className="h-4 w-60 mx-auto" />
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}

/* ── Generic Page Spinner ────────────────────── */

export function PageSpinner({ message = "Loading..." }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-dark to-green-primary gap-4">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-white/30 rounded-full" />
        <div className="absolute inset-0 w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-white/80 text-sm font-medium">{message}</p>
    </div>
  );
}
