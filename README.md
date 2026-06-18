# 🏛️ CM Grievance Intelligence Dashboard — v3.0
### Delhi Government — Chief Minister Grievance Management System

A production-grade MERN stack platform for intelligent grievance management, false-closure prevention, and real-time governance analytics.

---

## ✨ v3.0 — New Features & UI/UX Upgrade

### 🌗 Dual Theme System (Light default + Dark)
A full `ThemeContext` drives every color via CSS variables under `[data-theme]` selectors — not just a dark overlay. Badges, alerts, tables, forms, dropdowns, and modals all have dedicated dark-mode palettes (not just dimmed versions of light colors). Persisted to `localStorage`, toggled from the header, smooth 0.25s transition on switch. Light is always the default for new visitors, per requirement.

### 🗺️ 4-Theme Interactive Map
The Grievance Map now supports four distinct tile providers, switchable live without losing markers or zoom level:
- **Streets** — standard OpenStreetMap
- **Dark** — CartoDB dark-matter basemap (matches dark UI theme)
- **Satellite** — Esri World Imagery
- **Terrain** — OpenTopoMap with elevation contours

All four are free, keyless tile providers. The map defaults to Dark when the app is in dark mode and Streets in light mode, but a saved choice always takes priority. Map theme selection is independent of and persists separately from the app theme.

### ⌨️ Command Palette (⌘K / Ctrl+K)
A role-aware quick-navigation palette, fuzzy-searchable by label or keyword, with arrow-key navigation and a visible launcher chip in the header. Also exposes the light/dark toggle as a searchable action.

### 💬 Comments & Internal Notes Thread
Every complaint now has a discussion thread. Citizens and staff can both post public comments; staff additionally have an "Internal note" toggle for officer-to-officer coordination that is **never** visible to the citizen — enforced server-side, not just hidden in the UI. Posting a comment notifies the other party via the persistent notification system.

### 🔗 Public Ticket Tracking (No Login Required)
A new `/track/:ticketId` page lets anyone with a ticket ID check status without an account — useful for sharing with family, journalists, or local representatives. The backend endpoint (`GET /api/track/:ticketId`) is intentionally minimal: no citizen contact info, no officer phone numbers, no internal notes, ever. Rate-limited separately (60 req/15min) since it's unauthenticated and ticket IDs are sequential. A "Share Tracking Link" button on the complaint detail page copies this URL to the clipboard.

### 📊 Date-Range Analytics on CM Dashboard
The dashboard now supports Today / 7 Days / 30 Days / 90 Days / All Time pills that re-query the backend (`GET /api/complaints/stats?days=N`) and reshape every chart, not just a client-side slice of the same data — category breakdowns, department performance, and the trend chart all reflect the selected window.

### 🏆 Officer Leaderboard
Top-3 performers by resolved-complaint count surface above the officer grid with trophy-style rank badges, computed from existing performance data with no extra backend load.

### 📥 CSV Export
One-click export of the currently filtered complaint list to a properly RFC-4180-escaped CSV file (handles commas, quotes, and newlines in field values correctly) — for offline reporting or sharing with departments lacking system access.

### 💀 Skeleton Loading States
Replaced bare centered spinners on the complaints table and CM dashboard with content-shaped skeleton placeholders (shimmering table rows, stat-card skeletons) that keep page structure stable during loads — a real perceived-performance improvement, not just decoration.

### 🎨 Theme-Correctness Audit
Every previously hardcoded light-mode color (`#f8fafc`, `white`, `#fef2f2`, etc.) across badges, alerts, dropdowns, tables, and the header was migrated to theme CSS variables so dark mode never shows a light-colored box with unreadable text.

---

## 🔧 What Was Fixed in the v2.0 Rebuild

This version was built by first running the v1 codebase through real builds, module-load checks, and live HTTP tests, then fixing every gap found.

