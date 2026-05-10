# GoGoTruk Web UI

React web frontend for the GoGoTruk logistics platform — KYC registration and admin review.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Build Tool | Vite |
| Routing | React Router DOM v7 |
| HTTP Client | Axios |
| Fonts | Syne + DM Sans (Google Fonts) |

---

## How to Run

### Step 1 — Start PostgreSQL
```bash
& "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" start -D "C:\Users\madhas\postgresql\data" -l "C:\Users\madhas\postgresql\log.log"
```

### Step 2 — Start Backend
```bash
cd C:\Users\madhas\PycharmProjects\GoGo-Truk\truck_app
uvicorn app.main:app --reload
```

### Step 3 — Start Frontend
```bash
cd C:\Users\sagas\GoGoTruk-Web
npm install
npm run dev
```

### Step 4 — Open Browser

| URL | Purpose |
|-----|---------|
| `http://localhost:5173/` | Customer KYC registration flow |
| `http://localhost:5173/admin/kyc` | Admin pending queue |
| `http://localhost:5173/admin/kyc/:type/:id` | Admin KYC detail + review |

---

## Backend URL

```
http://127.0.0.1:8000
```

API docs (Swagger): `http://127.0.0.1:8000/docs`

---

## Project Structure

```
src/
├── api/
│   ├── kycApi.js        # Customer + Owner KYC API calls
│   └── adminApi.js      # Admin review API calls
├── admin/
│   ├── AdminKYCList.jsx # Pending queue page
│   ├── AdminKYCDetail.jsx # Detail + review page
│   └── Admin.css        # Admin panel styles
├── App.jsx              # Customer-facing KYC wizard
├── App.css              # Customer flow styles
└── main.jsx             # React Router entry point
```

---

## Features Implemented

### Customer Flow (`/`)
- OTP-based mobile verification
- Individual KYC registration (name, DOB, PAN, Aadhaar, address)
- Company KYC registration (linked to individual KYC)
- Truck Owner KYC registration (separate flow)
- Digital consent / declaration screen with PDF download
- ID document upload (images and PDFs)

### Admin Panel (`/admin/kyc`)
- Pending KYC queue — Customer, Company, Owner types
- Detail view with all submitted fields
- Document preview — images shown inline, PDFs embedded via iframe
- Approve / Reject with optional reason
- Company records show link to their associated individual KYC

---

## Document Viewing (Cloudinary)

All KYC document URLs stored in the database are Cloudinary CDN URLs that require authentication. The backend exposes a proxy endpoint to generate short-lived signed URLs:

```
GET http://127.0.0.1:8000/api/docs/view?url=<cloudinary_url>
```

Returns a `302` redirect to a 1-hour signed link. The admin panel routes all document `src` and `href` attributes through this proxy automatically.

---

## OTP in Development

In dev mode the backend does not send real SMS. The OTP is printed to the uvicorn console and also returned in the API response as `dev_otp`. The UI displays it in a yellow banner on the OTP entry screen.

---

## Notes for New Developers

- No login required for the admin panel yet (auth planned for Story 16)
- The customer flow is mobile-first (max-width 560px); the admin panel is desktop-first (max-width 1100px)
- All API base URLs are hardcoded to `http://127.0.0.1:8000` — update `src/api/*.js` if the backend moves
- PDFs must be uploaded to Cloudinary with `resource_type="raw"` — see `cloudinary_client.py`
