import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import NGODashboard from "./pages/NGODashboard";
import AdminDashboard from "./pages/AdminDashboard";
import MapView from "./pages/MapView";
import TrackingPage from "./pages/TrackingPage";
import ProtectedRoute from "./routes/ProtectedRoute";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public */}
                <Route path="/" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* Donor only */}
                <Route path="/dashboard" element={
                    <ProtectedRoute allowedRole="donor">
                        <Dashboard />
                    </ProtectedRoute>
                } />

                {/* NGO only */}
                <Route path="/ngo" element={
                    <ProtectedRoute allowedRole="ngo">
                        <NGODashboard />
                    </ProtectedRoute>
                } />

                {/* Admin only */}
                <Route path="/admin" element={
                    <ProtectedRoute allowedRole="admin">
                        <AdminDashboard />
                    </ProtectedRoute>
                } />

                {/* Map — any authenticated user */}
                <Route path="/map" element={
                    <ProtectedRoute>
                        <MapView />
                    </ProtectedRoute>
                } />

                {/* Real-time tracking — any authenticated user */}
                <Route path="/track/:id" element={
                    <ProtectedRoute>
                        <TrackingPage />
                    </ProtectedRoute>
                } />
            </Routes>
        </BrowserRouter>
    );
}

export default App;