import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getMetrics, getFleetQueue, getBookings, getRevenue,
  exportKycPdf, exportBookingsPdf, exportBookingsExcel, exportRevenuePdf, exportRevenueExcel,
  getNotifications,
} from "../api/dashboardApi";
import { getMe } from "../api/adminAuthApi";
import { getPendingKYC } from "../api/adminApi";
import VehicleTypePanel from "./VehicleTypePanel";
import RateCardPanel from "./RateCardPanel";
import AnalyticsPanel from "./AnalyticsPanel";
import NotificationsPanel from "./NotificationsPanel";
import "./Admin.css";

const TABS = ["Overview", "KYC Review", "Fleet", "Bookings", "Revenue", "View/Add Vehicle Types", "Rate Cards", "Analytics", "Notifications"];
const BOOKING_STATUSES = ["", "Pending", "Confirmed", "Completed", "Cancelled", "Rejected", "Auto-Rejected"];

function MetricCard({ label, value, color }) {
  return (
    <div className="dash-metric-card" style={{ borderTopColor: color }}>
      <div className="dash-metric-value" style={{ color }}>{value ?? "—"}</div>
      <div className="dash-metric-label">{label}</div>
    </div>
  );
}

function parseApiError(e) {
  const detail = e.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => `${d.loc?.at(-1)}: ${d.msg}`).join(" | ");
  return "Something went wrong.";
}

function fmt(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}


function typeBadge(type) {
  if (type === "Customer") return "badge-customer";
  if (type === "Company") return "badge-company";
  if (type === "Owner") return "badge-owner";
  return "";
}

