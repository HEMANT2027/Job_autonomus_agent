"""Autonomy API endpoints for external triggers."""

from fastapi import APIRouter, BackgroundTasks
from app.services.auto_discovery import trigger_immediate_discovery
from app.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/v1/autonomy", tags=["Autonomy"])

@router.post("/notify-new-jobs")
async def notify_new_jobs(background_tasks: BackgroundTasks):
    """
    Called by an external source (e.g. Sandbox Portal) to notify that new jobs
    might be available. This triggers an immediate discovery cycle.
    """
    logger.info("Received external notification of new jobs")
    background_tasks.add_task(trigger_immediate_discovery)
    return {"status": "received", "message": "Discovery cycle triggered"}

@router.get("/status")
async def get_autonomy_status():
    """Get status of the autonomy loop."""
    from app.services.apply_policy import get_policy
    from app.services.auto_discovery import get_discovery_status
    
    policy = get_policy()
    discovery = get_discovery_status()
    
    return {
        "global_autonomy_enabled": policy.get("global_autonomy_enabled", False),
        "discovery_active": discovery.get("is_running", False),
        "last_run": discovery.get("last_run_time")
    }
