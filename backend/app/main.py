"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.exceptions import (
    AppException,
    app_exception_handler,
    http_exception_handler,
    unhandled_exception_handler,
)
from app.logging_config import get_logger, setup_logging
from app.middleware import RequestLoggingMiddleware
from app.routers import health_router, profile_router, jobs_router, applications_router, student_router, personalize_router, policy_router, apply_router
from app.routers.tracker import router as tracker_router
from app.routers.verifier import router as verifier_router
from app.routers.audit import router as audit_router
from app.routers.autonomy import router as autonomy_router

# Setup logging
setup_logging()
# Trigger reload
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info(f"Starting {settings.app_name} in {settings.app_env} mode")
    logger.info(f"Debug mode: {settings.debug}")

    # Initialize database tables (optional, use Alembic migrations in production)
    if settings.app_env == "development":
        try:
            init_db()
            logger.info("Database tables initialized")
        except Exception as e:
            logger.warning(f"Database initialization skipped: {e}")

    # Start Background Services
    from app.services.auto_discovery import start_auto_discovery_service, stop_auto_discovery_service
    try:
        start_auto_discovery_service()
    except Exception as e:
        logger.error(f"Failed to start auto discovery: {e}")

    yield

    # Shutdown
    logger.info("Shutting down application")
    from app.services.batch_processor import stop_batch_processing
    stop_batch_processing()
    stop_auto_discovery_service()


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="API for Job Application Automation System",
    version="0.1.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register exception handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# Include routers
app.include_router(health_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(jobs_router, prefix="/api")
app.include_router(applications_router, prefix="/api")
app.include_router(student_router, prefix="/api")
app.include_router(personalize_router, prefix="/api")
app.include_router(policy_router, prefix="/api")
app.include_router(apply_router, prefix="/api")
app.include_router(tracker_router, prefix="/api")
app.include_router(verifier_router, prefix="/api")
app.include_router(audit_router, prefix="/api")
app.include_router(autonomy_router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": f"Welcome to {settings.app_name}",
        "version": "0.1.0",
        "docs": "/docs" if settings.debug else "Disabled in production",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
