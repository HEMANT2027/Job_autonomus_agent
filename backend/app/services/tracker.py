"""
Application Tracker Service

Provides aggregation, filtering, and management for independent application tracking.
Features:
- Summary Statistics (Total, Success Rate, Funnel)
- Advanced Filtering
- Failure Analysis
- Retry Orchestration
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
import traceback

from app.logging_config import get_logger
from app.services.data_store import load_applications, get_application_by_id
from app.services.auto_submit import submit_application, SubmissionError

logger = get_logger(__name__)

class TrackerError(Exception):
    """Base exception for tracker errors."""
    pass

def get_tracker_summary() -> Dict[str, Any]:
    """
    Get high-level statistics for the dashboard.
    """
    apps = load_applications()
    total = len(apps)
    
    if total == 0:
        return {
            "total_applications": 0,
            "success_rate": 0.0,
            "status_breakdown": {},
            "recent_activity": []
        }

    # Status Breakdown
    status_counts = {}
    submitted_count = 0
    
    for app in apps:
        status = app.get("status", "unknown")
        status_counts[status] = status_counts.get(status, 0) + 1
        
        if status in ["submitted", "interviewing", "offered", "rejected"]:
            submitted_count += 1
            
    # Success/Submit Rate (vs attempts or vs failures?)
    # Let's define Success Rate as: Submitted / (Submitted + Failed)
    # Or just % of Total that is Submitted/Active
    
    success_rate = 0.0
    failed_count = status_counts.get("failed", 0)
    denom = submitted_count + failed_count
    if denom > 0:
        success_rate = round(submitted_count / denom, 3)

    # Recent Activity (Last 5)
    sorted_apps = sorted(apps, key=lambda x: x.get("updated_at", ""), reverse=True)
    recent = sorted_apps[:5]

    return {
        "total_applications": total,
        "success_rate": success_rate,
        "submitted_count": submitted_count,
        "failed_count": failed_count,
        "status_breakdown": status_counts,
        "recent_activity": recent
    }

def get_filtered_applications(
    status: Optional[str] = None,
    company: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """
    Get list of applications with filters.
    """
    apps = load_applications()
    
    filtered = []
    
    for app in apps:
        # Status Filter
        if status and app.get("status") != status:
            continue
            
        # Company Filter (Contains)
        if company:
            app_company = app.get("company_name", "").lower()
            if company.lower() not in app_company:
                continue
                
        # Date Filter (Applied At or Updated At)
        app_date = app.get("applied_at") or app.get("updated_at")
        if app_date:
            # Simple string comparison works for ISO8601
            if date_from and app_date < date_from:
                continue
            if date_to and app_date > date_to:
                continue
                
        filtered.append(app)
        
    # Sort by date desc
    filtered.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
    
    return filtered[:limit]

def get_failed_applications() -> List[Dict[str, Any]]:
    """Get all failed applications with error details."""
    return get_filtered_applications(status="failed")

async def retry_application(app_id: str) -> Dict[str, Any]:
    """
    Retry a failed application.
    Re-triggers the submission logic.
    """
    app = get_application_by_id(app_id)
    if not app:
        raise TrackerError("Application not found")
        
    job_id = app.get("job_id")
    if not job_id:
        raise TrackerError("Application has no associated Job ID")
        
    # Re-submit
    # This calls auto_submit, which handles status updates
    try:
        result = await submit_application(job_id)
        return result
    except SubmissionError as e:
        raise TrackerError(f"Retry failed: {e}")
    except Exception as e:
        raise TrackerError(f"Unexpected error during retry: {e}")
