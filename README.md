# Drishti AI 👁️

> Explainable Resume-to-Job Matching & Recruitment Analytics Platform.

---

## 📌 Platform Overview

Drishti AI is an enterprise recruitment analytics and candidate matching platform designed to evaluate candidate-job compatibility with transparency, factor-by-factor attribution, algorithmic fairness auditing, and multi-tenant data isolation.

The platform is structured into decoupled `frontend` and `backend` services:

```text
drishti-ai/
├── backend/                       # Node.js + Express API Service
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js              # Mongoose connector with resilient fallback & safety guards
│   │   │   ├── migration.js       # Tenancy isolation & legacy data quarantine engine
│   │   │   └── seed.js            # Synthetic demo data & admin persona provisioner
│   │   ├── middleware/
│   │   │   └── auth.middleware.js # Multi-tenant resolver, PBKDF2/JWT auth, and RBAC guards
│   │   ├── models/
│   │   │   ├── EvaluationAudit.js # Immutable audit ledger & recruiter override schema
│   │   │   ├── Job.js             # Requisition schema with required/preferred skills
│   │   │   ├── MatchResult.js     # Explainable match evaluation & scoring breakdown
│   │   │   ├── RecruitmentOutcome.js # Candidate hiring pipeline tracking schema
│   │   │   ├── Resume.js          # Candidate profile schema with anonymization flags
│   │   │   └── User.js            # Authenticated user & organization model
│   │   ├── routes/
│   │   │   ├── analytics.routes.js   # Overview, What-If simulator, network graph & IR laboratory
│   │   │   ├── audit.routes.js       # Audit history ledger & recruiter override endpoints
│   │   │   ├── auth.routes.js        # Registration, login, demo sessions & profile me
│   │   │   ├── health.routes.js      # Health check & database telemetry
│   │   │   ├── integration.routes.js # ATS webhook dispatches (SSRF-safe) & Markdown export
│   │   │   ├── job.routes.js         # Job requisition CRUD & tenant-filtered listing
│   │   │   ├── match.routes.js       # Match evaluation, ranking, comparisons & fairness audits
│   │   │   ├── outcome.routes.js     # Hiring outcome pipeline funnel & tier correlation
│   │   │   └── resume.routes.js      # Candidate profile ingestion, PDF/TXT upload & delete
│   │   ├── services/
│   │   │   ├── embedding.service.js  # TF-IDF vectorizer & cosine similarity engine
│   │   │   ├── evaluation.service.js # Information retrieval benchmark laboratory (NDCG, MRR)
│   │   │   ├── evidence.service.js   # Trace extraction & citation dossier builder
│   │   │   ├── fairness.service.js   # EEOC 4/5ths disparate impact & regulatory reporting
│   │   │   ├── matcher.service.js    # Core multi-factor matching, synonyms & affinity scoring
│   │   │   ├── network.service.js    # Skill ontology relationship graph generator
│   │   │   ├── parser.service.js     # PDF/TXT extraction, regex tokenizer & PII masking
│   │   │   └── simulator.service.js  # Interactive What-If weight dynamic recalibration
│   │   ├── app.js                 # Express application configuration & security headers
│   │   └── server.js              # Server entry point & graceful shutdown
│   ├── production-security-audit.mjs # Live production security & cross-tenant audit suite
│   ├── security-test-suite.mjs    # Local automated RBAC & security test suite
│   ├── tenant-isolation-test-suite.mjs # Local multi-tenant isolation & IDOR verification suite
│   ├── test-suite.mjs             # Core matching, parsing & algorithmic unit tests
│   └── package.json
│
├── frontend/                      # React 19 + Vite 8 + Tailwind CSS Client
│   ├── src/
│   │   ├── components/            # MatchStudio, Leaderboard, Compare, AnalyticsLab, etc.
│   │   ├── App.jsx                # Responsive dashboard, navigation & modal controllers
│   │   ├── index.css              # Custom styling & design tokens
│   │   └── main.jsx               # React DOM entry
│   ├── vite.config.js             # Vite configuration with Tailwind CSS & /api proxy
│   └── package.json
│
├── .gitignore                     # Gitignore protecting secrets, dependencies & artifacts
└── README.md                      # Platform documentation
```

---

## 🛡️ Multi-Tenant Architecture & Data Isolation

Drishti AI enforces strict tenant data boundaries while preserving open, read-only demo access for prospective users and evaluators:

### 1. Data Scopes
- **Private Workspaces**: Every registered user (`/api/auth/register`, `/api/auth/login`) operates in an isolated workspace. All created candidate profiles, job requisitions, match evaluations, pipeline stages, and audit entries are tagged with the user's verified server-side `ownerId`.
- **Public Demo Scope**: Unauthenticated visitors or users exploring demo personas access only deliberate synthetic demo records (`isDemo: true, quarantined: false`).
- **Quarantine Zone**: Legacy or unowned records whose ownership cannot be proven are placed into quarantine (`quarantined: true`). Quarantined records are unreachable by both public demo visitors and private users.

