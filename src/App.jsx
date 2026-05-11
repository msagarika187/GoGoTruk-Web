import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  sendOTP, verifyOTP, registerKYC, getKYCStatus,
  registerCompanyKYC, uploadCompanyDocs, getCompanyKYCStatus,
  registerOwnerKYC, uploadOwnerDocs, getOwnerKYCStatus,
  submitConsent, getConsentStatus, getConsentPdfUrl,
} from "./api/kycApi";
import "./App.css";

const OWNER_STEPS = ["Mobile", "Verify OTP", "Owner Details", "Upload Docs", "Status"];

const CONSENT_CLAUSES = [
  {
    title: "1. GOODS LIABILITY",
    text: "The customer declares that all goods submitted for transport are legally owned or authorized for transport by them. GoGoTruk bears no liability for loss, damage, or theft of goods unless caused by proven negligence of the assigned truck owner.",
  },
  {
    title: "2. PACKAGING RESPONSIBILITY",
    text: "The customer is solely responsible for ensuring goods are appropriately packed and secured for road transport. Damage from inadequate packaging is entirely the customer's responsibility.",
  },
  {
    title: "3. PAYMENT TERMS",
    text: "Full freight charges must be paid before or upon delivery. Late payments attract a penalty of 2% per week. Disputes must be raised within 48 hours of delivery.",
  },
  {
    title: "4. CANCELLATION POLICY",
    text: "More than 48 hours before pickup: No charge\n24–48 hours before pickup: 25% charge retained\nLess than 24 hours before pickup: 50% charge retained\nNo-show on pickup day: 100% forfeited\nRefunds processed within 5–7 business days.",
  },
  {
    title: "5. LEGAL COMPLIANCE",
    text: "All goods must comply with Indian laws. Transport of prohibited, hazardous or illegal goods results in immediate account suspension and referral to law enforcement.",
  },
  {
    title: "6. DISPUTE RESOLUTION",
    text: "Disputes are subject to exclusive jurisdiction of courts in Mumbai, Maharashtra, India. Mediation must be attempted before legal proceedings.",
  },
  {
    title: "7. PLATFORM USAGE",
    text: "The platform must only be used for lawful purposes. Fraudulent bookings or abuse of cancellation policy results in permanent account ban.",
  },
];

function parseApiError(e) {
  const detail = e.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map(d => `${d.loc?.at(-1)}: ${d.msg}`).join(" | ");
  return null;
}

// ── Shared sub-components (outside App to prevent focus loss on re-render) ───

function OTPScreen({ mobile, onMobileChange, loading, error, onSendOTP, onBack }) {
  return (
    <div className="screen">
      <h2>Welcome to GoGoTruk</h2>
      <p className="subtitle">Enter your mobile number to get started</p>
      <div className="input-group">
        <label>Mobile Number</label>
        <div className="phone-input">
          <span className="country-code">🇮🇳 +91</span>
          <input type="tel" maxLength={10} placeholder="9876543210" value={mobile}
            onChange={(e) => onMobileChange(e.target.value.replace(/\D/g, ""))} />
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn-primary" onClick={onSendOTP} disabled={loading}>
        {loading ? "Sending..." : "Send OTP →"}
      </button>
      <button className="btn-link" onClick={onBack}>← Back</button>
    </div>
  );
}

function VerifyOTPScreen({ mobile, otp, onOtpChange, devOtp, loading, error, onVerifyOTP, onBack }) {
  return (
    <div className="screen">
      <h2>Verify OTP</h2>
      <p className="subtitle">Enter the 6-digit OTP sent to +91 {mobile}</p>
      {devOtp && (
        <div className="dev-otp">
          <span>🔧 Dev OTP:</span>
          <strong>{devOtp}</strong>
        </div>
      )}
      <div className="input-group">
        <label>Enter OTP</label>
        <input type="text" maxLength={6} placeholder="123456" value={otp}
          onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, ""))}
          className="otp-input" />
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn-primary" onClick={onVerifyOTP} disabled={loading}>
        {loading ? "Verifying..." : "Verify OTP →"}
      </button>
      <button className="btn-link" onClick={onBack}>← Change Number</button>
    </div>
  );
}

