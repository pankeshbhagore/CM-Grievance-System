# 🏛️ CM Grievance Intelligence Dashboard

### Delhi Government — Chief Minister Grievance Management System

A production-grade MERN stack platform for intelligent grievance management, false-closure prevention, and real-time governance analytics. Designed for high availability, security, and smart automation.

---

## ✨ System Highlights & Architecture

### 🤖 Advanced AI & ML Services (New!)
The platform leverages intelligent algorithms to reduce manual triage and ensure citizen satisfaction:
*   **Weighted AI Classification**: Uses TF-IDF-inspired weighted scoring and bigram phrase matching for superior categorization and automatic routing to departments.
*   **Jaccard Similarity Deduplication**: Proactively detects duplicate complaints by calculating Jaccard similarity coefficients, filtering stop words, and comparing geographic proximities.
*   **Sentiment & Urgency Analytics**: Analyzes citizen descriptions to tag frustration levels, escalating highly frustrated complaints and dynamically estimating resolution times based on historical department data.
*   **Anomaly & Behavior Detection**: Background services continually evaluate officer performance to identify suspiciously fast resolutions (false-closure risks) and department-wide bottlenecks.

### 🔐 Security & Anti-False Closure System
*   **Rigorous Verification Flow**: When an officer marks a ticket resolved, it enters a `pending_verification` state. Citizens must confirm resolution. Rejections auto-escalate and flag an audit log entry.
*   **Hardened Backend**: Protected against Mass Assignment vulnerabilities, ReDoS (Regular Expression Denial of Service) in text searches, and strict authorization enforcement for department heads.
*   **Data Integrity**: Enforced by rigorous `express-validator` schemas across all state transitions and API endpoints.

### 🌗 True Dual Theme System
A robust `ThemeContext` drives every color via CSS variables under `[data-theme]` selectors. Badges, alerts, tables, forms, dropdowns, and modals have dedicated dark-mode palettes (not just dimmed overlays). Persisted to `localStorage` with smooth 0.25s transitions.

### 🗺️ 4-Theme Interactive Geo-Spatial Map
The Grievance Map supports four distinct free, keyless tile providers (Streets, Dark, Satellite, Terrain), switchable live without losing markers. Includes "Locate Me" functionality for finding complaints within a 1km radius and pulse animations for critical alerts.

### 📊 Comprehensive CM Analytics & Leaderboards
*   **Real-time AI Insights Panel**: Displays department bottlenecks and officer behavior warnings directly to the Chief Minister.
*   **Date-Range Analytics**: Supports Today / 7 Days / 30 Days / 90 Days / All Time queries that dynamically reshape category breakdowns, department performance, and trend charts.
*   **Officer Leaderboard**: Top performers are highlighted based on resolved-complaint counts, alongside capacity tracking to prevent over-assignment and division-by-zero workload errors.

### 💬 Discussion Threads & Internal Notes
Every complaint has a dedicated discussion thread. Citizens and staff can post public comments; staff have an "Internal note" toggle for secure, officer-to-officer coordination that is mathematically isolated from public API responses.

### 🔗 Public Ticket Tracking (No Login Required)
A dedicated `/track/:ticketId` portal allows anyone to check status without an account. Rate-limited and sanitized to protect citizen PII and internal staff notes.

### 📥 Enterprise UX Enhancements
*   **Command Palette (⌘K / Ctrl+K)**: Role-aware quick navigation and fuzzy-search.
*   **CSV Exports**: One-click, unpaginated export of filtered complaint lists to properly RFC-4180-escaped CSV files.
*   **Debounced Search**: Optimized API performance with debounced inputs.
*   **Memory Safe**: React hooks rigorously clean up `URL.createObjectURL` references for heavy photo-evidence uploads.
*   **Skeleton Loading States**: Content-shaped placeholders maintain page structure during data fetches.

---

## 👥 Roles & Access Levels