function statusBadgeCls(s) {
  const m = { Pending: "badge-company", Confirmed: "badge-customer", Completed: "badge-owner" };
  return m[s] || "";
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("Overview");
  const [me, setMe] = useState(null);

  const [metrics, setMetrics] = useState(null);
  const [kycQueue, setKycQueue] = useState([]);
  const [fleetQueue, setFleetQueue] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingFilters, setBookingFilters] = useState({ status: "", owner_kyc_id: "" });
  const [revenue, setRevenue] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [loadingTab, setLoadingTab] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState("");
  const [hasFailedNotifs, setHasFailedNotifs] = useState(false);

  useEffect(() => {
    getMe().then((res) => setMe(res.data)).catch(() => {});
    loadMetrics();
    getNotifications({ status: "failed", page: 1, page_size: 1 })
      .then((res) => setHasFailedNotifs((res.data.total ?? 0) > 0))
      .catch(() => {});
  }, []);

  const loadMetrics = async () => {
    setLoadingMetrics(true);
    setError("");
    try {
      const res = await getMetrics();
      setMetrics(res.data);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoadingMetrics(false);
    }
  };

  const loadKycQueue = async () => {
    setLoadingTab(true);
    setError("");
    try {
      const res = await getPendingKYC();
      setKycQueue(res.data);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoadingTab(false);
    }
  };

  const loadFleetQueue = async () => {
    setLoadingTab(true);
    setError("");
    try {
      const res = await getFleetQueue();
      setFleetQueue(res.data.results ?? res.data);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoadingTab(false);
    }
  };

  const loadBookings = async () => {
    setLoadingTab(true);
    setError("");
    try {
      const params = {};
      if (bookingFilters.status) params.status = bookingFilters.status;
      if (bookingFilters.owner_kyc_id) params.owner_kyc_id = Number(bookingFilters.owner_kyc_id);
      const res = await getBookings(params);
      setBookings(res.data);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoadingTab(false);
    }
  };

  const loadRevenue = async () => {
    setLoadingTab(true);
    setError("");
    try {
      const res = await getRevenue();
      setRevenue(res.data);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoadingTab(false);
    }
  };

  const switchTab = (t) => {
    setTab(t);
    setError("");
    if (t === "Overview") loadMetrics();
    else if (t === "KYC Review") loadKycQueue();
    else if (t === "Fleet") loadFleetQueue();
    else if (t === "Bookings") loadBookings();
    else if (t === "Revenue") loadRevenue();
  };

  const handleExport = async (key, apiFn, params, filename) => {
    setExporting(key);
    setError("");
    try {
      const res = await apiFn(params);
      const mimeType = filename.endsWith(".xlsx")
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/pdf";
      const url = URL.createObjectURL(new Blob([res.data], { type: mimeType }));
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setExporting("");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    navigate("/admin/login");
  };

  const visibleTabs = TABS;

  return (
    <div className="admin-container">
      <div className="admin-nav">
        <span className="admin-nav-link active">Dashboard</span>
        <button className="admin-nav-link admin-nav-logout" onClick={handleLogout}>🔓 Logout</button>
      </div>

      <div className="admin-header">
        <div className="admin-logo">
          <span>🚛</span>
          <span className="admin-logo-text">GoGoTruk</span>
        </div>
        <div className="admin-header-action-row">
          <div>
            <h1>Admin Dashboard</h1>
            <p className="admin-subtitle">
              {me
                ? `Signed in as ${me.username}${me.is_super_admin ? " · Super Admin" : ""}`
                : "Loading…"}
            </p>
          </div>
        </div>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div className="dash-tabs">
        {visibleTabs.map((t) => (
          <button
            key={t}
            className={`dash-tab ${tab === t ? "active" : ""}`}
            onClick={() => switchTab(t)}
          >
            {t}
            {t === "Notifications" && hasFailedNotifs && (
              <span className="dash-tab-badge">!</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "Overview" && (
        <div>
          {loadingMetrics && <div className="admin-loading">Loading metrics…</div>}
          {metrics && (
            <>
              <div className="dash-metrics-grid">
                <MetricCard label="Total Bookings" value={metrics.total_bookings} color="#FF6B00" />
                <MetricCard label="Pending" value={metrics.pending_bookings} color="#F59E0B" />
                <MetricCard label="Confirmed" value={metrics.confirmed_bookings} color="#3B82F6" />
                <MetricCard label="Completed" value={metrics.completed_bookings} color="#10B981" />
                <MetricCard label="Cancelled" value={metrics.cancelled_bookings} color="#EF4444" />
                <MetricCard label="Pending KYC" value={metrics.pending_kyc_count} color="#8B5CF6" />
              </div>
              <div className="dash-metrics-grid" style={{ marginTop: "12px" }}>
                <MetricCard label="Total Customers" value={metrics.total_customers} color="#6B7280" />
                <MetricCard label="Total Owners" value={metrics.total_owners} color="#6B7280" />
                <MetricCard label="Total Revenue" value={fmt(metrics.total_revenue)} color="#10B981" />
              </div>
            </>
          )}
          <div style={{ marginTop: "24px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button className="dash-export-btn" disabled={!!exporting}
              onClick={() => handleExport("kyc-pdf", exportKycPdf, {}, "kyc-export.pdf")}>
              {exporting === "kyc-pdf" ? "Exporting…" : "⬇ KYC PDF"}
            </button>
            <button className="dash-export-btn" disabled={!!exporting}
              onClick={() => handleExport("bookings-pdf", exportBookingsPdf, {}, "bookings-export.pdf")}>
              {exporting === "bookings-pdf" ? "Exporting…" : "⬇ Bookings PDF"}
            </button>
            <button className="dash-export-btn" disabled={!!exporting}
              onClick={() => handleExport("bookings-xlsx", exportBookingsExcel, {}, "bookings-export.xlsx")}>
              {exporting === "bookings-xlsx" ? "Exporting…" : "⬇ Bookings Excel"}
            </button>
            <button className="dash-export-btn" disabled={!!exporting}
              onClick={() => handleExport("revenue-pdf", exportRevenuePdf, {}, "revenue-export.pdf")}>
              {exporting === "revenue-pdf" ? "Exporting…" : "⬇ Revenue PDF"}
            </button>
            <button className="dash-export-btn" disabled={!!exporting}
              onClick={() => handleExport("revenue-xlsx", exportRevenueExcel, {}, "revenue-export.xlsx")}>
              {exporting === "revenue-xlsx" ? "Exporting…" : "⬇ Revenue Excel"}
            </button>
          </div>
        </div>
      )}

      {/* ── KYC Review ── */}
      {tab === "KYC Review" && (
        <div>
          {loadingTab && <div className="admin-loading">Loading…</div>}
          {!loadingTab && (
            <>
              <div className="admin-count">
                {kycQueue.length} pending submission{kycQueue.length !== 1 ? "s" : ""}
              </div>
              {kycQueue.length === 0 ? (
                <div className="admin-empty">
                  <div className="admin-empty-icon">✅</div>
                  <p>No pending KYC submissions.</p>
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
                      {kycQueue.map((item, idx) => (
                        <tr key={`${item.kyc_type}-${item.id}`}>
                          <td className="admin-td-num">{idx + 1}</td>
                          <td>
                            <span className={`admin-badge ${typeBadge(item.kyc_type)}`}>{item.kyc_type}</span>
                          </td>
                          <td className="admin-td-name">{item.name}</td>
                          <td>{item.mobile}</td>
                          <td className="admin-td-email">{item.email || "—"}</td>
                          <td className="admin-td-date">{formatDate(item.created_at)}</td>
                          <td>
                            <button
                              className="admin-btn-review"
                              onClick={() => navigate(`/admin/kyc/${item.kyc_type.toLowerCase()}/${item.id}`)}
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
      )}

      {/* ── Fleet ── */}
      {tab === "Fleet" && (
        <div>
          {loadingTab && <div className="admin-loading">Loading…</div>}
          {!loadingTab && (
            <>
              <div className="admin-count">
                {fleetQueue.length} registered vehicle{fleetQueue.length !== 1 ? "s" : ""}
              </div>
              {fleetQueue.length === 0 ? (
                <div className="admin-empty">
                  <div className="admin-empty-icon">🚛</div>
                  <p>No fleet vehicles found.</p>
                </div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Fleet ID</th>
                        <th>Reg. Number</th>
                        <th>Vehicle Type</th>
                        <th>Owner KYC ID</th>
                        <th>Status</th>
                        <th>RC Expiry</th>
                        <th>Insurance Expiry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fleetQueue.map((f, idx) => (
                        <tr key={f.id}>
                          <td className="admin-td-num">{idx + 1}</td>
                          <td className="admin-td-name">#{f.id}</td>
                          <td>{f.registration_number}</td>
                          <td>{f.vehicle_type}</td>
                          <td>{f.owner_kyc_id}</td>
                          <td>
                            <span className={`admin-badge ${f.is_active ? "badge-customer" : "badge-owner"}`}>
                              {f.is_active ? "Active" : "Inactive"}
                            </span>
                            {f.is_active && (!f.rc_expiry_date || !f.insurance_expiry_date) && (
                              <span className="admin-badge badge-company" style={{ marginLeft: 6 }}>
                                Docs Pending
                              </span>
                            )}
                          </td>
                          <td className="admin-td-date">{formatDate(f.rc_expiry_date)}</td>
                          <td className="admin-td-date">{formatDate(f.insurance_expiry_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Bookings ── */}
      {tab === "Bookings" && (
        <div>
          <div className="dash-filter-bar">
            <select
              className="dash-filter-select"
              value={bookingFilters.status}
              onChange={(e) => setBookingFilters((f) => ({ ...f, status: e.target.value }))}
            >
              {BOOKING_STATUSES.map((s) => (
                <option key={s} value={s}>{s || "All Statuses"}</option>
              ))}
            </select>
            <input
              className="dash-filter-input"
              type="number"
              placeholder="Owner KYC ID"
              value={bookingFilters.owner_kyc_id}
              onChange={(e) => setBookingFilters((f) => ({ ...f, owner_kyc_id: e.target.value }))}
            />
            <button className="admin-btn-review" onClick={loadBookings} disabled={loadingTab}>
              {loadingTab ? "Loading…" : "Apply"}
            </button>
            <button className="dash-export-btn" disabled={!!exporting}
              onClick={() => {
                const p = {};
                if (bookingFilters.status) p.status = bookingFilters.status;
                if (bookingFilters.owner_kyc_id) p.owner_kyc_id = Number(bookingFilters.owner_kyc_id);
                handleExport("bookings-pdf", exportBookingsPdf, p, "bookings-export.pdf");
              }}>
              {exporting === "bookings-pdf" ? "Exporting…" : "⬇ PDF"}
            </button>
            <button className="dash-export-btn" disabled={!!exporting}
              onClick={() => {
                const p = {};
                if (bookingFilters.status) p.status = bookingFilters.status;
                if (bookingFilters.owner_kyc_id) p.owner_kyc_id = Number(bookingFilters.owner_kyc_id);
                handleExport("bookings-xlsx", exportBookingsExcel, p, "bookings-export.xlsx");
              }}>
              {exporting === "bookings-xlsx" ? "Exporting…" : "⬇ Excel"}
            </button>
          </div>

          {!loadingTab && (
            <>
              <div className="admin-count">{bookings.length} booking{bookings.length !== 1 ? "s" : ""}</div>
              {bookings.length === 0 ? (
                <div className="admin-empty">
                  <div className="admin-empty-icon">📦</div>
                  <p>No bookings found.</p>
                </div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Booking #</th>
                        <th>Pickup Date</th>
                        <th>Status</th>
                        <th>Customer</th>
                        <th>Owner</th>
                        <th>Pickup</th>
                        <th>Drop</th>
                        <th>Vehicle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b) => (
                        <tr key={b.id}>
                          <td className="admin-td-name">#{b.id}</td>
                          <td className="admin-td-date">{formatDate(b.pickup_date)}</td>
                          <td>
                            <span className={`admin-badge ${statusBadgeCls(b.status)}`}>{b.status}</span>
                          </td>
                          <td>{b.customer_name || "—"}</td>
                          <td>{b.owner_name || "—"}</td>
                          <td className="admin-td-email">{b.pickup_location || "—"}</td>
                          <td className="admin-td-email">{b.drop_location || "—"}</td>
                          <td>{b.vehicle_number || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Revenue ── */}
      {tab === "Revenue" && (
        <div>
          <div className="dash-filter-bar">
            <button className="dash-export-btn" disabled={!!exporting}
              onClick={() => handleExport("revenue-pdf", exportRevenuePdf, {}, "revenue-export.pdf")}>
              {exporting === "revenue-pdf" ? "Exporting…" : "⬇ PDF"}
            </button>
            <button className="dash-export-btn" disabled={!!exporting}
              onClick={() => handleExport("revenue-xlsx", exportRevenueExcel, {}, "revenue-export.xlsx")}>
              {exporting === "revenue-xlsx" ? "Exporting…" : "⬇ Excel"}
            </button>
          </div>
          {loadingTab && <div className="admin-loading">Loading…</div>}
          {!loadingTab && revenue && (
            <>
              <div className="dash-metrics-grid" style={{ marginBottom: "24px" }}>
                <MetricCard label="Total Revenue" value={fmt(revenue.total_revenue)} color="#10B981" />
                <MetricCard label="Total Invoices" value={revenue.total_invoices} color="#3B82F6" />
                <MetricCard
                  label="Average Invoice"
                  value={revenue.total_invoices ? fmt(revenue.total_revenue / revenue.total_invoices) : "—"}
                  color="#8B5CF6"
                />
              </div>
              {revenue.by_month && revenue.by_month.length > 0 && (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Invoices</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenue.by_month.map((row, idx) => (
                        <tr key={idx}>
                          <td className="admin-td-name">{row.month}</td>
                          <td>{row.count}</td>
                          <td>{fmt(row.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
          {!loadingTab && !revenue && (
            <div className="admin-empty">
              <div className="admin-empty-icon">💰</div>
              <p>No revenue data yet.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Vehicle Types ── */}
      {tab === "View/Add Vehicle Types" && (
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.2rem", fontWeight: 700, marginBottom: "20px", color: "#1A1A2E" }}>
            View / Add Vehicle Types
          </h2>
          <VehicleTypePanel />
        </div>
      )}

      {/* ── Rate Cards ── */}
      {tab === "Rate Cards" && (
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.2rem", fontWeight: 700, marginBottom: "20px", color: "#1A1A2E" }}>
            Rate Cards
          </h2>
          <RateCardPanel />
        </div>
      )}

      {/* ── Analytics ── */}
      {tab === "Analytics" && <AnalyticsPanel />}

      {/* ── Notifications ── */}
      {tab === "Notifications" && <NotificationsPanel />}
    </div>
  );
}
