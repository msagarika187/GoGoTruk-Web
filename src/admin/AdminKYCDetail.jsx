import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getCustomerKYCDetail,
  getCompanyKYCDetail,
  getOwnerKYCDetail,
  reviewCustomerKYC,
  reviewCompanyKYC,
  reviewOwnerKYC,
} from "../api/adminApi";
import "./Admin.css";

const DISPLAY_FIELDS = [
  { key: "name", label: "Full Name" },
  { key: "mobile", label: "Mobile" },
  { key: "email", label: "Email" },
  { key: "dob", label: "Date of Birth" },
  { key: "pan_number", label: "PAN Number" },
  { key: "aadhaar_number", label: "Aadhaar Number" },
  { key: "address", label: "Address" },
  { key: "customer_type", label: "Customer Type" },
  { key: "company_name", label: "Company Name" },
  { key: "gst_number", label: "GST Number" },
  { key: "registration_number", label: "Registration Number" },
  { key: "registered_address", label: "Registered Address" },
  { key: "license_number", label: "License Number" },
  { key: "vehicle_number", label: "Vehicle Number" },
  { key: "status", label: "Current Status" },
];

const DOC_FIELDS = [
  { key: "id_proof_url", label: "ID Proof" },
  { key: "incorporation_cert_url", label: "Incorporation Certificate" },
  { key: "gst_certificate_url", label: "GST Certificate" },
  { key: "driving_license_url", label: "Driving License" },
  { key: "owner_id_url", label: "Owner ID" },
];

function proxyUrl(url) {
  return `http://127.0.0.1:8000/api/docs/view?url=${encodeURIComponent(url)}`;
}

function isImageUrl(url) {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
}

function isPdfUrl(url) {
  return /\.pdf$/i.test(url);
}

function typeBadgeClass(type) {
  if (type === "customer") return "badge-customer";
  if (type === "company") return "badge-company";
  if (type === "owner") return "badge-owner";
  return "";
}

