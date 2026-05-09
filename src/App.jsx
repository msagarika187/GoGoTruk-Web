import { useState } from "react";
import axios from "axios";
import {
  sendOTP, verifyOTP, registerKYC, getKYCStatus,
  registerCompanyKYC, uploadCompanyDocs, getCompanyKYCStatus,
} from "./api/kycApi";
import "./App.css";

export default function App() {
  const [registrationType, setRegistrationType] = useState(null); // "Individual" | "Company"
  const [step, setStep] = useState(1);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [kycId, setKycId] = useState(null);
  const [kycData, setKycData] = useState(null);
  const [companyKycId, setCompanyKycId] = useState(null);
  const [companyKycData, setCompanyKycData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [file, setFile] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [incorporationCert, setIncorporationCert] = useState(null);
  const [gstCertificate, setGstCertificate] = useState(null);

  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    date_of_birth: "",
    email: "",
    address_1: "",
    address_2: "",
    address_3: "",
  });

  const [companyForm, setCompanyForm] = useState({
    company_name: "",
    company_type: "Pvt Ltd",
    gst_number: "",
    registered_address_1: "",
    registered_address_2: "",
    registered_address_3: "",
    city: "",
    state: "",
    pincode: "",
    contact_person_name: "",
    contact_person_mobile: "",
    contact_person_email: "",
  });

  const isCompany = registrationType === "Company";

  const steps = isCompany
    ? ["Mobile", "Verify OTP", "KYC Form", "Company Details", "Upload Docs", "Status"]
    : ["Mobile", "Verify OTP", "KYC Form", "Upload ID", "Status"];

  const stepIndexMap = isCompany
    ? { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 }
    : { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };

  const activeIndex = stepIndexMap[step] ?? 0;

  const handleSendOTP = async () => {
    setError("");
    if (!mobile || mobile.length !== 10) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      const res = await sendOTP(mobile);
      setDevOtp(res.dev_otp || "");
      if (res.dev_otp) setOtp(res.dev_otp);
      setStep(2);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to send OTP");
    }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    setError("");
    if (!otp || otp.length !== 6) {
      setError("Enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      await verifyOTP(mobile, otp);
      setStep(3);
    } catch (e) {
      setError(e.response?.data?.detail || "Invalid OTP");
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    setError("");
    if (!form.first_name || !form.last_name || !form.email || !form.address_1 || !form.date_of_birth) {
      setError("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      const res = await registerKYC({ ...form, mobile, customer_type: registrationType });
      setKycId(res.id);
      setKycData(res);
      setStep(4);
    } catch (e) {
      setError(e.response?.data?.detail || "Registration failed");
    }
    setLoading(false);
  };

  const handleUpload = async () => {
    setError("");
    if (!file) {
      setError("Please select a file");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(
        `http://127.0.0.1:8000/api/kyc/upload-id/${kycId}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setUploadedUrl(res.data.file_path);
      setStep(5);
    } catch (e) {
      setError(e.response?.data?.detail || "Upload failed");
    }
    setUploading(false);
  };

  const handleRegisterCompany = async () => {
    setError("");
    const { company_name, registered_address_1, city, state, pincode, contact_person_name, contact_person_mobile, contact_person_email } = companyForm;
    if (!company_name || !registered_address_1 || !city || !state || !pincode || !contact_person_name || !contact_person_mobile || !contact_person_email) {
      setError("Please fill all required fields");
      return;
    }
    if (pincode.length !== 6) {
      setError("Pincode must be 6 digits");
      return;
    }
    if (contact_person_mobile.length !== 10) {
      setError("Enter a valid 10-digit contact mobile");
      return;
    }
    setLoading(true);
    try {
      const res = await registerCompanyKYC({ ...companyForm, customer_kyc_id: kycId });
      setCompanyKycId(res.id);
      setStep(5);
    } catch (e) {
      const detail = e.response?.data?.detail;
      if (typeof detail === "string") setError(detail);
      else if (Array.isArray(detail)) setError(detail.map(d => `${d.loc?.at(-1)}: ${d.msg}`).join(" | "));
      else setError("Company registration failed");
    }
    setLoading(false);
  };

  const handleUploadDocs = async () => {
    setError("");
    if (!incorporationCert && !gstCertificate) {
      setError("Upload at least one document");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      if (incorporationCert) formData.append("incorporation_cert", incorporationCert);
      if (gstCertificate) formData.append("gst_certificate", gstCertificate);
      await uploadCompanyDocs(companyKycId, formData);
      const res = await getCompanyKYCStatus(companyKycId);
      setCompanyKycData(res);
      setStep(6);
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Upload failed. Please try again.");
    }
    setLoading(false);
  };

  const handleCheckStatus = async () => {
    setError("");
    setLoading(true);
    try {
      if (isCompany) {
        const res = await getCompanyKYCStatus(companyKycId);
        setCompanyKycData(res);
      } else {
        const res = await getKYCStatus(kycId);
        setKycData(res);
      }
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to fetch status");
    }
    setLoading(false);
  };

  const handleReset = () => {
    setRegistrationType(null);
    setStep(1);
    setMobile("");
    setOtp("");
    setKycId(null);
    setKycData(null);
    setCompanyKycId(null);
    setCompanyKycData(null);
    setError("");
    setDevOtp("");
    setFile(null);
    setUploadedUrl("");
    setIncorporationCert(null);
    setGstCertificate(null);
    setForm({ first_name: "", middle_name: "", last_name: "", date_of_birth: "", email: "", address_1: "", address_2: "", address_3: "" });
    setCompanyForm({ company_name: "", company_type: "Pvt Ltd", gst_number: "", registered_address_1: "", registered_address_2: "", registered_address_3: "", city: "", state: "", pincode: "", contact_person_name: "", contact_person_mobile: "", contact_person_email: "" });
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span className="logo-icon">🚛</span>
          <span className="logo-text">GoGoTruk</span>
        </div>
        <p className="tagline">India's Logistics Platform</p>
      </header>

      {/* Landing — choose registration type */}
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
          </div>
        </div>
      )}

      {/* Step indicator — only shown once type is selected */}
      {registrationType && (
        <>
          <div className="steps">
            {steps.map((s, i) => (
              <div key={i} className={`step ${activeIndex === i ? "active" : ""} ${activeIndex > i ? "done" : ""}`}>
                <div className="step-circle">{activeIndex > i ? "✓" : i + 1}</div>
                <span className="step-label">{s}</span>
              </div>
            ))}
          </div>

          <div className="card">
            {/* Step 1 — Mobile */}
            {step === 1 && (
              <div className="screen">
                <h2>Welcome to GoGoTruk</h2>
                <p className="subtitle">Enter your mobile number to get started</p>
                <div className="input-group">
                  <label>Mobile Number</label>
                  <div className="phone-input">
                    <span className="country-code">🇮🇳 +91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="9876543210"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                </div>
                {error && <p className="error">{error}</p>}
                <button className="btn-primary" onClick={handleSendOTP} disabled={loading}>
                  {loading ? "Sending..." : "Send OTP →"}
                </button>
                <button className="btn-link" onClick={() => { setRegistrationType(null); setError(""); }}>
                  ← Back
                </button>
              </div>
            )}

            {/* Step 2 — Verify OTP */}
            {step === 2 && (
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
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="otp-input"
                  />
                </div>
                {error && <p className="error">{error}</p>}
                <button className="btn-primary" onClick={handleVerifyOTP} disabled={loading}>
                  {loading ? "Verifying..." : "Verify OTP →"}
                </button>
                <button className="btn-link" onClick={() => { setStep(1); setError(""); }}>
                  ← Change Number
                </button>
              </div>
            )}

            {/* Step 3 — Individual KYC form (contact person details) */}
            {step === 3 && (
              <div className="screen">
                <h2>{isCompany ? "Contact Person Details" : "KYC Registration"}</h2>
                <p className="subtitle">
                  {isCompany
                    ? "Enter the authorized contact person's details"
                    : "Fill in your details to complete registration"}
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

            {/* Step 4 — Individual: Upload ID */}
            {step === 4 && !isCompany && (
              <div className="screen">
                <h2>Upload ID Proof</h2>
                <p className="subtitle">Upload a valid government ID (JPG, PNG or PDF, max 10MB)</p>
                <div className="upload-box">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="file-input"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="file-label">
                    {file ? `📄 ${file.name}` : "📁 Click to Choose File"}
                  </label>
                </div>
                {error && <p className="error">{error}</p>}
                <button className="btn-primary" onClick={handleUpload} disabled={uploading}>
                  {uploading ? "Uploading..." : "Upload ID →"}
                </button>
                <button className="btn-link" onClick={() => setStep(5)}>
                  Skip for now →
                </button>
              </div>
            )}

            {/* Step 4 — Company: Company Details */}
            {step === 4 && isCompany && (
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

            {/* Step 5 — Company: Upload Documents */}
            {step === 5 && isCompany && (
              <div className="screen">
                <h2>Upload Documents</h2>
                <p className="subtitle">Upload company documents (at least one required)</p>
                <div className="upload-grid">
                  <div className="upload-item">
                    <p className="upload-label">Certificate of Incorporation</p>
                    <div className="upload-zone" onClick={() => document.getElementById("inc-cert-input").click()}>
                      {incorporationCert ? (
                        <div className="file-selected">
                          <span className="file-icon">📄</span>
                          <span className="file-name">{incorporationCert.name}</span>
                        </div>
                      ) : (
                        <>
                          <span className="upload-icon">📁</span>
                          <p>Click to select</p>
                          <p className="upload-hint">JPG, PNG or PDF</p>
                        </>
                      )}
                    </div>
                    <input id="inc-cert-input" type="file" accept=".jpg,.jpeg,.png,.pdf"
                      style={{ display: "none" }}
                      onChange={(e) => { setIncorporationCert(e.target.files[0]); setError(""); }} />
                  </div>
                  <div className="upload-item">
                    <p className="upload-label">GST Certificate</p>
                    <div className="upload-zone" onClick={() => document.getElementById("gst-cert-input").click()}>
                      {gstCertificate ? (
                        <div className="file-selected">
                          <span className="file-icon">📄</span>
                          <span className="file-name">{gstCertificate.name}</span>
                        </div>
                      ) : (
                        <>
                          <span className="upload-icon">📁</span>
                          <p>Click to select</p>
                          <p className="upload-hint">JPG, PNG or PDF</p>
                        </>
                      )}
                    </div>
                    <input id="gst-cert-input" type="file" accept=".jpg,.jpeg,.png,.pdf"
                      style={{ display: "none" }}
                      onChange={(e) => { setGstCertificate(e.target.files[0]); setError(""); }} />
                  </div>
                </div>
                {error && <p className="error">{error}</p>}
                <button className="btn-primary" onClick={handleUploadDocs} disabled={loading}>
                  {loading ? "Uploading..." : "Upload & Finish →"}
                </button>
              </div>
            )}

            {/* Step 5 — Individual: Status */}
            {step === 5 && !isCompany && kycData && (
              <div className="screen">
                <div className="success-icon">🎉</div>
                <h2>Registration Successful!</h2>
                <p className="subtitle">Your KYC has been submitted successfully</p>
                <div className="status-card">
                  <div className="status-badge pending">{kycData.status}</div>
                  <div className="status-grid">
                    <div className="status-item">
                      <span className="label">Name</span>
                      <span className="value">{kycData.first_name} {kycData.last_name}</span>
                    </div>
                    <div className="status-item">
                      <span className="label">Mobile</span>
                      <span className="value">+91 {kycData.mobile}</span>
                    </div>
                    <div className="status-item">
                      <span className="label">Email</span>
                      <span className="value">{kycData.email}</span>
                    </div>
                    <div className="status-item">
                      <span className="label">KYC ID</span>
                      <span className="value">#{kycData.id}</span>
                    </div>
                    <div className="status-item">
                      <span className="label">OTP Verified</span>
                      <span className="value">{kycData.otp_verified === "true" ? "✅ Yes" : "❌ No"}</span>
                    </div>
                    {uploadedUrl && (
                      <div className="status-item">
                        <span className="label">ID Proof</span>
                        <a href={uploadedUrl} target="_blank" rel="noreferrer" className="value doc-link">
                          ✅ View Document
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <button className="btn-secondary" onClick={handleCheckStatus} disabled={loading}>
                  {loading ? "Checking..." : "🔄 Refresh Status"}
                </button>
                <button className="btn-link" onClick={handleReset}>+ Register Another</button>
              </div>
            )}

            {/* Step 6 — Company: Status */}
            {step === 6 && companyKycData && (
              <div className="screen">
                <div className="success-icon">🎉</div>
                <h2>Registration Successful!</h2>
                <p className="subtitle">Company KYC submitted successfully</p>
                <div className="status-card">
                  <div className={`status-badge ${companyKycData.status?.toLowerCase() || "pending"}`}>
                    {companyKycData.status}
                  </div>
                  <div className="status-grid">
                    <div className="status-item">
                      <span className="label">Company</span>
                      <span className="value">{companyKycData.company_name}</span>
                    </div>
                    <div className="status-item">
                      <span className="label">Type</span>
                      <span className="value">{companyKycData.company_type}</span>
                    </div>
                    <div className="status-item">
                      <span className="label">GST</span>
                      <span className="value">{companyKycData.gst_number || "—"}</span>
                    </div>
                    <div className="status-item">
                      <span className="label">Contact</span>
                      <span className="value">{companyKycData.contact_person_name}</span>
                    </div>
                    <div className="status-item">
                      <span className="label">Company KYC ID</span>
                      <span className="value">#{companyKycData.id}</span>
                    </div>
                  </div>
                </div>
                <button className="btn-secondary" onClick={handleCheckStatus} disabled={loading}>
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
