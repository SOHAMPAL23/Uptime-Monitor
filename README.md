<div align="center">
  <h1> Uptime Monitor</h1>
  <p><em>A simple, modular, and containerized uptime monitoring application</em></p>

  [![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
  [![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
  [![PostgreSQL](https://img.shields.io/badge/postgresql-4169e1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
  [![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
</div>

---

## 📖 Overview
The application automatically schedules and runs concurrent health checks on registered URLs every 60 seconds, recording HTTP response times, status codes, and server availability states.

---

## 🏛️ Architecture Overview

```mermaid
graph TD
    User[Web Browser] -->|Port 5173| Frontend[React + Vite + Nginx]
    Frontend -->|HTTP Proxy /urls /health-checks| Backend[FastAPI + APScheduler]
    Backend -->|Async pings| ExtServices[External URLs / APIs]
    Backend -->|psycopg async| DB[(PostgreSQL)]
```

-  **Frontend**: A React application styled with Tailwind CSS, served using Nginx. Nginx acts as a reverse proxy, routing API requests to the backend container to bypass CORS issues.
-  **Backend**: A FastAPI REST API running an internal async background job scheduler using `APScheduler`.
-  **Database**: PostgreSQL storing monitored targets and historical check results.
-  **Worker/Pinger**: Inside the FastAPI lifespan, a background worker uses `httpx.AsyncClient` to asynchronously ping active targets concurrently.

---

##  Folder Structure

```text
uptime-monitor/
├── app/                   #  FastAPI Backend Core
│   ├── config.py          # Settings and environment variables via Pydantic
│   ├── database.py        # SQLAlchemy async engine, session, and table creation
│   ├── main.py            # FastAPI entry point & lifespan (starts scheduler)
│   ├── models.py          # SQLAlchemy Declarative models (MonitoredURL, HealthCheck)
│   ├── routers.py         # REST API route handlers
│   ├── schemas.py         # Pydantic validation & response schemas
│   └── services.py        # Business logic, URL CRUD, and pinger/scheduler worker
├── frontend/              #  React UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── AddURLForm.jsx  # Input form to register new URLs
│   │   │   └── URLTable.jsx    # Table displaying statuses and response times
│   │   ├── App.jsx        # Core view, state aggregation, and 10s auto-refresh
│   │   ├── index.css      # Custom styles and Tailwind directives
│   │   └── main.jsx       # React entry mount
│   ├── Dockerfile         # Multi-stage production Nginx wrapper build
│   ├── nginx.conf         # Router configuration & API reverse proxy
│   ├── package.json       # Node package manager configurations
│   └── tailwind.config.js # Styling configurations
├── Dockerfile             #  FastAPI backend image instructions
├── docker-compose.yml     #  Multi-container local orchestration manifest
├── requirements.txt       #  Backend dependencies (pinned for psycopg & FastAPI)
└── .env.example           #  Reference configuration variables
```

---

## 🚀 Setup & Running the Stack

### 🗄️ Database Choices & Configurations
The application supports three database setups. You can easily switch between them by configuring the `DATABASE_URL` in your `.env` file:

1. **Local PostgreSQL Container (Offline Dev)**:
   * **In Docker (Option A)**: If you run Docker Compose, it automatically spins up a local database container (`db`). If `DATABASE_URL` is empty, commented out, or not set in your `.env` file, the backend container will automatically connect to this local container.
   * **Directly on Host (Option B)**: If you run the API manually, set `DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/uptime` in `.env` to connect to the active Docker container DB.
2. **Neon DB (Production / Cloud)**:
   * Set `DATABASE_URL` in your `.env` to your remote Neon connection string. Both your local runner and container will connect directly to Neon.
3. **Graceful SQLite Fallback**:
   * If you configure Neon DB, but your local network or firewall blocks port `5432` (a common issue on some home routers/ISPs), the backend watchdog will detect the block and **automatically fall back to a local SQLite database (`uptime.db`) within 2 seconds**. The app will never crash on boot!

---

### Option A: Local Containerization (Recommended) 

To spin up the database, backend service, and frontend client in a fully integrated stack:

1. Ensure **Docker** and **Docker Compose** are installed and running.
2. Run the following command in the project root:
   ```bash
   docker compose up --build
   ```
3. Once the build finishes and the healthchecks pass, access the resources at:
   -  **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
   -  **FastAPI OpenAPI Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
   -  **PostgreSQL**: `localhost:5432`

---

### Option B: Local Manual Development 🛠️

#### 1. Setup Backend
1. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Configure environment variables. Copy `.env.example` to `.env` and fill in your connection string (e.g. Neon DB or local Postgres):
   ```env
   DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/uptimedb
   ```
4. Run the API server:
   ```bash
   uvicorn app.main:app --reload
   ```

#### 2. Setup Frontend
1. Navigate to the directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Launch the development server:
   ```bash
   npm run dev
   ```

---

## 🔌 API Endpoints

| Method | Path | Request Body | Description |
| :--- | :--- | :--- | :--- |
|  **POST** | `/urls` | `{ "name": "Google", "url": "https://google.com" }` | Registers a new URL to monitor. |
|  **GET** | `/urls` | *None* | Lists all monitored URLs. |
|  **DELETE** | `/urls/{id}` | *None* | Removes a monitored URL and cascades delete health records. |
|  **GET** | `/urls/{id}/health` | *None* (Optional `limit` query) | Fetches historical health checks for a specific URL. |
|  **GET** | `/health-checks` | *None* (Optional `limit` query) | Fetches the latest global checks across all sites. |

---

## 🧪 Testing & Verifying States

### How to Verify UP and DOWN States

To instantly verify the core logic of the application locally, follow these exact steps:

1. **Verify UP State**:
   - Open the dashboard at `http://localhost:5173`.
   - In the "Register Endpoint" form, add a healthy URL: `https://example.com`.
   - Wait for the scheduler tick (within 10-60 seconds depending on cycle).
   - The status badge will update to **Operational** (UP) in emerald green, displaying the round-trip latency.

2. **Verify DOWN State**:
   - In the form, register an unreachable or invalid domain, such as `https://this-is-a-fake-unreachable-domain.local` or `https://httpstat.us/500`.
   - Wait for the scheduler tick. The background pinger catches the connection error or timeout gracefully.
   - The status badge will update to **Down** in red, without disrupting the checks on your healthy URLs.

---
---

## ☁️ Production Deployment Sketch (Vercel & Render)

To host this application in a robust production environment without AWS complexity, we map out a cloud architecture using **Vercel** (for the React frontend) and **Render** (for the FastAPI backend & DB layer):

```mermaid
graph TD
    User[Browser Client] -->|HTTPS Requests| Vercel[Vercel Edge Network]
    Vercel -->|Proxied API Requests /urls| RenderAPI[Render Web Service Backend]
    RenderAPI -->|APScheduler Worker Pings| Ext[External URLs]
    RenderAPI -->|SSL Connection| Neon[(Neon DB / Render PostgreSQL)]
```

### Architectural Highlights
*   **Frontend (Vercel)**: Vercel compiles the React dashboard and hosts it on their global edge network. To bypass CORS issue natively, we can define a rewrite proxy in `vercel.json`.
*   **Backend (Render)**: FastAPI runs a continuous background worker (`APScheduler`). Render's **Web Service** environment allows persistent background processes (unlike serverless functions which spin down and pause background pings).
*   **Database (Neon / Render Postgres)**: Fully managed, serverless PostgreSQL with connection pooling.

---

### Hypothetical IaC Specs

#### 1. Backend: Render Blueprint (`render.yaml`)
Render allows declaring infrastructure using a `render.yaml` file. Here is how we configure the backend service and database cluster programmatically:

```yaml
# ── RENDER BLUEPRINT CONFIG ──
services:
  # FastAPI web service
  - type: web
    name: uptime-monitor-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DATABASE_URL
        sync: false # Set this to your Neon DB connection string or local database
      - key: PYTHON_VERSION
        value: 3.12.0

databases:
  # Managed Postgres database (in case you want it hosted directly on Render)
  - name: uptimedb
    databaseName: uptime
    user: postgres
    plan: free # Can be upgraded to 'starter' for persistent disk
```

#### 2. Frontend: Vercel Config (`vercel.json`)
Vercel allows configuring edge behaviors using `vercel.json`. Here is how we map rewrites to proxy `/urls` API requests directly to Render, bypassing CORS cleanly:

```json
{
  "version": 2,
  "rewrites": [
    {
      "source": "/urls",
      "destination": "https://uptime-monitor-backend.onrender.com/urls"
    },
    {
      "source": "/urls/:path*",
      "destination": "https://uptime-monitor-backend.onrender.com/urls/:path*"
    },
    {
      "source": "/health-checks",
      "destination": "https://uptime-monitor-backend.onrender.com/health-checks"
    }
  ]
}
```

## 🔮 Future Improvements

1.  **Notification Alerts**: Integrate hooks to notify users via Webhooks, Slack, Discord, or Amazon SNS (SMS/Email) as soon as a site transition from `UP` to `DOWN` is logged.
2.  **Flexible Intervals**: Support custom check frequencies per URL (e.g. ping critical sites every 10s, secondary sites every 5m) instead of a global 60s window.
3.  **Historical Performance Visualization**: Add charting (e.g. Recharts or Chart.js) to view average latency changes and daily/weekly availability percentage scores.
4.  **User Authentication**: Secure endpoints with OAuth2 / JWT tokens so users only monitor and view their own private URL dashboards.
