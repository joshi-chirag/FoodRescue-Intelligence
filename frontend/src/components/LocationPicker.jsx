import { useState, useCallback } from "react";

const NOMINATIM = "https://nominatim.openstreetmap.org";

// ── Nominatim helpers ─────────────────────────────────────────────────────────
async function geocode(address) {
  const res = await fetch(
    `${NOMINATIM}/search?q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1`,
    { headers: { "User-Agent": "FoodRescue-Intelligence/1.0", "Accept-Language": "en" } }
  );
  const data = await res.json();
  if (!data.length) throw new Error("Address not found. Try a more specific address.");
  const { lat, lon, display_name } = data[0];
  return { lat: parseFloat(lat).toFixed(6), lon: parseFloat(lon).toFixed(6), address: display_name };
}

async function reverseGeocode(lat, lon) {
  const res = await fetch(
    `${NOMINATIM}/reverse?lat=${lat}&lon=${lon}&format=json&zoom=16`,
    { headers: { "User-Agent": "FoodRescue-Intelligence/1.0", "Accept-Language": "en" } }
  );
  const data = await res.json();
  // Build a short readable address
  const a = data.address || {};
  const parts = [
    a.amenity || a.road || a.pedestrian,
    a.neighbourhood || a.suburb,
    a.city || a.town || a.village,
    a.state,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : data.display_name;
}

// ── Main Component ────────────────────────────────────────────────────────────
/**
 * LocationPicker
 * Props:
 *   lat, lon, address  — current values (controlled)
 *   onChange({ lat, lon, address }) — called whenever any value updates
 *   disabled — grey out everything
 */
function LocationPicker({ lat, lon, address, onChange, disabled = false }) {
  const [query, setQuery]       = useState(address || "");
  const [gpsLoading, setGpsL]   = useState(false);
  const [searchLoading, setScL] = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  const flash = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

  // ── GPS detect ───────────────────────────────────────────────────────────────
  const detectGPS = useCallback(() => {
    setError(""); setSuccess("");
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser."); return;
    }
    setGpsL(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lt, longitude: ln } = pos.coords;
        try {
          const addr = await reverseGeocode(lt, ln);
          setQuery(addr);
          onChange({ lat: lt.toFixed(6), lon: ln.toFixed(6), address: addr });
          flash("✅ GPS location detected!");
        } catch {
          // Still use coordinates even if reverse geocode fails
          onChange({ lat: lt.toFixed(6), lon: ln.toFixed(6), address: query });
          flash("✅ GPS coordinates set (address lookup failed)");
        }
        setGpsL(false);
      },
      (err) => {
        const msgs = {
          1: "Location access denied. Please allow location in your browser settings.",
          2: "Location unavailable. Try searching by address instead.",
          3: "Location request timed out. Try again.",
        };
        setError(msgs[err.code] || "Could not get location.");
        setGpsL(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, [onChange, query]);

  // ── Address search ───────────────────────────────────────────────────────────
  const searchAddress = useCallback(async () => {
    if (!query.trim()) { setError("Please enter an address first."); return; }
    setError(""); setSuccess(""); setScL(true);
    try {
      const result = await geocode(query);
      setQuery(result.address);
      onChange(result);
      flash(`✅ Found: ${result.lat}, ${result.lon}`);
    } catch (err) {
      setError(err.message || "Search failed. Check your internet connection.");
    } finally {
      setScL(false);
    }
  }, [query, onChange]);

  const hasCoords = lat && lon;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>

      {/* Address input + search button */}
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">Location *</label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            className="form-input"
            placeholder="e.g. Connaught Place, New Delhi"
            value={query}
            disabled={disabled}
            onChange={e => { setQuery(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && searchAddress()}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={searchAddress}
            disabled={disabled || searchLoading || gpsLoading}
            title="Search address coordinates"
            style={{ flexShrink: 0, minWidth: 44 }}
          >
            {searchLoading
              ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
              : "🔍"}
          </button>
        </div>
      </div>

      {/* GPS button */}
      <button
        type="button"
        onClick={detectGPS}
        disabled={disabled || gpsLoading || searchLoading}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
          padding: "0.55rem 1rem", borderRadius: "var(--radius-sm)",
          border: "1px dashed rgba(16,185,129,0.35)",
          background: "rgba(16,185,129,0.05)",
          color: gpsLoading ? "var(--text-muted)" : "var(--green-primary)",
          fontWeight: 600, fontSize: "0.85rem", cursor: disabled || gpsLoading ? "not-allowed" : "pointer",
          fontFamily: "inherit", transition: "var(--transition)", width: "100%",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {gpsLoading ? (
          <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Detecting your location…</>
        ) : (
          <>📍 Use My GPS Location</>
        )}
      </button>

      {/* Error / Success */}
      {error   && <p style={{ fontSize: "0.8rem", color: "var(--red)",   margin: 0 }}>⚠️ {error}</p>}
      {success && <p style={{ fontSize: "0.8rem", color: "var(--green-primary)", margin: 0 }}>{success}</p>}

      {/* Coordinates display (auto-filled, read-only) */}
      {hasCoords && (
        <div style={{
          display: "flex", gap: "1rem",
          padding: "0.65rem 0.875rem",
          background: "rgba(16,185,129,0.06)",
          border: "1px solid rgba(16,185,129,0.18)",
          borderRadius: "var(--radius-sm)",
          alignItems: "center", flexWrap: "wrap",
        }}>
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", flex: 1 }}>
            📡 Coordinates set automatically
          </span>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "0.62rem", color: "var(--text-muted)", letterSpacing: "0.06em", marginBottom: "0.1rem" }}>LATITUDE</p>
              <code style={{ fontSize: "0.78rem", color: "var(--green-primary)", fontWeight: 700 }}>{lat}</code>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "0.62rem", color: "var(--text-muted)", letterSpacing: "0.06em", marginBottom: "0.1rem" }}>LONGITUDE</p>
              <code style={{ fontSize: "0.78rem", color: "var(--green-primary)", fontWeight: 700 }}>{lon}</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LocationPicker;