export default function AdminKYCDetail() {
  const { type, id } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewStatus, setReviewStatus] = useState("Verified");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const fetch = async () => {
      try {
        let res;
        if (type === "customer") res = await getCustomerKYCDetail(id);
        else if (type === "company") res = await getCompanyKYCDetail(id);
        else if (type === "owner") res = await getOwnerKYCDetail(id);
        else throw new Error("Unknown KYC type");
        setDetail(res.data);
      } catch (e) {
        const detail = e.response?.data?.detail;
        setError(typeof detail === "string" ? detail : "Failed to load KYC details.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [type, id]);

  const handleReview = async (status) => {
    if (status === "Rejected" && !reason.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const body = { status, reason: reason.trim() };
      if (type === "customer") await reviewCustomerKYC(id, body);
      else if (type === "company") await reviewCompanyKYC(id, body);
      else if (type === "owner") await reviewOwnerKYC(id, body);

      setToast(`KYC ${status}`);
      setTimeout(() => {
        setToast("");
        navigate("/admin/kyc");
      }, 1800);
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Review failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const typeLabel = type ? type.charAt(0).toUpperCase() + type.slice(1) : "";

  return (
    <div className="admin-container">
      {toast && (
        <div className={`admin-toast ${toast.includes("Verified") ? "toast-success" : "toast-reject"}`}>
          {toast.includes("Verified") ? "✅" : "❌"} {toast}
        </div>
      )}

      <div className="admin-detail-header">
        <button className="admin-btn-back" onClick={() => navigate("/admin/kyc")}>
          ← Back to Queue
        </button>
        <div className="admin-header">
          <div className="admin-logo">
            <span>🚛</span>
            <span className="admin-logo-text">GoGoTruk</span>
          </div>
          <h1>KYC Detail Review</h1>
        </div>
      </div>

      {loading && <div className="admin-loading">Loading details…</div>}
      {error && !loading && <div className="admin-error">{error}</div>}

      {detail && (
        <>
          <div className="admin-detail-card">
            <div className="admin-detail-title">
              <span className={`admin-badge ${typeBadgeClass(type)}`}>
                {typeLabel} KYC
              </span>
              <span className="admin-detail-id">ID: {id}</span>
            </div>

            {/* Linked individual KYC note for Company records */}
            {type === "company" && detail.customer_kyc_id && (
              <div className="admin-linked-note">
                Linked Individual KYC ID: <strong>{detail.customer_kyc_id}</strong>
                <button
                  className="admin-btn-link"
                  onClick={() => navigate(`/admin/kyc/customer/${detail.customer_kyc_id}`)}
                >
                  Review Individual →
                </button>
              </div>
            )}

            {/* Detail fields */}
            <div className="admin-fields-grid">
              {DISPLAY_FIELDS.filter(
                (f) => detail[f.key] !== undefined && detail[f.key] !== null && detail[f.key] !== ""
              ).map((f) => (
                <div key={f.key} className="admin-field-item">
                  <span className="admin-field-label">{f.label}</span>
                  <span className="admin-field-value">{String(detail[f.key])}</span>
                </div>
              ))}
            </div>

            {/* Document previews */}
            {DOC_FIELDS.some((f) => detail[f.key]) && (
              <div className="admin-docs-section">
                <div className="admin-section-title">Documents</div>
                <div className="admin-docs-grid">
                  {DOC_FIELDS.filter((f) => detail[f.key]).map((f) => (
                    <div key={f.key} className="admin-doc-item">
                      <div className="admin-doc-label">{f.label}</div>
                      {isImageUrl(detail[f.key]) ? (
                        <a href={proxyUrl(detail[f.key])} target="_blank" rel="noopener noreferrer">
                          <img src={proxyUrl(detail[f.key])} alt={f.label} className="admin-doc-img" />
                        </a>
                      ) : isPdfUrl(detail[f.key]) ? (
                        <div className="admin-doc-pdf">
                          <iframe
                            src={proxyUrl(detail[f.key])}
                            title={f.label}
                            className="admin-doc-iframe"
                          />
                          <a
                            href={proxyUrl(detail[f.key])}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="admin-doc-link"
                          >
                            ⬇ Download PDF
                          </a>
                        </div>
                      ) : (
                        <a
                          href={proxyUrl(detail[f.key])}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-doc-link"
                        >
                          View Document →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Review form */}
          <div className="admin-review-card">
            <div className="admin-section-title">Review Decision</div>

            <div className="admin-radio-group">
              <label className="admin-radio-label">
                <input
                  type="radio"
                  name="reviewStatus"
                  value="Verified"
                  checked={reviewStatus === "Verified"}
                  onChange={() => setReviewStatus("Verified")}
                />
                Verified
              </label>
              <label className="admin-radio-label">
                <input
                  type="radio"
                  name="reviewStatus"
                  value="Rejected"
                  checked={reviewStatus === "Rejected"}
                  onChange={() => setReviewStatus("Rejected")}
                />
                Rejected
              </label>
            </div>

            <div className="admin-reason-group">
              <label className="admin-field-label">
                Reason{reviewStatus === "Rejected" ? " (required)" : " (optional)"}
              </label>
              <textarea
                className="admin-textarea"
                placeholder={
                  reviewStatus === "Rejected"
                    ? "Explain why this KYC is being rejected…"
                    : "Add a note (optional)"
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            {error && <div className="admin-error">{error}</div>}

            <div className="admin-review-actions">
              <button
                className="admin-btn-approve"
                disabled={submitting || reviewStatus !== "Verified"}
                onClick={() => handleReview("Verified")}
              >
                {submitting && reviewStatus === "Verified" ? "Processing…" : "✓ Approve"}
              </button>
              <button
                className="admin-btn-reject"
                disabled={submitting || reviewStatus !== "Rejected" || !reason.trim()}
                onClick={() => handleReview("Rejected")}
              >
                {submitting && reviewStatus === "Rejected" ? "Processing…" : "✗ Reject"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
