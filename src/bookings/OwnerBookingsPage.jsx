import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getOwnerBookings, reviewBooking, getCancellationPreview, cancelBooking } from "../api/bookingApi";
import { previewInvoice, generateInvoice, getBookingInvoice } from "../api/invoiceApi";
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

function formatCountdown(deadlineStr, now) {
  if (!deadlineStr) return null;
  const deadline = new Date(deadlineStr);
  const diff = Math.floor((deadline - now) / 1000);
  if (diff <= 0) return { text: "Deadline passed", cls: "cd-red" };
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  const text = h > 0 ? `${h}h ${m}m ${s}s to respond` : `${m}m ${s}s to respond`;
  const cls = diff > 3600 ? "cd-green" : diff > 900 ? "cd-yellow" : "cd-red";
  return { text, cls };
}

function fmt(n) {
  return `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function proxyUrl(url) {
  return `http://127.0.0.1:8000/api/docs/view?url=${encodeURIComponent(url)}`;
}

const EMPTY_INVOICE_FORM = {
  distance_km: "",
  waiting_charges: "0",
  toll_charges: "0",
  loading_charges: "0",
  gst_type: "CGST+SGST",
  gst_rate: "5",
};

export default function OwnerBookingsPage() {
  const [searchParams] = useSearchParams();
  const [screen, setScreen] = useState("lookup");
  const [ownerKycId, setOwnerKycId] = useState(searchParams.get("owner_kyc_id") || "");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(new Date());

  // Review state
  const [rejectOpenId, setRejectOpenId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reviewing, setReviewing] = useState(false);

  // Invoice state
  const [invoiceBooking, setInvoiceBooking] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState(EMPTY_INVOICE_FORM);
  const [invoicePreview, setInvoicePreview] = useState(null);
  const [invoiceResult, setInvoiceResult] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");

  // Cancel state
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelPreview, setCancelPreview] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [loadingCancel, setLoadingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (searchParams.get("owner_kyc_id")) {
      handleLookup(searchParams.get("owner_kyc_id"));
    }
  }, []);

  useEffect(() => {
    if (screen !== "list") return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [screen]);

  const handleLookup = async (id) => {
    const kycId = id || ownerKycId;
    if (!kycId.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await getOwnerBookings(kycId);
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
      const res = await getOwnerBookings(ownerKycId);
      setBookings(res.data);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (bookingId, decision, reason) => {
    setReviewing(true);
    setError("");
    try {
      const payload = { action: decision };
      if (reason) payload.rejection_reason = reason;
      await reviewBooking(bookingId, payload);
      setRejectOpenId(null);
      setRejectReason("");
      await handleRefresh();
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setReviewing(false);
    }
  };

  const openReject = (id) => { setRejectOpenId(id); setRejectReason(""); };

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
      await cancelBooking(cancelTarget.id, { cancelled_by: "Owner", reason: cancelReason.trim() });
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

  const openInvoice = async (b) => {
    setInvoiceBooking(b);
    setInvoicePreview(null);
    setInvoiceForm(EMPTY_INVOICE_FORM);
    setInvoiceError("");
    try {
      const res = await getBookingInvoice(b.id);
      setInvoiceResult(res.data);
      setScreen("invoiceResult");
    } catch (e) {
      if (e.response?.status === 404) {
        setScreen("invoiceForm");
      } else {
        setError(parseApiError(e));
      }
    }
  };

  const setInvoiceField = (key, val) => {
    setInvoiceForm((f) => ({ ...f, [key]: val }));
    setInvoicePreview(null);
  };

  const buildPayload = () => ({
    booking_id: invoiceBooking.id,
    distance_km: Number(invoiceForm.distance_km),
    waiting_charges: Number(invoiceForm.waiting_charges) || 0,
    toll_charges: Number(invoiceForm.toll_charges) || 0,
    loading_charges: Number(invoiceForm.loading_charges) || 0,
    gst_type: invoiceForm.gst_type,
    gst_rate: Number(invoiceForm.gst_rate),
  });

  const handlePreview = async () => {
    if (!invoiceForm.distance_km || Number(invoiceForm.distance_km) <= 0) {
      setInvoiceError("Distance (km) is required and must be greater than 0.");
      return;
    }
    setPreviewing(true);
    setInvoiceError("");
    try {
      const res = await previewInvoice(buildPayload());
      setInvoicePreview(res.data);
    } catch (e) {
      setInvoiceError(parseApiError(e));
    } finally {
      setPreviewing(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setInvoiceError("");
    try {
      const res = await generateInvoice(buildPayload());
      setInvoiceResult(res.data);
      setScreen("invoiceResult");
    } catch (e) {
      if (e.response?.status === 409) {
        try {
          const existing = await getBookingInvoice(invoiceBooking.id);
          setInvoiceResult(existing.data);
          setScreen("invoiceResult");
        } catch {
          setInvoiceError(parseApiError(e));
        }
      } else {
        setInvoiceError(parseApiError(e));
      }
    } finally {
      setGenerating(false);
    }
  };

  const PreviewBreakdown = ({ data }) => (
    <div className="book-invoice-preview-card">
      <div className="book-invoice-form-title">Pricing Breakdown</div>
      <div className="book-preview-row"><span>Vehicle Type</span><span>{data.vehicle_type}</span></div>
      <div className="book-preview-row"><span>Distance</span><span>{data.distance_km} km × {fmt(data.rate_per_km)}/km</span></div>
      <div className="book-preview-row"><span>Base Fare</span><span>{fmt(data.base_fare)}</span></div>
      {data.waiting_charges > 0 && <div className="book-preview-row"><span>Waiting Charges</span><span>{fmt(data.waiting_charges)}</span></div>}
      {data.toll_charges > 0 && <div className="book-preview-row"><span>Toll Charges</span><span>{fmt(data.toll_charges)}</span></div>}
      {data.loading_charges > 0 && <div className="book-preview-row"><span>Loading Charges</span><span>{fmt(data.loading_charges)}</span></div>}
      <div className="book-preview-divider" />
      <div className="book-preview-row"><span>Total before GST</span><span>{fmt(data.total_before_gst)}</span></div>
      {data.cgst_amount > 0 && <div className="book-preview-row"><span>CGST ({data.cgst_rate}%)</span><span>{fmt(data.cgst_amount)}</span></div>}
      {data.sgst_amount > 0 && <div className="book-preview-row"><span>SGST ({data.sgst_rate}%)</span><span>{fmt(data.sgst_amount)}</span></div>}
      {data.igst_amount > 0 && <div className="book-preview-row"><span>IGST ({data.igst_rate}%)</span><span>{fmt(data.igst_amount)}</span></div>}
      <div className="book-preview-divider" />
      <div className="book-preview-total-row"><span>Total Amount</span><span>{fmt(data.total_amount)}</span></div>
    </div>
  );

  const pendingCount = bookings.filter((b) => b.status === "Pending").length;

  // ── Screen: Lookup ──────────────────────────────────────────────────
  if (screen === "lookup") {
    return (
      <div className="book-container">
        <div className="book-header">
          <div className="book-logo"><span>🚛</span><span className="book-logo-text">GoGoTruk</span></div>
          <h1>Incoming Bookings</h1>
          <p className="book-subtitle">Review and respond to customer booking requests</p>
        </div>
        <div className="book-lookup-card">
          <p className="book-hint">Enter your Owner KYC ID to view booking requests.</p>
          <div className="book-input-group">
            <label>Owner KYC ID</label>
            <input
              type="number"
              placeholder="e.g. 1"
              value={ownerKycId}
              onChange={(e) => setOwnerKycId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            />
          </div>
          {error && <div className="book-error">{error}</div>}
          <button className="book-btn-primary" onClick={() => handleLookup()} disabled={loading || !ownerKycId.trim()}>
            {loading ? "Loading…" : "View Bookings →"}
          </button>
        </div>
      </div>
    );
  }

  // ── Screen: Invoice Form ────────────────────────────────────────────
  if (screen === "invoiceForm" && invoiceBooking) {
    return (
      <div className="book-container">
        <div className="book-header">
          <div className="book-logo"><span>🚛</span><span className="book-logo-text">GoGoTruk</span></div>
          <h1>Generate Invoice</h1>
          <p className="book-subtitle">Booking #{invoiceBooking.id} · {formatDate(invoiceBooking.booking_date)}</p>
        </div>

        <button className="book-btn-back" onClick={() => setScreen("list")}>← Back to Bookings</button>

        <div className="book-details" style={{ marginBottom: "16px" }}>
          <div className="book-detail-row">
            <span className="book-detail-label">Pickup</span>
            <span className="book-detail-value">{invoiceBooking.pickup_address}</span>
          </div>
          <div className="book-detail-row">
            <span className="book-detail-label">Destination</span>
            <span className="book-detail-value">{invoiceBooking.destination_address}</span>
          </div>
          <div className="book-detail-row">
            <span className="book-detail-label">Goods</span>
            <span className="book-detail-value">{invoiceBooking.goods_type} · {invoiceBooking.goods_weight_kg} kg</span>
          </div>
        </div>

        <div className="book-invoice-form-card">
          <div className="book-invoice-form-title">Trip & Charge Details</div>
          <div className="book-invoice-grid">
            <div className="book-input-group">
              <label>Distance (km) *</label>
              <input
                type="number" min="0.1" step="0.1" placeholder="e.g. 120"
                value={invoiceForm.distance_km}
                onChange={(e) => setInvoiceField("distance_km", e.target.value)}
              />
            </div>
            <div className="book-input-group">
              <label>Waiting Charges (₹)</label>
              <input
                type="number" min="0" step="0.01"
                value={invoiceForm.waiting_charges}
                onChange={(e) => setInvoiceField("waiting_charges", e.target.value)}
              />
            </div>
            <div className="book-input-group">
              <label>Toll Charges (₹)</label>
              <input
                type="number" min="0" step="0.01"
                value={invoiceForm.toll_charges}
                onChange={(e) => setInvoiceField("toll_charges", e.target.value)}
              />
            </div>
            <div className="book-input-group">
              <label>Loading Charges (₹)</label>
              <input
                type="number" min="0" step="0.01"
                value={invoiceForm.loading_charges}
                onChange={(e) => setInvoiceField("loading_charges", e.target.value)}
              />
            </div>
            <div className="book-input-group">
              <label>GST Type</label>
              <select
                className="book-invoice-select"
                value={invoiceForm.gst_type}
                onChange={(e) => setInvoiceField("gst_type", e.target.value)}
              >
                <option value="CGST+SGST">CGST + SGST (Intrastate)</option>
                <option value="IGST">IGST (Interstate)</option>
              </select>
            </div>
            <div className="book-input-group">
              <label>GST Rate</label>
              <select
                className="book-invoice-select"
                value={invoiceForm.gst_rate}
                onChange={(e) => setInvoiceField("gst_rate", e.target.value)}
              >
                <option value="0">0% (Exempt)</option>
                <option value="5">5% (Standard GTA)</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
              </select>
            </div>
          </div>

          {invoiceError && <div className="book-error">{invoiceError}</div>}

          <button
            className="book-btn-refresh"
            style={{ width: "100%", marginTop: "8px", padding: "12px" }}
            onClick={handlePreview}
            disabled={previewing || !invoiceForm.distance_km}
          >
            {previewing ? "Calculating…" : "Preview Pricing"}
          </button>
        </div>

        {invoicePreview && (
          <>
            <PreviewBreakdown data={invoicePreview} />
            <button
              className="book-btn-invoice"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? "Generating…" : "📄 Generate Invoice & Send Email"}
            </button>
          </>
        )}
      </div>
    );
  }

  // ── Screen: Invoice Result ──────────────────────────────────────────
  if (screen === "invoiceResult" && invoiceResult) {
    return (
      <div className="book-container">
        <div className="book-header">
          <div className="book-logo"><span>🚛</span><span className="book-logo-text">GoGoTruk</span></div>
          <h1>Invoice</h1>
          <p className="book-subtitle">PDF sent to customer automatically</p>
        </div>

        <button className="book-btn-back" onClick={() => setScreen("list")}>← Back to Bookings</button>

        <div className="book-invoice-result-card">
          <div className="book-invoice-number">{invoiceResult.invoice_number}</div>
          <div className="book-preview-row"><span>Booking ID</span><span>#{invoiceResult.booking_id}</span></div>
          <div className="book-preview-row"><span>Distance</span><span>{invoiceResult.distance_km} km</span></div>
          <div className="book-preview-row"><span>Base Fare</span><span>{fmt(invoiceResult.base_fare)}</span></div>
          {invoiceResult.waiting_charges > 0 && <div className="book-preview-row"><span>Waiting Charges</span><span>{fmt(invoiceResult.waiting_charges)}</span></div>}
          {invoiceResult.toll_charges > 0 && <div className="book-preview-row"><span>Toll Charges</span><span>{fmt(invoiceResult.toll_charges)}</span></div>}
          {invoiceResult.loading_charges > 0 && <div className="book-preview-row"><span>Loading Charges</span><span>{fmt(invoiceResult.loading_charges)}</span></div>}
          <div className="book-preview-divider" />
          <div className="book-preview-row"><span>Total before GST</span><span>{fmt(invoiceResult.total_before_gst)}</span></div>
          {invoiceResult.cgst_amount > 0 && <div className="book-preview-row"><span>CGST ({invoiceResult.cgst_rate}%)</span><span>{fmt(invoiceResult.cgst_amount)}</span></div>}
          {invoiceResult.sgst_amount > 0 && <div className="book-preview-row"><span>SGST ({invoiceResult.sgst_rate}%)</span><span>{fmt(invoiceResult.sgst_amount)}</span></div>}
          {invoiceResult.igst_amount > 0 && <div className="book-preview-row"><span>IGST ({invoiceResult.igst_rate}%)</span><span>{fmt(invoiceResult.igst_amount)}</span></div>}
          <div className="book-preview-divider" />
          <div className="book-preview-total-row"><span>Total Amount</span><span>{fmt(invoiceResult.total_amount)}</span></div>

          {invoiceResult.invoice_pdf_url && (
            <a
              href={proxyUrl(invoiceResult.invoice_pdf_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="book-btn-invoice"
              style={{ textDecoration: "none", textAlign: "center", marginTop: "20px" }}
            >
              📄 View Invoice PDF
            </a>
          )}
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

        <button className="book-btn-back" onClick={() => setScreen("list")}>← Back to Bookings</button>

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
            <h1>Incoming Bookings</h1>
            <p className="book-subtitle">
              Owner KYC ID: {ownerKycId}
              {pendingCount > 0 && <> · <span className="book-pending-count">{pendingCount} pending</span></>}
            </p>
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
          <div className="book-empty-icon">📋</div>
          <p>No bookings yet.</p>
        </div>
      ) : (
        <div className="book-list">
          {bookings.map((b) => {
            const countdown = b.status === "Pending"
              ? formatCountdown(b.owner_response_deadline, now)
              : null;
            const statusCls = b.status.toLowerCase().replace(/[-\s]/g, "");

            return (
              <div key={b.id} className={`book-card book-card-${statusCls}`}>
                <div className="book-card-top">
                  <div>
                    <div className="book-booking-id">Booking #{b.id}</div>
                    <div className="book-date">{formatDate(b.booking_date)}</div>
                  </div>
                  <span className={`book-badge book-badge-${statusCls}`}>{b.status}</span>
                </div>

                {countdown && (
                  <div className={`book-countdown ${countdown.cls}`}>⏱ {countdown.text}</div>
                )}

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
                    <span className="book-detail-value">{b.goods_type}</span>
                  </div>
                  <div className="book-detail-row">
                    <span className="book-detail-label">Weight</span>
                    <span className="book-detail-value">{b.goods_weight_kg} kg</span>
                  </div>
                  <div className="book-detail-row">
                    <span className="book-detail-label">Customer KYC</span>
                    <span className="book-detail-value">#{b.customer_kyc_id}</span>
                  </div>
                </div>

                {b.rejection_reason && (
                  <div className="book-rejection-reason">Rejection reason: {b.rejection_reason}</div>
                )}

                {b.status === "Pending" && rejectOpenId !== b.id && (
                  <div className="book-actions">
                    <button
                      className="book-btn-confirm"
                      disabled={reviewing}
                      onClick={() => {
                        if (window.confirm(`Accept booking #${b.id} from customer #${b.customer_kyc_id}?`)) {
                          handleReview(b.id, "Confirmed", null);
                        }
                      }}
                    >
                      ✓ Accept
                    </button>
                    <button className="book-btn-reject-open" disabled={reviewing} onClick={() => openReject(b.id)}>
                      ✗ Reject
                    </button>
                  </div>
                )}

                {b.status === "Pending" && rejectOpenId === b.id && (
                  <div className="book-reject-form">
                    <textarea
                      className="book-reject-reason-input"
                      rows={3}
                      placeholder="Reason for rejection (required)…"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <div className="book-actions">
                      <button
                        className="book-btn-reject-confirm"
                        disabled={reviewing || !rejectReason.trim()}
                        onClick={() => handleReview(b.id, "Rejected", rejectReason.trim())}
                      >
                        {reviewing ? "Rejecting…" : "Confirm Reject"}
                      </button>
                      <button className="book-btn-cancel" disabled={reviewing} onClick={() => { setRejectOpenId(null); setRejectReason(""); }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {b.status === "Confirmed" && (
                  <div className="book-actions" style={{ marginTop: "8px" }}>
                    <button className="book-btn-invoice" style={{ margin: 0 }} onClick={() => openInvoice(b)}>
                      📄 Invoice
                    </button>
                    <button
                      className="book-btn-cancel-booking"
                      style={{ flex: 1 }}
                      disabled={loadingCancel}
                      onClick={() => openCancel(b)}
                    >
                      ✕ Cancel
                    </button>
                  </div>
                )}

                {b.status === "Pending" && rejectOpenId !== b.id && (
                  <button
                    className="book-btn-link"
                    disabled={loadingCancel}
                    onClick={() => openCancel(b)}
                    style={{ marginTop: "4px", color: "#EF4444" }}
                  >
                    Cancel this booking
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
