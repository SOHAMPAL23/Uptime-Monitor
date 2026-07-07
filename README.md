# Uptime Monitor

A simple, modular, and containerized uptime monitoring application built with **FastAPI**, **React (Vite)**, and **PostgreSQL**. The application automatically schedules and runs concurrent health checks on registered URLs every 60 seconds, recording HTTP response times, status codes, and server availability states.

---

## Architecture Overview

```mermaid
graph TD
    User[Web Browser] -->|Port 5173| Frontend[React + Vite + Nginx]
    Frontend -->|HTTP Proxy /urls /health-checks| Backend[FastAPI + APScheduler]
    Backend -->|Async pings| ExtServices[External URLs / APIs]
    Backend -->|psycopg async| DB[(PostgreSQL)]
```

- **Frontend**: A React application styled with Tailwind CSS, served using Nginx. Nginx acts as a reverse proxy, routing API requests to the backend container to bypass CORS issues.
- **Backend**: A FastAPI REST API running an internal async background job scheduler using `APScheduler`.
- **Database**: PostgreSQL storing monitored targets and historical check results.
- **Worker/Pinger**: Inside the FastAPI lifespan, a background worker uses `httpx.AsyncClient` to asynchronously ping active targets concurrently.

---

## Folder Structure

```
uptime-monitor/
├── app/
│   ├── config.py          # Settings and environment variables via Pydantic
│   ├── database.py        # SQLAlchemy async engine, session, and table creation
│   ├── main.py            # FastAPI entry point & lifespan (starts scheduler)
│   ├── models.py          # SQLAlchemy Declarative models (MonitoredURL, HealthCheck)
│   ├── routers.py         # REST API route handlers
│   ├── schemas.py         # Pydantic validation & response schemas
│   └── services.py        # Business logic, URL CRUD, and pinger/scheduler worker
├── frontend/
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
├── Dockerfile             # FastAPI backend image instructions
├── docker-compose.yml     # Multi-container local orchestration manifest
├── requirements.txt       # Backend dependencies (pinned for psycopg & FastAPI)
└── .env.example           # Reference configuration variables
```

---

## Setup & Running the Stack

### Option A: Local Containerization (Recommended)

To spin up the database, backend service, and frontend client in a fully integrated stack:

1. Ensure **Docker** and **Docker Compose** are installed and running.
2. Run the following command in the project root:
   ```bash
   docker compose up --build
   ```
3. Once the build finishes and the healthchecks pass, access the resources at:
   - **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
   - **FastAPI OpenAPI Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **PostgreSQL**: `localhost:5432`

---

### Option B: Local Manual Development

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

## API Endpoints

| Method | Path | Request Body | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/urls` | `{ "name": "Google", "url": "https://google.com" }` | Registers a new URL to monitor. |
| **GET** | `/urls` | *None* | Lists all monitored URLs. |
| **DELETE** | `/urls/{id}` | *None* | Removes a monitored URL and cascades delete health records. |
| **GET** | `/urls/{id}/health` | *None* (Optional `limit` query) | Fetches historical health checks for a specific URL. |
| **GET** | `/health-checks` | *None* (Optional `limit` query) | Fetches the latest global checks across all sites. |

---

## Testing & Verifying States

### How to Verify UP and DOWN States

1. **Verify UP State**:
   - Register a reliable site, such as `https://httpstat.us/200` or `https://google.com`.
   - Wait up to 60 seconds for the scheduler tick.
   - The status badge will update to **UP** (emerald green), displaying the round-trip latency in milliseconds.

2. **Verify DOWN State**:
   - Register an endpoint configured to fail, such as `https://httpstat.us/500`, a bad domain like `https://doesnotexist.example`, or trigger a timeout with `https://httpstat.us/200?sleep=12000`.
   - The scheduler catches timeouts (exceeding 10s) and network connection exceptions gracefully.
   - The status badge will display **DOWN** (red) without disrupting checks on other URLs.



1. **Frontend Hosting**:
   - Build frontend assets locally or via CI/CD (`npm run build`).
   - Sync the output `dist/` directory to an **Amazon S3** bucket configured for static web hosting.
   - Serve static resources globally using **Amazon CloudFront** to optimize performance, manage SSL certificates (via ACM), and secure header policies.

2. **Backend API & Worker**:
   - Containerize the application and push to **AWS Elastic Container Registry (ECR)**.
   - Run the API tasks in an **AWS ECS Fargate** cluster hidden behind an **Application Load Balancer (ALB)**.
   - Route traffic from CloudFront `/urls` and `/health-checks` paths to the ALB target group.

3. **Database**:
   - Use **Amazon RDS PostgreSQL** or **Aurora Serverless v2** in a private subnet, accepting traffic only from the ECS task security group.

---

## Future Improvements

1. **Notification Alerts**: Integrate hooks to notify users via Webhooks, Slack, Discord, or Amazon SNS (SMS/Email) as soon as a site transition from `UP` to `DOWN` is logged.
2. **Flexible Intervals**: Support custom check frequencies per URL (e.g. ping critical sites every 10s, secondary sites every 5m) instead of a global 60s window.
3. **Historical Performance Visualization**: Add charting (e.g. Recharts or Chart.js) to view average latency changes and daily/weekly availability percentage scores.
4. **User Authentication**: Secure endpoints with OAuth2 / JWT tokens so users only monitor and view their own private URL dashboards.
