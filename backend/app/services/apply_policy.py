"""
Apply Policy Service

Manages constraints and rules for automated job applications.
Controls:
- Daily application limits
- Minimum match score thresholds
- Blocked companies/titles
- Global kill switch (Pause All)
"""

import json
import threading
from datetime import datetime, date
from pathlib import Path
from typing import Any, Dict, List, Optional
import traceback

from app.logging_config import get_logger
from app.services.data_store import (
    load_applications, 
    get_job_by_id, 
    load_student_profile
)

logger = get_logger(__name__)

# Data directory path
DATA_DIR = Path(__file__).parent.parent.parent / "data"
POLICY_FILE = DATA_DIR / "apply_policy.json"

# Thread lock
_policy_lock = threading.RLock()

# Defaults
DEFAULT_POLICY = {
    "daily_limit": 0,  # 0 means no limit
    "min_match_score": 0,  # 0 means no threshold - apply to all jobs
    "blocked_companies": [],
    "auto_discovery_enabled": False, # Is the autonomous job finder running?
    "discovery_min_match_score": 60, # Only queue jobs above this score
    "global_autonomy_enabled": False, # Fully autonomous Discovery + Apply loop
    "last_discovery_run": None,
    "updated_at": datetime.utcnow().isoformat()
}

class PolicyError(Exception):
    """Base exception for policy errors."""
    pass

def _ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

def _read_policy() -> Dict[str, Any]:
    """Read the policy file safely."""
    try:
        if POLICY_FILE.exists():
            with open(POLICY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Merge with defaults for missing keys
                return {**DEFAULT_POLICY, **data}
        return DEFAULT_POLICY.copy()
    except Exception as e:
        logger.error(f"Error reading apply policy: {e}")
        return DEFAULT_POLICY.copy()

def _write_policy(data: Dict[str, Any]) -> bool:
    """Write to the policy file safely."""
    try:
        _ensure_data_dir()
        temp_path = POLICY_FILE.with_suffix(".tmp")
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)
        temp_path.replace(POLICY_FILE)
        return True
    except Exception as e:
        logger.error(f"Error writing apply policy: {e}")
        return False

# Public API

def get_policy() -> Dict[str, Any]:
    """Get current application policy."""
    with _policy_lock:
        return _read_policy()

def set_policy(updates: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update policy settings.
    
    Args:
        updates: Dict with keys to update (e.g., daily_limit, min_match_score)
    """
    with _policy_lock:
        current = _read_policy()
        
        # Validate fields
        if "daily_limit" in updates:
            current["daily_limit"] = int(updates["daily_limit"])
        if "min_match_score" in updates:
            current["min_match_score"] = float(updates["min_match_score"])
        if "blocked_companies" in updates:
            current["blocked_companies"] = list(updates["blocked_companies"])
        if "paused" in updates:
            current["paused"] = bool(updates["paused"])
        if "remote_only_enforced" in updates:
            current["remote_only_enforced"] = bool(updates["remote_only_enforced"])
        if "auto_discovery_enabled" in updates:
            current["auto_discovery_enabled"] = bool(updates["auto_discovery_enabled"])
        if "discovery_min_match_score" in updates:
            current["discovery_min_match_score"] = float(updates["discovery_min_match_score"])
        if "global_autonomy_enabled" in updates:
            current["global_autonomy_enabled"] = bool(updates["global_autonomy_enabled"])
            
        current["updated_at"] = datetime.utcnow().isoformat()
        
        if _write_policy(current):
            logger.info("Apply policy updated")
            return current
        raise PolicyError("Failed to save policy updates")

def pause_all_applications() -> bool:
    """Kill switch to stop all automated applications."""
    try:
        return set_policy({"paused": True}).get("paused") is True
    except:
        return False

def check_application_policy(job_id: str) -> Dict[str, Any]:
    """
    Check if applying to this job is allowed by current policy.
    
    Returns:
        Dict with:
        - allowed: bool
        - reason: str (if blocked)
        - policy_snapshot: dict
    """
    policy = get_policy()
    
    # 1. Global Kill Switch
    if policy.get("paused"):
        return {
            "allowed": False,
            "reason": "Global policy PAUSED",
            "policy_snapshot": policy
        }

    # 2. Get Job
    job = get_job_by_id(job_id)
    if not job:
        return {
            "allowed": False,
            "reason": "Job not found",
            "policy_snapshot": policy
        }

    # 3. Blocked Companies
    company = job.get("company", "").lower()
    blocked = [c.lower() for c in policy.get("blocked_companies", [])]
    if any(b in company for b in blocked):
        return {
            "allowed": False,
            "reason": f"Company '{job.get('company')}' is in blocked list",
            "policy_snapshot": policy
        }

    # 4. Minimum Match Score (if score exists on job or needs calc)
    # Assuming score might be in job metadata from ranking
    # If not present, we assume strictly manual or unscored jobs pass this check 
    # OR we could call ranking service here (expensive?)
    # For now, check if 'match_score' is in job (it should be if queued by ranker)
    match_score = job.get("match_score")
    min_score = policy.get("min_match_score", 0)
    
    # Only enforce threshold if min_score > 0 (0 means no threshold)
    if min_score > 0 and match_score is not None and match_score < min_score:
         return {
            "allowed": False,
            "reason": f"Match score {match_score} below threshold {min_score}",
            "policy_snapshot": policy
        }

    # 5. Remote Only Enforcement
    if policy.get("remote_only_enforced"):
        is_remote = job.get("is_remote") or "remote" in job.get("location", "").lower() or "remote" in job.get("title", "").lower()
        if not is_remote:
             return {
                "allowed": False,
                "reason": "Job is not Remote (Policy Enforced)",
                "policy_snapshot": policy
            }

    # 6. Daily Limit
    # Count applications made today
    applications = load_applications()
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    
    day_count = 0
    for app in applications:
        # Check applied_at or created_at
        app_date = app.get("applied_at") or app.get("created_at")
        if app_date and app_date.startswith(today_str):
            day_count += 1
            
    limit = policy.get("daily_limit", 10)
    # 0 or None means infinite/no limit
    if limit is not None and limit > 0 and day_count >= limit:
        return {
            "allowed": False,
            "reason": f"Daily limit reached ({day_count}/{limit})",
            "policy_snapshot": policy
        }

    return {
        "allowed": True,
        "reason": "Policy checks passed",
        "policy_snapshot": policy
    }
