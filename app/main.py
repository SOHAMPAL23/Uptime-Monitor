import logging
import sys
from contextlib import asynccontextmanager

if sys.platform == "win32":
    import asyncio
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI

from app.database import SessionLocal, init_db
from app.routers import router
from app.services import run_checks
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()                                          # create tables on startup
    
    # Run checks immediately on startup in the background so we have data right away
    import asyncio
    asyncio.create_task(run_checks(SessionLocal))
    
    scheduler.add_job(run_checks, "interval", seconds=60, args=[SessionLocal])
    scheduler.start()
    logging.getLogger(__name__).info("⚡ Scheduler started — checks every 60 s")
    yield
    scheduler.shutdown()
    logging.getLogger(__name__).info("🛑 Scheduler stopped")


app = FastAPI(title="Uptime Monitor", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

app.include_router(router)
