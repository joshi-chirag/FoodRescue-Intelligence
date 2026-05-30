import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import Navbar from "../components/Navbar";
import LocationPicker from "../components/LocationPicker";
import ImpactTab from "../components/ImpactTab";

const STATUS_BADGE = {
  pending:   { cls: "badge-amber", label: "⏳ Pending" },
  allocated: { cls: "badge-green", label: "✅ Allocated" },
  expired:   { cls: "badge-red",   label: "❌ Expired" },
  cancelled: { cls: "badge-gray",  label: "🚫 Cancelled" },
};

const PRIORITY_BADGE = {
  HIGH:   { cls: "badge-red",   label: "⚡ HIGH" },
  NORMAL: { cls: "badge-green", label: "✅ NORMAL" },
};

// ── Reusable ScoreBar ────────────────────────────────────────────────────────
function ScoreBar({ label, value, max = 1 }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
        <span style={{ fontSize: "0.77rem", color: "var(--text-secondary)" }}>{label}</span>
        <span style={{ fontSize: "0.77rem", fontWeight: 700 }}>{typeof value === "number" ? value.toFixed(3) : value}</span>
      </div>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Donate Tab ───────────────────────────────────────────────────────────────
function DonateTab({ username, onSuccess }) {
  const [form, setForm] = useState({
    food_type: "", quantity: "", expiry_time: "", location: "",
    latitude: "", longitude: "", temperature: 30, humidity: 60, time_since_cooked: 2,
    image: null,
  })
  const [result, setResult]         = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState("")
  const [showAdvanced, setShowAdv]  = useState(false)

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleAllocate = async () => {
    if (!form.food_type || !form.quantity || !form.expiry_time || !form.location) {
      setError("Please fill in all required fields."); return
    }
    try {
      setLoading(true); setError(""); setResult(null)

      const formData = new FormData()
      formData.append("food_type", form.food_type)
      formData.append("quantity", parseInt(form.quantity))
      formData.append("expiry_time", form.expiry_time)
      formData.append("location", form.location)
      if (form.latitude) formData.append("latitude", form.latitude)
      if (form.longitude) formData.append("longitude", form.longitude)
      formData.append("donor_name", username)
      if (form.image) {
        formData.append("image", form.image)
      }

      const donRes = await api.post("/donations/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      const res = await api.post("/auto-allocate/", {
        donation_id: donRes.data.id,
        temperature: form.temperature, humidity: form.humidity,
        time_since_cooked: form.time_since_cooked,
      })
      setResult(res.data)
      setForm(f => ({ ...f, food_type: "", quantity: "", expiry_time: "", location: "", latitude: "", longitude: "", image: null }))
      const fileInput = document.getElementById("food-image")
      if (fileInput) fileInput.value = ""
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.error || "Allocation failed. Make sure NGOs have coordinates.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid-2" style={{ alignItems: "start", gap: "1.5rem" }}>
      {/* ── Form ── */}
      <div className="card">
        <h2 className="section-title">🍱 New Donation</h2>
        {error && <div className="alert alert-error">{error}</div>}
        {result && <div className="alert alert-success">✅ Allocated to <strong>{result.allocated_to}</strong> — {result.distance_km} km away</div>}

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Food Type *</label>
            <input id="food-type" className="form-input" placeholder="e.g. Rice & Curry"
              value={form.food_type} onChange={e => setF("food_type", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Quantity (units) *</label>
            <input id="quantity" type="number" className="form-input" placeholder="e.g. 50"
              value={form.quantity} onChange={e => setF("quantity", e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Expiry Time *</label>
          <input id="expiry-time" type="datetime-local" className="form-input"
            value={form.expiry_time} onChange={e => setF("expiry_time", e.target.value)} />
        </div>

        {/* Smart LocationPicker */}
        <LocationPicker
          lat={form.latitude}
          lon={form.longitude}
          address={form.location}
          onChange={({ lat, lon, address }) =>
            setForm(f => ({ ...f, latitude: lat, longitude: lon, location: address }))
          }
        />

        {/* Food Photo Upload */}
        <div className="form-group" style={{ marginTop: "1rem", marginBottom: "1.25rem" }}>
          <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Food Photo</span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "normal" }}>(Optional)</span>
          </label>
          <input 
            id="food-image" 
            type="file" 
            className="form-input" 
            accept="image/*"
            onChange={e => setF("image", e.target.files[0])} 
            style={{ padding: "0.4rem" }}
          />
        </div>

        <button className="btn btn-secondary btn-sm" style={{ marginBottom: "1rem" }}
          onClick={() => setShowAdv(!showAdvanced)}>
          {showAdvanced ? "▲ Hide" : "▼ Show"} AI Parameters
        </button>

        {showAdvanced && (
          <div style={{ padding: "1rem", background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: "var(--radius-sm)", marginBottom: "1rem" }}>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
              These feed the ML model for expiry prediction. Defaults work in most cases.
            </p>
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Temp (°C)</label>
                <input type="number" className="form-input" value={form.temperature}
                  onChange={e => setF("temperature", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Humidity %</label>
                <input type="number" className="form-input" value={form.humidity}
                  onChange={e => setF("humidity", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Hrs Cooked</label>
                <input type="number" className="form-input" value={form.time_since_cooked}
                  onChange={e => setF("time_since_cooked", e.target.value)} />
              </div>
            </div>
          </div>
        )}

        <button id="allocate-btn" className="btn btn-primary btn-full" onClick={handleAllocate} disabled={loading}>
          {loading ? <><span className="spinner" /> Finding best NGO…</> : "🤖 Allocate with AI"}
        </button>
      </div>

      {/* ── AI Result ── */}
      {result ? (
        <div className="card animate-in" style={{ borderColor: "rgba(16,185,129,0.3)" }}>
          <h2 className="section-title">🎯 AI Allocation Result</h2>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1.25rem" }}>
            <div>
              <p style={{ fontSize: "1.2rem", fontWeight: 800 }}>{result.allocated_to}</p>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{result.ngo_location}</p>
            </div>
            <span className={`badge ${PRIORITY_BADGE[result.priority]?.cls || "badge-green"}`}>
              {PRIORITY_BADGE[result.priority]?.label}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem", padding: "1rem", background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-sm)" }}>
            {[
              { label: "DISTANCE", val: `${result.distance_km} km` },
              { label: "AI SCORE", val: result.score, color: "var(--green-primary)" },
              { label: "PREDICTED EXPIRY", val: `${result.predicted_expiry}h` },
              { label: "NGOs EVALUATED", val: result.all_ngo_scores?.length || 1 },
            ].map(m => (
              <div key={m.label}>
                <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: "0.2rem", letterSpacing: "0.06em" }}>{m.label}</p>
                <p style={{ fontWeight: 800, fontSize: "1.1rem", color: m.color || "var(--text-primary)" }}>{m.val}</p>
              </div>
            ))}
          </div>
          {result.all_ngo_scores?.length > 1 && (
            <div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, marginBottom: "0.6rem" }}>ALL NGO SCORES (ranked)</p>
              {result.all_ngo_scores.slice(0, 5).map((n, i) => (
                <ScoreBar key={i} label={`${i + 1}. ${n.ngo} (${n.distance_km} km)`}
                  value={n.score} max={result.all_ngo_scores[0].score} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "280px", borderStyle: "dashed" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.3 }}>🤖</div>
          <p style={{ color: "var(--text-muted)", textAlign: "center", maxWidth: "240px", fontSize: "0.9rem" }}>
            Fill in the form and click <strong style={{ color: "var(--text-secondary)" }}>Allocate with AI</strong> to see the result here.
          </p>
        </div>
      )}
    </div>
  )
}

// ── History Tab ──────────────────────────────────────────────────────────────
function HistoryTab({ donations, loading, onCancel }) {
  const [filter, setFilter] = useState("all")
  const navigate = useNavigate()

  const filtered = filter === "all" ? donations : donations.filter(d => d.status === filter)
  const counts = ["all", "pending", "allocated", "cancelled", "expired"].map(s => ({
    key: s,
    label: s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1),
    count: s === "all" ? donations.length : donations.filter(d => d.status === s).length,
  }))

  return (
    <div>
      {/* Filter pills */}
      <div className="filter-bar">
        {counts.map(({ key, label, count }) => count > 0 || key === "all" ? (
          <button key={key} className={`filter-pill ${filter === key ? "active" : ""}`} onClick={() => setFilter(key)}>
            {label} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
          </button>
        ) : null)}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem" }}><span className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p className="empty-state-text">No {filter !== "all" ? filter : ""} donations found.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {filtered.map((d, i) => {
            const badge = STATUS_BADGE[d.status] || STATUS_BADGE.pending
            const ai    = d.allocation_info
            return (
              <div key={d.id} className={`history-card animate-in animate-delay-${Math.min(i, 3)}`}>
                 {/* Top row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", gap: "1rem", alignItems: "start", flex: 1, minWidth: "200px" }}>
                    {d.image && (
                      <img 
                        src={d.image} 
                        alt={d.food_type} 
                        style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "var(--radius-sm)", border: "1px solid rgba(255,255,255,0.08)", marginTop: "0.2rem" }} 
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.25rem" }}>
                        🍱 {d.food_type}
                      </p>
                      <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                        📦 {d.quantity} units &nbsp;·&nbsp; 📍 {d.location}
                      </p>
                      {d.expiry_time && (
                        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                          ⏱ Expires: {new Date(d.expiry_time).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span className={`badge ${badge.cls}`}>{badge.label}</span>
                    {d.status === "pending" && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => onCancel(d.id)}
                      >
                        Cancel
                      </button>
                    )}
                    {(d.status === "allocated" || d.status === "pending") && d.id && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/track/${d.id}`)}
                        style={{ borderColor: "rgba(16,185,129,0.3)", color: "var(--green-primary)" }}
                      >
                        📍 Track
                      </button>
                    )}
                  </div>
                </div>

                {/* Allocation inset */}
                {ai && (
                  <div className="allocation-inset">
                    <div>
                      <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.15rem" }}>ALLOCATED TO</p>
                      <p style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--green-primary)" }}>🏢 {ai.ngo_name}</p>
                      <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>📍 {ai.ngo_location}</p>
                    </div>
                    <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                      <div>
                        <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.1rem" }}>DISTANCE</p>
                        <p style={{ fontWeight: 700, fontSize: "0.95rem" }}>{ai.distance_km} km</p>
                      </div>
                      <div>
                        <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.1rem" }}>AI SCORE</p>
                        <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--green-primary)" }}>{ai.score}</p>
                      </div>
                      {ai.priority && (
                        <span className={`badge ${PRIORITY_BADGE[ai.priority]?.cls}`} style={{ alignSelf: "center" }}>
                          {PRIORITY_BADGE[ai.priority]?.label}
                        </span>
                      )}
                      <span className={`badge ${STATUS_BADGE[ai.status]?.cls || "badge-amber"}`} style={{ alignSelf: "center" }}>
                        NGO: {ai.status}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard() {
  const navigate = useNavigate()
  const username = localStorage.getItem("username") || ""
  const [activeTab, setActiveTab]       = useState("donate")
  const [donations, setDonations]       = useState([])
  const [stats, setStats]               = useState(null)
  const [loadingDonations, setLoadingD] = useState(true)

  const fetchAll = useCallback(async () => {
    try {
      const [dRes, sRes] = await Promise.all([api.get("/donations/"), api.get("/stats/")])
      setDonations(dRes.data)
      setStats(sRes.data)
    } catch { /* silent */ } finally {
      setLoadingD(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this donation?")) return
    try {
      await api.patch(`/donations/${id}/cancel/`)
      setDonations(prev => prev.map(d => d.id === id ? { ...d, status: "cancelled" } : d))
      fetchAll()
    } catch (err) {
      alert(err.response?.data?.error || "Could not cancel donation.")
    }
  }

  return (
    <>
      <Navbar />
      <div className="page">
        {/* Header */}
        <div style={{ marginBottom: "1.75rem" }} className="animate-in">
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "0.25rem" }}>Donor Dashboard</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Welcome back, <span style={{ color: "var(--green-primary)", fontWeight: 600 }}>{username}</span>.
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="stats-grid animate-in animate-delay-1">
            {[
              { icon: "🍱", val: stats.total_donations, label: "Total Donations" },
              { icon: "✅", val: stats.allocated, label: "Allocated" },
              { icon: "⏳", val: stats.pending, label: "Pending" },
              { icon: "🏢", val: stats.active_ngos, label: "Active NGOs" },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-value">{s.val}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tab bar */}
        <div className="tab-bar animate-in animate-delay-2">
          {[
            { key: "donate",  label: "🍱 New Donation" },
            { key: "history", label: `📋 History${donations.length > 0 ? ` (${donations.length})` : ""}` },
            { key: "impact",  label: "📊 Impact" },
            { key: "map",     label: "🗺️ Map" },
          ].map(t => (
            <button
              key={t.key}
              className={`tab-btn ${activeTab === t.key ? "active" : ""}`}
              onClick={() => t.key === "map" ? navigate("/map") : setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "donate" && (
          <DonateTab username={username} onSuccess={fetchAll} />
        )}

        {activeTab === "history" && (
          <div className="card animate-in">
            <h2 className="section-title">📋 Donation History</h2>
            <HistoryTab donations={donations} loading={loadingDonations} onCancel={handleCancel} />
          </div>
        )}

        {activeTab === "impact" && (
          <div className="card animate-in">
            <h2 className="section-title">📊 Ecological & Social Impact</h2>
            <ImpactTab items={donations} isNGO={false} />
          </div>
        )}
      </div>
    </>
  )
}

export default Dashboard