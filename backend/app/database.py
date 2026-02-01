"""Database stub - using JSON file storage instead of PostgreSQL.

This module provides stub implementations for database functions.
The application uses JSON file storage for all data persistence.
"""

from typing import Generator, Optional
from app.logging_config import get_logger

logger = get_logger(__name__)


class Base:
    """Stub base class for compatibility with ORM models."""
    pass


def get_db() -> Generator[None, None, None]:
    """Stub dependency - no database session needed."""
    yield None


def init_db() -> None:
    """Stub init - using JSON file storage."""
    logger.info("Using JSON file storage (no PostgreSQL)")
