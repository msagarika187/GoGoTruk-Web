import { useState } from "react";
import { sendOTP, verifyOTP, registerKYC, getKYCStatus } from "./api/kycApi";
import "./App.css";

export default function App() {
  const [step, setStep] = useState(1);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [kycId, setKycId] = useState(null);
  const [kycData, setKycData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    date_of_birth: "",
    email: "",
    address_1: "",
    address_2: "",
    address_3: "",
    customer_type: "Individual",
  });

  const handleSendOTP = async () => {
    setError("");
    if (!mobile || mobile.length !== 10) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      const res = await sendOTP(mobile);
      setDevOtp(res.dev_otp);
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
      const res = await registerKYC({ ...form, mobile });
      setKycId(res.id);
      setKycData(res);
      setStep(4);
    } catch (e) {
      setError(e.response?.data?.detail || "Registration failed");
    }
    setLoading(false);
  };

  const handleCheckStatus = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await getKYCStatus(kycId);
      setKycData(res);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to fetch status");
    }
    setLoading(false);
  };

  const steps = ["Mobile", "Verify OTP", "KYC Form", "Status"];

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span className="logo-icon">🚛</span>
          <span className="logo-text">GoGoTruk</span>
        </div>
        <p className="tagline">India's Logistics Platform</p>
      </header>

      <div className="steps">
        {steps.map((s, i) => (
          <div key={i} className={`step ${step === i + 1 ? "active" : ""} ${step > i + 1 ? "done" : ""}`}>
            <div className="step-circle">{step > i + 1 ? "✓" : i + 1}</div>
            <span className="step-label">{s}</span>
          </div>
        ))}
      </div>

      <div className="card">
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
          </div>
        )}

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

        {step === 3 && (
          <div className="screen">
            <h2>KYC Registration</h2>
            <p className="subtitle">Fill in your details to complete registration</p>
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
              <div className="input-group full">
                <label>Customer Type *</label>
                <select value={form.customer_type}
                  onChange={(e) => setForm({ ...form, customer_type: e.target.value })}>
                  <option value="Individual">Individual</option>
                  <option value="Company">Company</option>
                </select>
              </div>
            </div>
            {error && <p className="error">{error}</p>}
            <button className="btn-primary" onClick={handleRegister} disabled={loading}>
              {loading ? "Registering..." : "Submit KYC →"}
            </button>
          </div>
        )}

        {step === 4 && kycData && (
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
              </div>
            </div>
            <button className="btn-secondary" onClick={handleCheckStatus} disabled={loading}>
              {loading ? "Checking..." : "🔄 Refresh Status"}
            </button>
            <button className="btn-link" onClick={() => {
              setStep(1); setMobile(""); setOtp("");
              setForm({ first_name: "", middle_name: "", last_name: "", date_of_birth: "", email: "", address_1: "", address_2: "", address_3: "", customer_type: "Individual" });
              setError("");
            }}>
              + Register Another
            </button>
          </div>
        )}
      </div>
    </div>
  );
}