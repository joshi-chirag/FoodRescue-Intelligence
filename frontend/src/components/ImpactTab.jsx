import { useState } from "react";

export default function ImpactTab({ items, isNGO = false }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  // ── 1. Calculate Metrics ───────────────────────────────────────────────────
  // Total units saved (Allocated or Completed)
  const totalUnits = items.reduce((acc, curr) => {
    const isSaved = isNGO ? curr.status === "completed" : curr.status === "allocated";
    const qty = isNGO ? (curr.food_detail?.quantity || 0) : (curr.quantity || 0);
    return isSaved ? acc + qty : acc;
  }, 0);

  // Gamified metrics
  const mealsServed = Math.round(totalUnits * 1.5);
  const co2Saved = (totalUnits * 2.5).toFixed(1); // 2.5 kg CO2 per kg food saved
  const waterSaved = Math.round(totalUnits * 150); // 150 liters water saved per kg food

  // ── 2. Calculate Status Distribution ────────────────────────────────────────
  const statusCounts = {};
  items.forEach(item => {
    const status = item.status || "pending";
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const statusColors = {
    pending: "#f59e0b",
    allocated: "#10b981",
    accepted: "#3b82f6",
    completed: "#10b981",
    expired: "#ef4444",
    cancelled: "#6b7280",
    rejected: "#ef4444"
  };

  const totalItems = items.length || 1;
  const statusPercentages = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
    percentage: Math.round((count / totalItems) * 100),
    color: statusColors[status] || "#ffffff",
  }));

  // ── 3. Data for Food Type Distribution (Bar Chart) ────────────────────────
  const foodTypeCounts = {};
  items.forEach(item => {
    const type = isNGO ? item.food_detail?.food_type : item.food_type;
    const qty = isNGO ? (item.food_detail?.quantity || 0) : (item.quantity || 0);
    if (type && qty > 0) {
      const cleanType = type.split(" ")[0].substring(0, 12); // Keep it short
      foodTypeCounts[cleanType] = (foodTypeCounts[cleanType] || 0) + qty;
    }
  });

  const topFoodTypes = Object.entries(foodTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // top 5

  const maxFoodQty = topFoodTypes.length > 0 ? Math.max(...topFoodTypes.map(t => t[1])) : 1;

  // ── 4. Donut Chart SVG Calculations ────────────────────────────────────────
  let cumulativePercent = 0;
  const donutSegments = statusPercentages.map(s => {
    const percent = s.percentage;
    const startPercent = cumulativePercent;
    cumulativePercent += percent;

    // SVG coordinates for strokeDasharray / strokeDashoffset
    // Radius = 50, Circumference = 2 * PI * 50 = 314.159
    const strokeLength = (percent / 100) * 314.159;
    const strokeOffset = 314.159 - ((startPercent / 100) * 314.159);

    return {
      ...s,
      strokeLength,
      strokeOffset,
    };
  });

  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* ── Impact Widgets Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        
        {/* Widget: Meals */}
        <div className="stat-card" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.02) 100%)", border: "1px solid rgba(16,185,129,0.15)" }}>
          <div className="stat-icon" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>😋</div>
          <div className="stat-value" style={{ color: "#10b981", fontSize: "1.8rem" }}>{mealsServed}</div>
          <div className="stat-label">Estimated Meals Shared</div>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            1 unit = 1.5 wholesome meals
          </p>
        </div>

        {/* Widget: CO2 Saved */}
        <div className="stat-card" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0.02) 100%)", border: "1px solid rgba(59,130,246,0.15)" }}>
          <div className="stat-icon" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>🌱</div>
          <div className="stat-value" style={{ color: "#3b82f6", fontSize: "1.8rem" }}>{co2Saved} kg</div>
          <div className="stat-label">CO₂ Landfill Emission Saved</div>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Helps prevent global warming
          </p>
        </div>

        {/* Widget: Water Saved */}
        <div className="stat-card" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.02) 100%)", border: "1px solid rgba(245,158,11,0.15)" }}>
          <div className="stat-icon" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>💧</div>
          <div className="stat-value" style={{ color: "#f59e0b", fontSize: "1.8rem" }}>{waterSaved.toLocaleString()} L</div>
          <div className="stat-label">Water Footprint Recovered</div>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Saved from agricultural waste
          </p>
        </div>
      </div>

      {/* ── Charts Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
        
        {/* ── Donut Chart: Status Distribution ── */}
        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "1.5rem" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 700, alignSelf: "start", marginBottom: "1rem", color: "var(--text-secondary)" }}>
            📊 Status Distribution
          </h3>
          
          {items.length === 0 ? (
            <p style={{ color: "var(--text-muted)", margin: "auto", fontSize: "0.85rem" }}>No data available</p>
          ) : (
            <div style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-around", flexWrap: "wrap", gap: "1rem" }}>
              {/* Donut SVG */}
              <div style={{ position: "relative", width: "140px", height: "140px" }}>
                <svg width="100%" height="100%" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                  {donutSegments.map((seg, i) => (
                    <circle
                      key={i}
                      cx="60"
                      cy="60"
                      r="50"
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth={hoveredIdx === i ? "16" : "12"}
                      strokeDasharray="314.159"
                      strokeDashoffset={seg.strokeOffset}
                      transform="rotate(-90 60 60)"
                      style={{
                        transition: "stroke-width 0.2s, stroke-dashoffset 1s",
                        cursor: "pointer",
                      }}
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />
                  ))}
                </svg>
                {/* Text overlay in center */}
                <div style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                  pointerEvents: "none"
                }}>
                  <p style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0 }}>{items.length}</p>
                  <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", margin: 0, letterSpacing: "0.05em" }}>TOTAL</p>
                </div>
              </div>

              {/* Legends */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {donutSegments.map((seg, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: "0.8rem",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: hoveredIdx === i ? "rgba(255,255,255,0.04)" : "transparent",
                      cursor: "pointer"
                    }}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: seg.color }} />
                    <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                      {seg.status.charAt(0).toUpperCase() + seg.status.slice(1)}
                    </span>
                    <strong style={{ marginLeft: "auto", color: "var(--text-primary)" }}>
                      {seg.count} ({seg.percentage}%)
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Bar Chart: Top Food Types (Quantity) ── */}
        <div className="card" style={{ display: "flex", flexDirection: "column", padding: "1.5rem" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-secondary)" }}>
            📈 Top Rescued Foods (by Units)
          </h3>

          {topFoodTypes.length === 0 ? (
            <p style={{ color: "var(--text-muted)", margin: "auto", fontSize: "0.85rem" }}>No data available</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", justifyContent: "center", flex: 1 }}>
              {topFoodTypes.map(([type, qty], i) => {
                const widthPct = Math.max(10, (qty / maxFoodQty) * 100);
                return (
                  <div key={type} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    {/* Label */}
                    <div style={{ width: "75px", fontSize: "0.78rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-secondary)" }}>
                      {type}
                    </div>
                    {/* Bar */}
                    <div style={{ flex: 1, height: "18px", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "9px", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${widthPct}%`,
                          height: "100%",
                          background: "linear-gradient(90deg, var(--green-primary) 0%, #3b82f6 100%)",
                          borderRadius: "9px",
                          transition: "width 1s ease-out",
                        }}
                      />
                    </div>
                    {/* Value */}
                    <div style={{ width: "35px", textAlign: "right", fontSize: "0.8rem", fontWeight: 800 }}>
                      {qty}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