### 2. Security Guarantees
- **Server-Side Identity Derivation**: User identity is derived strictly from HMAC SHA-256 signed JWT tokens verified on the server. Client-supplied IDs, query parameters, or persona selectors in payloads are completely ignored.
- **In-Depth IDOR Protection**: Cross-tenant requests (e.g., User B attempting to view, update, delete, or run comparisons referencing User A's candidate or job ID) fail with a uniform `404 Not Found` response, eliminating information leakage.
- **Demo Immutability**: All write, mutate, seed, or delete endpoints enforce `requirePrivateWorkspace` and reject demo tokens with `403 Forbidden` or anonymous requests with `401 Unauthorized`.
- **Administrative Protection**: Demo sessions are prohibited from gaining administrative privileges. Database seed operations (`/api/seed`) require verified administrator credentials and reject browser `GET` requests with `405 Method Not Allowed`.
- **SSRF Prevention**: The webhook dispatch integration validates destination URLs, rejecting localhost, private IP ranges (10.x, 172.16-31.x, 192.168.x, 127.x), and cloud metadata services (`169.254.169.254`, `metadata.google.internal`).

---

## 🗄️ Database Architecture & Safety Controls

Drishti AI employs a dual-mode database strategy designed for rapid local onboarding and strict production safety:

### 1. Local Development (`NODE_ENV=development`)
- **Configured MongoDB (Default)**: Connects to the database specified in `backend/.env`.
- **Ephemeral In-Memory Fallback (`mongodb-memory-server`)**: If the remote cluster is unreachable or lacks credentials, an ephemeral in-memory MongoDB instance starts automatically for local prototyping.

### 2. Production Environment (`NODE_ENV=production`)
- **Zero Ephemeral Substitution**: In-memory database fallback is strictly disabled.
- **Fail-Fast Policy**: If the cloud MongoDB instance fails or credentials reject, the server halts with a clear error. It will never substitute temporary memory storage for persistent data.

---

## 🔬 Core Algorithms & Features

- **Multi-Factor Explainable Scoring**:
  - **Mandatory Skills (60% default)**: Exact keyword matching, canonical synonym resolution (`K8s` ↔ `Kubernetes`, `Postgres` ↔ `PostgreSQL`), and domain family affinity transfer (`Docker` → `Kubernetes` at 65% credit).
  - **Career Tenure Alignment (20% default)**: Evaluates documented years of experience against minimum role requirements.
  - **Semantic Vector Cosine (15% default)**: TF-IDF vectorizer computing cosine overlap ($0.0 - 1.0$) between candidate qualifications and job description texts.
  - **Preferred Skills Bonus (5% default)**: Non-mandatory positive credit for complementary domain skills.
- **EEOC 4/5ths Disparate Impact Engine**: Continuous statistical analysis evaluating adverse impact across cohorts in compliance with EEOC Title VII Uniform Guidelines and NYC Local Law 144.
- **Interactive What-If Hiring Simulator**: Real-time recalculation of candidate rankings and qualification shifts under custom weight distributions.
- **Skill Ontology Relationship Graph**: Force-directed network analysis visualising core skills, related clusters, and domain prerequisites.
- **Model Evaluation Laboratory**: IR benchmarking metrics evaluating ranking precision, recall, NDCG, and MRR.
- **Candidate Pipeline Funnel**: Tracking applicant progression (`pending` → `shortlisted` → `interviewed` → `hired`/`rejected`) with fit tier correlation analysis.
- **Immutable Audit Ledger & Recruiter Overrides**: Cryptographically identified evaluation records (`EVAL-...`) with authorized recruiter override logging.
- **Enterprise ATS Webhook Dispatch**: SSRF-hardened dispatch simulation to Greenhouse, Lever, and Workday with Markdown/JSON export options.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0 or later (v22+ recommended)
- **npm**: v9.0.0 or later
- **MongoDB**: MongoDB Atlas connection string or local MongoDB instance

---

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Configure PORT, NODE_ENV, MONGODB_URI, and JWT_SECRET in .env
npm run dev
```

The backend starts at `http://localhost:5000`.

---

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend development server starts at `http://localhost:3000` (or `http://localhost:5173`).

To compile the production build:
```bash
npm run build
```

---

## 🧪 Testing Suites & Verification

Drishti AI features comprehensive test coverage spanning unit algorithms, security controls, and multi-tenant isolation:

### Run All Backend Tests (68 Tests)
```bash
cd backend
npm test
```

### Run Individual Test Suites
- **Unit & Algorithmic Suite (30 tests)**:
  ```bash
  npm run test:unit
  ```
- **Security & RBAC Suite (26 tests)**:
  ```bash
  npm run test:security
  ```
- **Multi-Tenant Isolation & IDOR Suite (12 tests)**:
  ```bash
  npm run test:tenant
  ```

### Frontend Code Quality
```bash
cd frontend
npm run lint
npm run build
```

### Live Production Security Audit (53 Assertions)
To run live end-to-end security verification against the production service:
```bash
node backend/production-security-audit.mjs
```
The audit exercises:
- Public demo isolation and anonymous immutability.
- Dual-tenant provisioning and candidate/job creation.
- Cross-tenant IDOR read, list, update, and deletion rejections (HTTP 404).
- Cross-tenant match, comparison, ranking, and simulation injection prevention.
- Analytics pool boundaries and pipeline outcome isolation.
- Recruiter override and webhook export isolation.
- Automatic teardown and cleanup of ephemeral test records.

---

## 🔒 Security & Deployment Hygiene

- **Secret Protection**: All JWT secrets and MongoDB connection strings remain strictly in environment variables. No credentials exist in client bundles or public repositories.
- **Security Headers**: Standard production headers applied across all routes (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`).
- **Cache Invalidation**: All sensitive `/api` endpoints issue `Cache-Control: no-store, no-cache, must-revalidate, private` to prevent intermediate caching.
