import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAdmin } from "../api/adminAuthApi";
import "./Admin.css";

function parseApiError(e) {
  const detail = e.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => `${d.loc?.at(-1)}: ${d.msg}`).join(" | ");
  return "Something went wrong. Please try again.";
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) { setError("Username and password are required."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await loginAdmin({ username: username.trim(), password });
      localStorage.setItem("adminToken", res.data.access_token);
      navigate("/admin/dashboard", { replace: true });
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container" style={{ maxWidth: 480, paddingTop: 80 }}>
      <div className="admin-header" style={{ textAlign: "center" }}>
        <div className="admin-logo" style={{ justifyContent: "center" }}>
          <span>🚛</span>
          <span className="admin-logo-text">GoGoTruk</span>
        </div>
        <h1>Admin Login</h1>
        <p className="admin-subtitle">Sign in to access the admin panel</p>
      </div>

      <div className="admin-login-card">
        <div className="admin-reason-group">
          <label className="admin-field-label">Username</label>
          <input
            className="vt-input"
            placeholder="admin"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
        </div>

        <div className="admin-reason-group">
          <label className="admin-field-label">Password</label>
          <input
            className="vt-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
        </div>

        {error && <div className="admin-error">{error}</div>}

        <button
          className="admin-btn-approve"
          style={{ width: "100%" }}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "Please wait…" : "Sign In →"}
        </button>
      </div>
    </div>
  );
}
