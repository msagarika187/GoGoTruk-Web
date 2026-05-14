import { useState, useEffect } from "react";
import { getAdminRateCards, createRateCard, updateRateCard } from "../api/rateCardApi";
import { getPublicVehicleTypes } from "../api/vehicleTypeApi";
import "./Admin.css";

const EMPTY_FORM = {
  vehicle_type: "", distance_from_km: "0", distance_to_km: "", base_fare: "", rate_per_km: "",
};

function parseApiError(e) {
  const detail = e.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => `${d.loc?.at(-1)}: ${d.msg}`).join(" | ");
  return "Something went wrong. Please try again.";
}

function fmtSlab(card) {
  const to = card.distance_to_km != null ? `${card.distance_to_km} km` : "∞";
  return `${card.distance_from_km} – ${to}`;
}

function fmt(n) {
  return `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function RateCardPanel() {
  const [cards, setCards] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
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
      const [cardsRes, typesRes] = await Promise.all([getAdminRateCards(), getPublicVehicleTypes()]);
      setCards(cardsRes.data);
      setVehicleTypes(typesRes.data.map((t) => t.type_name));
    } catch {
      setError("Failed to load rate cards.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, vehicle_type: vehicleTypes[0] || "" });
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditingId(c.id);
    setForm({
      vehicle_type: c.vehicle_type,
      distance_from_km: String(c.distance_from_km),
      distance_to_km: c.distance_to_km != null ? String(c.distance_to_km) : "",
      base_fare: String(c.base_fare),
      rate_per_km: String(c.rate_per_km),
    });
    setFormError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.vehicle_type.trim()) { setFormError("Vehicle type is required."); return; }
    if (!form.base_fare || !form.rate_per_km) { setFormError("Base fare and rate/km are required."); return; }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        vehicle_type: form.vehicle_type.trim(),
        distance_from_km: Number(form.distance_from_km) || 0,
        distance_to_km: form.distance_to_km !== "" ? Number(form.distance_to_km) : null,
        base_fare: Number(form.base_fare),
        rate_per_km: Number(form.rate_per_km),
      };
      if (editingId) await updateRateCard(editingId, payload);
      else await createRateCard(payload);
      setShowForm(false);
      await load();
    } catch (e) {
      setFormError(parseApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (c) => {
    const verb = c.is_active ? "Deactivate" : "Reactivate";
    if (!window.confirm(`${verb} rate card for ${c.vehicle_type} (${fmtSlab(c)})?`)) return;
    try { await updateRateCard(c.id, { is_active: !c.is_active }); await load(); }
    catch (e) { setError(parseApiError(e)); }
  };

  return (
    <div>
      <div className="dash-section-header">
        <div className="admin-count">{cards.length} rate card{cards.length !== 1 ? "s" : ""}</div>
        <button className="admin-btn-review" onClick={openAdd}>+ Add Rate Card</button>
      </div>

      {showForm && (
        <div className="vt-form-card">
          <div className="vt-form-title">{editingId ? "Edit Rate Card" : "Add Rate Card"}</div>
          <div className="vt-form-grid">
            <div className="admin-reason-group vt-full">
              <label className="admin-field-label">Vehicle Type</label>
              {vehicleTypes.length > 0 ? (
                <select className="vt-input" value={form.vehicle_type}
                  onChange={(e) => setField("vehicle_type", e.target.value)}>
                  {vehicleTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              ) : (
                <input className="vt-input" placeholder="e.g. Mini Truck" value={form.vehicle_type}
                  onChange={(e) => setField("vehicle_type", e.target.value)} />
              )}
            </div>
            <div className="admin-reason-group">
              <label className="admin-field-label">Distance From (km)</label>
              <input className="vt-input" type="number" min="0" placeholder="0"
                value={form.distance_from_km} onChange={(e) => setField("distance_from_km", e.target.value)} />
            </div>
            <div className="admin-reason-group">
              <label className="admin-field-label">Distance To (km) — blank = unlimited</label>
              <input className="vt-input" type="number" min="0" placeholder="e.g. 200"
                value={form.distance_to_km} onChange={(e) => setField("distance_to_km", e.target.value)} />
            </div>
            <div className="admin-reason-group">
              <label className="admin-field-label">Base Fare (₹)</label>
              <input className="vt-input" type="number" min="0" step="0.01" placeholder="e.g. 500"
                value={form.base_fare} onChange={(e) => setField("base_fare", e.target.value)} />
            </div>
            <div className="admin-reason-group">
              <label className="admin-field-label">Rate per km (₹)</label>
              <input className="vt-input" type="number" min="0" step="0.01" placeholder="e.g. 15"
                value={form.rate_per_km} onChange={(e) => setField("rate_per_km", e.target.value)} />
            </div>
          </div>
          {formError && <div className="admin-error" style={{ marginTop: 0, marginBottom: "16px" }}>{formError}</div>}
          <div className="vt-form-actions">
            <button className="admin-btn-approve" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save Changes" : "Add Rate Card"}
            </button>
            <button className="vt-btn-cancel" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
          </div>
        </div>
      )}

      {error && <div className="admin-error">{error}</div>}
      {loading && <div className="admin-loading">Loading rate cards…</div>}

      {!loading && cards.length === 0 && (
        <div className="admin-empty">
          <div className="admin-empty-icon">💰</div>
          <p>No rate cards yet. Add one to enable invoice generation.</p>
        </div>
      )}

      {!loading && cards.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Vehicle Type</th>
                <th>Distance Slab</th>
                <th>Base Fare</th>
                <th>Rate / km</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((c) => (
                <tr key={c.id}>
                  <td className="admin-td-name">{c.vehicle_type}</td>
                  <td>{fmtSlab(c)}</td>
                  <td>{fmt(c.base_fare)}</td>
                  <td>{fmt(c.rate_per_km)}/km</td>
                  <td>
                    <span className={`admin-badge ${c.is_active ? "badge-customer" : "badge-company"}`}>
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="vt-action-row">
                      <button className="admin-btn-review" style={{ fontSize: "0.78rem", padding: "6px 14px" }}
                        onClick={() => openEdit(c)}>Edit</button>
                      <button
                        className={`admin-btn-review ${c.is_active ? "vt-btn-deactivate" : "vt-btn-reactivate"}`}
                        style={{ fontSize: "0.78rem", padding: "6px 14px" }}
                        onClick={() => handleToggleActive(c)}>
                        {c.is_active ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
