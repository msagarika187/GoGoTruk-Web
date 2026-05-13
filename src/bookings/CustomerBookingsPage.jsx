import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getCustomerBookings, getCancellationPreview, cancelBooking } from "../api/bookingApi";
import "./Bookings.css";

function parseApiError(e) {
  const detail = e.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => `${d.loc?.at(-1)}: ${d.msg}`).join(" | ");
  return "Something went wrong. Please try again.";
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmt(n) {
  return `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CustomerBookingsPage() {
  const [searchParams] = useSearchParams();
  const [screen, setScreen] = useState("lookup");
  const [customerKycId, setCustomerKycId] = useState(searchParams.get("customer_kyc_id") || "");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Cancel state
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelPreview, setCancelPreview] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [loadingCancel, setLoadingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  useEffect(() => {
    if (searchParams.get("customer_kyc_id")) {
      handleLookup(searchParams.get("customer_kyc_id"));
    }
  }, []);

  const handleLookup = async (id) => {
    const kycId = id || customerKycId;
    if (!kycId.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await getCustomerBookings(kycId);
      setBookings(res.data);
      setScreen("list");
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getCustomerBookings(customerKycId);
      setBookings(res.data);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const openCancel = async (b) => {
    setCancelTarget(b);
    setCancelReason("");
    setCancelError("");
    setCancelPreview(null);
    setLoadingCancel(true);
    try {
      const res = await getCancellationPreview(b.id);
      setCancelPreview(res.data);
      setScreen("cancelPreview");
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoadingCancel(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancelReason.trim()) { setCancelError("Reason is required."); return; }
    setCancelling(true);
    setCancelError("");
    try {
      await cancelBooking(cancelTarget.id, { cancelled_by: "Customer", reason: cancelReason.trim() });
      setSuccessMsg(`Booking #${cancelTarget.id} cancelled. Refund of ${fmt(cancelPreview?.refund_amount ?? 0)} will be processed.`);
      setCancelTarget(null);
      setCancelPreview(null);
      setScreen("list");
      await handleRefresh();
    } catch (e) {
      setCancelError(parseApiError(e));
    } finally {
      setCancelling(false);
    }
  };

  // ── Screen: Lookup ──────────────────────────────────────────────────
  if (screen === "lookup") {
    return (
      <div className="book-container">
        <div className="book-header">
          <div className="book-logo"><span>🚛</span><span className="book-logo-text">GoGoTruk</span></div>
          <h1>My Bookings</h1>
          <p className="book-subtitle">View your booking history and manage cancellations</p>
        </div>
        <div className="book-lookup-card">
          <p className="book-hint">Enter your Customer KYC ID to view your bookings.</p>
          <div className="book-input-group">
            <label>Customer KYC ID</label>
            <input
              type="number"
              placeholder="e.g. 1"
              value={customerKycId}
              onChange={(e) => setCustomerKycId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            />
          </div>
          {error && <div className="book-error">{error}</div>}
          <button className="book-btn-primary" onClick={() => handleLookup()} disabled={loading || !customerKycId.trim()}>
            {loading ? "Loading…" : "View My Bookings →"}
          </button>
        </div>
      </div>
    );
  }

  // ── Screen: Cancel Preview ─────────────────────────────────────────
  if (screen === "cancelPreview" && cancelTarget && cancelPreview) {
    const hrs = Math.round(cancelPreview.hours_before_pickup);
    const hasInvoice = cancelPreview.invoice_total != null;
    const chargeColor = cancelPreview.cancellation_charge_pct === 0
      ? "book-cancel-free"
      : cancelPreview.cancellation_charge_pct <= 25
        ? "book-cancel-partial"
        : "book-cancel-full";

    return (
      <div className="book-container">
        <div className="book-header">
          <div className="book-logo"><span>🚛</span><span className="book-logo-text">GoGoTruk</span></div>
          <h1>Cancel Booking</h1>
          <p className="book-subtitle">Booking #{cancelTarget.id} · {formatDate(cancelTarget.booking_date)}</p>
        </div>

        <button className="book-btn-back" onClick={() => setScreen("list")}>← Back to My Bookings</button>

        <div className="book-invoice-preview-card">
          <div className="book-invoice-form-title">Cancellation Summary</div>
          <div className="book-preview-row">
            <span>Booking Status</span>
            <span>{cancelTarget.status}</span>
          </div>
          <div className="book-preview-row">
            <span>Hours before pickup</span>
            <span>{hrs >= 0 ? `${hrs}h` : "Pickup date passed"}</span>
          </div>

          {hasInvoice ? (
            <>
              <div className="book-preview-divider" />
              <div className="book-preview-row">
                <span>Invoice Total</span>
                <span>{fmt(cancelPreview.invoice_total)}</span>
              </div>
              <div className={`book-preview-row ${chargeColor}`}>
                <span>Cancellation Charge ({cancelPreview.cancellation_charge_pct}%)</span>
                <span>{fmt(cancelPreview.cancellation_charge_amount)}</span>
              </div>
              <div className="book-preview-divider" />
              <div className="book-preview-total-row">
                <span>Refund Amount</span>
                <span className="book-cancel-free">{fmt(cancelPreview.refund_amount)}</span>
              </div>
            </>
          ) : (
            <div className="book-preview-row" style={{ marginTop: "8px" }}>
              <span style={{ color: "#6B7280", fontStyle: "italic" }}>No invoice generated — no payment to refund</span>
            </div>
          )}
        </div>

        <div className="book-invoice-form-card">
          <div className="book-invoice-form-title">Reason for Cancellation</div>
          <div className="book-input-group" style={{ marginBottom: 0 }}>
            <textarea
              className="book-reject-reason-input"
              rows={3}
              placeholder="Provide a reason for cancelling this booking…"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          {cancelError && <div className="book-error" style={{ marginTop: "8px", marginBottom: 0 }}>{cancelError}</div>}
          <button
            className="book-btn-cancel-booking"
            onClick={handleCancelConfirm}
            disabled={cancelling || !cancelReason.trim()}
            style={{ marginTop: "12px" }}
          >
            {cancelling ? "Cancelling…" : "Confirm Cancellation"}
          </button>
        </div>
      </div>
    );
  }

  // ── Screen: List ────────────────────────────────────────────────────
  return (
    <div className="book-container">
      <div className="book-header">
        <div className="book-logo"><span>🚛</span><span className="book-logo-text">GoGoTruk</span></div>
        <div className="book-header-row">
          <div>
            <h1>My Bookings</h1>
            <p className="book-subtitle">Customer KYC ID: {customerKycId}</p>
          </div>
          <button className="book-btn-refresh" onClick={handleRefresh} disabled={loading}>
            {loading ? "…" : "↻ Refresh"}
          </button>
        </div>
      </div>

      {error && <div className="book-error">{error}</div>}
      {successMsg && <div className="book-success-banner">{successMsg}</div>}

      {bookings.length === 0 ? (
        <div className="book-empty">
          <div className="book-empty-icon">📦</div>
          <p>No bookings found.</p>
        </div>
      ) : (
        <div className="book-list">
          {bookings.map((b) => {
            const statusCls = b.status.toLowerCase().replace(/[-\s]/g, "");
            const canCancel = b.status === "Pending" || b.status === "Confirmed";

            return (
              <div key={b.id} className={`book-card book-card-${statusCls}`}>
                <div className="book-card-top">
                  <div>
                    <div className="book-booking-id">Booking #{b.id}</div>
                    <div className="book-date">{formatDate(b.booking_date)}</div>
                  </div>
                  <span className={`book-badge book-badge-${statusCls}`}>{b.status}</span>
                </div>

                <div className="book-details">
                  <div className="book-detail-row">
                    <span className="book-detail-label">Pickup</span>
                    <span className="book-detail-value">{b.pickup_address}</span>
                  </div>
                  <div className="book-detail-row">
                    <span className="book-detail-label">Destination</span>
                    <span className="book-detail-value">{b.destination_address}</span>
                  </div>
                  <div className="book-detail-row">
                    <span className="book-detail-label">Goods</span>
                    <span className="book-detail-value">{b.goods_type} · {b.goods_weight_kg} kg</span>
                  </div>
                </div>

                {b.rejection_reason && (
                  <div className="book-rejection-reason">Reason: {b.rejection_reason}</div>
                )}

                {canCancel && (
                  <button
                    className="book-btn-cancel-booking"
                    disabled={loadingCancel}
                    onClick={() => openCancel(b)}
                    style={{ marginTop: "8px" }}
                  >
                    ✕ Cancel Booking
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
