# Continuous KYC Autonomous Auditor

A continuous, autonomous KYC monitoring and audit platform, built for a 45-hour hackathon.

This repository is the **base repository** every developer clones. It is a working, compiling skeleton with no business logic, no agent implementations, and no real API behavior — every endpoint returns a dummy response and every page renders placeholder UI. The goal is that four people can `git clone`, run one setup command each for backend and frontend, and start building their own piece without touching shared scaffolding.

See `docs/` for the architecture design (added separately from this scaffold).

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | React + TypeScript + Vite + TailwindCSS + shadcn/ui + React Router + TanStack Query |
| Backend | FastAPI + SQLAlchemy + PostgreSQL + Pydantic + Alembic |
| AI | Gemini / OpenRouter (SDKs installed, not wired to any logic yet) |
| Scheduler | APScheduler (initialized, no jobs registered yet) |
| Vector Search | FAISS (dependency installed, not wired to any logic yet) |

## Folder Structure

```
continuous-kyc-autonomous-auditor/
├── backend/
│   ├── app/
│   │   ├── agents/        # autonomous agent graph nodes (empty — future phase)
│   │   ├── routes/        # FastAPI routers, one file per domain area
│   │   ├── services/      # business logic layer (empty — future phase)
│   │   ├── schemas/       # Pydantic request/response models
│   │   ├── database/      # SQLAlchemy engine/session/declarative base
│   │   ├── models/        # SQLAlchemy ORM models (13 tables)
│   │   ├── orchestrator/  # APScheduler lifecycle (no jobs yet)
│   │   ├── config/        # Settings (env-driven)
│   │   ├── utils/         # shared helpers (empty — future phase)
│   │   ├── middleware/    # request logging middleware
│   │   ├── core/          # logging setup
│   │   └── main.py        # FastAPI app factory
│   ├── alembic/           # migrations
│   ├── tests/
│   ├── requirements.txt
│   └── pyproject.toml
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/    # shared components + shadcn/ui primitives
│       ├── pages/         # one component per route
│       ├── layouts/       # MainLayout (navbar + outlet)
│       ├── services/      # API client + TanStack Query client
│       ├── hooks/         # shared hooks
│       ├── types/         # TS interfaces mirroring backend models
│       ├── assets/
│       └── utils/         # cn() helper, etc.
├── datasets/processed/    # local data artifacts (gitignored contents)
├── scripts/                # one-off scripts (empty — future phase)
├── docs/                   # architecture and design docs
├── .github/workflows/      # CI
├── docker-compose.yml
└── .env.example
```

## Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 16 (or use `docker-compose up postgres`)

### 1. Environment variables

```bash
cp .env.example .env
```

Fill in `GEMINI_API_KEY` / `OPENROUTER_API_KEY` when you actually need them — the app runs without them.

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt

# with Postgres running and DATABASE_URL set in .env:
alembic upgrade head

uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`. Health check: `GET /api/v1/health`. Interactive docs: `http://localhost:8000/docs`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

### 4. Everything via Docker Compose

```bash
docker-compose up --build
```

Starts Postgres, backend (`:8000`), and frontend (`:5173`) together.

## Development Workflow

- Each backend route file (`auth`, `dashboard`, `companies`, `monitor`, `reports`, `review`, `audit`) and each frontend page are independent — you can build one without waiting on another.
- Business logic goes in `backend/app/services/`, never directly in `routes/`.
- Agent implementations go in `backend/app/agents/`, wired together later in `backend/app/orchestrator/`.
- New DB tables/columns: edit the model in `backend/app/models/`, then `alembic revision --autogenerate -m "..."` and `alembic upgrade head`.
- New frontend types: keep `frontend/src/types/models.ts` in sync with `backend/app/models/` by hand.
- Run `ruff check app tests` + `black app tests` (backend) and `npm run lint` + `npm run format` (frontend) before pushing.

## Branch Strategy

- `main` — always deployable/demoable. Protected.
- `develop` — integration branch for the hackathon window.
- `feat/<area>-<short-desc>` — one branch per person per feature (e.g. `feat/agents-sanctions-screening`, `feat/frontend-dashboard`).
- Open a PR into `develop`, merge once CI is green. Merge `develop` into `main` at each demo-ready checkpoint.
- Rebase on `develop` before opening a PR to avoid last-minute conflicts.

## Commands Reference

| Command | Where | What |
|---|---|---|
| `uvicorn app.main:app --reload` | `backend/` | Run API with hot reload |
| `pytest -q` | `backend/` | Run backend tests |
| `ruff check app tests` | `backend/` | Lint backend |
| `black app tests` | `backend/` | Format backend |
| `alembic revision --autogenerate -m "msg"` | `backend/` | Generate a migration |
| `alembic upgrade head` | `backend/` | Apply migrations |
| `npm run dev` | `frontend/` | Run frontend dev server |
| `npm run build` | `frontend/` | Type-check + production build |
| `npm run lint` | `frontend/` | Lint frontend |
| `npm run format` | `frontend/` | Format frontend |
| `docker-compose up --build` | repo root | Run the full stack |