**Backend correctness**
- **Ticket ID race condition** — replaced `Complaint.countDocuments()` with an atomic MongoDB counter (`models/Counter.js`).
- **No global error handler** — added `middleware/errorHandler.js` with an `asyncHandler` wrapper and typed `AppError`.
- **No input validation** — added `express-validator` rules wired into every relevant route.
- **No file-type enforcement on uploads** — multer now restricted to JPG/PNG/WEBP by extension and MIME type.
- **Deactivated users could keep using old tokens** — `protect` middleware checks `isActive` and `passwordChangedAt` vs JWT `iat`.
- **Department stats double-counting risk** — assign/verify flows now correctly increment/decrement only on actual changes.
- **Access control gaps** — `getComplaint` now enforces ownership/assignment checks per role.
- **Missing endpoints** — added `changePassword`, admin `getAllUsers`, `toggleUserActive`, `updateDepartment`, `completeVisit`.
- **Notifications were purely transient** — added a persistent `Notification` model + service; Socket.IO now authenticates and joins a `user_<id>` room instead of relying on ad-hoc event names.

**Frontend correctness**
- **Leaflet race condition** — replaced inline `<script>` + synchronous `window.L` check with a `useLeaflet` hook.
- **Map instance leak** — map is created once; only markers/tile layer are swapped on filter/theme changes.
- **No notification UI, profile UI, or admin user management UI** — all added.
- **No crash protection** — added `ErrorBoundary`.
- **No 404 page** — added.
- **Duplicated formatting logic and error messages** — extracted into `utils/helpers.js`.

