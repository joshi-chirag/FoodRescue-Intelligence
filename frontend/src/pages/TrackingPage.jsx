import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import Navbar from "../components/Navbar";

// ── Config ────────────────────────────────────────────────────────────────────
const POLL_MS = 5000;

const OVERALL_CONFIG = {
  pending:    { label: "Awaiting Allocation",     color: "#f59e0b", bg: "rgba(245,158,11,0.10)",  icon: "⏳" },
  matched:    { label: "NGO Found · Confirming",  color: "#3b82f6", bg: "rgba(59,130,246,0.10)",  icon: "🤖" },
  collecting: { label: "Collection in Progress",  color: "#10b981", bg: "rgba(16,185,129,0.10)",  icon: "🚚" },
  delivered:  { label: "Food Delivered! 🎉",      color: "#34d399", bg: "rgba(52,211,153,0.12)",  icon: "🎉" },
  cancelled:  { label: "Donation Cancelled",      color: "#64748b", bg: "rgba(100,116,139,0.08)", icon: "🚫" },
  rejected:   { label: "NGO Rejected",            color: "#ef4444", bg: "rgba(239,68,68,0.10)",   icon: "❌" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
async function fetchOSRM(donLat, donLon, ngoLat, ngoLon) {
  const url = `https://router.project-osrm.org/route/v1/driving/${donLon},${donLat};${ngoLon},${ngoLat}?overview=false`;
  const res  = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const json = await res.json();
  if (json.code !== "Ok" || !json.routes?.[0]) throw new Error("No route");
  const r = json.routes[0];
  return { distKm: +(r.distance / 1000).toFixed(1), totalSec: Math.round(r.duration) };
}

function pad(n) { return String(Math.floor(n)).padStart(2, "0"); }

function fmtCountdown(sec) {
  if (sec <= 0) return { label: "Arriving now!", urgent: true };
  if (sec < 60)  return { label: `${sec}s`, urgent: true };
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return { label: `${m}m ${pad(s)}s`, urgent: m < 5 };
  return { label: `${Math.floor(m / 60)}h ${pad(m % 60)}m`, urgent: false };
}

// ── Confetti ─────────────────────────────────────────────────────────────────
function Confetti() {
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i, x: Math.random() * 100, delay: Math.random() * 2,
    dur: 1.5 + Math.random() * 1.5,
    color: ["#10b981","#34d399","#3b82f6","#f59e0b","#a78bfa","#f472b6","#fbbf24"][i % 7],
    size: 5 + Math.random() * 9,
  }));
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:9999, overflow:"hidden" }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position:"absolute", left:`${p.x}%`, top:"-20px",
          width:p.size, height:p.size, borderRadius: p.id % 2 === 0 ? "50%" : "2px",
          background:p.color,
          animation:`confettiFall ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
    </div>
  );
}

// ── ETA Countdown Ring ────────────────────────────────────────────────────────
function ETACountdown({ totalSec, elapsedSec, isDelivered }) {
  const remainSec = Math.max(0, totalSec - elapsedSec);
  const pct       = totalSec > 0 ? Math.min(100, (elapsedSec / totalSec) * 100) : 0;
  const { label, urgent } = fmtCountdown(remainSec);

  const R = 54;
  const C = 2 * Math.PI * R;
  const dashOffset = C * (1 - pct / 100);

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"0.5rem" }}>
      {/* SVG ring */}
      <div style={{ position:"relative", width:140, height:140 }}>
        <svg width="140" height="140" style={{ transform:"rotate(-90deg)" }}>
          {/* Track */}
          <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
          {/* Progress */}
          <circle cx="70" cy="70" r={R} fill="none"
            stroke={isDelivered ? "#34d399" : urgent ? "#ef4444" : "#10b981"}
            strokeWidth="10" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={dashOffset}
            style={{ transition:"stroke-dashoffset 1s linear, stroke 0.5s ease",
                     filter:`drop-shadow(0 0 8px ${isDelivered ? "rgba(52,211,153,0.5)" : urgent ? "rgba(239,68,68,0.5)" : "rgba(16,185,129,0.4)"})`
            }}
          />
        </svg>

        {/* Center text */}
        <div style={{
          position:"absolute", inset:0, display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center",
        }}>
          {isDelivered ? (
            <span style={{ fontSize:"2.2rem" }}>🎉</span>
          ) : (
            <>
              <span style={{
                fontSize: remainSec < 60 ? "1.2rem" : "1.5rem",
                fontWeight:800, lineHeight:1.1,
                color: urgent ? "#ef4444" : "#10b981",
                fontVariantNumeric:"tabular-nums",
                animation: urgent ? "urgentPulse 0.8s ease infinite" : "none",
              }}>
                {label}
              </span>
              <span style={{ fontSize:"0.65rem", color:"var(--text-muted)", marginTop:"0.15rem" }}>remaining</span>
            </>
          )}
        </div>
      </div>

      <div style={{ textAlign:"center" }}>
        <p style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>
          {isDelivered ? "Delivery complete!" : `${Math.round(pct)}% of route covered`}
        </p>
      </div>
    </div>
  );
}

// ── Route Info Strip ──────────────────────────────────────────────────────────
function RouteStrip({ distKm, totalSec, loading }) {
  return (
    <div style={{
      display:"grid", gridTemplateColumns:"1fr 1px 1fr",
      background:"rgba(255,255,255,0.02)", border:"1px solid var(--border)",
      borderRadius:"var(--radius-sm)", overflow:"hidden", marginTop:"1rem",
    }}>
      {[
        {
          label: "🛣️ ROAD DISTANCE",
          val:   loading ? "…" : distKm ? `${distKm} km` : "—",
          sub:   loading ? "Calculating route…" : distKm ? "via real roads" : "no coordinates set",
          color: distKm ? "var(--text-primary)" : "var(--text-muted)",
        },
        null,
        {
          label: "🚗 DRIVE TIME",
          val:   loading ? "…" : totalSec ? `${Math.ceil(totalSec / 60)} min` : "—",
          sub:   loading ? "Please wait…" : totalSec ? "real ETA" : "unavailable",
          color: totalSec ? "var(--green-primary)" : "var(--text-muted)",
        },
      ].map((item, i) =>
        item === null
          ? <div key={i} style={{ background:"var(--border)" }} />
          : <div key={i} style={{ padding:"0.875rem 0.75rem", textAlign:"center" }}>
              <p style={{ fontSize:"0.62rem", color:"var(--text-muted)", letterSpacing:"0.07em", marginBottom:"0.35rem" }}>{item.label}</p>
              {loading
                ? <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"0.4rem" }}>
                    <span className="spinner" style={{ width:14, height:14, borderWidth:2 }} />
                    <span style={{ fontSize:"0.78rem", color:"var(--text-muted)" }}>{item.sub}</span>
                  </div>
                : <>
                    <p style={{ fontWeight:800, fontSize:"1.35rem", color:item.color, lineHeight:1 }}>{item.val}</p>
                    <p style={{ fontSize:"0.68rem", color:"var(--text-muted)", marginTop:"0.25rem" }}>{item.sub}</p>
                  </>
              }
            </div>
      )}
    </div>
  );
}


// ── Timeline Step ─────────────────────────────────────────────────────────────
function Step({ step, isLast, index, totalDone }) {
  const isActive = !step.done && index === totalDone;
  const isPast   = step.done;
  return (
    <div style={{ display:"flex", gap:"1.25rem", position:"relative" }}>
      {!isLast && (
        <div style={{
          position:"absolute", left:21, top:46, width:2, height:"calc(100% - 12px)",
          background: isPast ? "var(--green-primary)" : "rgba(255,255,255,0.07)",
          transition:"background 0.8s ease", zIndex:0,
        }} />
      )}
      <div style={{ position:"relative", flexShrink:0, zIndex:1 }}>
        <div style={{
          width:44, height:44, borderRadius:"50%",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize: isPast ? "1.25rem" : "1.1rem",
          background: isPast ? "linear-gradient(135deg,#10b981,#059669)" : isActive ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)",
          border:`2px solid ${isPast ? "#10b981" : isActive ? "#10b981" : "rgba(255,255,255,0.09)"}`,
          transition:"all 0.6s ease",
          boxShadow: isPast ? "0 0 18px rgba(16,185,129,0.3)" : isActive ? "0 0 12px rgba(16,185,129,0.18)" : "none",
        }}>{step.icon}</div>
        {isActive && <div style={{ position:"absolute", inset:-5, borderRadius:"50%", border:"2px solid #10b981", animation:"trackPulse 1.8s ease-out infinite" }} />}
      </div>
      <div style={{ paddingBottom: isLast ? 0 : "2rem", flex:1 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"0.2rem", marginTop:"0.65rem" }}>
          <p style={{ fontWeight:700, fontSize:"0.95rem", color: isPast ? "var(--text-primary)" : isActive ? "#10b981" : "var(--text-muted)", transition:"color 0.4s" }}>
            {step.label}
          </p>
          {isPast  && <span style={{ fontSize:"0.68rem", fontWeight:700, color:"#10b981", background:"rgba(16,185,129,0.1)", padding:"1px 8px", borderRadius:"100px", border:"1px solid rgba(16,185,129,0.22)" }}>✓ Done</span>}
          {isActive && <span style={{ fontSize:"0.68rem", fontWeight:700, color:"#f59e0b", background:"rgba(245,158,11,0.1)", padding:"1px 8px", borderRadius:"100px", border:"1px solid rgba(245,158,11,0.25)", animation:"blink 1.4s ease infinite" }}>● Live</span>}
        </div>
        <p style={{ fontSize:"0.82rem", color: isActive ? "var(--text-secondary)" : "var(--text-muted)", lineHeight:1.45 }}>{step.description}</p>
        {step.time && <p style={{ fontSize:"0.72rem", color:"var(--text-muted)", marginTop:"0.2rem" }}>🕐 {step.time}</p>}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function TrackingPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [secAgo, setSecAgo]   = useState(0);
  const [showConfetti, setConfetti] = useState(false);

  // Route from OSRM
  const [route, setRoute]       = useState(null);
  const [routeLoad, setRL]      = useState(false);

  // ── Countdown state ──
  // startEpoch = when collection began (stored in localStorage per donation)
  const [startEpoch, setStartEpoch] = useState(null);
  const [elapsedSec, setElapsed]    = useState(0);

  const prevStatus   = useRef(null);
  const lastUpd      = useRef(null);
  const routeFetched = useRef(false);

  // ── Fetch OSRM once ─────────────────────────────────────────────────────────
  const fetchRoute = useCallback(async (dLat, dLon, nLat, nLon) => {
    if (!dLat || !dLon || !nLat || !nLon || routeFetched.current) return;
    routeFetched.current = true;
    setRL(true);
    try {
      const r = await fetchOSRM(dLat, dLon, nLat, nLon);
      setRoute(r);
    } catch { routeFetched.current = false; }
    finally { setRL(false); }
  }, []);

  // ── Poll tracking API ────────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get(`/donations/${id}/track/`);
      const d   = res.data;
      setData(d);
      lastUpd.current = Date.now();
      setSecAgo(0);

      // Confetti on delivery
      if (prevStatus.current !== "delivered" && d.overall_status === "delivered") {
        setConfetti(true);
        setTimeout(() => setConfetti(false), 5000);
      }
      prevStatus.current = d.overall_status;
      setError("");

      // Start countdown when status becomes "collecting" (NGO accepted)
      if (d.overall_status === "collecting" || d.overall_status === "matched") {
        const key = `trackStart_${id}`;
        let stored = localStorage.getItem(key);
        if (!stored) { stored = String(Date.now()); localStorage.setItem(key, stored); }
        setStartEpoch(parseInt(stored));
      }

      if (d.donation && d.allocation) {
        fetchRoute(d.donation.latitude, d.donation.longitude, d.allocation.ngo_latitude, d.allocation.ngo_longitude);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load tracking info.");
    } finally {
      setLoading(false);
    }
  }, [id, fetchRoute]);

  useEffect(() => {
    fetchStatus();
    const poll = setInterval(fetchStatus, POLL_MS);
    return () => clearInterval(poll);
  }, [fetchStatus]);

  // ── Tick every second ─────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = setInterval(() => {
      setSecAgo(s => s + 1);
      if (startEpoch) setElapsed(Math.floor((Date.now() - startEpoch) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [startEpoch]);

  // ── Loading / Error ──────────────────────────────────────────────────────────
  if (loading) return (
    <><Navbar />
      <div style={{ minHeight:"80vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:"1rem" }}>
        <span className="spinner" style={{ width:42, height:42, borderWidth:3 }} />
        <p style={{ color:"var(--text-muted)" }}>Loading tracking info…</p>
      </div>
    </>
  );
  if (error) return (
    <><Navbar />
      <div style={{ minHeight:"80vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:"1rem" }}>
        <div style={{ fontSize:"2.5rem" }}>⚠️</div>
        <p style={{ color:"var(--red)" }}>{error}</p>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>← Back</button>
      </div>
    </>
  );

  const cfg         = OVERALL_CONFIG[data.overall_status] || OVERALL_CONFIG.pending;
  const totalDone   = data.steps.filter(s => s.done).length;
  const isDelivered = data.overall_status === "delivered";
  const isActive    = !["delivered","cancelled","rejected"].includes(data.overall_status);
  const isCollecting = data.overall_status === "collecting" || data.overall_status === "matched";

  return (
    <>
      <Navbar />
      {showConfetti && <Confetti />}

      <style>{`
        @keyframes trackPulse { 0%{transform:scale(0.9);opacity:0.9} 100%{transform:scale(1.6);opacity:0} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes confettiFall { 0%{transform:translateY(-30px) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0} }
        @keyframes urgentPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div className="page" style={{ maxWidth:780 }}>
        <button className="btn btn-secondary btn-sm" style={{ marginBottom:"1.25rem" }} onClick={() => navigate(-1)}>
          ← Back
        </button>

        {/* ── Header ── */}
        <div className="card animate-in" style={{ marginBottom:"1.25rem", borderColor:cfg.color+"55", background:`linear-gradient(135deg,${cfg.bg},var(--bg-card))` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"start", flexWrap:"wrap", gap:"1.25rem" }}>

            {/* Left */}
            <div style={{ display: "flex", gap: "1.25rem", alignItems: "start" }}>
              {data.donation.image && (
                <img 
                  src={data.donation.image} 
                  alt={data.donation.food_type} 
                  style={{ width: "70px", height: "70px", objectFit: "cover", borderRadius: "var(--radius-sm)", border: "1px solid rgba(255,255,255,0.08)", marginTop: "0.25rem" }} 
                />
              )}
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:"0.875rem", marginBottom:"0.6rem" }}>
                  <span style={{ fontSize:"2.5rem", lineHeight:1 }}>{cfg.icon}</span>
                  <div>
                    <p style={{ fontSize:"1.45rem", fontWeight:800, lineHeight:1.1 }}>{data.donation.food_type}</p>
                    <p style={{ color:"var(--text-secondary)", fontSize:"0.84rem", marginTop:"0.2rem" }}>
                      📦 {data.donation.quantity} units &nbsp;·&nbsp; 📍 {data.donation.location}
                    </p>
                  </div>
                </div>
                <span style={{ display:"inline-flex", alignItems:"center", gap:"0.4rem", padding:"0.3rem 1rem", borderRadius:"100px", background:cfg.bg, border:`1px solid ${cfg.color}44`, color:cfg.color, fontWeight:700, fontSize:"0.84rem" }}>
                  {cfg.label}
                </span>

                {/* Live badge */}
                <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginTop:"0.75rem" }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:isDelivered?"#34d399":"#f59e0b", display:"inline-block", boxShadow:`0 0 8px ${isDelivered?"rgba(52,211,153,0.6)":"rgba(245,158,11,0.6)"}`, animation:isActive?"blink 1.4s ease infinite":"none" }} />
                  <span style={{ fontSize:"0.78rem", fontWeight:700, color:isDelivered?"#34d399":"#f59e0b" }}>
                    {isDelivered ? "Completed" : isActive ? "LIVE" : "Ended"}
                  </span>
                  <span style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>· Updated {secAgo === 0 ? "just now" : `${secAgo}s ago`}</span>
                </div>
              </div>
            </div>

            {/* Right — ETA Countdown Ring */}
            {(isCollecting || isDelivered) && route ? (
              <ETACountdown
                totalSec={route.totalSec}
                elapsedSec={isDelivered ? route.totalSec : elapsedSec}
                isDelivered={isDelivered}
              />
            ) : routeLoad ? (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"0.5rem" }}>
                <span className="spinner" style={{ width:40, height:40, borderWidth:3 }} />
                <span style={{ fontSize:"0.75rem", color:"var(--text-muted)" }}>Calculating route…</span>
              </div>
            ) : null}
          </div>

          {/* Progress bar */}
          <div style={{ marginTop:"1.25rem" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"0.4rem" }}>
              <span style={{ fontSize:"0.75rem", color:"var(--text-muted)" }}>{totalDone} of {data.steps.length} steps complete</span>
              <span style={{ fontSize:"0.75rem", fontWeight:700, color:cfg.color }}>{data.progress_pct}%</span>
            </div>
            <div style={{ height:8, background:"rgba(255,255,255,0.06)", borderRadius:100, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${data.progress_pct}%`, background:"linear-gradient(90deg,#10b981,#34d399)", borderRadius:100, transition:"width 0.9s cubic-bezier(0.4,0,0.2,1)", boxShadow:"0 0 14px rgba(16,185,129,0.5)" }} />
            </div>
          </div>
        </div>

        {/* ── NGO + Route ── */}
        {data.allocation && (
          <div className="card animate-in animate-delay-1" style={{ marginBottom:"1.25rem" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"0.875rem" }}>
              <div style={{ width:48, height:48, borderRadius:"50%", background:"rgba(59,130,246,0.1)", border:"2px solid rgba(59,130,246,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.4rem" }}>🏢</div>
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:800, fontSize:"1.05rem" }}>{data.allocation.ngo_name}</p>
                <p style={{ fontSize:"0.82rem", color:"var(--text-secondary)" }}>📍 {data.allocation.ngo_location}</p>
              </div>
              <div style={{ display:"flex", gap:"0.5rem" }}>
                <span className={`badge ${data.allocation.priority === "HIGH" ? "badge-red" : "badge-green"}`}>
                  {data.allocation.priority === "HIGH" ? "⚡ HIGH" : "✅ NORMAL"}
                </span>
                <span style={{ padding:"2px 10px", borderRadius:"100px", background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.25)", fontSize:"0.75rem", fontWeight:700, color:"#10b981" }}>
                  Score {data.allocation.score}
                </span>
              </div>
            </div>

            <RouteStrip
              distKm={route?.distKm}
              totalSec={route?.totalSec}
              loading={routeLoad}
            />

            {route && (
              <p style={{ fontSize:"0.72rem", color:"var(--text-muted)", textAlign:"center", marginTop:"0.6rem" }}>
                📡 Real road distance via OpenStreetMap OSRM
              </p>
            )}
          </div>
        )}

        {/* ── Timeline ── */}
        <div className="card animate-in animate-delay-2">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
            <h2 className="section-title" style={{ margin:0 }}>📍 Delivery Timeline</h2>
            <span style={{ fontSize:"0.74rem", color:"var(--text-muted)", display:"flex", alignItems:"center", gap:"0.4rem" }}>
              {isActive
                ? <><span style={{ width:6, height:6, borderRadius:"50%", background:"#f59e0b", display:"inline-block", animation:"blink 1.4s ease infinite" }} /> Live · every {POLL_MS/1000}s</>
                : <><span style={{ width:6, height:6, borderRadius:"50%", background:"#34d399", display:"inline-block" }} /> Completed</>
              }
            </span>
          </div>
          {data.steps.map((step, i) => (
            <Step key={step.step} step={step} index={i} isLast={i === data.steps.length - 1} totalDone={totalDone} />
          ))}
        </div>

        {/* ── Delivered banner ── */}
        {isDelivered && (
          <div className="card animate-in" style={{ marginTop:"1.25rem", textAlign:"center", padding:"2rem", background:"linear-gradient(135deg,rgba(16,185,129,0.12),rgba(52,211,153,0.05))", borderColor:"rgba(16,185,129,0.35)" }}>
            <div style={{ fontSize:"3rem", marginBottom:"0.75rem" }}>🌍</div>
            <p style={{ fontWeight:800, fontSize:"1.2rem", color:"#10b981", marginBottom:"0.5rem" }}>Food Reached People in Need!</p>
            <p style={{ color:"var(--text-secondary)", fontSize:"0.9rem", lineHeight:1.6 }}>
              <strong style={{ color:"var(--text-primary)" }}>{data.donation.quantity} units of {data.donation.food_type}</strong> successfully
              distributed by <strong style={{ color:"var(--text-primary)" }}>{data.allocation?.ngo_name}</strong>. Thank you 💚
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export default TrackingPage;
