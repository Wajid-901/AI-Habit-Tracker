import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Habits from "./pages/Habits.jsx";
import Weekly from "./pages/Weekly.jsx";
import Insights from "./pages/Insights.jsx";
import Stats from "./pages/Stats.jsx";
import AppLayout from "./components/AppLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import NotificationPermission from "./components/NotificationPermission.jsx";

export default function App() {
  const { user } = useAuth();

  return (
    <>
      {user && <NotificationPermission />}
      <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/habits" element={<Habits />} />
        <Route path="/weekly" element={<Weekly />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/stats" element={<Stats />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
