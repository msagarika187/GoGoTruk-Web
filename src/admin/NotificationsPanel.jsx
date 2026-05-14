import { useState, useEffect, useCallback } from "react";
import { getNotifications } from "../api/dashboardApi";
import "./Admin.css";

const EVENT_TYPES = [
  "kyc_verified", "kyc_rejected",
  "booking_created", "booking_confirmed", "booking_rejected",
  "booking_auto_rejected", "booking_cancelled",
  "invoice_sent", "document_expiry_alert", "document_expired",
];

const CHANNELS = ["console", "sms", "email", "push"];
const STATUSES = ["dev_logged", "delivered", "failed"];

const STATUS_COLORS = {
  dev_logged: "#6B7280",
  delivered: "#10B981",
  failed: "#EF4444",
};

const CHANNEL_COLORS = {
  console: "#9CA3AF",
  sms: "#3B82F6",
  email: "#8B5CF6",
  push: "#FF6B00",
};

function parseApiError(e) {
  const detail = e.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => `${d.loc?.at(-1)}: ${d.msg}`).join(" | ");
  return "Something went wrong.";
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function NotificationsPanel() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const [filters, setFilters] = useState({ event_type: "", channel: "", status: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async (pg = 1, f = filters) => {
    setLoading(true);
    setError("");
    try {
      const params = { page: pg, page_size: PAGE_SIZE };
      if (f.event_type) params.event_type = f.event_type;
      if (f.channel) params.channel = f.channel;
      if (f.status) params.status = f.status;
      const res = await getNotifications(params);
      setRows(res.data.results ?? []);
      setTotal(res.data.total ?? 0);
      setPage(pg);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(1, filters); }, []);

  const applyFilter = (key, val) => {
    const next = { ...filters, [key]: val };
    setFilters(next);
    load(1, next);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      {/* Quick-filter chips row */}
      <div className="notif-filter-row">
        <span className="notif-filter-label">Channel:</span>
        {["", ...CHANNELS].map((c) => (
          <button
            key={c || "all"}
            className={`notif-chip ${filters.channel === c ? "active" : ""}`}
            onClick={() => applyFilter("channel", c)}
          >
            {c || "All"}
          </button>
        ))}

        <span className="notif-filter-label" style={{ marginLeft: 16 }}>Status:</span>
        {["", ...STATUSES].map((s) => (
          <button
            key={s || "all"}
            className={`notif-chip ${filters.status === s ? "active" : ""} ${s === "failed" ? "notif-chip-failed" : ""}`}
            onClick={() => applyFilter("status", s)}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Event type filter */}
      <div style={{ marginBottom: 16 }}>
        <select
          className="dash-filter-select"
          value={filters.event_type}
          onChange={(e) => applyFilter("event_type", e.target.value)}
        >
          <option value="">All Event Types</option>
          {EVENT_TYPES.map((et) => (
            <option key={et} value={et}>{et.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {error && <div className="admin-error">{error}</div>}
      {loading && <div className="admin-loading">Loading notifications…</div>}

      {!loading && (
        <>
          <div className="admin-count">{total} notification{total !== 1 ? "s" : ""}</div>

          {rows.length === 0 ? (
            <div className="admin-empty">
              <div className="admin-empty-icon">🔔</div>
              <p>No notifications match the selected filters.</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Event</th>
                    <th>Channel</th>
                    <th>Recipient</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Time</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((n) => (
                    <>
                      <tr key={n.id} className={n.status === "failed" ? "notif-row-failed" : ""}>
                        <td className="admin-td-num">{n.id}</td>
                        <td>
                          <span className="notif-event-tag">{n.event_type.replace(/_/g, " ")}</span>
                        </td>
                        <td>
                          <span className="notif-chip-inline" style={{ background: CHANNEL_COLORS[n.channel] + "22", color: CHANNEL_COLORS[n.channel] }}>
                            {n.channel}
                          </span>
                        </td>
                        <td className="admin-td-email">
                          {n.recipient_mobile || n.recipient_email || "—"}
                        </td>
                        <td className="admin-td-email" style={{ maxWidth: 200 }}>
                          {n.subject || "—"}
                        </td>
                        <td>
                          <span className="notif-status-dot" style={{ background: STATUS_COLORS[n.status] }} />
                          <span style={{ color: STATUS_COLORS[n.status], fontWeight: 600, fontSize: "0.8rem" }}>
                            {n.status}
                          </span>
                        </td>
                        <td className="admin-td-date">{formatDate(n.created_at)}</td>
                        <td>
                          <button
                            className="notif-expand-btn"
                            onClick={() => setExpanded(expanded === n.id ? null : n.id)}
                          >
                            {expanded === n.id ? "▲" : "▼"}
                          </button>
                        </td>
                      </tr>
                      {expanded === n.id && (
                        <tr key={`${n.id}-exp`} className="notif-expanded-row">
                          <td colSpan={8}>
                            <div className="notif-message-box">
                              <div className="notif-message-label">Message</div>
                              <div className="notif-message-body">{n.message || "—"}</div>
                              {n.error_message && (
                                <>
                                  <div className="notif-message-label" style={{ color: "#EF4444", marginTop: 8 }}>Error</div>
                                  <div className="notif-message-body" style={{ color: "#EF4444" }}>{n.error_message}</div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="notif-pagination">
              <button
                className="notif-page-btn"
                disabled={page === 1}
                onClick={() => load(page - 1)}
              >
                ← Prev
              </button>
              <span className="notif-page-info">Page {page} of {totalPages}</span>
              <button
                className="notif-page-btn"
                disabled={page === totalPages}
                onClick={() => load(page + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
