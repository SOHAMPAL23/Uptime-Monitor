from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app import services
from app.database import get_db
from app.schemas import HealthCheckResponse, URLCreate, URLResponse

router = APIRouter()

# ── URL endpoints ─────────────────────────────────────────────────────────────

@router.post("/urls", response_model=URLResponse, status_code=201)
async def add_url(payload: URLCreate, db: AsyncSession = Depends(get_db)):
    try:
        entry = await services.add_url(db, name=payload.name, url=str(payload.url))
        
        # Ping the URL immediately so the frontend has a status right away
        import httpx
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        async with httpx.AsyncClient(timeout=httpx.Timeout(4.0), headers=headers) as client:
            await services.ping_url(db, entry, client)
        
        # Fetch the latest check we just inserted to return with the payload
        from sqlalchemy import select
        from app.models import HealthCheck
        check = (await db.execute(
            select(HealthCheck)
            .where(HealthCheck.url_id == entry.id)
            .order_by(HealthCheck.checked_at.desc())
            .limit(1)
        )).scalar_one_or_none()
        
        entry.latest_check = check
        return entry
    except IntegrityError:
        raise HTTPException(status_code=400, detail="This URL is already being monitored.")

@router.get("/urls", response_model=list[URLResponse])
async def list_urls(db: AsyncSession = Depends(get_db)):
    return await services.list_urls(db)

@router.delete("/urls/{url_id}", status_code=204)
async def delete_url(url_id: str, db: AsyncSession = Depends(get_db)):
    deleted = await services.delete_url(db, url_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="URL not found")


# ── Health-check endpoints ────────────────────────────────────────────────────

@router.get("/urls/{url_id}/health", response_model=list[HealthCheckResponse])
async def url_health(url_id: str, limit: int = 20, db: AsyncSession = Depends(get_db)):
    return await services.get_health_checks(db, url_id, limit)

@router.get("/health-checks", response_model=list[HealthCheckResponse])
async def all_health_checks(limit: int = 50, db: AsyncSession = Depends(get_db)):
    return await services.get_all_latest_checks(db, limit)