function UploadZone({ id, label, selectedFile, onFileChange, onClearError }) {
  return (
    <div className="upload-item">
      <p className="upload-label">{label}</p>
      <div className="upload-zone" onClick={() => document.getElementById(id).click()}>
        {selectedFile ? (
          <div className="file-selected">
            <span className="file-icon">📄</span>
            <span className="file-name">{selectedFile.name}</span>
          </div>
        ) : (
          <>
            <span className="upload-icon">📁</span>
            <p>Click to select</p>
            <p className="upload-hint">JPG, PNG or PDF</p>
          </>
        )}
      </div>
      <input id={id} type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display: "none" }}
        onChange={(e) => { onFileChange(e.target.files[0]); onClearError(); }} />
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);         // null | "customer" | "owner"
  const [registrationType, setRegistrationType] = useState(null); // null | "Individual" | "Company"

  const [step, setStep] = useState(1);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Customer — Individual KYC
  const [kycId, setKycId] = useState(null);
  const [kycData, setKycData] = useState(null);
  const [file, setFile] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    first_name: "", middle_name: "", last_name: "",
    date_of_birth: "", email: "",
    address_1: "", address_2: "", address_3: "",
  });

  // Customer — Consent (step 4)
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentId, setConsentId] = useState(null);
  const [consentConfirmed, setConsentConfirmed] = useState(false);

  // Customer — Company KYC
  const [companyKycId, setCompanyKycId] = useState(null);
  const [companyKycData, setCompanyKycData] = useState(null);
  const [incorporationCert, setIncorporationCert] = useState(null);
  const [gstCertificate, setGstCertificate] = useState(null);
  const [companyForm, setCompanyForm] = useState({
    company_name: "", company_type: "Pvt Ltd", gst_number: "",
    registered_address_1: "", registered_address_2: "", registered_address_3: "",
    city: "", state: "", pincode: "",
    contact_person_name: "", contact_person_mobile: "", contact_person_email: "",
  });

  // Owner KYC
  const [ownerKycId, setOwnerKycId] = useState(null);
  const [ownerKycData, setOwnerKycData] = useState(null);
  const [drivingLicense, setDrivingLicense] = useState(null);
  const [ownerId, setOwnerId] = useState(null);
  const [ownerForm, setOwnerForm] = useState({
    first_name: "", middle_name: "", last_name: "",
    date_of_birth: "", email: "", company_name: "",
    address_1: "", address_2: "", address_3: "",
  });

  // Derived
  const isCompany = registrationType === "Company";

  // Step 4 = Declaration, then Upload ID (step 5) or Company Details (step 5) based on type
  const customerSteps = isCompany
    ? ["Mobile", "Verify OTP", "KYC Form", "Declaration", "Company Details", "Upload Docs", "Status"]
    : ["Mobile", "Verify OTP", "KYC Form", "Declaration", "Upload ID", "Status"];
  const customerStepIndexMap = isCompany
    ? { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6 }
    : { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
  const customerActiveIndex = customerStepIndexMap[step] ?? 0;

  // ── Shared OTP handlers ──────────────────────────────────────────────────

  const handleSendOTP = async () => {
    setError("");
    if (!mobile || mobile.length !== 10) { setError("Enter a valid 10-digit mobile number"); return; }
    setLoading(true);
    try {
      const res = await sendOTP(mobile);
      setDevOtp(res.dev_otp || "");
      if (res.dev_otp) setOtp(res.dev_otp);
      setStep(2);
    } catch (e) { setError(e.response?.data?.detail || "Failed to send OTP"); }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    setError("");
    if (!otp || otp.length !== 6) { setError("Enter the 6-digit OTP"); return; }
    setLoading(true);
    try {
      await verifyOTP(mobile, otp);
      setStep(3);
    } catch (e) { setError(e.response?.data?.detail || "Invalid OTP"); }
    setLoading(false);
  };

  // ── Customer handlers ────────────────────────────────────────────────────

  const handleRegister = async () => {
    setError("");
    if (!form.first_name || !form.last_name || !form.email || !form.address_1 || !form.date_of_birth) {
      setError("Please fill all required fields"); return;
    }
    setLoading(true);
    try {
      const res = await registerKYC({ ...form, mobile, customer_type: registrationType });
      setKycId(res.id); setKycData(res);
      // Check if consent already given — skip step 4 if so
      try {
        await getConsentStatus(res.id);
        setStep(5); // Already consented
      } catch {
        setStep(4); // Consent required
      }
    } catch (e) { setError(parseApiError(e) || "Registration failed"); }
    setLoading(false);
  };

  const handleSubmitConsent = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await submitConsent({ customer_kyc_id: kycId, accepted: true });
      setConsentId(res.id);
      setConsentConfirmed(true);
    } catch (e) { setError(parseApiError(e) || "Failed to submit consent"); }
    setLoading(false);
  };

  const handleUpload = async () => {
    setError("");
    if (!file) { setError("Please select a file"); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`http://127.0.0.1:8000/api/kyc/upload-id/${kycId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadedUrl(res.data.file_path);
      setStep(6);
    } catch (e) { setError(e.response?.data?.detail || "Upload failed"); }
    setUploading(false);
  };

  const handleRegisterCompany = async () => {
    setError("");
    const { company_name, registered_address_1, city, state, pincode, contact_person_name, contact_person_mobile, contact_person_email } = companyForm;
    if (!company_name || !registered_address_1 || !city || !state || !pincode || !contact_person_name || !contact_person_mobile || !contact_person_email) {
      setError("Please fill all required fields"); return;
    }
    if (pincode.length !== 6) { setError("Pincode must be 6 digits"); return; }
    if (contact_person_mobile.length !== 10) { setError("Enter a valid 10-digit contact mobile"); return; }
    setLoading(true);
    try {
      const res = await registerCompanyKYC({ ...companyForm, customer_kyc_id: kycId });
      setCompanyKycId(res.id); setStep(6);
    } catch (e) { setError(parseApiError(e) || "Company registration failed"); }
    setLoading(false);
  };

  const handleUploadCompanyDocs = async () => {
    setError("");
    if (!incorporationCert && !gstCertificate) { setError("Upload at least one document"); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      if (incorporationCert) formData.append("incorporation_cert", incorporationCert);
      if (gstCertificate) formData.append("gst_certificate", gstCertificate);
      await uploadCompanyDocs(companyKycId, formData);
      const res = await getCompanyKYCStatus(companyKycId);
      setCompanyKycData(res); setStep(7);
    } catch (e) { setError(parseApiError(e) || "Upload failed"); }
    setLoading(false);
  };

  const handleCheckCustomerStatus = async () => {
    setError(""); setLoading(true);
    try {
      if (isCompany) {
        const res = await getCompanyKYCStatus(companyKycId); setCompanyKycData(res);
      } else {
        const res = await getKYCStatus(kycId); setKycData(res);
      }
    } catch (e) { setError(e.response?.data?.detail || "Failed to fetch status"); }
    setLoading(false);
  };

  // ── Owner handlers ───────────────────────────────────────────────────────

  const handleOwnerRegister = async () => {
    setError("");
    if (!ownerForm.first_name || !ownerForm.last_name || !ownerForm.email || !ownerForm.address_1 || !ownerForm.date_of_birth) {
      setError("Please fill all required fields"); return;
    }
    setLoading(true);
    try {
      const res = await registerOwnerKYC({ ...ownerForm, mobile });
      setOwnerKycId(res.id); setStep(4);
    } catch (e) { setError(parseApiError(e) || "Owner registration failed"); }
    setLoading(false);
  };

  const handleUploadOwnerDocs = async () => {
    setError("");
    if (!drivingLicense && !ownerId) { setError("Upload at least one document"); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      if (drivingLicense) formData.append("driving_license", drivingLicense);
      if (ownerId) formData.append("owner_id", ownerId);
      await uploadOwnerDocs(ownerKycId, formData);
      const res = await getOwnerKYCStatus(ownerKycId);
      setOwnerKycData(res); setStep(5);
    } catch (e) { setError(parseApiError(e) || "Upload failed"); }
    setLoading(false);
  };

  const handleCheckOwnerStatus = async () => {
    setError(""); setLoading(true);
    try {
      const res = await getOwnerKYCStatus(ownerKycId); setOwnerKycData(res);
    } catch (e) { setError(e.response?.data?.detail || "Failed to fetch status"); }
    setLoading(false);
  };

  // ── Reset ────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setUserRole(null); setRegistrationType(null); setStep(1);
    setMobile(""); setOtp(""); setDevOtp(""); setError("");
    setKycId(null); setKycData(null); setFile(null); setUploadedUrl("");
    setConsentChecked(false); setConsentId(null); setConsentConfirmed(false);
    setCompanyKycId(null); setCompanyKycData(null);
    setIncorporationCert(null); setGstCertificate(null);
    setOwnerKycId(null); setOwnerKycData(null);
    setDrivingLicense(null); setOwnerId(null);
    setForm({ first_name: "", middle_name: "", last_name: "", date_of_birth: "", email: "", address_1: "", address_2: "", address_3: "" });
    setCompanyForm({ company_name: "", company_type: "Pvt Ltd", gst_number: "", registered_address_1: "", registered_address_2: "", registered_address_3: "", city: "", state: "", pincode: "", contact_person_name: "", contact_person_mobile: "", contact_person_email: "" });
    setOwnerForm({ first_name: "", middle_name: "", last_name: "", date_of_birth: "", email: "", company_name: "", address_1: "", address_2: "", address_3: "" });
  };

  const clearError = () => setError("");

  const otpScreenProps = { mobile, onMobileChange: setMobile, loading, error, onSendOTP: handleSendOTP };
  const verifyOTPProps = { mobile, otp, onOtpChange: setOtp, devOtp, loading, error, onVerifyOTP: handleVerifyOTP };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span className="logo-icon">🚛</span>
          <span className="logo-text">GoGoTruk</span>
        </div>
        <p className="tagline">India's Logistics Platform</p>
      </header>

      {/* ── Top-level landing ── */}
      {userRole === null && (
        <div className="card">
          <div className="screen">
            <h2>Who are you?</h2>
            <p className="subtitle">Choose your registration type to get started</p>
            <div className="type-grid">
              <button className="type-card" onClick={() => setUserRole("customer")}>
                <span className="type-icon">👤</span>
                <strong>Customer</strong>
                <p>Register as an individual or company to book logistics services</p>
              </button>
              <button className="type-card" onClick={() => setUserRole("owner")}>
                <span className="type-icon">🚛</span>
                <strong>Truck Owner</strong>
                <p>Register your trucks and start accepting delivery jobs</p>
              </button>
            </div>
            <button className="btn-link" onClick={() => navigate("/fleet")}>
              Already a registered owner? Manage My Fleet →
            </button>
          </div>
        </div>
      )}

      {/* ── Customer flow ── */}
      {userRole === "customer" && (
        <>
          {!registrationType && (
            <div className="card">
              <div className="screen">
                <h2>Get Started</h2>
                <p className="subtitle">How would you like to register?</p>
                <div className="type-grid">
                  <button className="type-card" onClick={() => setRegistrationType("Individual")}>
                    <span className="type-icon">👤</span>
                    <strong>Individual</strong>
                    <p>Personal KYC for truck owners and drivers</p>
                  </button>
                  <button className="type-card" onClick={() => setRegistrationType("Company")}>
                    <span className="type-icon">🏢</span>
                    <strong>Company</strong>
                    <p>Business KYC for logistics companies and fleet operators</p>
                  </button>
                </div>
                <button className="btn-link" onClick={() => { setUserRole(null); setError(""); }}>← Back</button>
              </div>
            </div>
          )}

          {registrationType && (
            <>
              <div className="steps">
                {customerSteps.map((s, i) => (
                  <div key={i} className={`step ${customerActiveIndex === i ? "active" : ""} ${customerActiveIndex > i ? "done" : ""}`}>
                    <div className="step-circle">{customerActiveIndex > i ? "✓" : i + 1}</div>
                    <span className="step-label">{s}</span>
                  </div>
                ))}
              </div>

              <div className="card">
                {step === 1 && <OTPScreen {...otpScreenProps} onBack={() => { setRegistrationType(null); setError(""); }} />}
                {step === 2 && <VerifyOTPScreen {...verifyOTPProps} onBack={() => { setStep(1); setError(""); }} />}

                {/* Step 3 — Individual KYC form */}
                {step === 3 && (
                  <div className="screen">
                    <h2>{isCompany ? "Contact Person Details" : "KYC Registration"}</h2>
                    <p className="subtitle">
                      {isCompany ? "Enter the authorized contact person's details" : "Fill in your details to complete registration"}
                    </p>
                    <div className="form-grid">
                      <div className="input-group">
                        <label>First Name *</label>
                        <input placeholder="John" value={form.first_name}
                          onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                      </div>
                      <div className="input-group">
                        <label>Middle Name</label>
                        <input placeholder="A" value={form.middle_name}
                          onChange={(e) => setForm({ ...form, middle_name: e.target.value })} />
                      </div>
                      <div className="input-group">
                        <label>Last Name *</label>
                        <input placeholder="Doe" value={form.last_name}
                          onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                      </div>
                      <div className="input-group">
                        <label>Date of Birth *</label>
                        <input type="date" value={form.date_of_birth}
                          onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
                      </div>
                      <div className="input-group full">
                        <label>Email *</label>
                        <input type="email" placeholder="john@example.com" value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      </div>
                      <div className="input-group full">
                        <label>Address Line 1 *</label>
                        <input placeholder="123 MG Road" value={form.address_1}
                          onChange={(e) => setForm({ ...form, address_1: e.target.value })} />
                      </div>
                      <div className="input-group full">
                        <label>Address Line 2</label>
                        <input placeholder="Bangalore" value={form.address_2}
                          onChange={(e) => setForm({ ...form, address_2: e.target.value })} />
                      </div>
                      <div className="input-group full">
                        <label>Address Line 3</label>
                        <input placeholder="Karnataka" value={form.address_3}
                          onChange={(e) => setForm({ ...form, address_3: e.target.value })} />
                      </div>
                    </div>
                    {error && <p className="error">{error}</p>}
                    <button className="btn-primary" onClick={handleRegister} disabled={loading}>
                      {loading ? "Registering..." : isCompany ? "Continue →" : "Submit KYC →"}
                    </button>
                  </div>
                )}

                {/* Step 4 — Declaration / Consent */}
                {step === 4 && (
                  <div className="screen">
                    {!consentConfirmed ? (
                      <>
                        <h2>Platform Declaration</h2>
                        <p className="subtitle">Read and accept the terms before proceeding</p>
                        <div className="consent-clauses">
                          {CONSENT_CLAUSES.map((clause, i) => (
                            <div key={i} className="consent-clause">
                              <h4>{clause.title}</h4>
                              <p style={{ whiteSpace: "pre-line" }}>{clause.text}</p>
                            </div>
                          ))}
                        </div>
                        <label className="consent-check-row">
                          <input type="checkbox" checked={consentChecked}
                            onChange={(e) => setConsentChecked(e.target.checked)} />
                          <span>I have read and agree to all the terms of this declaration</span>
                        </label>
                        {error && <p className="error">{error}</p>}
                        <button className="btn-primary" onClick={handleSubmitConsent}
                          disabled={!consentChecked || loading}>
                          {loading ? "Submitting..." : "I Agree →"}
                        </button>
                      </>
                    ) : (
                      <div className="consent-success">
                        <div className="success-icon">✅</div>
                        <h3>Declaration accepted successfully</h3>
                        <p className="subtitle">Your consent has been recorded</p>
                        {consentId && (
                          <a href={getConsentPdfUrl(consentId)} target="_blank" rel="noreferrer"
                            className="btn-secondary" style={{ display: "block", textAlign: "center", textDecoration: "none", marginBottom: "8px" }}>
                            📄 Download Declaration PDF
                          </a>
                        )}
                        <button className="btn-primary" onClick={() => setStep(5)}>
                          Continue →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 5 — Individual: Upload ID */}
                {step === 5 && !isCompany && (
                  <div className="screen">
                    <h2>Upload ID Proof</h2>
                    <p className="subtitle">Upload a valid government ID (JPG, PNG or PDF)</p>
                    <div className="upload-box">
                      <input type="file" accept=".jpg,.jpeg,.png,.pdf" id="file-upload"
                        className="file-input" onChange={(e) => setFile(e.target.files[0])} />
                      <label htmlFor="file-upload" className="file-label">
                        {file ? `📄 ${file.name}` : "📁 Click to Choose File"}
                      </label>
                    </div>
                    {error && <p className="error">{error}</p>}
                    <button className="btn-primary" onClick={handleUpload} disabled={uploading}>
                      {uploading ? "Uploading..." : "Upload ID →"}
                    </button>
                    <button className="btn-link" onClick={() => setStep(6)}>Skip for now →</button>
                  </div>
                )}

                {/* Step 5 — Company: Company Details */}
                {step === 5 && isCompany && (
                  <div className="screen">
                    <h2>Company Details</h2>
                    <p className="subtitle">Enter your company information to continue</p>
                    <div className="form-grid">
                      <div className="input-group full">
                        <label>Company Name *</label>
                        <input placeholder="Acme Pvt Ltd" value={companyForm.company_name}
                          onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })} />
                      </div>
                      <div className="input-group">
                        <label>Company Type *</label>
                        <select value={companyForm.company_type}
                          onChange={(e) => setCompanyForm({ ...companyForm, company_type: e.target.value })}>
                          <option value="Pvt Ltd">Pvt Ltd</option>
                          <option value="LLP">LLP</option>
                          <option value="Partnership">Partnership</option>
                          <option value="Limited">Limited</option>
                        </select>
                      </div>
                      <div className="input-group">
                        <label>GST Number</label>
                        <input placeholder="22AAAAA0000A1Z5" maxLength={15} value={companyForm.gst_number}
                          onChange={(e) => setCompanyForm({ ...companyForm, gst_number: e.target.value.toUpperCase() })} />
                      </div>
                      <div className="input-group full">
                        <label>Registered Address 1 *</label>
                        <input placeholder="123 Industrial Area" value={companyForm.registered_address_1}
                          onChange={(e) => setCompanyForm({ ...companyForm, registered_address_1: e.target.value })} />
                      </div>
                      <div className="input-group full">
                        <label>Registered Address 2</label>
                        <input placeholder="Phase 2" value={companyForm.registered_address_2}
                          onChange={(e) => setCompanyForm({ ...companyForm, registered_address_2: e.target.value })} />
                      </div>
                      <div className="input-group full">
                        <label>Registered Address 3</label>
                        <input placeholder="Near Main Gate" value={companyForm.registered_address_3}
                          onChange={(e) => setCompanyForm({ ...companyForm, registered_address_3: e.target.value })} />
                      </div>
                      <div className="input-group">
                        <label>City *</label>
                        <input placeholder="Mumbai" value={companyForm.city}
                          onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })} />
                      </div>
                      <div className="input-group">
                        <label>State *</label>
                        <input placeholder="Maharashtra" value={companyForm.state}
                          onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })} />
                      </div>
                      <div className="input-group full">
                        <label>Pincode *</label>
                        <input placeholder="400001" maxLength={6} value={companyForm.pincode}
                          onChange={(e) => setCompanyForm({ ...companyForm, pincode: e.target.value.replace(/\D/g, "") })} />
                      </div>
                      <div className="section-divider full"><span>Contact Person</span></div>
                      <div className="input-group full">
                        <label>Contact Person Name *</label>
                        <input placeholder="John Doe" value={companyForm.contact_person_name}
                          onChange={(e) => setCompanyForm({ ...companyForm, contact_person_name: e.target.value })} />
                      </div>
                      <div className="input-group">
                        <label>Contact Mobile *</label>
                        <input placeholder="9876543210" maxLength={10} value={companyForm.contact_person_mobile}
                          onChange={(e) => setCompanyForm({ ...companyForm, contact_person_mobile: e.target.value.replace(/\D/g, "") })} />
                      </div>
                      <div className="input-group">
                        <label>Contact Email *</label>
                        <input type="email" placeholder="john@company.com" value={companyForm.contact_person_email}
                          onChange={(e) => setCompanyForm({ ...companyForm, contact_person_email: e.target.value })} />
                      </div>
                    </div>
                    {error && <p className="error">{error}</p>}
                    <button className="btn-primary" onClick={handleRegisterCompany} disabled={loading}>
                      {loading ? "Saving..." : "Continue →"}
                    </button>
                  </div>
                )}

                {/* Step 6 — Company: Upload Docs */}
                {step === 6 && isCompany && (
                  <div className="screen">
                    <h2>Upload Documents</h2>
                    <p className="subtitle">Upload company documents (at least one required)</p>
                    <div className="upload-grid">
                      <UploadZone id="inc-cert-input" label="Certificate of Incorporation"
                        selectedFile={incorporationCert} onFileChange={setIncorporationCert} onClearError={clearError} />
                      <UploadZone id="gst-cert-input" label="GST Certificate"
                        selectedFile={gstCertificate} onFileChange={setGstCertificate} onClearError={clearError} />
                    </div>
                    {error && <p className="error">{error}</p>}
                    <button className="btn-primary" onClick={handleUploadCompanyDocs} disabled={loading}>
                      {loading ? "Uploading..." : "Upload & Finish →"}
                    </button>
                  </div>
                )}

                {/* Step 6 — Individual: Status */}
                {step === 6 && !isCompany && kycData && (
                  <div className="screen">
                    <div className="success-icon">🎉</div>
                    <h2>Registration Successful!</h2>
                    <p className="subtitle">Your KYC has been submitted successfully</p>
                    <div className="status-card">
                      <div className="status-badge pending">{kycData.status}</div>
                      <div className="status-grid">
                        <div className="status-item"><span className="label">Name</span><span className="value">{kycData.first_name} {kycData.last_name}</span></div>
                        <div className="status-item"><span className="label">Mobile</span><span className="value">+91 {kycData.mobile}</span></div>
                        <div className="status-item"><span className="label">Email</span><span className="value">{kycData.email}</span></div>
                        <div className="status-item"><span className="label">KYC ID</span><span className="value">#{kycData.id}</span></div>
                        <div className="status-item"><span className="label">OTP Verified</span><span className="value">{kycData.otp_verified === "true" ? "✅ Yes" : "❌ No"}</span></div>
                        {uploadedUrl && (
                          <div className="status-item"><span className="label">ID Proof</span>
                            <a href={uploadedUrl} target="_blank" rel="noreferrer" className="value doc-link">✅ View Document</a>
                          </div>
                        )}
                      </div>
                    </div>
                    <button className="btn-secondary" onClick={handleCheckCustomerStatus} disabled={loading}>
                      {loading ? "Checking..." : "🔄 Refresh Status"}
                    </button>
                    <button className="btn-link" onClick={handleReset}>+ Register Another</button>
                  </div>
                )}

                {/* Step 7 — Company: Status */}
                {step === 7 && companyKycData && (
                  <div className="screen">
                    <div className="success-icon">🎉</div>
                    <h2>Registration Successful!</h2>
                    <p className="subtitle">Company KYC submitted successfully</p>
                    <div className="status-card">
                      <div className={`status-badge ${companyKycData.status?.toLowerCase() || "pending"}`}>{companyKycData.status}</div>
                      <div className="status-grid">
                        <div className="status-item"><span className="label">Company</span><span className="value">{companyKycData.company_name}</span></div>
                        <div className="status-item"><span className="label">Type</span><span className="value">{companyKycData.company_type}</span></div>
                        <div className="status-item"><span className="label">GST</span><span className="value">{companyKycData.gst_number || "—"}</span></div>
                        <div className="status-item"><span className="label">Contact</span><span className="value">{companyKycData.contact_person_name}</span></div>
                        <div className="status-item"><span className="label">Company KYC ID</span><span className="value">#{companyKycData.id}</span></div>
                      </div>
                    </div>
                    <button className="btn-secondary" onClick={handleCheckCustomerStatus} disabled={loading}>
                      {loading ? "Checking..." : "🔄 Refresh Status"}
                    </button>
                    <button className="btn-link" onClick={handleReset}>+ Register Another</button>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Owner flow ── */}
      {userRole === "owner" && (
        <>
          <div className="steps">
            {OWNER_STEPS.map((s, i) => (
              <div key={i} className={`step ${step - 1 === i ? "active" : ""} ${step - 1 > i ? "done" : ""}`}>
                <div className="step-circle">{step - 1 > i ? "✓" : i + 1}</div>
                <span className="step-label">{s}</span>
              </div>
            ))}
          </div>

          <div className="card">
            {step === 1 && <OTPScreen {...otpScreenProps} onBack={() => { setUserRole(null); setStep(1); setError(""); }} />}
            {step === 2 && <VerifyOTPScreen {...verifyOTPProps} onBack={() => { setStep(1); setError(""); }} />}

            {step === 3 && (
              <div className="screen">
                <h2>Owner Registration</h2>
                <p className="subtitle">Fill in your details to register as a truck owner</p>
                <div className="form-grid">
                  <div className="input-group">
                    <label>First Name *</label>
                    <input placeholder="Suresh" value={ownerForm.first_name}
                      onChange={(e) => setOwnerForm({ ...ownerForm, first_name: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label>Middle Name</label>
                    <input value={ownerForm.middle_name}
                      onChange={(e) => setOwnerForm({ ...ownerForm, middle_name: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label>Last Name *</label>
                    <input placeholder="Yadav" value={ownerForm.last_name}
                      onChange={(e) => setOwnerForm({ ...ownerForm, last_name: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label>Date of Birth *</label>
                    <input type="date" value={ownerForm.date_of_birth}
                      onChange={(e) => setOwnerForm({ ...ownerForm, date_of_birth: e.target.value })} />
                  </div>
                  <div className="input-group full">
                    <label>Email *</label>
                    <input type="email" placeholder="suresh@example.com" value={ownerForm.email}
                      onChange={(e) => setOwnerForm({ ...ownerForm, email: e.target.value })} />
                  </div>
                  <div className="input-group full">
                    <label>Company / Fleet Name <span className="optional-tag">optional</span></label>
                    <input placeholder="Yadav Transport" value={ownerForm.company_name}
                      onChange={(e) => setOwnerForm({ ...ownerForm, company_name: e.target.value })} />
                  </div>
                  <div className="input-group full">
                    <label>Address Line 1 *</label>
                    <input placeholder="45 NH-44 Highway" value={ownerForm.address_1}
                      onChange={(e) => setOwnerForm({ ...ownerForm, address_1: e.target.value })} />
                  </div>
                  <div className="input-group full">
                    <label>Address Line 2</label>
                    <input placeholder="Nagpur" value={ownerForm.address_2}
                      onChange={(e) => setOwnerForm({ ...ownerForm, address_2: e.target.value })} />
                  </div>
                  <div className="input-group full">
                    <label>Address Line 3</label>
                    <input value={ownerForm.address_3}
                      onChange={(e) => setOwnerForm({ ...ownerForm, address_3: e.target.value })} />
                  </div>
                </div>
                {error && <p className="error">{error}</p>}
                <button className="btn-primary" onClick={handleOwnerRegister} disabled={loading}>
                  {loading ? "Registering..." : "Continue →"}
                </button>
              </div>
            )}

            {step === 4 && (
              <div className="screen">
                <h2>Upload Documents</h2>
                <p className="subtitle">Upload your documents (at least one required)</p>
                <div className="upload-grid">
                  <UploadZone id="dl-input" label="Driving License"
                    selectedFile={drivingLicense} onFileChange={setDrivingLicense} onClearError={clearError} />
                  <UploadZone id="owner-id-input" label="Owner ID Proof"
                    selectedFile={ownerId} onFileChange={setOwnerId} onClearError={clearError} />
                </div>
                {error && <p className="error">{error}</p>}
                <button className="btn-primary" onClick={handleUploadOwnerDocs} disabled={loading}>
                  {loading ? "Uploading..." : "Upload & Finish →"}
                </button>
              </div>
            )}

            {step === 5 && ownerKycData && (
              <div className="screen">
                <div className="success-icon">🎉</div>
                <h2>Registration Successful!</h2>
                <p className="subtitle">Your owner KYC has been submitted successfully</p>
                <div className="status-card">
                  <div className={`status-badge ${ownerKycData.status?.toLowerCase() || "pending"}`}>{ownerKycData.status}</div>
                  <div className="status-grid">
                    <div className="status-item"><span className="label">Name</span><span className="value">{ownerKycData.first_name} {ownerKycData.last_name}</span></div>
                    <div className="status-item"><span className="label">Mobile</span><span className="value">+91 {ownerKycData.mobile}</span></div>
                    <div className="status-item"><span className="label">Email</span><span className="value">{ownerKycData.email}</span></div>
                    {ownerKycData.company_name && (
                      <div className="status-item"><span className="label">Fleet</span><span className="value">{ownerKycData.company_name}</span></div>
                    )}
                    <div className="status-item"><span className="label">Owner KYC ID</span><span className="value">#{ownerKycData.id}</span></div>
                  </div>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => navigate("/fleet")}
                  style={{ marginTop: "16px" }}
                >
                  Manage My Fleet →
                </button>
                <button className="btn-secondary" onClick={handleCheckOwnerStatus} disabled={loading} style={{ marginTop: "8px" }}>
                  {loading ? "Checking..." : "🔄 Refresh Status"}
                </button>
                <button className="btn-link" onClick={handleReset}>+ Register Another</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
