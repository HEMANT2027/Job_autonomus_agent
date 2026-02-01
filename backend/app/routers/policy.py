"""Policy API endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

from app.services.apply_policy import (
    get_policy, 
    set_policy, 
    check_application_policy, 
    pause_all_applications,
    PolicyError
)
from app.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/v1/policy", tags=["Policy"])

class PolicyUpdateRequest(BaseModel):
    """Schema for updating policy."""
    daily_limit: Optional[int] = None
    min_match_score: Optional[float] = None
    blocked_companies: Optional[List[str]] = None
    paused: Optional[bool] = None
    remote_only_enforced: Optional[bool] = None
    auto_discovery_enabled: Optional[bool] = None
    discovery_min_match_score: Optional[float] = None

class PolicyCheckResponse(BaseModel):
    """Response for policy check."""
    allowed: bool
    reason: str
    policy_snapshot: Dict[str, Any]

@router.get("/", response_model=Dict[str, Any])
async def get_current_policy():
    """Get the current application policy."""
    return get_policy()

@router.post("/set", response_model=Dict[str, Any])
async def update_policy(request: PolicyUpdateRequest):
    """Update application policy settings."""
    try:
        updates = request.dict(exclude_unset=True)
        return set_policy(updates)
    except PolicyError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating policy: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/pause-all", response_model=Dict[str, Any])
async def pause_applications():
    """Immediately pause all automated applications."""
    if pause_all_applications():
        return {"status": "paused", "message": "All applications paused"}
    raise HTTPException(status_code=500, detail="Failed to pause applications")

@router.get("/check", response_model=PolicyCheckResponse)
async def check_policy(job_id: str):
    """
    Check if a specific job allows application under current policy.
    """
    return check_application_policy(job_id)
