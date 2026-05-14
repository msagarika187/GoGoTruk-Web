import { useState, useEffect, useCallback } from "react";
import {
  getSummary, getTopRoutes, getTrend, getCustomerGrowth,
  generateReport, downloadReportPdf, downloadReportExcel,
} from "../api/analyticsApi";
import "./Admin.css";

const PERIODS = [
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "weekly", label: "This Week" },
  { value: "monthly", label: "This Month" },
  { value: "custom", label: "Custom" },
];

function parseApiError(e) {
  const detail = e.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => `${d.loc?.at(-1)}: ${d.msg}`).join(" | ");
  return "Something went wrong.";
}

function fmt(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function BarChart({ data, valueKey, labelKey, color, formatValue }) {
  if (!data || data.length === 0) return <div className="admin-empty" style={{ padding: "24px" }}><p>No data</p></div>;
  const max = Math.max(...data.map((d) => d[valueKey] || 0), 1);
  return (
    <div className="analytics-bar-chart">
      {data.map((d, i) => (
        <div key={i} className="analytics-bar-item">
          <div className="analytics-bar-value">{formatValue ? formatValue(d[valueKey]) : d[valueKey]}</div>
          <div className="analytics-bar-track">
            <div
              className="analytics-bar-fill"
              style={{ height: `${Math.max((d[valueKey] / max) * 100, 2)}%`, background: color }}
            />
          </div>
          <div className="analytics-bar-label">{d[labelKey]}</div>
        </div>
      ))}
    </div>
  );
}

function SummaryCard({ label, value, sub, color }) {
  return (
    <div className="dash-metric-card" style={{ borderTopColor: color }}>
      <div className="dash-metric-value" style={{ color, fontSize: "1.5rem" }}>{value ?? "—"}</div>
      <div className="dash-metric-label">{label}</div>
      {sub && <div style={{ fontSize: "0.72rem", color: "#9CA3AF", marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}

export default function AnalyticsPanel() {
  const [period, setPeriod] = useState("last_30_days");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [routes, setRoutes] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [reportType, setReportType] = useState("weekly");
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState("");

  const buildParams = useCallback(() => {
    const p = { period };
    if (period === "custom") {
      if (customFrom) p.date_from = customFrom;
      if (customTo) p.date_to = customTo;
    }
    return p;
  }, [period, customFrom, customTo]);

  const loadAll = useCallback(async () => {
    const params = buildParams();
    if (period === "custom" && (!customFrom || !customTo)) return;
    setLoading(true);
    setError("");
    try {
      const [sumRes, trendRes, growthRes, routesRes] = await Promise.all([
        getSummary(params),
        getTrend(params),
        getCustomerGrowth({ months: 6 }),
        getTopRoutes({ ...params, limit: 10 }),
      ]);
      setSummary(sumRes.data);
      setTrend(trendRes.data.trend ?? []);
      setGrowth(growthRes.data.growth ?? []);
      setRoutes(routesRes.data.routes ?? []);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
    }
  }, [buildParams, period, customFrom, customTo]);

  useEffect(() => {
    if (period !== "custom") loadAll();
  }, [period]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await generateReport({ report_type: reportType });
      showToast(res.data.message || "Report generated and emailed.");
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (format) => {
    setDownloading(format);
    setError("");
    try {
      const params = { report_type: reportType };
      const res = format === "pdf"
        ? await downloadReportPdf(params)
        : await downloadReportExcel(params);
      const mimeType = format === "pdf" ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const url = URL.createObjectURL(new Blob([res.data], { type: mimeType }));
      const a = document.createElement("a");
      a.href = url; a.download = `${reportType}-report.${format}`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setDownloading("");
    }
  };

  const trendBookings = trend.map((d) => ({ ...d, label: fmtDate(d.date) }));
  const trendRevenue = trend.map((d) => ({ ...d, label: fmtDate(d.date) }));
  const growthData = growth.map((d) => ({ ...d, label: d.month }));

  return (
    <div>
      {toast && (
        <div className="admin-toast toast-success" style={{ top: 80 }}>{toast}</div>
      )}

      {/* Period selector */}
      <div className="analytics-period-row">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            className={`analytics-period-btn ${period === p.value ? "active" : ""}`}
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </button>
        ))}
        {period === "custom" && (
          <>
            <input type="date" className="dash-filter-input" style={{ minWidth: 140 }}
              value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <span style={{ color: "#6B7280", fontSize: "0.875rem" }}>to</span>
            <input type="date" className="dash-filter-input" style={{ minWidth: 140 }}
              value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            <button className="admin-btn-review" onClick={loadAll}
              disabled={!customFrom || !customTo || loading}>
              Apply
            </button>
          </>
        )}
      </div>

      {error && <div className="admin-error">{error}</div>}
      {loading && <div className="admin-loading">Loading analytics…</div>}

      {!loading && summary && (
        <>
          {/* Bookings summary */}
          <div className="analytics-section-title">Bookings</div>
          <div className="dash-metrics-grid" style={{ marginBottom: "24px" }}>
            <SummaryCard label="Total" value={summary.bookings?.total} color="#FF6B00" />
            <SummaryCard label="Confirmed" value={summary.bookings?.confirmed} color="#3B82F6" />
            <SummaryCard label="Completed" value={summary.bookings?.completed} color="#10B981" />
            <SummaryCard label="Cancelled" value={summary.bookings?.cancelled} color="#EF4444" />
            <SummaryCard label="Pending" value={summary.bookings?.pending} color="#F59E0B" />
            <SummaryCard label="Rejected" value={summary.bookings?.rejected} color="#6B7280" />
          </div>

          {/* Revenue summary */}
          <div className="analytics-section-title">Revenue</div>
          <div className="dash-metrics-grid" style={{ marginBottom: "24px" }}>
            <SummaryCard label="Total Invoiced" value={fmt(summary.revenue?.total_invoiced)} color="#10B981" />
            <SummaryCard label="Collected" value={fmt(summary.revenue?.total_collected)} color="#3B82F6" />
            <SummaryCard label="Outstanding" value={fmt(summary.revenue?.outstanding)} color="#F59E0B" />
            <SummaryCard label="Invoices" value={summary.revenue?.invoice_count} color="#8B5CF6" />
            <SummaryCard label="Active Trucks" value={summary.active_trucks} color="#FF6B00" />
            <SummaryCard label="New Customers" value={summary.new_customers} color="#6B7280" />
          </div>
        </>
      )}

      {/* Daily Trend — Bookings */}
      {!loading && trendBookings.length > 0 && (
        <div className="analytics-chart-wrap">
          <div className="analytics-section-title">Daily Bookings</div>
          <BarChart data={trendBookings} valueKey="bookings" labelKey="label" color="#FF6B00" />
        </div>
      )}

      {/* Daily Trend — Revenue */}
      {!loading && trendRevenue.length > 0 && (
        <div className="analytics-chart-wrap">
          <div className="analytics-section-title">Daily Revenue</div>
          <BarChart data={trendRevenue} valueKey="revenue" labelKey="label" color="#10B981"
            formatValue={(v) => `₹${Number(v || 0).toLocaleString("en-IN")}`} />
        </div>
      )}

      {/* Customer Growth */}
      {!loading && growthData.length > 0 && (
        <div className="analytics-chart-wrap">
          <div className="analytics-section-title">Customer Growth (Last 6 Months)</div>
          <BarChart data={growthData} valueKey="new_customers" labelKey="label" color="#3B82F6" />
        </div>
      )}

      {/* Top Routes */}
      {!loading && routes.length > 0 && (
        <div className="analytics-chart-wrap">
          <div className="analytics-section-title">Top Routes</div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Bookings</th>
                </tr>
              </thead>
              <tbody>
                {routes.map((r, i) => (
                  <tr key={i}>
                    <td className="admin-td-num">{i + 1}</td>
                    <td className="admin-td-name">{r.from}</td>
                    <td className="admin-td-name">{r.to}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{
                          height: "8px", borderRadius: "4px", background: "#FF6B00",
                          width: `${(r.bookings / routes[0].bookings) * 80}px`,
                          minWidth: "4px",
                        }} />
                        {r.bookings}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report Generation */}
      <div className="analytics-report-card">
        <div className="analytics-section-title" style={{ borderBottom: "none", marginBottom: "16px" }}>
          Generate Report
        </div>
        <p style={{ fontSize: "0.85rem", color: "#6B7280", marginBottom: "16px" }}>
          Reports are also emailed automatically every Monday (weekly) and on the 1st of each month (monthly).
        </p>

        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          <button
            className={`analytics-period-btn ${reportType === "weekly" ? "active" : ""}`}
            onClick={() => setReportType("weekly")}
          >
            Weekly
          </button>
          <button
            className={`analytics-period-btn ${reportType === "monthly" ? "active" : ""}`}
            onClick={() => setReportType("monthly")}
          >
            Monthly
          </button>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button className="admin-btn-approve" style={{ flex: "none", padding: "10px 24px" }}
            onClick={handleGenerateReport} disabled={generating}>
            {generating ? "Generating…" : "✉ Generate & Email"}
          </button>
          <button className="dash-export-btn" onClick={() => handleDownload("pdf")}
            disabled={!!downloading}>
            {downloading === "pdf" ? "Downloading…" : "⬇ Download PDF"}
          </button>
          <button className="dash-export-btn" onClick={() => handleDownload("xlsx")}
            disabled={!!downloading}>
            {downloading === "xlsx" ? "Downloading…" : "⬇ Download Excel"}
          </button>
        </div>
      </div>
    </div>
  );
}
