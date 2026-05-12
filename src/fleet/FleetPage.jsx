import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { registerVehicle, uploadFleetDocs, getOwnerVehicles, updateExpiryDates } from "../api/fleetApi";
import { getPublicVehicleTypes } from "../api/vehicleTypeApi";
import FilePreview from "../components/FilePreview";
import "./Fleet.css";

const VEHICLE_ICONS = {
  "Tractor": "🚜",
  "20ft Container": "🚛",
  "40ft Container": "🚛",
  "Flatbed": "🚚",
  "Trailer": "🏗️",
};

function proxyUrl(url) {
  return `http://127.0.0.1:8000/api/docs/view?url=${encodeURIComponent(url)}`;
}

function parseApiError(e) {
  const detail = e.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => `${d.loc?.at(-1)}: ${d.msg}`).join(" | ");
  return "Something went wrong. Please try again.";
}

function expiryStatus(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr);
  const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 0) return { dot: "🔴", cls: "expiry-red", label: "Expired" };
  if (daysLeft <= 7) return { dot: "🔴", cls: "expiry-red", label: `${daysLeft}d left` };
  if (daysLeft <= 30) return { dot: "🟡", cls: "expiry-yellow", label: `${daysLeft}d left` };
  return { dot: "🟢", cls: "expiry-green", label: `${daysLeft}d left` };
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

const EMPTY_FORM = {
  vehicle_type: "",
  registration_number: "",
  engine_number: "",
  chassis_number: "",
  description: "",
  max_load_capacity: "",
  dimensions: "",
};

const EMPTY_EXPIRY = {
  rc_expiry_date: "",
  insurance_expiry_date: "",
  permit_expiry_date: "",
  puc_expiry_date: "",
};

