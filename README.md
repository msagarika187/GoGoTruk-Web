# GoGoTruk Web UI

React frontend for the GoGoTruk logistics platform. Covers KYC registration flows, an admin review panel, fleet management, truck availability, and customer booking.

---

## Tech Stack

| | |
|---|---|
| Framework | React 19 |
| Build Tool | Vite |
| Routing | React Router DOM v7 |
| HTTP Client | Axios |
| Fonts | Syne + DM Sans (Google Fonts) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Backend server running at `http://127.0.0.1:8000` (see backend README)

### Install and run

```bash
npm install
npm run dev
```

App opens at `http://localhost:5173`

---

## App URLs

| URL | Who uses it | Description |
|-----|------------|-------------|
| `/` | Customer / Truck Owner | KYC registration wizard |
| `/fleet` | Truck Owner | Fleet vehicle management |
| `/availability` | Truck Owner / Customer | Set availability (owner) or search + book trucks (customer) |
| `/bookings/owner` | Truck Owner | Incoming booking requests — accept, reject, cancel, generate invoice |
| `/bookings/customer` | Customer | View booking history and cancel bookings |
| `/admin/kyc` | Admin | Pending KYC review queue |
| `/admin/rate-cards` | Admin | Rate card management (pricing slabs) |
| `/admin/kyc/:type/:id` | Admin | KYC detail and approve/reject |
| `/admin/vehicle-types` | Admin | Vehicle type CRUD |

---

## Project Structure

```
src/
├── api/
│   ├── kycApi.js             # OTP, individual, company, owner KYC, consent
│   ├── adminApi.js           # Admin KYC review endpoints
│   ├── fleetApi.js           # Fleet registration, document upload, expiry dates
│   ├── vehicleTypeApi.js     # Public + admin vehicle type endpoints
│   ├── availabilityApi.js    # Availability CRUD + book + release
│   ├── bookingApi.js         # Create booking, get booking, list customer/owner bookings, review
│   ├── rateCardApi.js        # Public + admin rate card endpoints
│   └── invoiceApi.js         # Preview, generate, get invoice by ID or booking ID
│
├── admin/
│   ├── AdminKYCList.jsx      # Pending KYC queue table
│   ├── AdminKYCDetail.jsx    # KYC detail view + approve/reject form
│   ├── VehicleTypeList.jsx   # Vehicle type management (add/edit/deactivate/reactivate)
│   ├── RateCardPage.jsx      # Rate card management (add/edit/deactivate per vehicle type + slab)
│   └── Admin.css
│
├── availability/
│   ├── AvailabilityPage.jsx  # Owner availability management + customer search + booking
│   └── Availability.css
│
├── bookings/
│   ├── OwnerBookingsPage.jsx    # Owner: review, accept/reject, invoice, cancel
│   ├── CustomerBookingsPage.jsx # Customer: view history, cancel bookings
│   └── Bookings.css
│
├── components/
│   ├── FilePreview.jsx       # Shared file preview (image thumbnail / PDF iframe)
│   └── FilePreview.css
│
├── fleet/
│   ├── FleetPage.jsx         # All fleet screens (lookup, list, register, upload, edit expiry)
│   └── Fleet.css
│
├── App.jsx                   # Customer + owner KYC wizard (all steps)
├── App.css
└── main.jsx                  # Router entry point
```

---

## Features by Story

### Stories 1–4 — Customer KYC (`/`)

Landing screen lets the user pick **Customer** or **Truck Owner**.

**Customer — Individual:**
1. Enter mobile → OTP verification
2. Fill KYC form (name, DOB, email, address)
3. Digital consent / declaration (8 clauses, checkbox, PDF download)
4. Upload ID proof (image or PDF)

Address fields: Address Line 1 (required), Address Line 2, City, State, ZIP / Pincode.

**Customer — Company:**
Same as Individual up to step 3 (contact person details), then two extra steps:
- Company details form (company name, type, GST, registered address, city, state, pincode, contact person)
- Contact phone accepts **10-digit mobile** (starts with 6–9) or **11-digit landline** (e.g. `01140001234`)
- Upload incorporation certificate + GST certificate