| Role | Access |
|------|--------|
| **Citizen** | Submit, track, verify resolutions, upvote, comment, manage profile, share tracking link |
| **Employee** | View assigned tasks, update status, upload proof, comment (incl. internal notes) |
| **Department Head** | Assign officers within their department, view dept analytics |
| **CM** | Full dashboard, heat map, officer performance, visit logs, audit, AI anomalies |
| **Super Admin** | Everything + user management + department management |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Pure CSS Custom Variables (Light/Dark theming) |
| Charts | Recharts |
| Maps | Leaflet + 4 tile providers (OSM, CartoDB, Esri, OpenTopoMap) |
| Real-time | Socket.IO with authenticated per-user & per-role rooms |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Auth & Security| JWT, bcrypt, express-validator, Rate Limiting, ReDoS protection |
| File Upload | Multer (MIME + extension restricted to JPG/PNG/WEBP) |
| AI / Jobs | node-cron (Anomaly detection, overdue sweeps), Custom NLP |

---

## 🚀 Quick Start

### Prerequisites
Node.js 18+, MongoDB 6+ (local or Atlas)

### Backend
```bash
cd backend
cp .env.example .env   # Edit MONGO_URI and JWT_SECRET
npm install
npm run seed           # Seeds departments, users, and 40 mock complaints
npm run dev            # Runs on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm start              # Runs on http://localhost:3000
```

---

## 🔑 Demo Credentials (Password: `password123`)

| Role | Email |
|------|-------|
| CM | cm@delhi.gov.in |
| Super Admin | admin@delhi.gov.in |
| Dept Head (Roads) | dh.roads@delhi.gov.in |
| Officer | officer1@delhi.gov.in |
| Citizen | citizen1@example.com |

*Tip: After seeding the database, navigate to `/track/GRV-2026-000001` (no login required) to preview the public tracking portal.*

---

## 📡 Core API Reference

### Auth & Users
*   `POST /api/auth/login`, `POST /api/auth/register`
*   `GET /api/users/officers`, `GET /api/users/officer-performance`
*   `POST /api/users` (Admin), `PUT /api/users/:id/toggle-active` (Admin)

### Complaints & AI
*   `POST /api/complaints`
*   `GET /api/complaints`, `GET /api/complaints/stats?days=N`
*   `PUT /api/complaints/:id/status`, `POST /api/complaints/:id/verify`
*   `GET /api/ai/anomalies` (CM/Admin)

### Comments & Public Tracking
*   `GET /api/complaints/:id/comments`, `POST /api/complaints/:id/comments` (Supports `isInternal`)
*   `GET /api/track/:ticketId` (Public, no auth)

### Departments & Visits
*   `GET /api/departments`
*   `POST /api/visits`, `PUT /api/visits/:id/complete`

### Notifications & Audit
*   `GET /api/notifications`, `PUT /api/notifications/:id/read`
*   `GET /api/audit-logs` (Supports `?suspicious=true`)

---

## 📁 Project Structure

```
cm-grievance/
├── backend/
│   ├── config/          # DB config
│   ├── controllers/     # Auth, Complaint, User, Visit, Notification, Comment
│   ├── middleware/      # Auth, ErrorHandler, Upload, Validators
│   ├── models/          # User, Department, Complaint, CMVisit, AuditLog, etc.
│   ├── routes/          # Express Routers
│   ├── services/        # aiClassification, anomalyDetection, mcd311, notification
│   ├── utils/           # Seeder
│   └── server.js        # Entry point
└── frontend/
    └── src/
        ├── components/  # Layout, CommandPalette, CommentsThread, Skeletons
        ├── contexts/    # Auth, Socket, Theme
        ├── hooks/       # useLeaflet
        ├── pages/       # Dashboards, Maps, Submission, Tracking
        ├── services/    # api.js
        └── utils/       # helpers.js
```

---

*Built for India Innovates 2026 | Delhi CM Grievance Initiative*