**Verification performed (not just claimed)**
- Every backend module (`require`) loads without error, including all v3.0 additions (Comment model, comment controller).
- JWT sign/verify and bcrypt hash/compare roundtrips tested directly.
- AI classification tested against 4 labeled examples — all passed.
- Controller status-string usage cross-checked against the Mongoose enum programmatically.
- Live HTTP tests against the running server (single atomic shell invocation, since background processes don't persist across separate tool calls in this environment): `/health` → 200; malformed registration → 400 with validator messages; unknown route → 404; new public `/api/track/:ticketId` route correctly chains through middleware and fails gracefully (500 JSON, not a crash) when MongoDB is unreachable — confirming the route/controller/error-handler wiring is correct even though a live DB wasn't available to test the full data path in this sandbox.
- Frontend production build (`react-scripts build`) completes with zero errors and zero warnings after every round of changes, including the full v3.0 feature set.
- A true end-to-end DB integration test via `mongodb-memory-server` was attempted but blocked by this sandbox's network allowlist (`fastdl.mongodb.org` not reachable). Run `npm run seed` against a real local/Atlas MongoDB to fully exercise the data layer.

---

## 🚀 Key Features

### 🤖 AI Complaint Segregation
Keyword-based NLP classifies complaints into 15 categories, auto-routes to the correct department, and flags critical situations.

### 🔐 Anti-False Closure System
Officer marks resolved → citizen verification requested → citizen confirms or rejects with reason → rejection auto-escalates, flags an audit log entry, and increments the officer's false-closure counter.

### 🚨 Critical Complaint Alerts
Life-threatening keyword detection triggers a persisted notification to every CM/admin plus a real-time Socket.IO push.

### 🗺️ Geo-Spatial Grievance Map (4 Themes)
Streets, Dark, Satellite, and Terrain tile layers; color-coded priority markers; filters; "Locate Me" nearby-complaints lookup.

### 🏛️ CM Visit Log System
Plan field visits, log GPS locations, automatically pull nearby unresolved complaints within 500m, mark visits complete.

### 📊 Officer Bandwidth Management + Leaderboard
Real-time capacity tracking blocks over-assignment; performance page shows resolved count, average resolution time, satisfaction score, false-closure rate, and a top-3 leaderboard.

### 🔗 MCD311 API Integration
Background sync with automatic mock-mode fallback — a government API outage never blocks or fails a complaint submission.

### ⚡ Real-Time + Persistent Notifications
Every alert is stored in MongoDB and pushed live via an authenticated Socket.IO room, with a full notification inbox in the UI.

### 👥 Full Admin Console
User management, department management, audit log with suspicious-activity filtering.

### 💬 Discussion Threads & 🔗 Public Tracking
Per-complaint comments with staff-only internal notes, plus a no-login public tracking page for sharing status externally.

---

## 👥 Roles & Access

| Role | Access |
|------|--------|
| **Citizen** | Submit, track, verify resolutions, upvote, comment, manage profile, share tracking link |
| **Employee** | View assigned tasks, update status, upload proof, comment (incl. internal notes) |
| **Department Head** | Assign officers within their department, view dept analytics |
| **CM** | Full dashboard, heat map, officer performance, visit logs, audit |
| **Super Admin** | Everything + user management + department management |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, pure CSS design system with light/dark theming |
| Charts | Recharts |
| Maps | Leaflet + 4 free tile providers (OSM, CartoDB, Esri, OpenTopoMap), loaded via custom async hook |
| Real-time | Socket.IO with authenticated per-user rooms |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcrypt, password-change session invalidation |
| Validation | express-validator |
| File Upload | Multer (MIME + extension restricted) |
| Scheduling | node-cron (hourly overdue sweep) |
| Deployment | Docker + Docker Compose |

---

## 🚀 Quick Start

### Prerequisites
Node.js 18+, MongoDB 6+ (local or Atlas)

### Backend
```bash
cd backend
cp .env.example .env   # edit MONGO_URI and JWT_SECRET
npm install
npm run seed            # seeds departments, users, 40 complaints
npm run dev              # http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm start                # http://localhost:3000
```

### Docker (full stack)
```bash
docker-compose up --build
```

---

## 🔑 Demo Credentials (password: `password123`)

| Role | Email |
|------|-------|
| CM | cm@delhi.gov.in |
| Super Admin | admin@delhi.gov.in |
| Dept Head (Roads) | dh.roads@delhi.gov.in |
| Officer | officer1@delhi.gov.in |
| Citizen | citizen1@example.com |

After seeding, try `/track/GRV-2026-000001` (no login) to see the public tracking page.

---

## 📡 API Reference

### Auth
`POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/me` · `PUT /api/auth/profile` · `PUT /api/auth/change-password`

### Complaints
`POST /api/complaints` · `GET /api/complaints` · `GET /api/complaints/stats?days=N` · `GET /api/complaints/nearby` · `GET /api/complaints/:id` · `POST /api/complaints/:id/assign` · `PUT /api/complaints/:id/status` · `POST /api/complaints/:id/verify` · `POST /api/complaints/:id/upvote`

### Comments
`GET /api/complaints/:id/comments` · `POST /api/complaints/:id/comments` (supports `isInternal` for staff)

### Public Tracking (no auth)
`GET /api/track/:ticketId`

### Users
`GET /api/users/officers` · `GET /api/users/officer-performance` · `GET /api/users` (admin) · `POST /api/users` (admin) · `PUT /api/users/:id` (admin) · `PUT /api/users/:id/toggle-active` (admin)

### Departments
`GET /api/departments` · `POST /api/departments` (admin) · `PUT /api/departments/:id` (admin)

### Visits
`POST /api/visits` · `GET /api/visits` · `GET /api/visits/:id` · `POST /api/visits/:id/log` · `PUT /api/visits/:id/complete`

### Notifications
`GET /api/notifications` · `PUT /api/notifications/:id/read` · `PUT /api/notifications/read-all`

### Audit & MCD311
`GET /api/audit-logs` (supports `?suspicious=true`) · `GET /api/mcd311/status`

---

## 📁 Project Structure

```
cm-grievance/
├── backend/
│   ├── config/db.js
│   ├── controllers/        # auth, complaint, user, visit, notification, comment
│   ├── middleware/         # auth, errorHandler, upload, validators
│   ├── models/             # User, Department, Complaint, CMVisit, AuditLog, Notification, Counter, Comment
│   ├── routes/index.js
│   ├── services/           # aiClassification, mcd311, notificationService
│   ├── utils/seeder.js
│   └── server.js
└── frontend/
    └── src/
        ├── components/shared/   # Layout, ErrorBoundary, CommandPalette, CommentsThread, Skeletons
        ├── contexts/             # Auth, Socket, Theme
        ├── hooks/useLeaflet.js
        ├── pages/                 # 18 pages incl. TrackComplaint, Profile, Users, NotFound
        ├── services/api.js
        └── utils/helpers.js
```

---

*Built for India Innovates 2026 | Delhi CM Grievance Initiative*
