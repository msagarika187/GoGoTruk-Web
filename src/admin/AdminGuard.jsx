import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Admin.css";

// Change this password or set VITE_ADMIN_PASSWORD in your .env file
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "admin@gogotruk";

export default function AdminGuard({ children }) {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("adminAuth") === "true");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (authed) return children;

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem("adminAuth", "true");
      setAuthed(true);
    } else {
      setError("Incorrect password.");
      setPassword("");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto", padding: "48px 20px" }}>
      <div className="admin-header">
        <div className="admin-logo">
          <span>🚛</span>
          <span className="admin-logo-text">GoGoTruk</span>
        </div>
        <h1>Admin Access</h1>
        <p className="admin-subtitle">This area is restricted to administrators</p>
      </div>
      <div className="admin-detail-card">
        <div className="admin-reason-group">
          <label className="admin-field-label">Admin Password</label>
          <input
            type="password"
            className="vt-input"
            placeholder="Enter admin password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            autoFocus
          />
        </div>
        {error && <div className="admin-error" style={{ marginBottom: 0 }}>{error}</div>}
        <button
          className="admin-btn-approve"
          style={{ marginTop: "16px", width: "100%" }}
          onClick={handleLogin}
          disabled={!password.trim()}
        >
          Access Admin Panel →
        </button>
        <button
          className="admin-btn-back"
          style={{ marginTop: "8px", marginBottom: 0 }}
          onClick={() => navigate("/")}
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
}
