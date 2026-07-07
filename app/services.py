import asyncio
import logging
import sys
import time
from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import HealthCheck, MonitoredURL

log = logging.getLogger(__name__)


# ── URL CRUD ──────────────────────────────────────────────────────────────────

async def add_url(db: AsyncSession, name: str, url: str) -> MonitoredURL:
    entry = MonitoredURL(name=name, url=url)
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry

async def list_urls(db: AsyncSession) -> list[MonitoredURL]:
    result = await db.execute(select(MonitoredURL))
    return list(result.scalars().all())

async def delete_url(db: AsyncSession, url_id: str) -> bool:
    entry = await db.get(MonitoredURL, url_id)
    if not entry:
        return False
    await db.delete(entry)
    await db.commit()
    return True


# ── Health-check queries ──────────────────────────────────────────────────────

async def get_health_checks(db: AsyncSession, url_id: str, limit: int = 20) -> list[HealthCheck]:
    result = await db.execute(
        select(HealthCheck)
        .where(HealthCheck.url_id == url_id)
        .order_by(HealthCheck.checked_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())

async def get_all_latest_checks(db: AsyncSession, limit: int = 50) -> list[HealthCheck]:
    result = await db.execute(
        select(HealthCheck).order_by(HealthCheck.checked_at.desc()).limit(limit)
    )
    return list(result.scalars().all())


# ── Ping logic ────────────────────────────────────────────────────────────────

async def _ping_icmp(target_url: str) -> tuple[int | None, float | None, bool]:
    """Perform an ICMP ping."""
    start = time.monotonic()
    try:
        if sys.platform == "win32":
            ping_cmd = ["ping", "-n", "1", "-w", "2000", target_url]
        else:
            ping_cmd = ["ping", "-c", "1", "-W", "2", target_url]

        proc = await asyncio.create_subprocess_exec(
            *ping_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        await proc.communicate()
        
        elapsed = time.monotonic() - start
        response_time_ms = round(elapsed * 1000, 2)
        
        if proc.returncode == 0:
            log.info("✅ PING %s  time=%sms", target_url, response_time_ms)
            return 200, response_time_ms, True
        else:
            log.warning("🔌 PING failed  url=%s", target_url)
            return None, response_time_ms, False
            
    except Exception as exc:
        log.error("❌ PING Unexpected error  url=%s  exc=%r", target_url, exc)
        return None, None, False

async def _ping_http(client: httpx.AsyncClient, target_url: str) -> tuple[int | None, float | None, bool]:
    """Perform an HTTP GET request."""
    start = time.monotonic()
    
    # Map localhost to host.docker.internal for local docker testing
    if "localhost" in target_url or "127.0.0.1" in target_url:
        target_url = target_url.replace("localhost", "host.docker.internal").replace("127.0.0.1", "host.docker.internal")

    try:
        resp = await client.get(target_url, follow_redirects=True)
        elapsed = time.monotonic() - start
        response_time_ms = round(elapsed * 1000, 2)
        
        is_up = resp.status_code < 400
        log.info("✅ %s  status=%s  time=%sms", target_url, resp.status_code, response_time_ms)
        return resp.status_code, response_time_ms, is_up

    except httpx.TimeoutException:
        elapsed = time.monotonic() - start
        response_time_ms = round(elapsed * 1000, 2)
        log.warning("⏱  Timeout after %.0fms  url=%s", response_time_ms, target_url)
        return None, response_time_ms, False

    except httpx.ConnectError as exc:
        log.warning("🔌 Connection error  url=%s  reason=%s", target_url, exc)
        return None, None, False

    except Exception as exc:
        log.error("❌ Unexpected error  url=%s  exc=%r", target_url, exc)
        return None, None, False

async def ping_url(db: AsyncSession, entry: MonitoredURL, client: httpx.AsyncClient) -> None:
    """Ping a single URL and save a HealthCheck row."""
    target_url = entry.url.strip()

    if not target_url.startswith(("http://", "https://")):
        status_code, response_time_ms, is_up = await _ping_icmp(target_url)
    else:
        status_code, response_time_ms, is_up = await _ping_http(client, target_url)

    db.add(HealthCheck(
        url_id=entry.id,
        status_code=status_code,
        response_time_ms=response_time_ms,
        is_up=is_up,
        checked_at=datetime.now(timezone.utc),
    ))
    await db.commit()


# ── Scheduler job ─────────────────────────────────────────────────────────────

async def run_checks(session_factory) -> None:
    """APScheduler calls this every 10 s."""
    log.info("🔄 Scheduler tick — starting health checks")
    try:
        async with session_factory() as db:
            urls = [u for u in await list_urls(db) if u.is_active]

        if not urls:
            log.info("No active URLs to check.")
            return

        async def _check(entry: MonitoredURL, client: httpx.AsyncClient) -> None:
            async with session_factory() as db:
                await ping_url(db, entry, client)

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0), headers=headers) as client:
            await asyncio.gather(*[_check(u, client) for u in urls], return_exceptions=True)
            
        log.info("✔ Health checks complete — %d URLs checked", len(urls))

    except Exception as exc:
        log.error("💥 Scheduler run failed: %r", exc)
