# Developer Log: Soham & Antigravity (AI) Collaboration Journal

This log serves as a chronological record of the development of the Uptime Monitor application. It captures the real engineering challenges, bugs, debugging cycles, and solutions that arose while pairing to build the service.

---

## 🛠️ The Core Challenges & Debugging Chronicles

### 1. The Windows Event Loop & `asyncpg` SSL Handshake Bug
*   **The Problem:** During the initial setup, we targetted a remote Neon PostgreSQL database over SSL using the `asyncpg` driver. Because this was running on a Windows host with Python 3.10, the default event loop (`SelectorEventLoop`) failed to properly negotiate the SSL/TLS handshake. This caused recurring connection drops and threw `ConnectionResetError: [WinError 10054]`.
*   **The Fix:** We swapped the database driver from `asyncpg` to `psycopg[binary]` (Psycopg 3), which handles SSL handshakes far more reliably on Windows out-of-the-box.

### 2. Neon Connection Pooler & Channel Binding Failures
*   **The Problem:** Neon's connection pooling is powered by PgBouncer. When using the pooled connection string (with `-pooler` in the host), PgBouncer threw errors or hung. The driver was trying to negotiate SCRAM-SHA-256-PLUS channel binding, which PgBouncer does not support.
*   **The Fix:** We modified the connection settings to explicitly disable channel binding (passing `{"channel_binding": "disable"}` to psycopg) and removed the `&channel_binding=require` parameter from the `.env` configuration file to allow PgBouncer to authenticate cleanly.

### 3. Local ISP Firewall Drops (Port 5432)
*   **The Problem:** Even with the pooler configuration fixed, database connection attempts to Neon still timed out entirely on Soham's local network. The local ISP was silently dropping all outgoing TCP traffic on port `5432`. This caused the FastAPI lifespan startup (`init_db`) to hang indefinitely, preventing the API container from listening. In turn, Nginx returned `502 Bad Gateway` and `ERR_CONNECTION_REFUSED` errors to the browser.
*   **The Fix:**
    1.  **Watchdog Timeout**: We wrapped the connection check in a fast `asyncio.wait_for` timeout.
    2.  **SQLite Fallback**: If the Postgres database connection is blocked or times out, the backend logs a warning and dynamically falls back to an offline local SQLite database (`uptime.db`) instead of crashing the app.
    3.  **Local Postgres Container**: We added a local PostgreSQL service (`db`) to `docker-compose.yml` so that we have a local containerized database ready for offline development, giving Soham the option to run Postgres completely locally.

### 4. The Python Module Import Reference Gotcha (Scheduler Freeze)
*   **The Problem:** Even after adding the SQLite fallback, the background scheduler checks continued to hang and crash. Why? In `app/main.py`, the scheduler was started with `scheduler.add_job(run_checks, ..., args=[SessionLocal])`. When `init_db` fell back to SQLite, it reassigned `SessionLocal = async_sessionmaker(...)` globally in `database.py`. However, because `main.py` had already imported `SessionLocal` directly at startup, it was still referencing the cached, frozen Postgres sessionmaker! The scheduler kept trying to connect to Neon in the background, locking up the async event loop and making the entire server unresponsive.
*   **The Fix:** We refactored `SessionLocal` in `app/database.py` into a dynamic callable factory:
    ```python
    _session_maker = async_sessionmaker(engine, expire_on_commit=False)

    def SessionLocal():
        return _session_maker()
    ```
    This ensures that whenever the scheduler or routers call `SessionLocal()`, they always fetch the active sessionmaker instance (whether it's pointing to Postgres or SQLite).

---

## ⚡ Performance Optimizations

To make the app snappier, we implemented the following performance tweaks:
*   **HTTP HEAD Requests**: Instead of fetching the entire HTML page body of a monitored site (which wastes CPU and bandwidth), the worker now uses lightweight `HEAD` requests to verify status codes. If a server doesn't support `HEAD` (returning `405` or `501`), it automatically falls back to a standard `GET`.
*   **Faster Timeout Watchdogs**:
    *   Reduced the database connection timeout limit from `5.0`s to `2.0`s. The app now detects database blocks and switches to SQLite in just 2 seconds.
    *   Reduced the HTTP client connection timeout from `10.0`s to `4.0`s.
    *   Reduced the local shell ping tool timeout from `2.0`s to `1.0`s.

---

## 🤝 Dual-Mode Database Support (Offline & Neon DB Freedom)

One of our main collaboration milestones was designing the stack to accommodate both remote database hosting and completely offline local containerization without requiring configuration rewrites:
*   **The Docker Compose Fallback**: We configured `docker-compose.yml` to automatically spin up a local PostgreSQL database container (`db`).
*   **Dynamic Variable Substitution**: The backend environment defines `DATABASE_URL=${DATABASE_URL:-postgresql+psycopg://postgres:postgres@db:5432/uptime}`.
    *   If a developer wants to use **Neon DB**, they simply define `DATABASE_URL` in `.env`.
    *   If they want to use **local containerized Postgres**, they can comment out `DATABASE_URL` in `.env`, and Docker will seamlessly point the backend to the local `db` service.
*   **The Fail-safe SQLite Fallback**: If the developer chooses to connect to Neon DB, but their local ISP / router blocks port `5432`, the backend watchdog switches to SQLite automatically in 2 seconds so they can still continue working on the app offline without a single container crash.

---

## 💡 Key Lessons Learned

1.  **Platform Discrepancies**: Windows socket event loop handling of SSL/TLS differs from Unix. When building network-heavy apps, using standard client libraries with robust fallback features is crucial.
2.  **Never Hard-Block Lifecycle Events**: Hard-blocking application startup on network calls (like database connections) is risky. Adding graceful timeouts and database failovers keeps services available, even during network degradation.
3.  **Python Reference Bindings**: Directly importing variables that might be reassigned at runtime is a major source of bugs. Wrapping state in callable factories or namespaces avoids caching stale references.
4.  **Keep it Simple & Local**: Nginx reverse proxying inside the frontend container is much cleaner than dealing with local CORS configurations, making the app feel robust and integrated.
