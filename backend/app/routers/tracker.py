"""Tracker API endpoints."""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import httpx
import os

from app.services.tracker import (
    get_tracker_summary,
    get_filtered_applications,
    get_failed_applications,
    retry_application,
    TrackerError
)
from app.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/v1/tracker", tags=["Tracker"])

# Sandbox Portal URL
SANDBOX_API = os.getenv("SANDBOX_API_URL", "http://localhost:8001")
SANDBOX_API_KEY = os.getenv("SANDBOX_API_KEY", "sandbox_demo_key_2026")

class RetryRequest(BaseModel):
    """Request schema for retrying an application."""
    application_id: str

@router.get("/summary", response_model=Dict[str, Any])
def get_summary():
    """Get high-level dashboard metrics."""
    return get_tracker_summary()

@router.get("/applications", response_model=List[Dict[str, Any]])
def list_filtered_applications(
    status: Optional[str] = Query(None, description="Filter by status"),
    company: Optional[str] = Query(None, description="Filter by company name"),
    date_from: Optional[str] = Query(None, description="Start date (ISO8601)"),
    date_to: Optional[str] = Query(None, description="End date (ISO8601)"),
    limit: int = 100
):
    """Get list of applications with filters."""
    return get_filtered_applications(
        status=status,
        company=company,
        date_from=date_from,
        date_to=date_to,
        limit=limit
    )

@router.get("/failures", response_model=List[Dict[str, Any]])
def list_failures():
    """Get all failed applications."""
    return get_failed_applications()

@router.post("/retry", response_model=Dict[str, Any])
async def retry_failed_application(request: RetryRequest):
    """
    Retry a failed application submission.
    Triggers the submission logic again.
    """
    try:
        result = await retry_application(request.application_id)
        return result
        
    except TrackerError as e:
        logger.error(f"Tracker error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
        
    except Exception as e:
        logger.error(f"Unexpected error retrying application: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================
# Sandbox Recruiter Feedback Endpoints
# ============================================================

@router.get("/sandbox/feedback", response_model=List[Dict[str, Any]])
async def get_all_sandbox_feedback():
    """
    Get all applications from sandbox with recruiter feedback.
    Fetches applications, messages, and meetings from sandbox portal in one enriched call.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Fetch all applications from sandbox with enrichment
            res = await client.get(
                f"{SANDBOX_API}/sandbox/applications?enrich=true",
                headers={"X-API-Key": SANDBOX_API_KEY}
            )
            
            if res.status_code != 200:
                logger.warning(f"Sandbox returned {res.status_code}")
                return []
            
            return res.json()
            
    except httpx.RequestError as e:
        logger.error(f"Failed to connect to sandbox: {e}")
        return []
    except Exception as e:
        logger.error(f"Error fetching sandbox feedback: {e}")
        return []


@router.get("/sandbox/feedback/{application_id}", response_model=Dict[str, Any])
async def get_sandbox_feedback(application_id: str):
    """
    Get recruiter feedback for a specific application.
    Returns application details, messages, and meetings.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Fetch application details
            app_res = await client.get(
                f"{SANDBOX_API}/sandbox/applications/{application_id}",
                headers={"X-API-Key": SANDBOX_API_KEY}
            )
            
            if app_res.status_code == 404:
                raise HTTPException(status_code=404, detail="Application not found in sandbox")
            
            if app_res.status_code != 200:
                raise HTTPException(status_code=app_res.status_code, detail="Failed to fetch from sandbox")
            
            app = app_res.json()
            
            # Fetch messages
            try:
                msg_res = await client.get(
                    f"{SANDBOX_API}/sandbox/applications/{application_id}/messages",
                    headers={"X-API-Key": SANDBOX_API_KEY}
                )
                app["messages"] = msg_res.json().get("messages", []) if msg_res.status_code == 200 else []
            except:
                app["messages"] = []
            
            # Fetch meetings
            try:
                mtg_res = await client.get(
                    f"{SANDBOX_API}/sandbox/applications/{application_id}/meetings",
                    headers={"X-API-Key": SANDBOX_API_KEY}
                )
                app["meetings"] = mtg_res.json().get("meetings", []) if mtg_res.status_code == 200 else []
            except:
                app["meetings"] = []
            
            return app
            
    except HTTPException:
        raise
    except httpx.RequestError as e:
        logger.error(f"Failed to connect to sandbox: {e}")
        raise HTTPException(status_code=503, detail="Sandbox portal unavailable")
    except Exception as e:
        logger.error(f"Error fetching sandbox feedback: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/sandbox/feedback/{application_id}/message")
async def send_message_to_sandbox(application_id: str, message: Dict[str, Any]):
    """
    Send a message from the applicant to the recruiter in the sandbox.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Prepare message with sender: applicant
            payload = {
                "sender": "applicant",
                "content": message.get("content", "")
            }
            
            res = await client.post(
                f"{SANDBOX_API}/sandbox/applications/{application_id}/messages",
                json=payload,
                headers={"X-API-Key": SANDBOX_API_KEY}
            )
            
            if res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail="Failed to send message to sandbox")
            
            return res.json()
            
    except httpx.RequestError as e:
        logger.error(f"Failed to connect to sandbox: {e}")
        raise HTTPException(status_code=503, detail="Sandbox portal unavailable")
    except Exception as e:
        logger.error(f"Error sending message to sandbox: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
