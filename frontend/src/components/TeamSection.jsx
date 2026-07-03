import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Filter,
  Loader2,
  LocateFixed,
  MapPin,
  Phone,
  RefreshCcw,
  Search,
  Stethoscope,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { getSpecialists } from "../api/recommendations";

const specialties = [
  { label: "All", value: "all" },
  { label: "Doctors", value: "doctor" },
  { label: "Neurology", value: "neurologist" },
  { label: "Clinics", value: "clinic" },
  { label: "Hospitals", value: "hospital" },
];

export default function TeamSection() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [specialists, setSpecialists] = useState([]);
  const [radiusKm, setRadiusKm] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locationLabel, setLocationLabel] = useState("");

  const fetchNearbyCare = useCallback(() => {
    setError("");

    if (!window.navigator?.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    setLoading(true);

    window.navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setLocationLabel(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);

        try {
          const response = await getSpecialists(latitude, longitude, {
            radiusKm,
          });
          setSpecialists(
            Array.isArray(response?.specialists) ? response.specialists : [],
          );
        } catch (err) {
          setError(err.message || "Failed to fetch nearby doctors.");
        } finally {
          setLoading(false);
        }
      },
      (geoError) => {
        setLoading(false);
        if (geoError.code === 1) {
          setError("Location permission is needed to auto-find nearby doctors.");
          return;
        }
        setError("Unable to determine your location right now.");
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
      },
    );
  }, [radiusKm]);

  useEffect(() => {
    fetchNearbyCare();
  }, [fetchNearbyCare]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return specialists.filter((item) => {
      const name = String(item.name || "").toLowerCase();
      const category = String(item.category || "medical").toLowerCase();
      const address = String(item.address || "").toLowerCase();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        category.includes(query) ||
        address.includes(query);

      const matchesFilter =
        activeFilter === "all" || category.includes(activeFilter);

      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, search, specialists]);

  const avatarColor = (name) => {
    const colors = [
      "bg-green-primary",
      "bg-emerald-600",
      "bg-teal-600",
      "bg-cyan-700",
      "bg-green-dark",
      "bg-green-accent",
    ];
    let hash = 0;
    for (const ch of name || "medical") {
      hash = ch.charCodeAt(0) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <section className="bg-cream py-16 md:py-24">
      <div id="specialists" className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Find Nearby{" "}
            <span className="font-serif italic text-green-primary">
              Specialists
            </span>
          </h2>
          <p className="mt-4 leading-relaxed text-gray-600">
            NeuroSense automatically searches OpenStreetMap for hospitals,
            clinics, doctors, and neurology-tagged care options near
            your location.
          </p>
        </div>

        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, type, or location..."
              className="w-full rounded-full border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-green-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="mr-1 hidden h-4 w-4 text-gray-400 sm:block" />
            <label className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600">
              Radius
              <select
                value={radiusKm}
                onChange={(event) => setRadiusKm(Number(event.target.value))}
                className="bg-transparent text-green-primary outline-none"
              >
                <option value={10}>10 km</option>
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
                <option value={100}>100 km</option>
              </select>
            </label>
            {specialties.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setActiveFilter(s.value)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  activeFilter === s.value
                    ? "bg-green-primary text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:border-green-primary hover:text-green-primary"
                }`}
              >
                {s.label}
              </button>
            ))}
            <button
              type="button"
              onClick={fetchNearbyCare}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 hover:border-green-primary hover:text-green-primary disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCcw className="h-3.5 w-3.5" />
              )}
              Refresh
            </button>
          </div>
        </div>

        {locationLabel && (
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-green-primary">
            <LocateFixed className="h-3.5 w-3.5" />
            Using location: {locationLabel}
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <TriangleAlert className="h-4 w-4" />
            {error}
          </div>
        )}

        {loading && specialists.length === 0 ? (
          <div className="flex items-center justify-center rounded-3xl border border-gray-100 bg-white py-16 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="ml-2 text-sm">Finding nearby care options...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white py-16 text-center">
            <Stethoscope className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="text-gray-500">
              No nearby doctors found matching your criteria.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.slice(0, 6).map((doc, index) => (
              <div
                key={doc.id || `${doc.name}-${index}`}
                className="group relative flex flex-col rounded-2xl border border-gray-100 bg-white p-6 transition-shadow hover:shadow-xl"
              >
                <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-green-light px-2.5 py-1 text-[11px] font-semibold capitalize text-green-primary">
                  {doc.category || "medical"}
                </span>

                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${avatarColor(doc.name)} text-white`}
                  >
                    <UserRound className="h-7 w-7" />
                  </div>
                  <div className="min-w-0 pr-20">
                    <h3 className="truncate text-base font-semibold text-gray-900">
                      {doc.name || "Unnamed Facility"}
                    </h3>
                    <p className="text-sm font-medium capitalize text-green-primary">
                      {doc.category || "medical care"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-cream px-2.5 py-1.5 text-xs text-gray-600">
                    <MapPin className="h-3 w-3" />
                    {doc.distanceKm ?? "N/A"} km away
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-cream px-2.5 py-1.5 text-xs text-gray-600">
                    {doc.address || "Address unavailable"}
                  </span>
                </div>

                <hr className="my-5 border-gray-100" />

                <div className="mt-auto flex items-center gap-3">
                  {doc.contact?.mapsUrl ? (
                    <a
                      href={doc.contact.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-green-primary px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-green-dark"
                    >
                      Open Map
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gray-100 px-4 py-2.5 text-xs font-semibold text-gray-400"
                    >
                      Map unavailable
                    </button>
                  )}
                  <a
                    href={
                      doc.contact?.phone && doc.contact.phone !== "Not available"
                        ? `tel:${doc.contact.phone}`
                        : undefined
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition-colors hover:border-green-primary hover:text-green-primary"
                    aria-label="Call facility"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