**Truck Owner:**
1. Enter mobile → OTP verification
2. Fill owner details form (name, DOB, email, address — same address structure as Individual)
3. Upload driving licence + owner ID
4. Status screen with **Manage My Fleet →** link

OTP is shown in a yellow banner on screen during development (no real SMS sent).

**Declaration clauses** (8 total): Goods Liability, Packaging, Payment Terms, Cancellation Policy, Legal Compliance, Dispute Resolution (jurisdiction: Chennai, Tamil Nadu), Platform Usage, Driver No-Show.

---

### Story 5 — Admin KYC Review (`/admin/kyc`)

- Table of all pending KYC submissions with type badges (Customer / Company / Owner)
- Click **Review →** to open the detail page
- Detail page shows all submitted fields + document previews
- PDFs preview via embedded iframe; images shown as thumbnails
- Approve or Reject with a reason (reason required for rejection)
- Company records show a link to the associated individual KYC

---

### Story 6 — Fleet Vehicle Registration (`/fleet`)

Truck owners access this after KYC is verified by admin.

- Enter Owner KYC ID to view fleet
- Register a vehicle: type, registration number, engine number, chassis number, plus optional **Description**, **Max Load Capacity (tonnes)**, and **Dimensions** — pre-filled from the selected vehicle type, editable by the owner
- Upload **4 documents**: RC Book (required), Insurance Certificate (required), Permit (optional), PUC Certificate (optional)
- Each upload zone shows a **file preview** after selection (image thumbnail or PDF iframe)
- Fleet list shows all vehicles with doc status badges (✓ / ✗) for all 4 documents
- Vehicle cards display Max Load, Dimensions, and Description when present
- View any uploaded document via proxy links

Navigation: Landing page has **"Already a registered owner? Manage My Fleet →"** link. Owner KYC status screen also links here after completion.

---

### Story 7 — Vehicle Type Management (`/admin/vehicle-types`)

- Lists all vehicle types including inactive ones
- Add new types (name, description, max load capacity, dimensions)
- Edit any type inline
- Deactivate a type — removes it from the fleet registration dropdown immediately
- **Reactivate** a deactivated type — it reappears in the dropdown
- Fleet registration dropdown is populated live from the API (not hardcoded)
- Top nav bar switches between KYC Review and Vehicle Types

---

### Story 8 — Fleet Document Expiry Tracking (`/fleet`)

Vehicle cards show expiry status for all 4 document types:

| Indicator | Condition |
|-----------|-----------|
| 🟢 | More than 30 days remaining |
| 🟡 | 30 days or fewer remaining |
| 🔴 | 7 days or fewer / expired |

- **Upload screen** — date pickers for all 4 document expiry dates alongside each file upload zone
- **✏️ Update Expiry Dates** button on each vehicle card — edit all 4 dates (RC, insurance, permit, PUC)
- **Inactive banner** — if backend marks `is_active: false`, a red warning banner appears on the card

---

### Story 9 — Truck Availability Management (`/availability`)

Truck owners set the dates and locations their truck is available for jobs.

- Enter Fleet ID to view all slots (requires verified owner KYC + active fleet vehicle)
- **Add Dates** — multi-date picker: select one date, click Add, repeat; dates appear as orange chips
- Set City and State for the batch — all selected dates get the same location
- Filter slots by status: All / Available / Booked / Cancelled
- **Edit** a slot — change date, city, state, or status
- **Delete** a slot — disabled for Booked slots
- **Release** a Booked slot — returns it to Available (shown instead of Delete for Booked slots)
- From `/fleet`, each vehicle card has a **📅 Manage Availability** button that deep-links to `/availability?fleet_id=<id>` and skips the Fleet ID lookup

---

### Story 10 — Search Available Trucks (`/availability` → Search mode)

Public search — no KYC required to browse.

