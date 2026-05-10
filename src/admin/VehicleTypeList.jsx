import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAdminVehicleTypes,
  createVehicleType,
  updateVehicleType,
  deactivateVehicleType,
} from "../api/vehicleTypeApi";
import "./Admin.css";

const EMPTY_FORM = { type_name: "", description: "", max_load_capacity: "", dimensions: "" };

function parseApiError(e) {
  const detail = e.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => `${d.loc?.at(-1)}: ${d.msg}`).join(" | ");
  return "Something went wrong. Please try again.";
}

export default function VehicleTypeList() {
  const navigate = useNavigate();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = async () => {
    setError("");
    try {
      const res = await getAdminVehicleTypes();
      setTypes(res.data);
    } catch {
      setError("Failed to load vehicle types.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (t) => {
    setEditingId(t.id);
    setForm({
      type_name: t.type_name,
      description: t.description || "",
      max_load_capacity: t.max_load_capacity ?? "",
      dimensions: t.dimensions || "",
    });
    setFormError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.type_name.trim()) { setFormError("Type Name is required."); return; }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        type_name: form.type_name.trim(),
        description: form.description.trim() || null,
        max_load_capacity: form.max_load_capacity !== "" ? parseFloat(form.max_load_capacity) : null,
        dimensions: form.dimensions.trim() || null,
      };
      if (editingId) await updateVehicleType(editingId, payload);
      else await createVehicleType(payload);
      setShowForm(false);
      await load();
    } catch (e) {
      setFormError(parseApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`Deactivate "${name}"? It will be removed from the fleet registration dropdown.`)) return;
    try {
      await deactivateVehicleType(id);
      await load();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  return (
    <div className="admin-container">
      {/* Nav */}
      <div className="admin-nav">
        <button className="admin-nav-link" onClick={() => navigate("/admin/kyc")}>KYC Review</button>
        <span className="admin-nav-link active">Vehicle Types</span>
      </div>

      <div className="admin-header">
        <div className="admin-logo">
          <span>🚛</span>
          <span className="admin-logo-text">GoGoTruk</span>
        </div>
        <div className="admin-header-action-row">
          <div>
            <h1>Vehicle Types</h1>
            <p className="admin-subtitle">Manage vehicle type options available in fleet registration</p>
          </div>
          <button className="admin-btn-review" onClick={openAdd}>+ Add Type</button>
        </div>
      </div>

      {/* Inline add / edit form */}
      {showForm && (
        <div className="vt-form-card">
          <div className="vt-form-title">
            {editingId ? "Edit Vehicle Type" : "Add Vehicle Type"}
          </div>
          <div className="vt-form-grid">
            <div className="admin-reason-group vt-full">
              <label className="admin-field-label">Type Name *</label>
              <input
                className="vt-input"
                placeholder="e.g. Mini Truck"
                value={form.type_name}
                onChange={(e) => setField("type_name", e.target.value)}
              />
            </div>
            <div className="admin-reason-group vt-full">
              <label className="admin-field-label">Description</label>
              <textarea
                className="admin-textarea"
                placeholder="Brief description of this vehicle type"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                rows={2}
              />
            </div>
            <div className="admin-reason-group">
              <label className="admin-field-label">Max Load Capacity (tonnes)</label>
              <input
                className="vt-input"
                type="number"
                step="0.1"
                min="0"
                placeholder="e.g. 1.5"
                value={form.max_load_capacity}
                onChange={(e) => setField("max_load_capacity", e.target.value)}
              />
            </div>
            <div className="admin-reason-group">
              <label className="admin-field-label">Dimensions</label>
              <input
                className="vt-input"
                placeholder="e.g. 4m x 2m x 2m"
                value={form.dimensions}
                onChange={(e) => setField("dimensions", e.target.value)}
              />
            </div>
          </div>
          {formError && <div className="admin-error">{formError}</div>}
          <div className="vt-form-actions">
            <button className="admin-btn-approve" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save Changes" : "Add Type"}
            </button>
            <button className="vt-btn-cancel" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <div className="admin-error">{error}</div>}
      {loading && <div className="admin-loading">Loading…</div>}

      {!loading && (
        <>
          <div className="admin-count">{types.length} vehicle type{types.length !== 1 ? "s" : ""}</div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Type Name</th>
                  <th>Description</th>
                  <th>Max Load</th>
                  <th>Dimensions</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {types.map((t, idx) => (
                  <tr key={t.id} style={{ opacity: t.is_active ? 1 : 0.45 }}>
                    <td className="admin-td-num">{idx + 1}</td>
                    <td className="admin-td-name">{t.type_name}</td>
                    <td className="admin-td-email">{t.description || "—"}</td>
                    <td>{t.max_load_capacity != null ? `${t.max_load_capacity}t` : "—"}</td>
                    <td>{t.dimensions || "—"}</td>
                    <td>
                      <span className={`admin-badge ${t.is_active ? "badge-customer" : "badge-owner"}`}>
                        {t.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="vt-action-row">
                        <button className="admin-btn-review" onClick={() => openEdit(t)}>
                          Edit
                        </button>
                        {t.is_active && (
                          <button
                            className="admin-btn-review vt-btn-deactivate"
                            onClick={() => handleDeactivate(t.id, t.type_name)}
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
