import { useEffect, useState, useCallback } from "react";
import api from "../api";
import Navbar from "../components/Navbar";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [ngos, setNgos] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cleanupLoading, setCleanupLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [uRes, nRes, sRes] = await Promise.all([
        api.get("/admin/users/"),
        api.get("/admin/ngos/"),
        api.get("/stats/")
      ]);
      setUsers(uRes.data);
      setNgos(nRes.data);
      setStats(sRes.data);
    } catch {
      setError("Failed to fetch admin data. Make sure you are logged in as an Admin.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRunCleanup = async () => {
    try {
      setCleanupLoading(true);
      setSuccess("");
      setError("");
      const res = await api.post("/admin/cleanup-expired/");
      setSuccess(`✅ Expiry cleanup completed. ${res.data.count} expired donations marked.`);
      setTimeout(() => setSuccess(""), 5000);
      await fetchData();
    } catch {
      setError("Failed to run expiry cleanup.");
    } finally {
      setCleanupLoading(false);
    }
  };

  // ── 1. USER ACTIONS ─────────────────────────────────────────────────────────
  const handleToggleUserActive = async (id, currentActive) => {
    try {
      setSuccess(""); setError("");
      await api.patch(`/admin/users/${id}/`, { is_active: !currentActive });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: !currentActive } : u));
      setSuccess("✅ User active status updated successfully.");
      setTimeout(() => setSuccess(""), 4000);
    } catch {
      setError("Failed to update user active status.");
    }
  };

  const handleChangeUserRole = async (id, newRole) => {
    try {
      setSuccess(""); setError("");
      await api.patch(`/admin/users/${id}/`, { role: newRole });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
      setSuccess("✅ User role updated successfully.");
      setTimeout(() => setSuccess(""), 4000);
    } catch {
      setError("Failed to update user role.");
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      setSuccess(""); setError("");
      await api.delete(`/admin/users/${id}/`);
      setUsers(prev => prev.filter(u => u.id !== id));
      setSuccess(`🗑️ User "${name}" has been deleted.`);
      setTimeout(() => setSuccess(""), 4000);
    } catch {
      setError("Failed to delete user.");
    }
  };

  // ── 2. NGO ACTIONS ──────────────────────────────────────────────────────────
  const handleToggleNgoActive = async (id, currentActive) => {
    try {
      setSuccess(""); setError("");
      await api.patch(`/admin/ngos/${id}/`, { is_active: !currentActive });
      setNgos(prev => prev.map(n => n.id === id ? { ...n, is_active: !currentActive } : n));
      setSuccess("✅ NGO active status updated.");
      setTimeout(() => setSuccess(""), 4000);
    } catch {
      setError("Failed to update NGO active status.");
    }
  };

  const handleUpdateNgoCapacity = async (id, name, currentCapacity) => {
    const input = window.prompt(`Enter new capacity for NGO "${name}":`, currentCapacity);
    if (input === null) return;
    const capacity = parseInt(input);
    if (isNaN(capacity) || capacity < 0) {
      alert("Invalid capacity value.");
      return;
    }
    try {
      setSuccess(""); setError("");
      await api.patch(`/admin/ngos/${id}/`, { capacity });
      setNgos(prev => prev.map(n => n.id === id ? { ...n, capacity } : n));
      setSuccess("✅ NGO capacity updated.");
      setTimeout(() => setSuccess(""), 4000);
    } catch {
      setError("Failed to update NGO capacity.");
    }
  };

  return (
    <>
      <Navbar />
      <div className="page animate-in">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "0.25rem" }}>Admin Command Center</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Platform-wide management of users, organizations, and rescue statistics.
            </p>
          </div>
          <button
            onClick={handleRunCleanup}
            disabled={cleanupLoading}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            {cleanupLoading ? (
              <>
                <span className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px", display: "inline-block" }} /> Running...
              </>
            ) : (
              "⏳ Run Expiry Cleanup"
            )}
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* stats */}
        {stats && (
          <div className="stats-grid animate-in animate-delay-1" style={{ marginBottom: "1.5rem" }}>
            {[
              { icon: "🍱", val: stats.total_donations, label: "Total Donations" },
              { icon: "✅", val: stats.allocated, label: "Total Allocated" },
              { icon: "⏳", val: stats.pending, label: "Awaiting Rescue" },
              { icon: "🏢", val: ngos.length, label: "Total NGOs Registered" },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-value">{s.val}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs navigation */}
        <div className="tab-bar animate-in animate-delay-2" style={{ marginBottom: "1.25rem" }}>
          {[
            { key: "users", label: `👥 Users Management (${users.length})` },
            { key: "ngos", label: `🏢 NGOs Capacity (${ngos.length})` }
          ].map(t => (
            <button
              key={t.key}
              className={`tab-btn ${activeTab === t.key ? "active" : ""}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem" }}><span className="spinner" /></div>
        ) : (
          <div className="card animate-in animate-delay-3" style={{ padding: 0, overflowX: "auto" }}>
            {activeTab === "users" && (
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "0.875rem 1rem", color: "var(--text-muted)", fontWeight: 700 }}>USERNAME</th>
                    <th style={{ padding: "0.875rem 1rem", color: "var(--text-muted)", fontWeight: 700 }}>EMAIL</th>
                    <th style={{ padding: "0.875rem 1rem", color: "var(--text-muted)", fontWeight: 700 }}>ROLE</th>
                    <th style={{ padding: "0.875rem 1rem", color: "var(--text-muted)", fontWeight: 700 }}>STATUS</th>
                    <th style={{ padding: "0.875rem 1rem", color: "var(--text-muted)", fontWeight: 700 }}>DATE JOINED</th>
                    <th style={{ padding: "0.875rem 1rem", color: "var(--text-muted)", fontWeight: 700, textAlign: "right" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "1rem", fontWeight: 700 }}>{u.username}</td>
                      <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>{u.email || "—"}</td>
                      <td style={{ padding: "1rem" }}>
                        <select
                          value={u.role}
                          onChange={e => handleChangeUserRole(u.id, e.target.value)}
                          className="form-input"
                          style={{ width: "fit-content", padding: "0.2rem 0.5rem", height: "auto", fontSize: "0.82rem" }}
                        >
                          <option value="donor">Donor</option>
                          <option value="ngo">NGO</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <span className={`badge ${u.is_active ? "badge-green" : "badge-gray"}`}>
                          {u.is_active ? "Active" : "Deactivated"}
                        </span>
                      </td>
                      <td style={{ padding: "1rem", color: "var(--text-muted)" }}>{u.date_joined}</td>
                      <td style={{ padding: "1rem", textAlign: "right" }}>
                        <button
                          className={`btn ${u.is_active ? "btn-danger" : "btn-secondary"} btn-sm`}
                          style={{ marginRight: "0.5rem" }}
                          onClick={() => handleToggleUserActive(u.id, u.is_active)}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteUser(u.id, u.username)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "ngos" && (
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "0.875rem 1rem", color: "var(--text-muted)", fontWeight: 700 }}>NGO NAME</th>
                    <th style={{ padding: "0.875rem 1rem", color: "var(--text-muted)", fontWeight: 700 }}>LOCATION</th>
                    <th style={{ padding: "0.875rem 1rem", color: "var(--text-muted)", fontWeight: 700 }}>CAPACITY</th>
                    <th style={{ padding: "0.875rem 1rem", color: "var(--text-muted)", fontWeight: 700 }}>EMAIL/PHONE</th>
                    <th style={{ padding: "0.875rem 1rem", color: "var(--text-muted)", fontWeight: 700 }}>COORDINATES</th>
                    <th style={{ padding: "0.875rem 1rem", color: "var(--text-muted)", fontWeight: 700 }}>STATUS</th>
                    <th style={{ padding: "0.875rem 1rem", color: "var(--text-muted)", fontWeight: 700, textAlign: "right" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {ngos.map(n => (
                    <tr key={n.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "1rem", fontWeight: 700 }}>{n.name}</td>
                      <td style={{ padding: "1rem", color: "var(--text-secondary)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.location || "—"}</td>
                      <td style={{ padding: "1rem" }}>
                        <span style={{ fontWeight: 800, color: "var(--green-primary)" }}>{n.capacity}</span> units
                      </td>
                      <td style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        {n.email && <div>📧 {n.email}</div>}
                        {n.phone && <div>📞 {n.phone}</div>}
                        {!n.email && !n.phone && "—"}
                      </td>
                      <td style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        {n.latitude && n.longitude ? `${n.latitude}, ${n.longitude}` : "⚠️ Not Set"}
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <span className={`badge ${n.is_active ? "badge-green" : "badge-gray"}`}>
                          {n.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ padding: "1rem", textAlign: "right" }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ marginRight: "0.5rem" }}
                          onClick={() => handleUpdateNgoCapacity(n.id, n.name, n.capacity)}
                        >
                          Capacity
                        </button>
                        <button
                          className={`btn ${n.is_active ? "btn-danger" : "btn-primary"} btn-sm`}
                          onClick={() => handleToggleNgoActive(n.id, n.is_active)}
                        >
                          {n.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </>
  );
}
