# 🚛 GoGoTruk Web UI

React web frontend for the GoGoTruk logistics platform.

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Build Tool | Vite |
| HTTP Client | Axios |
| Fonts | Syne + DM Sans |

---

## 🚀 How to Run

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
cd C:\Users\madhas\PycharmProjects\GoGoTrukWeb
npm run dev
```

### Step 4 — Open Browser
```
http://localhost:5173
```

---

## 🔌 Backend URL
```
http://127.0.0.1:8000
```