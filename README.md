# GoGoTruk Web UI

React frontend for the GoGoTruk logistics platform. Covers KYC registration flows, an admin review panel, and fleet management.

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
| `/admin/kyc` | Admin | Pending KYC review queue |
| `/admin/kyc/:type/:id` | Admin | KYC detail and approve/reject |
| `/admin/vehicle-types` | Admin | Vehicle type CRUD |

---

## Project Structure

```
src/
├── api/
│   ├── kycApi.js           # OTP, individual, company, owner KYC, consent
│   ├── adminApi.js         # Admin KYC review endpoints
│   ├── fleetApi.js         # Fleet registration and document upload
│   └── vehicleTypeApi.js   # Public + admin vehicle type endpoints
│
├── admin/
│   ├── AdminKYCList.jsx    # Pending KYC queue table
│   ├── AdminKYCDetail.jsx  # KYC detail view + approve/reject form
│   ├── VehicleTypeList.jsx # Vehicle type management (add/edit/deactivate)
│   └── Admin.css
│
├── fleet/
│   ├── FleetPage.jsx       # All fleet screens (lookup, list, register, upload, edit expiry)
│   └── Fleet.css
│
├── App.jsx                 # Customer + owner KYC wizard (all steps)
├── App.css
└── main.jsx                # Router entry point
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
| Admin pages (`admin/`) | 1100px | Desktop |

---

## Key Dev Notes

- **Admin auth** — not implemented yet, planned for Story 16. The `/admin/*` routes are open by URL.
- **API base URLs** — hardcoded to `http://127.0.0.1:8000` in all `src/api/*.js` files. Update there if the backend moves.
- **Component scope** — `OTPScreen`, `VerifyOTPScreen`, and `UploadZone` are defined at module level in `App.jsx` (not inside the component). Keep them there — defining components inside a parent causes focus loss on every keystroke.
- **Error parsing** — FastAPI validation errors return `detail` as an array. Use `parseApiError(e)` (defined locally in each page file) to handle both string and array formats.
- **File preview** — `src/components/FilePreview.jsx` renders a thumbnail for images and an iframe for PDFs using `URL.createObjectURL`. It cleans up via `revokeObjectURL` on unmount. Used in all upload zones across `App.jsx` and `FleetPage.jsx`.
- **Address structure** — Individual and Owner KYC use: `address_1` (required), `address_2`, `city`, `state`, `zip_code`. There is no `address_3` field. Company KYC uses `registered_address_1`, `registered_address_2`, `city`, `state`, `pincode`.
- **Vehicle type pre-fill** — `FleetPage.jsx` stores full vehicle type objects in `vehicleTypeData` state. When the type dropdown changes, `handleVehicleTypeChange()` auto-fills description, max load capacity, and dimensions from that object. The owner can override any value before submitting.
