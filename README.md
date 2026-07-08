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

## ☁️ Production Deployment Sketch (IaC)

To host this application in a robust, scaleable production environment on AWS, we map out a cloud architecture using **ECS Fargate**, **RDS PostgreSQL**, **S3**, and **CloudFront**:

```mermaid
graph TD
    User[Browser Client] -->|HTTPS| CF[CloudFront CDN]
    CF -->|Static Assets| S3[(S3 Bucket)]
    CF -->|API Traffic /urls| ALB[Application Load Balancer]
    ALB -->|Fargate Tasks| ECS[ECS Service Backend]
    ECS -->|Persistent Connection| RDS[(RDS Aurora Serverless PostgreSQL)]
```

### Architectural Highlights
*   **Static Frontend (S3 + CloudFront)**: Fast, highly cached, and cost-effective delivery of the compiled React files.
*   **Persistent Backend (ECS Fargate)**: FastAPI runs `APScheduler` in a persistent container task. Since Fargate runs continuously, it guarantees the background checking worker never sleeps (avoiding the cold-start limitations of AWS Lambda).
*   **Managed Database (Aurora Serverless PostgreSQL)**: Auto-scaling, managed backups, and secure connection pooling.

### Hypothetical Terraform Sketch

Here is a simplified Terraform configuration sketching out the core service resources:

```hcl
# ── AWS PROVIDER CONFIG ──
provider "aws" {
  region = "us-east-1"
}

# ── DATABASE: managed aurora postgresql ──
resource "aws_rds_cluster" "db" {
  cluster_identifier      = "uptime-monitor-db-cluster"
  engine                  = "aurora-postgresql"
  engine_mode             = "serverless"
  database_name           = "uptimedb"
  master_username         = "dbadmin"
  master_password         = var.db_password
  backup_retention_period = 7
  skip_final_snapshot     = true
}

# ── FRONTEND HOSTING: s3 & cloudfront cdn ──
resource "aws_s3_bucket" "frontend_assets" {
  bucket        = "uptime-monitor-production-frontend"
  force_destroy = true
}

resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = aws_s3_bucket.frontend_assets.bucket_regional_domain_name
    origin_id   = "S3-Frontend"
  }

  enabled             = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-Frontend"

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# ── BACKEND: ecs cluster & fargate service ──
resource "aws_ecs_cluster" "app_cluster" {
  name = "uptime-monitor-cluster"
}

resource "aws_ecs_task_definition" "backend_task" {
  family                   = "uptime-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"

  container_definitions = jsonencode([{
    name      = "backend"
    image     = "${var.ecr_repository_url}:latest"
    essential = true
    portMappings = [{
      containerPort = 8000
      hostPort      = 8000
    }]
    environment = [
      { name = "DATABASE_URL", value = "postgresql+psycopg://dbadmin:${var.db_password}@${aws_rds_cluster.db.endpoint}/uptimedb" }
    ]
  }])
}

resource "aws_ecs_service" "backend_service" {
  name            = "uptime-backend-service"
  cluster         = aws_ecs_cluster.app_cluster.id
  task_definition = aws_ecs_task_definition.backend_task.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    assign_public_ip = true
  }
}
```

---

## 🔮 Future Improvements

1.  **Notification Alerts**: Integrate hooks to notify users via Webhooks, Slack, Discord, or Amazon SNS (SMS/Email) as soon as a site transition from `UP` to `DOWN` is logged.
2.  **Flexible Intervals**: Support custom check frequencies per URL (e.g. ping critical sites every 10s, secondary sites every 5m) instead of a global 60s window.
3.  **Historical Performance Visualization**: Add charting (e.g. Recharts or Chart.js) to view average latency changes and daily/weekly availability percentage scores.
4.  **User Authentication**: Secure endpoints with OAuth2 / JWT tokens so users only monitor and view their own private URL dashboards.
