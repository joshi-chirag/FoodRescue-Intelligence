import { useNavigate, Link, useLocation } from "react-router-dom";

function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const username = localStorage.getItem("username") || "User";
    const role     = localStorage.getItem("role");
    const dashPath = role === "ngo" ? "/ngo" : role === "admin" ? "/admin" : "/dashboard";

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("username");
        navigate("/");
    };

    const NavLink = ({ to, children }) => (
        <Link to={to} style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: location.pathname === to ? "var(--green-primary)" : "var(--text-secondary)",
            textDecoration: "none",
            padding: "0.3rem 0.75rem",
            borderRadius: "6px",
            background: location.pathname === to ? "rgba(16,185,129,0.1)" : "transparent",
            border: location.pathname === to ? "1px solid rgba(16,185,129,0.25)" : "1px solid transparent",
            transition: "var(--transition)",
        }}>
            {children}
        </Link>
    );

    return (
        <nav style={{
            borderBottom: "1px solid var(--border)",
            background: "rgba(7, 13, 26, 0.97)",
            backdropFilter: "blur(20px)",
            position: "sticky",
            top: 0,
            zIndex: 1000,
            padding: "0 1.5rem",
        }}>
            <div style={{
                maxWidth: "1200px",
                margin: "0 auto",
                height: "60px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
            }}>
                {/* Logo */}
                <Link to={dashPath} style={{ display: "flex", alignItems: "center", gap: "0.6rem", textDecoration: "none", flexShrink: 0 }}>
                    <span style={{ fontSize: "1.4rem" }}>🌱</span>
                    <span style={{ fontWeight: 800, fontSize: "1.05rem", background: "linear-gradient(135deg, #f1f5f9, #10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        FoodRescue
                    </span>
                    <span style={{ fontSize: "0.65rem", background: "rgba(16,185,129,0.15)", color: "var(--green-primary)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "4px", padding: "1px 6px", fontWeight: 700, letterSpacing: "0.05em" }}>
                        AI
                    </span>
                </Link>

                {/* Nav links */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <NavLink to={dashPath}>
                        {role === "ngo" ? "📦 Dashboard" : role === "admin" ? "⚙️ Dashboard" : "🍱 Dashboard"}
                    </NavLink>
                    <NavLink to="/map">🗺️ Map</NavLink>
                </div>

                {/* User info + logout */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", flexShrink: 0 }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green-primary)", display: "inline-block", boxShadow: "0 0 6px rgba(16,185,129,0.6)" }} />
                        {username}
                        <span style={{
                            padding: "2px 8px", borderRadius: "4px", fontSize: "0.68rem", fontWeight: 800,
                            background: role === "ngo" ? "rgba(59,130,246,0.15)" : "rgba(16,185,129,0.15)",
                            color: role === "ngo" ? "var(--blue)" : "var(--green-primary)",
                            border: `1px solid ${role === "ngo" ? "rgba(59,130,246,0.3)" : "rgba(16,185,129,0.3)"}`,
                        }}>
                            {role?.toUpperCase()}
                        </span>
                    </span>
                    <button id="logout-btn" className="btn btn-secondary btn-sm" onClick={handleLogout}>
                        Sign out
                    </button>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
