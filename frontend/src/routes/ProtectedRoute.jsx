import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, allowedRole }) {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    // Not logged in → go to login
    if (!token) {
        return <Navigate to="/" replace />;
    }

    // No role stored (stale old session) → clear and go to login
    if (!role) {
        localStorage.clear();
        return <Navigate to="/" replace />;
    }

    // Role mismatch → redirect to the correct dashboard
    if (allowedRole && role !== allowedRole) {
        if (role === "ngo") return <Navigate to="/ngo" replace />;
        if (role === "donor") return <Navigate to="/dashboard" replace />;
        if (role === "admin") return <Navigate to="/admin" replace />;
        // Unknown role → logout
        localStorage.clear();
        return <Navigate to="/" replace />;
    }

    return children;
}

export default ProtectedRoute;