- **Date is mandatory** — exact date or date range (From/To) must be selected before searching
- City and state are optional partial-match filters
- Results show: vehicle type, registration number, date, location, owner name + mobile, max load capacity, dimensions, description
- Pagination — Prev / Next with "Page X of Y" when results exceed 10
- Only `status = Available` slots appear — booked trucks are automatically hidden

---

### Story 11 — Real-Time Availability (`/availability`)

- **Book** button on each search result opens the booking form (Story 12)
- **Release** button on owner's Booked slots — returns slot to Available, owner-side only
- Simultaneous-booking conflicts (409) are retried automatically once after 800ms

---

### Story 12 — Booking Request (`/availability` → Book flow)

Full booking form triggered when a customer clicks **"Book This Truck →"** on a search result.

**Prerequisites:** Customer must have a verified KYC ID. Enter it in the **Customer KYC ID** field at the top of the search screen before searching. Without it, the Book button redirects to `/` for registration.

**Booking form fields:**
- Pickup address (required)
- Destination address (required)
- Goods type (required — e.g. Electronics, Furniture)
- Weight in kg (required, must be > 0)
- Declaration checkbox (must be accepted)

**Responses:**
- **201** → Confirmation screen showing Booking ID, status "Pending", date, pickup/destination, goods summary
- **403** → Redirected to `/` (KYC not verified)
- **409** → "This slot was just taken" — search auto-refreshes
- **404** → Error shown inline with backend message (KYC ID or slot not found)

`booking_date` is taken from the availability slot — not collected from the user. The truck owner is notified server-side on successful booking. The slot is immediately marked Booked and disappears from future search results.

---

### Story 13 — Owner Booking Confirmation (`/bookings/owner`)

Truck owners review incoming booking requests and accept or reject them within a 2-hour window.

**Access:** From the Fleet page list screen, click **📋 Incoming Bookings** (top-right). Or navigate directly to `/bookings/owner?owner_kyc_id=<id>`.

**Booking card shows:**
- Booking ID, booking date, status badge
- Live countdown timer (green → yellow → red as deadline approaches)
- Pickup address, destination, goods type, weight, customer KYC ID
- Rejection reason (if previously rejected)

**Actions (Pending bookings only):**
- **✓ Accept** — confirm dialog, then calls `POST /api/bookings/{id}/review` with `decision: "Confirmed"`
- **✗ Reject** — expands an inline textarea; rejection reason is required; calls review with `decision: "Rejected"` + reason

**Countdown colours:**

| Colour | Condition |
|--------|-----------|
| Green | More than 1 hour remaining |
| Yellow | 15 minutes – 1 hour remaining |
| Red | Under 15 minutes / deadline passed |

If the owner does not respond within 2 hours, the backend auto-rejects the booking. The UI shows status **Auto-Rejected** with no action buttons.

---

### Story 14 — Pricing & Invoice Generation

Two parts: admin rate card setup, and owner invoice generation for confirmed bookings.

#### Admin — Rate Cards (`/admin/rate-cards`)

Rate cards define pricing per vehicle type per distance slab. Accessible via the **Rate Cards** tab in the admin nav.

- Lists all rate cards (active + inactive) in a table
- **Add Rate Card** — vehicle type (dropdown from active types), distance from/to km (leave "To" blank for unlimited), base fare ₹, rate per km ₹
- **Edit** any card inline
- **Deactivate / Reactivate** toggle per card

Example slabs for Mini Truck:

| From | To | Base Fare | Rate/km |
|------|----|-----------|---------|
| 0 | 50 km | ₹500 | ₹15/km |
| 50 | 200 km | ₹750 | ₹12/km |
| 200 | unlimited | ₹1000 | ₹10/km |

Rate cards **must be seeded before any invoice can be generated** — the backend returns 400 if no matching slab is found.

#### Owner — Generate Invoice (`/bookings/owner`)

On confirmed bookings, a **📄 Generate Invoice** button appears. Clicking it:

1. Checks if an invoice already exists for that booking (`GET /api/invoices/booking/{id}`)
   - If yes → goes straight to the invoice result screen
   - If no → opens the invoice form

