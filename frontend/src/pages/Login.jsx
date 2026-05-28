import { useState, useEffect } from "react";
import api from "../api";
import { useNavigate, Link } from "react-router-dom";

function Login() {
    const navigate = useNavigate();
    const [data, setData] = useState({ username: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const getRedirectPath = (role) => {
        if (role === "ngo") return "/ngo";
        if (role === "admin") return "/admin";
        return "/dashboard";
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        const role = localStorage.getItem("role");
        if (token) {
            navigate(getRedirectPath(role));
        }
    }, []);

    const handleLogin = async () => {
        if (!data.username || !data.password) {
            setError("Please enter your username and password.");
            return;
        }
        try {
            setLoading(true);
            setError("");
            const res = await api.post("/login/", data);
            localStorage.setItem("token", res.data.access);
            localStorage.setItem("role", res.data.role);
            localStorage.setItem("username", res.data.username);
            navigate(getRedirectPath(res.data.role));
        } catch {
            setError("Invalid credentials. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleKey = (e) => {
        if (e.key === "Enter") handleLogin();
    };

    return (
        <div className="page-full" style={{
            background: "radial-gradient(ellipse at top left, rgba(16,185,129,0.08) 0%, transparent 60%), var(--bg-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "1.5rem",
        }}>
            <div style={{ width: "100%", maxWidth: "420px" }}>

                {/* Logo */}
                <div style={{ textAlign: "center", marginBottom: "2.5rem" }} className="animate-in">
                    <div style={{
                        fontSize: "3.5rem",
                        marginBottom: "0.75rem",
                        filter: "drop-shadow(0 0 20px rgba(16,185,129,0.4))"
                    }}>🌱</div>
                    <h1 style={{
                        fontSize: "1.75rem",
                        fontWeight: 800,
                        background: "linear-gradient(135deg, #f1f5f9, #10b981)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        marginBottom: "0.5rem",
                    }}>FoodRescue Intelligence</h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                        AI-powered food redistribution platform
                    </p>
                </div>

                {/* Card */}
                <div className="card animate-in animate-delay-1">
                    <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1.75rem" }}>
                        Sign in to your account
                    </h2>

                    {error && <div className="alert alert-error">{error}</div>}

                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input
                            id="login-username"
                            className="form-input"
                            placeholder="Enter your username"
                            value={data.username}
                            onChange={(e) => setData({ ...data, username: e.target.value })}
                            onKeyDown={handleKey}
                        />
                    </div>

                    <div className="form-group">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <label className="form-label">Password</label>
                            <Link to="/forgot-password" style={{ color: "var(--text-muted)", fontSize: "0.8rem", textDecoration: "none", fontWeight: 500 }}>
                                Forgot Password?
                            </Link>
                        </div>
                        <input
                            id="login-password"
                            className="form-input"
                            type="password"
                            placeholder="Enter your password"
                            value={data.password}
                            onChange={(e) => setData({ ...data, password: e.target.value })}
                            onKeyDown={handleKey}
                        />
                    </div>

                    <button
                        id="login-btn"
                        className="btn btn-primary btn-full"
                        style={{ marginTop: "0.5rem" }}
                        onClick={handleLogin}
                        disabled={loading}
                    >
                        {loading ? <><span className="spinner" /> Signing in...</> : "Sign In →"}
                    </button>

                    <p style={{
                        textAlign: "center",
                        marginTop: "1.5rem",
                        color: "var(--text-secondary)",
                        fontSize: "0.9rem"
                    }}>
                        New to FoodRescue?{" "}
                        <Link to="/register" style={{ color: "var(--green-primary)", fontWeight: 600, textDecoration: "none" }}>
                            Create an account
                        </Link>
                    </p>
                </div>

                <p style={{
                    textAlign: "center",
                    marginTop: "2rem",
                    color: "var(--text-muted)",
                    fontSize: "0.8rem",
                }}>
                    Reducing food waste · Feeding communities
                </p>
            </div>
        </div>
    );
}

export default Login;