export default function FleetPage() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState("lookup"); // lookup | list | register | upload | editExpiry
  const [ownerKycId, setOwnerKycId] = useState("");
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newFleetId, setNewFleetId] = useState(null);

  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [vehicleTypeData, setVehicleTypeData] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);

  const [rcBook, setRcBook] = useState(null);
  const [insurance, setInsurance] = useState(null);
  const [permit, setPermit] = useState(null);
  const [puc, setPuc] = useState(null);
  const [rcExpiryDate, setRcExpiryDate] = useState("");
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState("");
  const [permitExpiryDate, setPermitExpiryDate] = useState("");
  const [pucExpiryDate, setPucExpiryDate] = useState("");
  const [uploading, setUploading] = useState(false);

  const [editingVehicle, setEditingVehicle] = useState(null);
  const [expiryForm, setExpiryForm] = useState(EMPTY_EXPIRY);
  const [savingExpiry, setSavingExpiry] = useState(false);

  useEffect(() => {
    getPublicVehicleTypes()
      .then((res) => {
        setVehicleTypeData(res.data);
        const names = res.data.map((t) => t.type_name);
        setVehicleTypes(names);
        if (res.data.length > 0) {
          const first = res.data[0];
          setForm((f) => ({
            ...f,
            vehicle_type: f.vehicle_type || first.type_name || "",
            description: f.description || first.description || "",
            max_load_capacity: f.max_load_capacity !== "" ? f.max_load_capacity : (first.max_load_capacity ?? ""),
            dimensions: f.dimensions || first.dimensions || "",
          }));
        }
      })
      .catch(() => {});
  }, []);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleVehicleTypeChange = (typeName) => {
    const t = vehicleTypeData.find((t) => t.type_name === typeName);
    setForm((f) => ({
      ...f,
      vehicle_type: typeName,
      description: t?.description || "",
      max_load_capacity: t?.max_load_capacity ?? "",
      dimensions: t?.dimensions || "",
    }));
  };
  const setExpiryField = (key, val) => setExpiryForm((f) => ({ ...f, [key]: val }));

  const refreshVehicles = async () => {
    const res = await getOwnerVehicles(ownerKycId);
    setVehicles(res.data);
  };

  const handleLookup = async () => {
    if (!ownerKycId.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await getOwnerVehicles(ownerKycId);
      setVehicles(res.data);
      setScreen("list");
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await registerVehicle({ ...form, owner_kyc_id: parseInt(ownerKycId) });
      setNewFleetId(res.data.id);
      setScreen("upload");
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDocs = async () => {
    if (!rcBook || !insurance) {
      setError("Please upload both RC book and insurance document.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("rc_book", rcBook);
      fd.append("insurance", insurance);
      if (permit) fd.append("permit", permit);
      if (puc) fd.append("puc", puc);
      if (rcExpiryDate) fd.append("rc_expiry_date", rcExpiryDate);
      if (insuranceExpiryDate) fd.append("insurance_expiry_date", insuranceExpiryDate);
      if (permitExpiryDate) fd.append("permit_expiry_date", permitExpiryDate);
      if (pucExpiryDate) fd.append("puc_expiry_date", pucExpiryDate);
      await uploadFleetDocs(newFleetId, fd);
      await refreshVehicles();
      setForm(EMPTY_FORM);
      setRcBook(null);
      setInsurance(null);
      setPermit(null);
      setPuc(null);
      setRcExpiryDate("");
      setInsuranceExpiryDate("");
      setPermitExpiryDate("");
      setPucExpiryDate("");
      setNewFleetId(null);
      setScreen("list");
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setUploading(false);
    }
  };

  const handleSaveExpiry = async () => {
    setSavingExpiry(true);
    setError("");
    try {
      const payload = Object.fromEntries(
        Object.entries(expiryForm).filter(([, v]) => v !== "")
      );
      await updateExpiryDates(editingVehicle.id, payload);
      await refreshVehicles();
      setEditingVehicle(null);
      setExpiryForm(EMPTY_EXPIRY);
      setScreen("list");
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setSavingExpiry(false);
    }
  };

  const openEditExpiry = (v) => {
    setEditingVehicle(v);
    setExpiryForm({
      rc_expiry_date: v.rc_expiry_date || "",
      insurance_expiry_date: v.insurance_expiry_date || "",
      permit_expiry_date: v.permit_expiry_date || "",
      puc_expiry_date: v.puc_expiry_date || "",
    });
    setError("");
    setScreen("editExpiry");
  };

  const goToList = () => { setError(""); setScreen("list"); };
  const hasDoc = (url) => !!url;

  const FleetHeader = ({ title, subtitle }) => (
    <div className="fleet-header">
      <div className="fleet-logo">
        <span>🚛</span>
        <span className="fleet-logo-text">GoGoTruk</span>
      </div>
      <h1>{title}</h1>
      {subtitle && <p className="fleet-subtitle">{subtitle}</p>}
    </div>
  );

  // ── Screen: Lookup ──────────────────────────────────────────────────
  if (screen === "lookup") {
    return (
      <div className="fleet-container">
        <FleetHeader title="My Fleet" subtitle="Manage your registered vehicles" />
        <div className="fleet-card">
          <p className="fleet-hint">Enter your Owner KYC ID to view and manage your vehicles.</p>
          <div className="fleet-input-group">
            <label>Owner KYC ID</label>
            <input
              type="number"
              placeholder="e.g. 1"
              value={ownerKycId}
              onChange={(e) => setOwnerKycId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            />
          </div>
          {error && <div className="fleet-error">{error}</div>}
          <button className="fleet-btn-primary" onClick={handleLookup} disabled={loading || !ownerKycId.trim()}>
            {loading ? "Loading…" : "View My Fleet →"}
          </button>
          <button className="fleet-btn-link" onClick={() => navigate("/")}>
            Not registered yet? Complete Owner KYC first
          </button>
        </div>
      </div>
    );
  }

  // ── Screen: Vehicle List ────────────────────────────────────────────
  if (screen === "list") {
    return (
      <div className="fleet-container">
        <div className="fleet-header">
          <div className="fleet-logo">
            <span>🚛</span>
            <span className="fleet-logo-text">GoGoTruk</span>
          </div>
          <div className="fleet-header-row">
            <div>
              <h1>My Fleet</h1>
              <p className="fleet-subtitle">
                Owner KYC ID: {ownerKycId} · {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button className="fleet-btn-add" onClick={() => { setError(""); setScreen("register"); }}>
              + Add Vehicle
            </button>
          </div>
        </div>

        {vehicles.length === 0 ? (
          <div className="fleet-empty">
            <div className="fleet-empty-icon">🚚</div>
            <p>No vehicles registered yet.</p>
            <button className="fleet-btn-primary" onClick={() => setScreen("register")}>
              Register Your First Vehicle
            </button>
          </div>
        ) : (
          <div className="fleet-grid">
            {vehicles.map((v) => (
              <div key={v.id} className={`fleet-vehicle-card ${!v.is_active ? "fleet-card-inactive" : ""}`}>

                {/* Inactive banner */}
                {!v.is_active && (
                  <div className="fleet-inactive-banner">
                    ⚠️ This vehicle has been deactivated due to expired documents. Please renew and update expiry dates.
                  </div>
                )}

                <div className="fleet-vehicle-header">
                  <span className="fleet-vehicle-icon">{VEHICLE_ICONS[v.vehicle_type] || "🚛"}</span>
                  <div>
                    <div className="fleet-vehicle-type">{v.vehicle_type}</div>
                    <div className="fleet-vehicle-reg">{v.registration_number}</div>
                  </div>
                </div>

                <div className="fleet-vehicle-details">
                  <div className="fleet-detail-row">
                    <span className="fleet-detail-label">Engine No.</span>
                    <span className="fleet-detail-value">{v.engine_number}</span>
                  </div>
                  <div className="fleet-detail-row">
                    <span className="fleet-detail-label">Chassis No.</span>
                    <span className="fleet-detail-value">{v.chassis_number}</span>
                  </div>
                  {v.max_load_capacity != null && (
                    <div className="fleet-detail-row">
                      <span className="fleet-detail-label">Max Load</span>
                      <span className="fleet-detail-value">{v.max_load_capacity}t</span>
                    </div>
                  )}
                  {v.dimensions && (
                    <div className="fleet-detail-row">
                      <span className="fleet-detail-label">Dimensions</span>
                      <span className="fleet-detail-value">{v.dimensions}</span>
                    </div>
                  )}
                  {v.description && (
                    <div className="fleet-detail-row" style={{ alignItems: "flex-start" }}>
                      <span className="fleet-detail-label">Description</span>
                      <span className="fleet-detail-value" style={{ textAlign: "right" }}>{v.description}</span>
                    </div>
                  )}
                </div>

                {/* Expiry dates */}
                <div className="fleet-expiry-section">
                  {[
                    { label: "RC Expiry", key: "rc_expiry_date" },
                    { label: "Insurance", key: "insurance_expiry_date" },
                    { label: "Permit", key: "permit_expiry_date" },
                    { label: "PUC", key: "puc_expiry_date" },
                  ].map(({ label, key }) => {
                    const status = expiryStatus(v[key]);
                    return (
                      <div key={key} className="fleet-expiry-row">
                        <span className="fleet-detail-label">{label}</span>
                        <span className={`fleet-expiry-value ${status?.cls || ""}`}>
                          {status ? `${status.dot} ${formatDate(v[key])} · ${status.label}` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Doc status */}
                <div className="fleet-doc-status">
                  {[
                    { key: "rc_book_url",    label: "RC Book" },
                    { key: "insurance_url",  label: "Insurance" },
                    { key: "permit_url",     label: "Permit" },
                    { key: "puc_url",        label: "PUC" },
                  ].map(({ key, label }) => (
                    <span key={key} className={`fleet-doc-badge ${hasDoc(v[key]) ? "doc-ok" : "doc-missing"}`}>
                      {hasDoc(v[key]) ? "✓" : "✗"} {label}
                    </span>
                  ))}
                </div>

                {[
                  { key: "rc_book_url",   label: "RC Book" },
                  { key: "insurance_url", label: "Insurance" },
                  { key: "permit_url",    label: "Permit" },
                  { key: "puc_url",       label: "PUC" },
                ].some(({ key }) => hasDoc(v[key])) && (
                  <div className="fleet-doc-links">
                    {[
                      { key: "rc_book_url",   label: "RC Book" },
                      { key: "insurance_url", label: "Insurance" },
                      { key: "permit_url",    label: "Permit" },
                      { key: "puc_url",       label: "PUC" },
                    ].filter(({ key }) => hasDoc(v[key])).map(({ key, label }) => (
                      <a key={key} href={proxyUrl(v[key])} target="_blank" rel="noopener noreferrer" className="fleet-doc-link">
                        View {label} →
                      </a>
                    ))}
                  </div>
                )}

                <button className="fleet-btn-expiry" onClick={() => openEditExpiry(v)}>
                  ✏️ Update Expiry Dates
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Screen: Register Vehicle ────────────────────────────────────────
  if (screen === "register") {
    return (
      <div className="fleet-container">
        <FleetHeader title="Register a Vehicle" subtitle="Add a new vehicle to your fleet" />
        <div className="fleet-card">
          <div className="fleet-input-group">
            <label>Vehicle Type</label>
            <select value={form.vehicle_type} onChange={(e) => handleVehicleTypeChange(e.target.value)}>
              {vehicleTypes.length === 0 && <option value="">Loading types…</option>}
              {vehicleTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="fleet-input-group">
            <label>Registration Number</label>
            <input
              type="text"
              placeholder="e.g. MH12AB1234"
              value={form.registration_number}
              onChange={(e) => setField("registration_number", e.target.value.toUpperCase())}
            />
          </div>
          <div className="fleet-input-group">
            <label>Engine Number</label>
            <input
              type="text"
              placeholder="e.g. ENG456789"
              value={form.engine_number}
              onChange={(e) => setField("engine_number", e.target.value.toUpperCase())}
            />
          </div>
          <div className="fleet-input-group">
            <label>Chassis Number</label>
            <input
              type="text"
              placeholder="e.g. CHS987654"
              value={form.chassis_number}
              onChange={(e) => setField("chassis_number", e.target.value.toUpperCase())}
            />
          </div>
          <div className="fleet-input-group">
            <label>Description <span className="fleet-optional">(optional)</span></label>
            <textarea
              className="fleet-textarea"
              placeholder="Brief description of this vehicle"
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              rows={2}
            />
          </div>
          <div className="fleet-input-group">
            <label>Max Load Capacity (tonnes) <span className="fleet-optional">(optional)</span></label>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="e.g. 1.5"
              value={form.max_load_capacity}
              onChange={(e) => setField("max_load_capacity", e.target.value)}
            />
          </div>
          <div className="fleet-input-group">
            <label>Dimensions <span className="fleet-optional">(optional)</span></label>
            <input
              type="text"
              placeholder="e.g. 4m x 2m x 2m"
              value={form.dimensions}
              onChange={(e) => setField("dimensions", e.target.value)}
            />
          </div>
          {error && <div className="fleet-error">{error}</div>}
          <button
            className="fleet-btn-primary"
            onClick={handleRegister}
            disabled={loading || !form.registration_number.trim() || !form.engine_number.trim() || !form.chassis_number.trim()}
          >
            {loading ? "Registering…" : "Register Vehicle →"}
          </button>
          <button className="fleet-btn-link" onClick={goToList}>← Back to My Fleet</button>
        </div>
      </div>
    );
  }

  // ── Screen: Upload Documents ────────────────────────────────────────
  if (screen === "upload") {
    return (
      <div className="fleet-container">
        <FleetHeader title="Upload Documents" subtitle="RC book and insurance certificate required" />
        <div className="fleet-card">
          <div className="fleet-upload-grid">
            {[
              { id: "fleet_rc_book",   label: "RC Book",               required: true,  file: rcBook,    setFile: setRcBook,    expiry: rcExpiryDate,        setExpiry: setRcExpiryDate },
              { id: "fleet_insurance", label: "Insurance Certificate",  required: true,  file: insurance, setFile: setInsurance, expiry: insuranceExpiryDate, setExpiry: setInsuranceExpiryDate },
              { id: "fleet_permit",    label: "Permit",                 required: false, file: permit,    setFile: setPermit,    expiry: permitExpiryDate,    setExpiry: setPermitExpiryDate },
              { id: "fleet_puc",       label: "PUC Certificate",        required: false, file: puc,       setFile: setPuc,       expiry: pucExpiryDate,       setExpiry: setPucExpiryDate },
            ].map(({ id, label, required, file, setFile, expiry, setExpiry }) => (
              <div key={id} className="fleet-upload-item">
                <div className="fleet-upload-label">
                  {label}
                  {required
                    ? <span className="fleet-required"> *</span>
                    : <span className="fleet-optional"> (optional)</span>}
                </div>
                <label className="fleet-upload-zone" htmlFor={id}>
                  {file ? (
                    <div className="fleet-file-selected">
                      <span className="fleet-file-icon">📄</span>
                      <span className="fleet-file-name">{file.name}</span>
                    </div>
                  ) : (
                    <>
                      <span className="fleet-upload-icon">📁</span>
                      <p>Upload {label}</p>
                      <p className="fleet-upload-hint">JPG, PNG or PDF</p>
                    </>
                  )}
                </label>
                <input
                  id={id}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="fleet-file-input"
                  onChange={(e) => { setFile(e.target.files[0] || null); setError(""); }}
                />
                {file && <FilePreview file={file} />}
                <div className="fleet-input-group" style={{ marginBottom: 0, marginTop: "8px" }}>
                  <label>Expiry Date</label>
                  <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
                </div>
              </div>
            ))}
          </div>

          {error && <div className="fleet-error">{error}</div>}
          <button className="fleet-btn-primary" onClick={handleUploadDocs} disabled={uploading}>
            {uploading ? "Uploading…" : "Upload & Finish →"}
          </button>
          <button className="fleet-btn-link" onClick={goToList}>Skip for now — Upload later</button>
        </div>
      </div>
    );
  }

  // ── Screen: Edit Expiry Dates ───────────────────────────────────────
  if (screen === "editExpiry" && editingVehicle) {
    return (
      <div className="fleet-container">
        <FleetHeader
          title="Update Expiry Dates"
          subtitle={`Vehicle: ${editingVehicle.registration_number}`}
        />
        <div className="fleet-card">
          {[
            { label: "RC Book Expiry Date", key: "rc_expiry_date" },
            { label: "Insurance Expiry Date", key: "insurance_expiry_date" },
            { label: "Permit Expiry Date", key: "permit_expiry_date" },
            { label: "PUC Expiry Date", key: "puc_expiry_date" },
          ].map(({ label, key }) => (
            <div className="fleet-input-group" key={key}>
              <label>{label}</label>
              <input
                type="date"
                value={expiryForm[key]}
                onChange={(e) => setExpiryField(key, e.target.value)}
              />
            </div>
          ))}

          {error && <div className="fleet-error">{error}</div>}

          <button className="fleet-btn-primary" onClick={handleSaveExpiry} disabled={savingExpiry}>
            {savingExpiry ? "Saving…" : "Save Expiry Dates →"}
          </button>
          <button className="fleet-btn-link" onClick={goToList}>← Back to My Fleet</button>
        </div>
      </div>
    );
  }

  return null;
}
