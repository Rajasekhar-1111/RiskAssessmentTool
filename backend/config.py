import os
import logging
from sqlalchemy.pool import NullPool

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

logger = logging.getLogger(__name__)


def _resolve_db_url():
    """Resolve and validate the database URL.
    
    Tries the configured PostgreSQL (Supabase) URL first.
    If connection fails (e.g., paused project), falls back to local SQLite.
    """
    raw_url = os.environ.get(
        'DATABASE_URL',
        ''
    ).strip()

    # If no DATABASE_URL is set, use SQLite directly
    if not raw_url:
        sqlite_path = f"sqlite:///{os.path.join(BASE_DIR, 'riskdb.sqlite')}"
        logger.info(f"No DATABASE_URL set, using local SQLite: {sqlite_path}")
        return sqlite_path

    # Fix the deprecated postgres:// prefix
    db_url = raw_url
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    # Add SSL required for Supabase (skip for SQLite)
    if db_url.startswith("postgresql://") and "sslmode" not in db_url:
        db_url += "?sslmode=require"

    # On Vercel, SQLite is read-only and will always fail, so don't even try falling back.
    if os.environ.get('VERCEL') == '1':
        logger.info("Running on Vercel, skipping PostgreSQL connection test.")
        return db_url

    # Test the PostgreSQL connection locally
    try:
        import psycopg2
        # Parse out sslmode for psycopg2 test
        test_url = raw_url
        if test_url.startswith("postgres://"):
            test_url = test_url.replace("postgres://", "postgresql://", 1)
        conn = psycopg2.connect(test_url + ("?sslmode=require" if "sslmode" not in test_url else ""), connect_timeout=15)
        conn.close()
        logger.info("✅ PostgreSQL (Supabase) connection verified successfully")
        return db_url
    except Exception as e:
        sqlite_path = f"sqlite:///{os.path.join(BASE_DIR, 'riskdb.sqlite')}"
        logger.warning(
            f"⚠️ PostgreSQL connection failed: {e}\n"
            f"   Falling back to local SQLite: {sqlite_path}\n"
            f"   If using Supabase, check if your project is paused at https://supabase.com/dashboard"
        )
        return sqlite_path


_db_url = _resolve_db_url()


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'risk-assessment-secret-key-2025')

    # ── Database ──────────────────────────────────────────────────────────────
    SQLALCHEMY_DATABASE_URI = _db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Supabase Transaction Mode pooler is stateless — use NullPool so
    # SQLAlchemy does NOT hold persistent connections between requests.
    # For local dev using Session Mode (5432), we keep pooling enabled for speed.
    is_vercel = os.environ.get('VERCEL') == '1'
    is_transaction_pooler = ':6543' in _db_url
    
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
    }
    
    if _db_url.startswith("postgresql://"):
        if is_vercel or is_transaction_pooler:
            from sqlalchemy.pool import NullPool
            SQLALCHEMY_ENGINE_OPTIONS['poolclass'] = NullPool
        else:
            SQLALCHEMY_ENGINE_OPTIONS['pool_size'] = 5
            SQLALCHEMY_ENGINE_OPTIONS['max_overflow'] = 10

    # ── JWT ───────────────────────────────────────────────────────────────────
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-risk-secret-key-2025')
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours

    # ── Files ─────────────────────────────────────────────────────────────────
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload

