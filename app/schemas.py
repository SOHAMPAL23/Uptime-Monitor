from datetime import datetime
from typing import Optional

from pydantic import BaseModel, HttpUrl


# ── Health-check schemas ─────────────────────────────────────────────────────

class HealthCheckResponse(BaseModel):
    id: str
    url_id: str
    status_code: Optional[int]
    response_time_ms: Optional[float]
    is_up: bool
    checked_at: datetime

    model_config = {"from_attributes": True}


# ── URL schemas ──────────────────────────────────────────────────────────────

class URLCreate(BaseModel):
    name: str
    url: HttpUrl


class URLResponse(BaseModel):
    id: str
    name: str
    url: str
    is_active: bool
    created_at: datetime
    latest_check: Optional[HealthCheckResponse] = None

    model_config = {"from_attributes": True}
