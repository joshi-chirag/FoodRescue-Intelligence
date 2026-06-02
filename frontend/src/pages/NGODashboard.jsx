import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import Navbar from "../components/Navbar";
import LocationPicker from "../components/LocationPicker";
import ImpactTab from "../components/ImpactTab";

const STATUS_BADGE = {
  pending:   { cls: "badge-amber", label: "⏳ Pending" },
  accepted:  { cls: "badge-green", label: "✅ Accepted" },
  rejected:  { cls: "badge-red",   label: "❌ Rejected" },
  completed: { cls: "badge-blue",  label: "🎉 Completed" },
};
const PRIORITY_BADGE = {
  HIGH:   { cls: "badge-red",   label: "⚡ HIGH" },
  NORMAL: { cls: "badge-green", label: "✅ NORMAL" },
};

// ── Single allocation card ───────────────────────────────────────────────────
function AllocationCard({ item, onUpdate, updating }) {
  const badge    = STATUS_BADGE[item.status] || STATUS_BADGE.pending
  const prioBadge = item.priority ? PRIORITY_BADGE[item.priority] : null
  const food     = item.food_detail
  const isPending  = item.status === "pending"
  const isAccepted = item.status === "accepted"

  return (
    <div className="history-card" style={{ borderColor: isPending ? "rgba(245,158,11,0.25)" : "var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: "0.75rem" }}>

        {/* Left — food info */}
        <div style={{ display: "flex", gap: "1rem", alignItems: "start", flex: 1, minWidth: "200px" }}>
          {food?.image && (
            <img 
              src={food.image} 
              alt={food.food_type} 
              style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "var(--radius-sm)", border: "1px solid rgba(255,255,255,0.08)", marginTop: "0.2rem" }} 
            />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
              <span style={{ fontSize: "1.25rem" }}>🍱</span>
              <span style={{ fontWeight: 800, fontSize: "1rem" }}>{food?.food_type || "Food donation"}</span>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.15rem" }}>
              📦 <strong style={{ color: "var(--text-primary)" }}>{food?.quantity}</strong> units &nbsp;·&nbsp; 📍 {food?.location}
            </p>
            {food?.expiry_time && (
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                ⏱ Expires: {new Date(food.expiry_time).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            )}
          </div>
        </div>

        {/* Middle — AI scores */}
        {(item.distance_km != null || item.score != null) && (
          <div style={{ display: "flex", gap: "1.25rem", alignItems: "center", padding: "0.5rem 0.875rem", background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-sm)", flexWrap: "wrap" }}>
            {item.distance_km != null && (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", letterSpacing: "0.06em" }}>DISTANCE</p>
                <p style={{ fontWeight: 800, fontSize: "0.95rem" }}>{item.distance_km} km</p>
              </div>
            )}
            {item.score != null && (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", letterSpacing: "0.06em" }}>AI SCORE</p>
                <p style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--green-primary)" }}>{item.score}</p>
              </div>
            )}
            {prioBadge && <span className={`badge ${prioBadge.cls}`}>{prioBadge.label}</span>}
          </div>
        )}

        {/* Right — status + actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span className={`badge ${badge.cls}`}>{badge.label}</span>
          {isPending && (
            <>
              <button id={`accept-${item.id}`} className="btn btn-primary btn-sm"
                disabled={updating === item.id} onClick={() => onUpdate(item.id, "accepted")}>
                {updating === item.id ? <span className="spinner" /> : "Accept"}
              </button>
              <button id={`reject-${item.id}`} className="btn btn-danger btn-sm"
                disabled={updating === item.id} onClick={() => onUpdate(item.id, "rejected")}>
                Reject
              </button>
            </>
          )}
          {isAccepted && (
            <button id={`complete-${item.id}`} className="btn btn-secondary btn-sm"
              disabled={updating === item.id} onClick={() => onUpdate(item.id, "completed")}>
              {updating === item.id ? <span className="spinner" /> : "Mark Complete ✓"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Incoming Tab (pending only) ──────────────────────────────────────────────
function IncomingTab({ allocations, loading, onUpdate, updating }) {
  const pending = allocations.filter(a => a.status === "pending")
  return loading ? (
    <div style={{ textAlign: "center", padding: "3rem" }}>
      <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
    </div>
  ) : pending.length === 0 ? (
    <div className="empty-state">
      <div className="empty-state-icon">📭</div>
      <p className="empty-state-text">No pending allocations. The AI engine will route donations to you soon.</p>
    </div>
  ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
      {pending.map((item, i) => (
        <AllocationCard key={item.id} item={item} onUpdate={onUpdate} updating={updating} />
      ))}
    </div>
  )
}

// ── History Tab (all past) ───────────────────────────────────────────────────
function HistoryTab({ allocations, loading, onUpdate, updating }) {
  const [filter, setFilter] = useState("all")
  const past     = allocations.filter(a => a.status !== "pending")
  const filtered = filter === "all" ? past : past.filter(a => a.status === filter)

  const counts = ["all", "accepted", "completed", "rejected"].map(s => ({
    key: s, label: s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1),
    count: s === "all" ? past.length : past.filter(a => a.status === s).length,
  }))

  return (
    <div>
      <div className="filter-bar">
        {counts.map(({ key, label, count }) => (count > 0 || key === "all") && (
          <button key={key} className={`filter-pill ${filter === key ? "active" : ""}`} onClick={() => setFilter(key)}>
            {label} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
          </button>
        ))}
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem" }}><span className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p className="empty-state-text">No {filter !== "all" ? filter : ""} allocations yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {filtered.map(item => (
            <AllocationCard key={item.id} item={item} onUpdate={onUpdate} updating={updating} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab() {
  const [ngo, setNgo]         = useState(null);
  const [form, setForm]       = useState({ location: "", latitude: "", longitude: "", capacity: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError]     = useState("");

  useEffect(() => {
    api.get("/my-ngo/").then(res => {
      setNgo(res.data);
      setForm({
        location:  res.data.location  || "",
        latitude:  res.data.latitude  ? String(res.data.latitude)  : "",
        longitude: res.data.longitude ? String(res.data.longitude) : "",
        capacity:  res.data.capacity  ? String(res.data.capacity)  : "",
      });
    }).catch(() => setError("Failed to load NGO profile."))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!form.location) { setError("Location name is required."); return; }
    try {
      setSaving(true); setError(""); setSuccess("");
      const res = await api.patch("/my-ngo/", {
        location:  form.location,
        latitude:  form.latitude  ? parseFloat(form.latitude)  : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        capacity:  form.capacity  ? parseInt(form.capacity)    : ngo?.capacity,
      });
      setNgo(res.data.ngo);
      setSuccess("✅ Profile updated! AI will now use your real location for smarter matching.");
      setTimeout(() => setSuccess(""), 5000);
    } catch { setError("Failed to save. Try again."); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ textAlign: "center", padding: "3rem" }}><span className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 560 }}>
      <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.6 }}>
        Set your NGO's exact location so the AI can accurately calculate distance from donors
        and prioritise routing donations to you. Use GPS or type your address below.
      </p>

      {/* Current info */}
      {ngo && (
        <div style={{ padding: "0.875rem 1rem", background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "var(--radius-sm)", marginBottom: "1.25rem" }}>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.35rem", letterSpacing: "0.06em" }}>CURRENT PROFILE</p>
          <p style={{ fontWeight: 700, marginBottom: "0.2rem" }}>🏢 {ngo.name}</p>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>📍 {ngo.location || "Not set"}</p>
          {ngo.latitude && ngo.longitude ? (
            <p style={{ fontSize: "0.78rem", color: "var(--green-primary)", marginTop: "0.3rem" }}>
              ✅ Coordinates: {ngo.latitude}, {ngo.longitude}
            </p>
          ) : (
            <p style={{ fontSize: "0.78rem", color: "var(--amber)", marginTop: "0.3rem" }}>
              ⚠️ No coordinates — AI cannot match you accurately
            </p>
          )}
        </div>
      )}

      {/* LocationPicker */}
      <LocationPicker
        lat={form.latitude}
        lon={form.longitude}
        address={form.location}
        onChange={({ lat, lon, address }) =>
          setForm(f => ({ ...f, latitude: lat, longitude: lon, location: address }))
        }
      />

      {/* Capacity */}
      <div className="form-group" style={{ marginTop: "1rem" }}>
        <label className="form-label">Capacity (max food units you can handle)</label>
        <input type="number" className="form-input" placeholder="e.g. 200"
          value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
      </div>

      {error   && <div className="alert alert-error"   style={{ marginTop: "0.75rem" }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginTop: "0.75rem" }}>{success}</div>}

      <button className="btn btn-primary" style={{ marginTop: "1rem", width: "100%" }} onClick={handleSave} disabled={saving}>
        {saving ? <><span className="spinner" /> Saving…</> : "💾 Save Location"}
      </button>
    </div>
  );
}

// ── NGO Dashboard ────────────────────────────────────────────────────────────
function NGODashboard() {
  const navigate   = useNavigate()
  const username   = localStorage.getItem("username") || ""
  const [activeTab, setActiveTab] = useState("incoming")
  const [allocations, setAllocations] = useState([])
  const [stats, setStats]             = useState(null)
  const [loading, setLoading]         = useState(true)
  const [updating, setUpdating]       = useState(null)

  const prevPendingIdsRef = useRef([])

  const fetchAll = useCallback(async () => {
    try {
      const [aRes, sRes] = await Promise.all([api.get("/allocations/"), api.get("/stats/")])
      setAllocations(aRes.data)
      setStats(sRes.data)
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  // Request Notification permissions
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Poll allocations every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAll();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Check for new incoming allocations to trigger desktop notifications
  useEffect(() => {
    const pendingAllocations = allocations.filter(a => a.status === "pending");
    const pendingIds = pendingAllocations.map(a => a.id);
    
    // Check if we have new IDs compared to what we saw previously
    const newAllocations = pendingAllocations.filter(
      a => !prevPendingIdsRef.current.includes(a.id)
    );

    if (newAllocations.length > 0) {
      // Only notify if this isn't the initial load
      if (prevPendingIdsRef.current.length > 0) {
        newAllocations.forEach(item => {
          if ("Notification" in window && Notification.permission === "granted") {
            const title = "🍱 New Food Rescue Match!";
            const options = {
              body: `${item.food_detail?.food_type || "Food donation"} (${item.food_detail?.quantity || 0} units) from ${item.food_detail?.location || "unknown"}`,
              tag: `alloc-${item.id}`,
            };
            new Notification(title, options);
          }
        });
      }
    }
    // Update ref
    prevPendingIdsRef.current = pendingIds;
  }, [allocations]);

  useEffect(() => { fetchAll() }, [fetchAll])

  const updateStatus = async (id, newStatus) => {
    try {
      setUpdating(id)
      await api.patch(`/allocations/${id}/`, { status: newStatus })
      setAllocations(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a))
      fetchAll()
    } catch { alert("Failed to update status.") } finally { setUpdating(null) }
  }

  const pendingCount   = allocations.filter(a => a.status === "pending").length
  const acceptedCount  = allocations.filter(a => a.status === "accepted").length
  const completedCount = allocations.filter(a => a.status === "completed").length

  return (
    <>
      <Navbar />
      <div className="page">
        {/* Header */}
        <div style={{ marginBottom: "1.75rem" }} className="animate-in">
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "0.25rem" }}>NGO Dashboard</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Welcome, <span style={{ color: "var(--blue)", fontWeight: 600 }}>{username}</span>.
            Review incoming food allocations and manage distribution.
          </p>
        </div>

        {/* Stats */}
        <div className="stats-grid animate-in animate-delay-1">
          {[
            { icon: "📬", val: allocations.length, label: "Total Received" },
            { icon: "⏳", val: pendingCount, label: "Pending Action", color: "var(--amber)" },
            { icon: "✅", val: acceptedCount, label: "Accepted" },
            { icon: "🎉", val: completedCount, label: "Completed", color: "var(--blue)" },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-value" style={{ color: s.color || "var(--green-primary)" }}>{s.val}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className="tab-bar animate-in animate-delay-2">
          {[
            { key: "incoming", label: `📦 Incoming${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
            { key: "history",  label: "📋 History" },
            { key: "impact",   label: "📊 Impact" },
            { key: "settings", label: "⚙️ Settings" },
            { key: "map",      label: "🗺️ Map" },
          ].map(t => (
            <button key={t.key}
              className={`tab-btn ${activeTab === t.key ? "active" : ""}`}
              onClick={() => t.key === "map" ? navigate("/map") : setActiveTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="card animate-in animate-delay-3">
          {activeTab === "incoming" && (
            <>
              <h2 className="section-title">📦 Pending Allocations</h2>
              <IncomingTab allocations={allocations} loading={loading} onUpdate={updateStatus} updating={updating} />
            </>
          )}
          {activeTab === "history" && (
            <>
              <h2 className="section-title">📋 Allocation History</h2>
              <HistoryTab allocations={allocations} loading={loading} onUpdate={updateStatus} updating={updating} />
            </>
          )}
          {activeTab === "impact" && (
            <>
              <h2 className="section-title">📊 Ecological & Social Impact</h2>
              <ImpactTab items={allocations} isNGO={true} />
            </>
          )}
          {activeTab === "settings" && (
            <>
              <h2 className="section-title">⚙️ NGO Profile & Location</h2>
              <SettingsTab />
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default NGODashboard