import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  LocateFixed,
  MapPin,
  RefreshCcw,
  Stethoscope,
  TriangleAlert,
} from "lucide-react";
import { getSpecialists } from "../api/recommendations";

export default function NearbyCareSection() {
  const [specialists, setSpecialists] = useState([]);
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
          const response = await getSpecialists(latitude, longitude);
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
  }, []);

  useEffect(() => {
    fetchNearbyCare();
  }, [fetchNearbyCare]);

  return (
    <section id="specialists" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-green-primary">
              Nearby Care
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-gray-900 sm:text-4xl">
              Doctors and clinics within 50 km
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-500">
              NeuroSense uses your browser location to automatically find
              nearby hospitals, clinics, doctors, and neurology-tagged care
              options through OpenStreetMap.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchNearbyCare}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-green-primary px-5 py-3 text-sm font-semibold text-white hover:bg-green-dark disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>

        {locationLabel && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-green-light px-4 py-2 text-xs font-semibold text-green-primary">
            <LocateFixed className="h-3.5 w-3.5" />
            {locationLabel}
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <TriangleAlert className="h-4 w-4" />
            {error}
          </div>
        )}

        {loading && specialists.length === 0 ? (
          <div className="flex items-center justify-center rounded-3xl border border-gray-100 bg-gray-50 py-16 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="ml-2 text-sm">Finding nearby care options...</span>
          </div>
        ) : specialists.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {specialists.slice(0, 6).map((specialist, index) => (
              <article
                key={specialist.id || `${specialist.name}-${index}`}
                className="rounded-2xl border border-gray-100 bg-gray-50 p-5 transition-colors hover:border-green-200 hover:bg-white"
              >
                <div className="mb-4 inline-flex rounded-xl bg-green-light p-3 text-green-primary">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {specialist.name}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm text-gray-500">
                  {specialist.address || "Address unavailable"}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs font-semibold text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {specialist.distanceKm ?? "N/A"} km
                  </span>
                  {specialist.contact?.mapsUrl && (
                    <a
                      href={specialist.contact.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-green-primary hover:underline"
                    >
                      Open map
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center text-sm text-gray-500">
            No nearby care options loaded yet.
          </div>
        )}
      </div>
    </section>
  );
}