**Invoice form fields:**
- Distance (km) — required
- Waiting charges ₹ (default 0)
- Toll charges ₹ (default 0)
- Loading charges ₹ (default 0)
- GST Type — `CGST+SGST` (intrastate) or `IGST` (interstate)
- GST Rate — 0%, 5%, 12%, or 18% (5% is standard for GTA freight)

**Preview Pricing** → calls `POST /api/invoices/preview`, shows full breakdown (base fare, charges, GST split, total). Changing any field clears the preview.

**Generate Invoice & Send Email** → calls `POST /api/invoices/generate`:
- PDF invoice uploaded to Cloudinary
- Invoice email sent to customer automatically (background task)
- Invoice number format: `INV-YYYYMMDD-000001`

**Invoice result screen** shows all line items, total, and a **View Invoice PDF** link (proxied through the backend).

**GST calculation:**
- `CGST+SGST`: rate split equally (e.g. 5% → 2.5% CGST + 2.5% SGST)
- `IGST`: full rate applied as a single tax

---

### Story 15 — Booking Cancellation & Refund

Both customers and owners can cancel a Pending or Confirmed booking. The cancellation charge depends on how far in advance the cancellation happens.

**Cancellation charge rules:**

| Booking Status | Hours Before Pickup | Charge |
|---|---|---|
| Pending | Any | 0% — always free |
| Confirmed | > 48 hours | 0% — full refund |
| Confirmed | 24–48 hours | 25% of invoice total retained |
| Confirmed | < 24 hours | 50% of invoice total retained |

#### Owner — `/bookings/owner`

- **Confirmed** bookings show **📄 Invoice** and **✕ Cancel** side-by-side
- **Pending** bookings show a "Cancel this booking" text link below the Accept/Reject buttons
- Clicking Cancel calls `GET /cancellation-preview` immediately and opens the cancellation screen

#### Customer — `/bookings/customer`

New page. Enter Customer KYC ID to view all bookings. Supports deep-link via `?customer_kyc_id=<id>`.

- Lists all bookings with status badges
- **Pending** and **Confirmed** bookings show **✕ Cancel Booking** button

#### Cancellation screen (both owner and customer)

Shows before confirming:
- Booking status + hours before pickup (rounded to nearest hour)
- Invoice total, charge percentage + amount, refund amount (colour-coded)
- If no invoice was generated: "No payment to refund"
- Reason input (required)
- **Confirm Cancellation** button

On success (201):
- Returns to the list with a green success banner
- Booking status updates to Cancelled
- Availability slot is released — truck reappears in search results immediately
- Customer and owner receive SMS notifications

**refund_status values:** `Processed` (completed), `Pending` (queued briefly), `NA` (no refund applicable)

---

## Document Proxy

All Cloudinary document URLs require authentication. Never use them directly in `src` or `href`. Always wrap through the proxy:

