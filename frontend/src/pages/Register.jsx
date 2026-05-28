import { useState } from "react";
import api from "../api";
import { useNavigate, Link } from "react-router-dom";

function Register() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: "", password: "", role: "donor" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleRegister = async () => {
        if (!form.username || !form.password) {
            setError("Username and password are required.");
            return;
        }
        if (form.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        try {
            setLoading(true);
            setError("");
            // Register user
            await api.post("/register/", form);
            // Auto-login after register
            const res = await api.post("/login/", {
                username: form.username,
                password: form.password,
            });
            localStorage.setItem("token", res.data.access);
            localStorage.setItem("role", res.data.role);
            localStorage.setItem("username", res.data.username);
            const getRedirectPath = (role) => {
                if (role === "ngo") return "/ngo";
                if (role === "admin") return "/admin";
                return "/dashboard";
            };
            navigate(getRedirectPath(res.data.role));
        } catch (err) {
            const msg = err.response?.data?.username?.[0]
                || err.response?.data?.password?.[0]
                || "Registration failed. Try a different username.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-full" style={{
            background: "radial-gradient(ellipse at bottom right, rgba(16,185,129,0.08) 0%, transparent 60%), var(--bg-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "1.5rem",
        }}>
            <div style={{ width: "100%", maxWidth: "420px" }}>
                <div style={{ textAlign: "center", marginBottom: "2.5rem" }} className="animate-in">
                    <div style={{ fontSize: "3.5rem", marginBottom: "0.75rem" }}>🌿</div>
                    <h1 style={{
                        fontSize: "1.75rem",
                        fontWeight: 800,
                        background: "linear-gradient(135deg, #f1f5f9, #10b981)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        marginBottom: "0.5rem",
                    }}>Join FoodRescue</h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                        Create your account and start making a difference
                    </p>
                </div>

                <div className="card animate-in animate-delay-1">
                    <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1.75rem" }}>
                        Create Account
                    </h2>

                    {error && <div className="alert alert-error">{error}</div>}

                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input
                            id="register-username"
                            className="form-input"
                            placeholder="Choose a username"
                            value={form.username}
                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            id="register-password"
                            className="form-input"
                            type="password"
                            placeholder="At least 6 characters"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">I am a</label>
                        <select
                            id="register-role"
                            className="form-input"
                            value={form.role}
                            onChange={(e) => setForm({ ...form, role: e.target.value })}
                        >
                            <option value="donor">🍱 Food Donor (Restaurant / Hotel / Individual)</option>
                            <option value="ngo">🏢 NGO (Food Distribution Organization)</option>
                        </select>
                    </div>

                    {/* Role info */}
                    <div style={{
                        padding: "0.875rem",
                        background: "rgba(16,185,129,0.06)",
                        border: "1px solid rgba(16,185,129,0.15)",
                        borderRadius: "var(--radius-sm)",
                        marginBottom: "1.25rem",
                        fontSize: "0.82rem",
                        color: "var(--text-secondary)",
                    }}>
                        {form.role === "donor"
                            ? "🍱 As a Donor you can submit food donations and trigger AI-powered allocation to match the best NGO."
                            : "🏢 As an NGO you can view incoming food allocations and manage distribution to people in need."}
                    </div>

                    <button
                        id="register-btn"
                        className="btn btn-primary btn-full"
                        onClick={handleRegister}
                        disabled={loading}
                    >
                        {loading ? <><span className="spinner" /> Creating account...</> : "Create Account →"}
                    </button>

                    <p style={{
                        textAlign: "center",
                        marginTop: "1.5rem",
                        color: "var(--text-secondary)",
                        fontSize: "0.9rem"
                    }}>
                        Already have an account?{" "}
                        <Link to="/" style={{ color: "var(--green-primary)", fontWeight: 600, textDecoration: "none" }}>
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Register;
