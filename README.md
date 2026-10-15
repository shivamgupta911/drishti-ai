# Drishti AI 👁️

> Explainable Resume-to-Job Matching Platform.

---

## 📌 Platform Overview

Drishti AI is an explainable resume-to-job matching platform designed to evaluate candidate-opportunity compatibility with transparency, factor-by-factor attribution, and bias mitigation.

The project is structured into cleanly decoupled `frontend` and `backend` services:

```text
drishti-ai/
├── backend/                  # Node.js + Express API Service
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js         # Resilient Mongoose connector & production safety guards
│   │   ├── routes/
│   │   │   └── health.routes.js # GET /api/health endpoint
│   │   ├── app.js            # Express app configuration & middleware
│   │   └── server.js         # Server entry point & graceful shutdown
│   ├── .env.example          # Environment template
│   ├── .env                  # Local secret configuration (git-ignored)
│   ├── .gitignore            # Backend gitignore
│   └── package.json
│
├── frontend/                 # React 19 + Vite 8 + Tailwind CSS Client
│   ├── src/
│   │   ├── App.jsx           # Dashboard with real-time health telemetry
│   │   ├── index.css         # Tailwind CSS styling
│   │   └── main.jsx          # React DOM entry
│   ├── .env.example          # Frontend environment template
│   ├── .gitignore            # Frontend gitignore
│   ├── vite.config.js        # Vite + Tailwind plugin & /api proxy
│   └── package.json
│
├── .gitignore                # Root gitignore (protects all .env files and node_modules)
├── .env.example              # Full project environment template
└── README.md                 # Project documentation
```

---

## 🗄️ Database Architecture & Safety Controls

Drishti AI employs a multi-tiered database strategy designed for frictionless local onboarding and strict production safety:

### 1. Local Development Mode (`NODE_ENV=development`)
- **Configured MongoDB (Default)**: Attempts connection to the URI configured in `backend/.env` (such as MongoDB Atlas or a local `mongod` service).
- **In-Memory Fallback (`mongodb-memory-server`)**: If the configured remote cluster is unreachable or rejects credentials (e.g., during offline development or prior to Atlas user provisioning), the backend automatically initializes an in-memory MongoDB instance.
- ⚠️ **Ephemeral Nature**: The in-memory database runs entirely in volatile RAM. All documents, collections, and indexes will **reset when the server restarts**. It is intended strictly for rapid UI testing and local API verification without external cloud blockers.

### 2. Production Environment (`NODE_ENV=production`)
- 🛡️ **Zero Ephemeral Substitution**: The in-memory database is **strictly disabled** in production mode.
- 🚫 **Fail-Fast Policy**: If the production MongoDB cluster cannot connect or rejects authentication, the server logs a fatal error and reports `database.connected: false` and `database.status: "disconnected"`. It will **never** silently substitute in-memory storage for production data.

---

## ☁️ MongoDB Atlas Configuration Guide

To connect persistent cloud storage via MongoDB Atlas:

1. **Create a Database User**:
   - In MongoDB Atlas Console, go to **Security** → **Database Access**.
   - Click **Add New Database User**.
   - Select **Password (SCRAM)** authentication.
   - Assign database privileges (e.g. `readWriteAnyDatabase` or `Built-in: readWrite` on `drishti_ai`).
   - Click **Add User** (allow ~30 seconds for Atlas to propagate the credentials).

2. **Configure Network Access**:
   - In Atlas, go to **Security** → **Network Access**.
   - Click **Add IP Address** and add your current public IP address (or `0.0.0.0/0` for development).

3. **Set Environment Variable**:
   - Open `backend/.env` (which is git-ignored and never committed):
     ```env
     PORT=5000
     NODE_ENV=development
     MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/drishti_ai?retryWrites=true&w=majority
     ```
   - *Note*: If your password contains special characters (such as `@`, `:`, `/`, `#`), ensure they are percent-encoded (e.g., `@` becomes `%40`).

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0 or later (v24+ verified)
- **npm**: v9.0.0 or later
- **MongoDB**: MongoDB Atlas URI or automatic local in-memory fallback

---

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

4. Start the backend development server:
   ```bash
   npm run dev
   # or npm start
   ```
   The backend service starts at `http://localhost:5000`.

5. Verify the health-check endpoint:
   ```bash
   curl http://localhost:5000/api/health
   ```
   Example response (local in-memory development):
   ```json
   {
     "status": "ok",
     "service": "drishti-ai-backend",
     "version": "0.1.0",
     "environment": "development",
     "timestamp": "2026-10-14T...",
     "uptimeSeconds": 15,
     "database": {
       "status": "connected",
       "connected": true,
       "type": "in-memory (local-development-only)",
       "isInMemory": true,
       "note": "Ephemeral in-memory database active for local development. Data resets on restart."
     }
   }
   ```

---

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Access the UI at `http://localhost:3000`.

4. Build for production:
   ```bash
   npm run build
   ```

---

## 🔒 Security & Git Hygiene

- **Isolated Credentials**: All database connection strings and sensitive credentials remain strictly in `backend/.env`.
- **Zero Client Leakage**: No database URIs, API keys, or private secrets are imported or exposed in client bundles.
- **Git Ignored**: `.env` and `.env.*` files are explicitly excluded via root, backend, and frontend `.gitignore` rules.
- **Pre-Push Guarantee**: No `.env` files or secret values are staged or tracked in Git.

---

## 🗺️ Project Progression & Roadmap

- [x] **Day 1**: Local Engineering Foundation (Express + Mongoose + React 19 + Tailwind, dual-tier resilient DB, health checks, git hygiene)
- [x] **Day 2**: Core Data Models (Resume, Job, MatchResult), Extraction Parser, Explainable Matching Engine, and Ingestion APIs
- [x] **Day 3**: Semantic Skill Synonym Resolution (e.g. K8s ↔ Kubernetes), Domain Affinity Transfer, Batch Leaderboard Ranking, Pairwise Candidate Comparison, and Compliance Audit Dossier Export
- [ ] **Phase 4**: Production JWT Authentication & Role-Based Access Control (Recruiter, Hiring Manager, Candidate)
- [ ] **Phase 5**: Deep Vector Embedding Integration & Enterprise HRIS Webhooks (Greenhouse, Lever)

---

## 🔬 Day 3 Semantic & Explainability Features

- **Semantic Synonym Mapping**: Normalizes canonical terms (e.g., `K8s` -> `Kubernetes`, `Postgres` -> `PostgreSQL`, `TS` -> `TypeScript`) with 100% credit and transparent attribution.
- **Domain Affinity Transfer**: Grants partial credit for adjacent skills in the same family (e.g., `Docker` -> `Kubernetes` [Container Ecosystem, 65% credit]; `MySQL` -> `PostgreSQL` [Relational DB, 75% credit]).
- **Batch Leaderboard (`GET /api/matches/rank/:jobId`)**: Ranks all candidate profiles against a selected job description with cohort averages and tier classifications.
- **Pairwise Comparison (`POST /api/matches/compare`)**: Side-by-side comparison of two candidates explaining why one candidate outranks another.
- **Fairness & Compliance Dossier (`GET /api/matches/:id/report`)**: Exportable certification confirming demographic signals were masked and scoring was based strictly on demonstrable qualifications.