```js
`http://127.0.0.1:8000/api/docs/view?url=${encodeURIComponent(cloudinaryUrl)}`
```

This is already handled in `AdminKYCDetail.jsx` and `FleetPage.jsx`. Apply the same pattern to any new document display you add.

---

## Layout Conventions

| Area | Max width | Designed for |
|------|-----------|--------------|
| Customer / Owner KYC (`App.jsx`) | 560px | Mobile |
| Fleet pages (`FleetPage.jsx`) | 600px | Mobile |
| Availability pages (`AvailabilityPage.jsx`) | 600px | Mobile |
| Owner bookings + invoice (`OwnerBookingsPage.jsx`) | 640px | Mobile |
| Admin pages (`admin/`) | 1100px | Desktop |

---

## Key Dev Notes

- **Admin auth** — frontend password gate via `AdminGuard` wraps all `/admin/*` routes. Default password: `admin@gogotruk`. Override with `VITE_ADMIN_PASSWORD` in `.env`. Session stored in `sessionStorage` — cleared on browser close. Backend auth (JWT) is planned for Story 16.
- **API base URLs** — hardcoded to `http://127.0.0.1:8000` in all `src/api/*.js` files. Update there if the backend moves.
- **Component scope** — `OTPScreen`, `VerifyOTPScreen`, and `UploadZone` are defined at module level in `App.jsx` (not inside the component). Keep them there — defining components inside a parent causes focus loss on every keystroke.
- **Error parsing** — FastAPI validation errors return `detail` as an array. Use `parseApiError(e)` (defined locally in each page file) to handle both string and array formats.
- **File preview** — `src/components/FilePreview.jsx` renders a thumbnail for images and an iframe for PDFs using `URL.createObjectURL`. It cleans up via `revokeObjectURL` on unmount. Used in all upload zones across `App.jsx` and `FleetPage.jsx`.
- **Address structure** — Individual and Owner KYC use: `address_1` (required), `address_2`, `city`, `state`, `zip_code`. There is no `address_3` field. Company KYC uses `registered_address_1`, `registered_address_2`, `city`, `state`, `pincode`.
- **Vehicle type pre-fill** — `FleetPage.jsx` stores full vehicle type objects in `vehicleTypeData` state. When the type dropdown changes, `handleVehicleTypeChange()` auto-fills description, max load capacity, and dimensions from that object. The owner can override any value before submitting.
- **AvailabilityPage screens** — `mode` state (`null | "owner" | "search"`) controls the top-level view. Owner flow uses `screen` state (`lookup | list | add | edit`). Search flow uses `searchScreen` state (`results | bookForm | bookConfirm`). All screens live in one file.
- **Booking retry logic** — `withRetry()` in `AvailabilityPage.jsx` catches 409 errors containing "simultaneously" in the detail, waits 800ms, and retries the call once automatically.
- **Search date is mandatory** — the search form validates that either an exact date or at least one range date is provided before calling the API. This prevents customers from seeing results with no date context before booking.
- **Customer KYC gate** — the Customer KYC ID is entered once at the top of the search screen and reused for all booking attempts in that session. If blank, the Book button label changes to "Register / Login to Book →" and clicking redirects to `/`.
- **Owner booking countdown** — `OwnerBookingsPage.jsx` runs a `setInterval` every second (stored in `now` state) while on the list screen. `formatCountdown(deadlineStr, now)` returns `{ text, cls }` where `cls` is `cd-green` / `cd-yellow` / `cd-red`. The interval is cleared on unmount via `useEffect` cleanup.
- **Review payload field name** — `POST /api/bookings/{id}/review` expects `action` (not `decision`) for the accept/reject value. Values are `"Confirmed"` and `"Rejected"`. Optional `rejection_reason` string is omitted entirely on accept.
- **Incoming Bookings deep-link** — `OwnerBookingsPage` reads `?owner_kyc_id` from the URL query and auto-triggers the lookup on mount, so the Fleet page "📋 Incoming Bookings" button can link directly to the list without a manual lookup step.
- **Invoice generation gate** — "📄 Generate Invoice" button only appears on `Confirmed` bookings. Clicking first calls `GET /api/invoices/booking/{id}` — if an invoice already exists it goes straight to the result screen; if 404, it opens the form. A 409 on generate also falls back to fetching the existing invoice.
- **Invoice form resets preview** — changing any invoice form field clears `invoicePreview` state, forcing the owner to re-preview before generating. This prevents generating with stale numbers.
- **Rate card prerequisite** — an active rate card matching the booking's vehicle type and distance slab must exist before any invoice can be generated. The admin must seed rate cards at `/admin/rate-cards` first (400 returned otherwise).
- **GST field display** — unused GST fields (e.g. IGST when using CGST+SGST) return 0.0 from the backend and are conditionally hidden in the preview and result screens.
- **Cancellation flow** — always calls `GET /cancellation-preview` first; never calculates charges on the frontend. The preview `invoice_total` is null if no invoice exists — the UI shows "No payment to refund" in that case.
- **Cancellation charge colours** — 0% charge shows green refund amount; 25% shows amber charge row; 50% shows red charge row. Applied via `.book-cancel-free/partial/full` classes on the preview row.
- **cancelled_by** — owner cancellations send `"Owner"`, customer cancellations send `"Customer"`. Both go through the same backend endpoint.
