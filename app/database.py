import asyncio
import logging
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

logger = logging.getLogger(__name__)

db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

connect_args = {}
if db_url.startswith("postgresql"):
    connect_args = {"connect_timeout": 2}

engine = create_async_engine(
    db_url,
    echo=False,
    pool_pre_ping=True,   # drop stale connections automatically
    connect_args=connect_args
)
_session_maker = async_sessionmaker(engine, expire_on_commit=False)


def SessionLocal():
    if _session_maker is None:
        raise RuntimeError("Database session maker is not initialized")
    return _session_maker()


class Base(DeclarativeBase):
    pass


async def get_db():
    async with SessionLocal() as session:
        yield session


async def _try_init_postgres():
    async with engine.begin() as conn:
        await conn.execute("SELECT 1")
        await conn.run_sync(Base.metadata.create_all)


async def init_db():
    global engine, _session_maker
    try:
        # Wrap connection in a 2-second timeout to prevent hangs due to network drops/blocks
        await asyncio.wait_for(_try_init_postgres(), timeout=2.0)
        logger.info("📡 Successfully connected to PostgreSQL (Neon)")
    except Exception as e:
        logger.warning(
            f"⚠️ PostgreSQL connection failed or timed out: {e}. "
            "Falling back to local SQLite database (uptime.db) for consistency and stability."
        )
        # Recreate engine and _session_maker using SQLite
        sqlite_url = "sqlite+aiosqlite:///./uptime.db"
        engine = create_async_engine(
            sqlite_url,
            echo=False,
        )
        _session_maker = async_sessionmaker(engine, expire_on_commit=False)
        
        # Initialize SQLite tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            logger.info("📁 Local SQLite database initialized successfully.")



