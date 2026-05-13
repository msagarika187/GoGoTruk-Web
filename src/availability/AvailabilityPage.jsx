import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  setAvailability,
  getFleetAvailability,
  searchTrucks,
  updateAvailability,
  deleteAvailability,
  releaseSlot,
} from "../api/availabilityApi";
import { createBooking } from "../api/bookingApi";
import "./Availability.css";

function parseApiError(e) {
  const detail = e.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => `${d.loc?.at(-1)}: ${d.msg}`).join(" | ");
  return "Something went wrong. Please try again.";
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

const STATUS_CLASS = {
  Available: "status-available",
  Booked: "status-booked",
  Cancelled: "status-cancelled",
};

function AvailHeader({ title, subtitle }) {
  return (
    <div className="avail-header">
      <div className="avail-logo">
        <span>🚛</span>
        <span className="avail-logo-text">GoGoTruk</span>
      </div>
      <h1>{title}</h1>
      {subtitle && <p className="avail-subtitle">{subtitle}</p>}
    </div>
  );
}

export default function AvailabilityPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState(null); // null | "owner" | "search"
  const [screen, setScreen] = useState("lookup"); // lookup | list | add | edit

  // Owner
  const [fleetId, setFleetId] = useState(searchParams.get("fleet_id") || "");
  const [slots, setSlots] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Add
  const [dateInput, setDateInput] = useState("");
  const [selectedDates, setSelectedDates] = useState([]);
  const [addCity, setAddCity] = useState("");
  const [addState, setAddState] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit
  const [editingSlot, setEditingSlot] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [saving, setSaving] = useState(false);

  // Search
  const [searchCity, setSearchCity] = useState("");
  const [searchState, setSearchState] = useState("");
  const [searchMode, setSearchMode] = useState("exact"); // "exact" | "range"
  const [searchDate, setSearchDate] = useState("");
  const [searchDateFrom, setSearchDateFrom] = useState("");
  const [searchDateTo, setSearchDateTo] = useState("");
  const [searchPage, setSearchPage] = useState(1);
  const [searchResults, setSearchResults] = useState([]);
  const [searchMeta, setSearchMeta] = useState({ total: 0, total_pages: 0, page: 1 });
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [customerKycId, setCustomerKycId] = useState("");
  const [searchScreen, setSearchScreen] = useState("results"); // "results" | "bookForm" | "bookConfirm"
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingForm, setBookingForm] = useState({ pickup_address: "", destination_address: "", goods_type: "", goods_weight_kg: "", declaration_accepted: false });
  const [bookingResult, setBookingResult] = useState(null);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [releasingId, setReleasingId] = useState(null);

  useEffect(() => {
    const fid = searchParams.get("fleet_id");
    if (fid) {
      setFleetId(fid);
      setMode("owner");
      loadSlots(fid, "");
      return;
    }
    const m = searchParams.get("mode");
    if (m === "search") setMode("search");
    if (m === "owner") setMode("owner");
  }, []);

  const withRetry = async (fn) => {
    try {
      return await fn();
    } catch (e) {
      const detail = e.response?.data?.detail || "";
      if (e.response?.status === 409 && detail.toLowerCase().includes("simultaneously")) {
        await new Promise((r) => setTimeout(r, 800));
        return await fn();
      }
      throw e;
    }
  };

  const handleOpenBookingForm = (slot) => {
    if (!customerKycId.trim()) { navigate("/"); return; }
    setSelectedSlot(slot);
    setBookingForm({ pickup_address: "", destination_address: "", goods_type: "", goods_weight_kg: "", declaration_accepted: false });
    setBookingError("");
    setSearchScreen("bookForm");
  };

  const handleSubmitBooking = async () => {
    if (!bookingForm.pickup_address.trim() || !bookingForm.destination_address.trim() || !bookingForm.goods_type.trim()) {
      setBookingError("Please fill all required fields."); return;
    }
    if (!bookingForm.goods_weight_kg || parseFloat(bookingForm.goods_weight_kg) <= 0) {
      setBookingError("Goods weight must be greater than 0 kg."); return;
    }
    if (!bookingForm.declaration_accepted) {
      setBookingError("You must accept the declaration to proceed."); return;
    }
    setSubmittingBooking(true);
    setBookingError("");
    try {
      const res = await withRetry(() => createBooking({
        customer_kyc_id: parseInt(customerKycId),
        availability_id: selectedSlot.availability_id,
        pickup_address: bookingForm.pickup_address.trim(),
        destination_address: bookingForm.destination_address.trim(),
        goods_type: bookingForm.goods_type.trim(),
        goods_weight_kg: parseFloat(bookingForm.goods_weight_kg),
        declaration_accepted: bookingForm.declaration_accepted,
      }));
      setBookingResult(res.data);
      setSearchScreen("bookConfirm");
      handleSearch(searchPage);
    } catch (e) {
      const status = e.response?.status;
      if (status === 403) { navigate("/"); return; }
      if (status === 404) { setBookingError(parseApiError(e) || "Record not found. Check your Customer KYC ID."); return; }
      if (status === 409) {
        setBookingError("This slot was just taken. Please search again.");
        setSearchScreen("results");
        handleSearch(1);
      } else {
        setBookingError(parseApiError(e));
      }
    } finally {
      setSubmittingBooking(false);
    }
  };

  const handleRelease = async (slot) => {
    if (!window.confirm(`Release booking for ${formatDate(slot.date)}? It will become Available again.`)) return;
    setReleasingId(slot.id);
    setError("");
    try {
      const res = await withRetry(() => releaseSlot(slot.id));
      setSlots((prev) => prev.map((s) => s.id === slot.id ? { ...s, status: res.data.status } : s));
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setReleasingId(null);
    }
  };

  const loadSlots = async (fid, status) => {
    setLoading(true);
    setError("");
    try {
      const res = await getFleetAvailability(fid || fleetId, status || undefined);
      setSlots(res.data);
      setScreen("list");
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = async () => {
    if (!fleetId.trim()) return;
    await loadSlots(fleetId, statusFilter);
  };

  const handleFilterChange = (val) => {
    setStatusFilter(val);
    loadSlots(fleetId, val);
  };

  const addDate = () => {
    if (!dateInput || selectedDates.includes(dateInput)) return;
    setSelectedDates([...selectedDates, dateInput].sort());
    setDateInput("");
  };

  const removeDate = (d) => setSelectedDates(selectedDates.filter((x) => x !== d));

  const handleAddAvailability = async () => {
    if (selectedDates.length === 0) { setError("Add at least one date."); return; }
    if (!addCity.trim() || !addState.trim()) { setError("City and State are required."); return; }
    setAdding(true);
    setError("");
    try {
      await setAvailability({
        fleet_id: parseInt(fleetId),
        dates: selectedDates,
        city: addCity.trim(),
        state: addState.trim(),
      });
      setSelectedDates([]);
      setAddCity("");
      setAddState("");
      await loadSlots(fleetId, statusFilter);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setAdding(false);
    }
  };

  const openEdit = (slot) => {
    setEditingSlot(slot);
    setEditDate(slot.date);
    setEditCity(slot.city);
    setEditState(slot.state);
    setEditStatus(slot.status);
    setError("");
    setScreen("edit");
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    setError("");
    try {
      await updateAvailability(editingSlot.id, {
        date: editDate || undefined,
        city: editCity.trim() || undefined,
        state: editState.trim() || undefined,
        status: editStatus || undefined,
      });
      setEditingSlot(null);
      await loadSlots(fleetId, statusFilter);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slot) => {
    if (!window.confirm(`Delete availability for ${formatDate(slot.date)}?`)) return;
    setError("");
    try {
      await deleteAvailability(slot.id);
      await loadSlots(fleetId, statusFilter);
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const handleSearch = async (page = 1) => {
    if (searchMode === "exact" && !searchDate) {
      setError("Please select a date to search.");
      return;
    }
    if (searchMode === "range" && !searchDateFrom && !searchDateTo) {
      setError("Please select at least a From or To date.");
      return;
    }
    setSearching(true);
    setError("");
    if (page === 1) setSearched(false);
    try {
      const params = { page, page_size: 10 };
      if (searchCity.trim()) params.city = searchCity.trim();
      if (searchState.trim()) params.state = searchState.trim();
      if (searchMode === "exact") {
        if (searchDate) params.date = searchDate;
      } else {
        if (searchDateFrom) params.date_from = searchDateFrom;
        if (searchDateTo) params.date_to = searchDateTo;
      }
      const res = await searchTrucks(params);
      setSearchResults(res.data.results);
      setSearchMeta({ total: res.data.total, total_pages: res.data.total_pages, page: res.data.page });
      setSearchPage(page);
      setSearched(true);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setSearching(false);
    }
  };

  // ── Mode selection ──────────────────────────────────────────────────
  if (mode === null) {
    return (
      <div className="avail-container">
        <AvailHeader title="Truck Availability" />
        <div className="avail-card">
          <p className="avail-hint">What would you like to do?</p>
          <div className="avail-mode-grid">
            <button className="avail-mode-card" onClick={() => { setMode("owner"); setScreen("lookup"); }}>
              <span className="avail-mode-icon">🚛</span>
              <strong>Manage Availability</strong>
              <p>Set dates your truck is available for jobs</p>
            </button>
            <button className="avail-mode-card" onClick={() => { setMode("search"); setError(""); }}>
              <span className="avail-mode-icon">🔍</span>
              <strong>Search Available Trucks</strong>
              <p>Find trucks available in your city and date</p>
            </button>
          </div>
          <button className="avail-btn-link" onClick={() => navigate("/")}>← Back to Home</button>
        </div>
      </div>
    );
  }

  // ── Search: Booking form ────────────────────────────────────────────
  if (mode === "search" && searchScreen === "bookForm" && selectedSlot) {
    return (
      <div className="avail-container">
        <AvailHeader title="Book a Truck" subtitle={`${selectedSlot.vehicle_type} · ${selectedSlot.registration_number}`} />
        <div className="avail-card">
          <div className="avail-booking-summary">
            <div>📅 {formatDate(selectedSlot.date)}</div>
            <div>📍 {selectedSlot.city}, {selectedSlot.state}</div>
            <div>👤 {selectedSlot.owner_name}{selectedSlot.owner_company ? ` · ${selectedSlot.owner_company}` : ""}</div>
          </div>

          <div className="avail-input-group">
            <label>Pickup Address <span className="avail-required">*</span></label>
            <input
              placeholder="e.g. 123 MG Road, Mumbai"
              value={bookingForm.pickup_address}
              onChange={(e) => setBookingForm((f) => ({ ...f, pickup_address: e.target.value }))}
            />
          </div>
          <div className="avail-input-group">
            <label>Destination Address <span className="avail-required">*</span></label>
            <input
              placeholder="e.g. 456 Ring Road, Pune"
              value={bookingForm.destination_address}
              onChange={(e) => setBookingForm((f) => ({ ...f, destination_address: e.target.value }))}
            />
          </div>
          <div className="avail-form-grid">
            <div className="avail-input-group">
              <label>Goods Type <span className="avail-required">*</span></label>
              <input
                placeholder="e.g. Electronics"
                value={bookingForm.goods_type}
                onChange={(e) => setBookingForm((f) => ({ ...f, goods_type: e.target.value }))}
              />
            </div>
            <div className="avail-input-group">
              <label>Weight (kg) <span className="avail-required">*</span></label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                placeholder="e.g. 500"
                value={bookingForm.goods_weight_kg}
                onChange={(e) => setBookingForm((f) => ({ ...f, goods_weight_kg: e.target.value }))}
              />
            </div>
          </div>

          <label className="avail-declaration-row">
            <input
              type="checkbox"
              checked={bookingForm.declaration_accepted}
              onChange={(e) => setBookingForm((f) => ({ ...f, declaration_accepted: e.target.checked }))}
            />
            <span>I confirm the goods are legally owned, comply with Indian transport laws, and I accept GoGoTruk's terms including the cancellation and liability policy.</span>
          </label>

          {bookingError && <div className="avail-error">{bookingError}</div>}
          <button className="avail-btn-primary" onClick={handleSubmitBooking} disabled={submittingBooking}>
            {submittingBooking ? "Submitting…" : "Confirm Booking →"}
          </button>
          <button className="avail-btn-link" onClick={() => { setSearchScreen("results"); setBookingError(""); }}>
            ← Back to Results
          </button>
        </div>
      </div>
    );
  }

  // ── Search: Booking confirmed ───────────────────────────────────────
  if (mode === "search" && searchScreen === "bookConfirm" && bookingResult) {
    return (
      <div className="avail-container">
        <AvailHeader title="Booking Submitted!" subtitle="Awaiting owner confirmation" />
        <div className="avail-card">
          <div className="avail-confirm-icon">🎉</div>
          <div className="avail-confirm-grid">
            <div className="avail-confirm-row">
              <span className="avail-confirm-label">Booking ID</span>
              <span className="avail-confirm-value">#{bookingResult.id}</span>
            </div>
            <div className="avail-confirm-row">
              <span className="avail-confirm-label">Status</span>
              <span className="avail-status-badge status-booked">{bookingResult.status}</span>
            </div>
            <div className="avail-confirm-row">
              <span className="avail-confirm-label">Date</span>
              <span className="avail-confirm-value">{formatDate(bookingResult.booking_date)}</span>
            </div>
            <div className="avail-confirm-row">
              <span className="avail-confirm-label">Pickup</span>
              <span className="avail-confirm-value">{bookingResult.pickup_address}</span>
            </div>
            <div className="avail-confirm-row">
              <span className="avail-confirm-label">Destination</span>
              <span className="avail-confirm-value">{bookingResult.destination_address}</span>
            </div>
            <div className="avail-confirm-row">
              <span className="avail-confirm-label">Goods</span>
              <span className="avail-confirm-value">{bookingResult.goods_type} · {bookingResult.goods_weight_kg} kg</span>
            </div>
          </div>
          <p className="avail-confirm-note">The truck owner has been notified. You will be contacted to confirm the trip details.</p>
          {customerKycId && (
            <button
              className="avail-btn-primary"
              onClick={() => navigate(`/bookings/customer?customer_kyc_id=${customerKycId}`)}
            >
              View My Bookings →
            </button>
          )}
          <button className="avail-btn-secondary" onClick={() => { setSearchScreen("results"); setBookingResult(null); }}>
            Search Again
          </button>
        </div>
      </div>
    );
  }

  // ── Search mode ─────────────────────────────────────────────────────
  if (mode === "search") {
    return (
      <div className="avail-container">
        <AvailHeader title="Find Available Trucks" subtitle="Search by city, state, or date" />
        <div className="avail-card">
          <div className="avail-input-group">
            <label>Your Customer KYC ID <span className="avail-kyc-hint">(required to book)</span></label>
            <input
              type="number"
              placeholder="e.g. 1 — leave blank to browse only"
              value={customerKycId}
              onChange={(e) => setCustomerKycId(e.target.value)}
            />
          </div>
          <div className="avail-form-grid">
            <div className="avail-input-group">
              <label>City</label>
              <input placeholder="e.g. Mumbai" value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)} />
            </div>
            <div className="avail-input-group">
              <label>State</label>
              <input placeholder="e.g. Maharashtra" value={searchState}
                onChange={(e) => setSearchState(e.target.value)} />
            </div>
          </div>

          <div className="avail-date-mode-row">
            <button
              className={`avail-date-mode-btn ${searchMode === "exact" ? "active" : ""}`}
              onClick={() => setSearchMode("exact")}
            >Exact Date</button>
            <button
              className={`avail-date-mode-btn ${searchMode === "range" ? "active" : ""}`}
              onClick={() => setSearchMode("range")}
            >Date Range</button>
          </div>

          {searchMode === "exact" ? (
            <div className="avail-input-group">
              <label>Date <span className="avail-required">*</span></label>
              <input type="date" value={searchDate} onChange={(e) => { setSearchDate(e.target.value); setError(""); }} />
            </div>
          ) : (
            <div className="avail-form-grid">
              <div className="avail-input-group">
                <label>From <span className="avail-required">*</span></label>
                <input type="date" value={searchDateFrom} onChange={(e) => { setSearchDateFrom(e.target.value); setError(""); }} />
              </div>
              <div className="avail-input-group">
                <label>To <span className="avail-required">*</span></label>
                <input type="date" value={searchDateTo} onChange={(e) => { setSearchDateTo(e.target.value); setError(""); }} />
              </div>
            </div>
          )}

          {error && <div className="avail-error">{error}</div>}
          <button className="avail-btn-primary" onClick={() => handleSearch(1)} disabled={searching}>
            {searching ? "Searching…" : "Search →"}
          </button>
          <button className="avail-btn-link" onClick={() => { setMode(null); setError(""); setSearched(false); }}>
            ← Back
          </button>
        </div>

        {searched && (
          <div style={{ marginTop: "20px" }}>
            <div className="avail-count">
              {searchMeta.total} truck{searchMeta.total !== 1 ? "s" : ""} available
            </div>
            {searchResults.length === 0 ? (
              <div className="avail-empty">
                <div className="avail-empty-icon">🔍</div>
                <p>No trucks found matching your criteria.</p>
              </div>
            ) : (
              <>
                <div className="avail-results-list">
                  {searchResults.map((s) => (
                    <div key={s.availability_id} className="avail-result-card">
                      <div className="avail-result-top">
                        <span className="avail-result-icon">🚛</span>
                        <div>
                          <div className="avail-result-vehicle-type">{s.vehicle_type}</div>
                          <div className="avail-result-reg">{s.registration_number}</div>
                        </div>
                      </div>
                      <div className="avail-result-meta">
                        <span>📅 {formatDate(s.date)}</span>
                        <span>📍 {s.city}, {s.state}</span>
                      </div>
                      <div className="avail-result-owner">
                        <span>👤 {s.owner_name}{s.owner_company ? ` · ${s.owner_company}` : ""}</span>
                        <span>📞 {s.owner_mobile}</span>
                      </div>
                      {(s.max_load_capacity != null || s.dimensions || s.description) && (
                        <div className="avail-result-specs">
                          {s.max_load_capacity != null && <span className="avail-spec-tag">⚖️ {s.max_load_capacity}t</span>}
                          {s.dimensions && <span className="avail-spec-tag">📐 {s.dimensions}</span>}
                          {s.description && <p className="avail-result-desc">{s.description}</p>}
                        </div>
                      )}
                      <button
                        className="avail-btn-book"
                        onClick={() => handleOpenBookingForm(s)}
                      >
                        {customerKycId.trim() ? "Book This Truck →" : "Register / Login to Book →"}
                      </button>
                    </div>
                  ))}
                </div>

                {searchMeta.total_pages > 1 && (
                  <div className="avail-pagination">
                    <button
                      className="avail-page-btn"
                      onClick={() => handleSearch(searchPage - 1)}
                      disabled={searchPage <= 1 || searching}
                    >← Prev</button>
                    <span className="avail-page-info">Page {searchMeta.page} of {searchMeta.total_pages}</span>
                    <button
                      className="avail-page-btn"
                      onClick={() => handleSearch(searchPage + 1)}
                      disabled={searchPage >= searchMeta.total_pages || searching}
                    >Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Owner: Lookup ───────────────────────────────────────────────────
  if (mode === "owner" && screen === "lookup") {
    return (
      <div className="avail-container">
        <AvailHeader title="Manage Availability" subtitle="Set dates your truck is available" />
        <div className="avail-card">
          <p className="avail-hint">Enter your Fleet ID to view and manage availability slots.</p>
          <div className="avail-input-group">
            <label>Fleet ID</label>
            <input
              type="number"
              placeholder="e.g. 1"
              value={fleetId}
              onChange={(e) => setFleetId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            />
          </div>
          {error && <div className="avail-error">{error}</div>}
          <button className="avail-btn-primary" onClick={handleLookup} disabled={loading || !fleetId.trim()}>
            {loading ? "Loading…" : "View Availability →"}
          </button>
          <button className="avail-btn-link" onClick={() => { setMode(null); setError(""); }}>← Back</button>
        </div>
      </div>
    );
  }

  // ── Owner: List ─────────────────────────────────────────────────────
  if (mode === "owner" && screen === "list") {
    return (
      <div className="avail-container">
        <div className="avail-header">
          <div className="avail-logo">
            <span>🚛</span>
            <span className="avail-logo-text">GoGoTruk</span>
          </div>
          <div className="avail-header-row">
            <div>
              <h1>Availability</h1>
              <p className="avail-subtitle">
                Fleet #{fleetId} · {slots.length} slot{slots.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button className="avail-btn-add" onClick={() => { setError(""); setScreen("add"); }}>
              + Add Dates
            </button>
          </div>
        </div>

        <div className="avail-filter-row">
          {["", "Available", "Booked", "Cancelled"].map((s) => (
            <button
              key={s}
              className={`avail-filter-btn ${statusFilter === s ? "active" : ""}`}
              onClick={() => handleFilterChange(s)}
            >
              {s || "All"}
            </button>
          ))}
        </div>

        {error && <div className="avail-error">{error}</div>}
        {loading && <div className="avail-loading">Loading…</div>}

        {!loading && slots.length === 0 && (
          <div className="avail-empty">
            <div className="avail-empty-icon">📅</div>
            <p>
              {statusFilter
                ? `No slots with status "${statusFilter}".`
                : "No availability slots set yet."}
            </p>
            <button className="avail-btn-primary" onClick={() => setScreen("add")}>
              Add Availability
            </button>
          </div>
        )}

        {!loading && slots.length > 0 && (
          <div className="avail-slots-list">
            {slots.map((s) => (
              <div key={s.id} className="avail-slot-card">
                <div className="avail-slot-left">
                  <div className="avail-slot-date">{formatDate(s.date)}</div>
                  <div className="avail-slot-location">📍 {s.city}, {s.state}</div>
                </div>
                <div className="avail-slot-right">
                  <span className={`avail-status-badge ${STATUS_CLASS[s.status] || ""}`}>{s.status}</span>
                  <div className="avail-slot-actions">
                    <button className="avail-btn-edit" onClick={() => openEdit(s)}>Edit</button>
                    {s.status === "Booked" ? (
                      <button
                        className="avail-btn-release"
                        onClick={() => handleRelease(s)}
                        disabled={releasingId === s.id}
                      >
                        {releasingId === s.id ? "…" : "Release"}
                      </button>
                    ) : (
                      <button
                        className="avail-btn-delete"
                        onClick={() => handleDelete(s)}
                        title="Delete slot"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="avail-btn-link" style={{ marginTop: "16px" }} onClick={() => navigate("/fleet")}>
          ← Back to My Fleet
        </button>
      </div>
    );
  }

  // ── Owner: Add Dates ────────────────────────────────────────────────
  if (mode === "owner" && screen === "add") {
    return (
      <div className="avail-container">
        <AvailHeader title="Add Availability" subtitle={`Fleet #${fleetId}`} />
        <div className="avail-card">
          <div className="avail-input-group">
            <label>Select Dates</label>
            <div className="avail-date-row">
              <input
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="avail-input-group avail-date-input"
              />
              <button className="avail-btn-add-date" onClick={addDate} disabled={!dateInput}>
                Add
              </button>
            </div>
          </div>

          {selectedDates.length > 0 && (
            <div className="avail-date-chips">
              {selectedDates.map((d) => (
                <span key={d} className="avail-date-chip">
                  {formatDate(d)}
                  <button className="avail-chip-remove" onClick={() => removeDate(d)}>×</button>
                </span>
              ))}
            </div>
          )}

          <div className="avail-form-grid">
            <div className="avail-input-group">
              <label>City *</label>
              <input placeholder="e.g. Mumbai" value={addCity}
                onChange={(e) => setAddCity(e.target.value)} />
            </div>
            <div className="avail-input-group">
              <label>State *</label>
              <input placeholder="e.g. Maharashtra" value={addState}
                onChange={(e) => setAddState(e.target.value)} />
            </div>
          </div>

          {error && <div className="avail-error">{error}</div>}
          <button
            className="avail-btn-primary"
            onClick={handleAddAvailability}
            disabled={adding || selectedDates.length === 0}
          >
            {adding
              ? "Saving…"
              : `Set Availability for ${selectedDates.length} date${selectedDates.length !== 1 ? "s" : ""} →`}
          </button>
          <button className="avail-btn-link" onClick={() => { setError(""); setScreen("list"); }}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ── Owner: Edit Slot ────────────────────────────────────────────────
  if (mode === "owner" && screen === "edit" && editingSlot) {
    return (
      <div className="avail-container">
        <AvailHeader title="Edit Slot" subtitle={`Fleet #${fleetId}`} />
        <div className="avail-card">
          <div className="avail-form-grid">
            <div className="avail-input-group avail-full">
              <label>Date</label>
              <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>
            <div className="avail-input-group">
              <label>City</label>
              <input value={editCity} onChange={(e) => setEditCity(e.target.value)} />
            </div>
            <div className="avail-input-group">
              <label>State</label>
              <input value={editState} onChange={(e) => setEditState(e.target.value)} />
            </div>
            <div className="avail-input-group avail-full">
              <label>Status</label>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                <option value="Available">Available</option>
                <option value="Booked">Booked</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          {error && <div className="avail-error">{error}</div>}
          <button className="avail-btn-primary" onClick={handleSaveEdit} disabled={saving}>
            {saving ? "Saving…" : "Save Changes →"}
          </button>
          <button className="avail-btn-link" onClick={() => { setError(""); setScreen("list"); }}>← Cancel</button>
        </div>
      </div>
    );
  }

  return null;
}
