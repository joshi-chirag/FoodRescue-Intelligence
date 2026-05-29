import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = Request OTP, 2 = Confirm OTP & New Password
  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRequestOtp = async () => {
    if (!username) {
      setError("Please enter your username.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await api.post("/password-reset/request/", { username });
      setSuccess("✅ A verification code has been sent. Check server console logs if running locally!");
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || "Error requesting code. Make sure the user exists.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!otp || !newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await api.post("/password-reset/confirm/", {
        username,
        otp,
        new_password: newPassword,
      });
      setSuccess("🎉 Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Invalid code or expired token. Please try again.");
    } finally {
      setLoading(false);
    }
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
        
        {/* Logo / Title */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }} className="animate-in">
          <div style={{ fontSize: "3.5rem", marginBottom: "0.75rem", filter: "drop-shadow(0 0 20px rgba(16,185,129,0.4))" }}>🔑</div>
          <h1 style={{
            fontSize: "1.75rem",
            fontWeight: 800,
            background: "linear-gradient(135deg, #f1f5f9, #10b981)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "0.5rem",
          }}>Reset Password</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Recover your FoodRescue account
          </p>
        </div>

        {/* Form Card */}
        <div className="card animate-in animate-delay-1">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {step === 1 ? (
            /* Step 1: Request OTP */
            <>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1.5rem" }}>
                Request Verification Code
              </h2>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  id="reset-username"
                  className="form-input"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <button
                className="btn btn-primary btn-full"
                onClick={handleRequestOtp}
                disabled={loading}
                style={{ marginTop: "1rem" }}
              >
                {loading ? <><span className="spinner" /> Sending OTP...</> : "Send Verification Code →"}
              </button>
            </>
          ) : (
            /* Step 2: Confirm OTP & Reset */
            <>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1.5rem" }}>
                Enter New Password
              </h2>
              
              <div className="form-group">
                <label className="form-label">Verification Code (OTP)</label>
                <input
                  id="reset-otp"
                  className="form-input"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  id="reset-password"
                  type="password"
                  className="form-input"
                  placeholder="Create new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  id="reset-confirm"
                  type="password"
                  className="form-input"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <button
                className="btn btn-primary btn-full"
                onClick={handleConfirmReset}
                disabled={loading}
                style={{ marginTop: "1rem" }}
              >
                {loading ? <><span className="spinner" /> Resetting...</> : "Reset Password ✓"}
              </button>

              <button
                className="btn btn-secondary btn-full"
                onClick={() => setStep(1)}
                style={{ marginTop: "0.5rem" }}
              >
                ← Back to Step 1
              </button>
            </>
          )}

          <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.9rem" }}>
            Remembered your password?{" "}
            <Link to="/login" style={{ color: "var(--green-primary)", fontWeight: 600, textDecoration: "none" }}>
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
