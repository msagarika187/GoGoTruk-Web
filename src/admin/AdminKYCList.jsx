import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPendingKYC } from "../api/adminApi";
import "./Admin.css";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function typeBadgeClass(type) {
  if (type === "Customer") return "badge-customer";
  if (type === "Company") return "badge-company";
  if (type === "Owner") return "badge-owner";
  return "";
}

export default function AdminKYCList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    getPendingKYC()
      .then((res) => setItems(res.data))
      .catch(() => setError("Failed to load pending KYC submissions."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="admin-container">
      {/* Nav */}
      <div className="admin-nav">
        <span className="admin-nav-link active">KYC Review</span>
        <button className="admin-nav-link" onClick={() => navigate("/admin/vehicle-types")}>Vehicle Types</button>
        <button className="admin-nav-link" onClick={() => navigate("/admin/rate-cards")}>Rate Cards</button>
        <button className="admin-nav-link admin-nav-logout" onClick={() => { sessionStorage.removeItem("adminAuth"); navigate("/"); }}>🔓 Logout</button>
      </div>

      <div className="admin-header">
        <div className="admin-logo">
          <span>🚛</span>
          <span className="admin-logo-text">GoGoTruk</span>
        </div>
        <h1>KYC Review Panel</h1>
        <p className="admin-subtitle">Pending submissions awaiting review</p>
      </div>

      {loading && <div className="admin-loading">Loading submissions…</div>}
      {error && <div className="admin-error">{error}</div>}

      {!loading && !error && (
        <>
          <div className="admin-count">
            {items.length} pending submission{items.length !== 1 ? "s" : ""}
          </div>

          {items.length === 0 ? (
            <div className="admin-empty">
              <div className="admin-empty-icon">✅</div>
              <p>All KYC submissions have been reviewed.</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Type</th>
                    <th>Name</th>
                    <th>Mobile</th>
                    <th>Email</th>
                    <th>Submitted</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={`${item.kyc_type}-${item.id}-${idx}`}>
                      <td className="admin-td-num">{idx + 1}</td>
                      <td>
                        <span className={`admin-badge ${typeBadgeClass(item.kyc_type)}`}>
                          {item.kyc_type}
                        </span>
                      </td>
                      <td className="admin-td-name">{item.name}</td>
                      <td>{item.mobile}</td>
                      <td className="admin-td-email">{item.email || "—"}</td>
                      <td className="admin-td-date">{formatDate(item.created_at)}</td>
                      <td>
                        <button
                          className="admin-btn-review"
                          onClick={() =>
                            navigate(`/admin/kyc/${item.kyc_type.toLowerCase()}/${item.id}`)
                          }
                        >
                          Review →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
