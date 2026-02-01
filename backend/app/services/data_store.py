"""
JSON-based Data Store Service

Thread-safe JSON file persistence for student profiles, jobs, and applications.
Uses file locking for concurrent access safety.
"""

import json
import os
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.logging_config import get_logger

logger = get_logger(__name__)

# Data directory path
DATA_DIR = Path(__file__).parent.parent.parent / "data"

# File paths
STUDENT_PROFILE_FILE = DATA_DIR / "student_profile.json"
JOBS_FILE = DATA_DIR / "job_listings.json"
APPLICATIONS_FILE = DATA_DIR / "applications.json"

# Thread locks for concurrent access
_profile_lock = threading.RLock()
_jobs_lock = threading.RLock()
_applications_lock = threading.RLock()


def _ensure_data_dir() -> None:
    """Ensure the data directory exists."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def _read_json_file(file_path: Path, default: Any = None) -> Any:
    """Read and parse a JSON file safely."""
    try:
        if file_path.exists():
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return default
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing JSON from {file_path}: {e}")
        return default
    except Exception as e:
        logger.error(f"Error reading file {file_path}: {e}")
        return default


def _write_json_file(file_path: Path, data: Any) -> bool:
    """Write data to a JSON file safely."""
    try:
        _ensure_data_dir()
        # Write to temp file first, then rename for atomicity
        temp_path = file_path.with_suffix(".tmp")
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)
        # Atomic rename
        temp_path.replace(file_path)
        return True
    except Exception as e:
        logger.error(f"Error writing file {file_path}: {e}")
        return False


# ============================================================
# Student Profile Functions
# ============================================================

def save_student_profile(data: Dict[str, Any]) -> bool:
    """
    Save student profile data.
    
    Args:
        data: Dictionary containing student profile information.
              Expected fields: name, email, phone, education, skills,
              experience, resume_path, etc.
    
    Returns:
        True if saved successfully, False otherwise.
    """
    with _profile_lock:
        # Add metadata
        data["updated_at"] = datetime.utcnow().isoformat()
        if "created_at" not in data:
            data["created_at"] = datetime.utcnow().isoformat()
        
        profile_data = {"profile": data}
        success = _write_json_file(STUDENT_PROFILE_FILE, profile_data)
        
        if success:
            logger.info("Student profile saved successfully")
        return success


def load_student_profile() -> Optional[Dict[str, Any]]:
    """
    Load student profile data.
    
    Returns:
        Dictionary containing student profile, or None if not found.
    """
    with _profile_lock:
        data = _read_json_file(STUDENT_PROFILE_FILE, {"profile": None})
        return data.get("profile")


# ============================================================
# Jobs Functions
# ============================================================

def save_jobs(jobs_list: List[Dict[str, Any]]) -> bool:
    """
    Save the entire jobs list (overwrites existing).
    
    Args:
        jobs_list: List of job dictionaries.
                   Each job should have: id, title, company, location,
                   description, url, posted_at, etc.
    
    Returns:
        True if saved successfully, False otherwise.
    """
    with _jobs_lock:
        # Ensure each job has an ID
        for job in jobs_list:
            if "id" not in job:
                job["id"] = str(uuid.uuid4())
            if "created_at" not in job:
                job["created_at"] = datetime.utcnow().isoformat()
        
        jobs_data = {"jobs": jobs_list, "updated_at": datetime.utcnow().isoformat()}
        success = _write_json_file(JOBS_FILE, jobs_data)
        
        if success:
            logger.info(f"Saved {len(jobs_list)} jobs")
        return success


def add_job(job: Dict[str, Any]) -> Optional[str]:
    """
    Add a single job to the jobs list.
    
    Args:
        job: Job dictionary with title, company, location, etc.
    
    Returns:
        The job ID if saved successfully, None otherwise.
    """
    with _jobs_lock:
        jobs = load_jobs()
        
        # Generate ID if not present
        if "id" not in job:
            job["id"] = str(uuid.uuid4())
        job["created_at"] = datetime.utcnow().isoformat()
        
        jobs.append(job)
        
        if save_jobs(jobs):
            return job["id"]
        return None


def load_jobs() -> List[Dict[str, Any]]:
    """
    Load all jobs.
    
    Returns:
        List of job dictionaries.
    """
    with _jobs_lock:
        data = _read_json_file(JOBS_FILE, {"jobs": []})
        return data.get("jobs", [])


def get_job_by_id(job_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a single job by ID.
    
    Args:
        job_id: The job's unique identifier.
    
    Returns:
        Job dictionary or None if not found.
    """
    jobs = load_jobs()
    for job in jobs:
        if job.get("id") == job_id:
            return job
    return None


def delete_job(job_id: str) -> bool:
    """
    Delete a job by ID.
    
    Args:
        job_id: The job's unique identifier.
    
    Returns:
        True if deleted, False if not found.
    """
    with _jobs_lock:
        jobs = load_jobs()
        original_count = len(jobs)
        jobs = [j for j in jobs if j.get("id") != job_id]
        
        if len(jobs) < original_count:
            return save_jobs(jobs)
        return False


# ============================================================
# Applications Functions
# ============================================================

def save_application(app_data: Dict[str, Any]) -> Optional[str]:
    """
    Save a new job application.
    
    Args:
        app_data: Application dictionary with job_id, status, 
                  applied_at, resume_used, cover_letter, notes, etc.
    
    Returns:
        The application ID if saved successfully, None otherwise.
    """
    with _applications_lock:
        applications = load_applications()
        
        # Generate ID if not present
        if "id" not in app_data:
            app_data["id"] = str(uuid.uuid4())
        
        # Add timestamps
        app_data["created_at"] = datetime.utcnow().isoformat()
        app_data["updated_at"] = datetime.utcnow().isoformat()
        
        # Set default status
        if "status" not in app_data:
            app_data["status"] = "pending"
        
        applications.append(app_data)
        
        if _save_all_applications(applications):
            logger.info(f"Application {app_data['id']} saved successfully")
            return app_data["id"]
        return None


def update_application(app_id: str, updates: Dict[str, Any]) -> bool:
    """
    Update an existing application.
    
    Args:
        app_id: The application's unique identifier.
        updates: Dictionary of fields to update.
    
    Returns:
        True if updated successfully, False otherwise.
    """
    with _applications_lock:
        applications = load_applications()
        
        for app in applications:
            if app.get("id") == app_id:
                app.update(updates)
                app["updated_at"] = datetime.utcnow().isoformat()
                return _save_all_applications(applications)
        
        return False


def load_applications() -> List[Dict[str, Any]]:
    """
    Load all applications.
    
    Returns:
        List of application dictionaries.
    """
    with _applications_lock:
        data = _read_json_file(APPLICATIONS_FILE, {"applications": []})
        return data.get("applications", [])


def get_application_by_id(app_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a single application by ID.
    
    Args:
        app_id: The application's unique identifier.
    
    Returns:
        Application dictionary or None if not found.
    """
    applications = load_applications()
    for app in applications:
        if app.get("id") == app_id:
            return app
    return None


def get_applications_by_status(status: str) -> List[Dict[str, Any]]:
    """
    Get applications filtered by status.
    
    Args:
        status: Status to filter by (pending, applied, interviewing, etc.)
    
    Returns:
        List of matching applications.
    """
    applications = load_applications()
    return [app for app in applications if app.get("status") == status]


def delete_application(app_id: str) -> bool:
    """
    Delete an application by ID.
    
    Args:
        app_id: The application's unique identifier.
    
    Returns:
        True if deleted, False if not found.
    """
    with _applications_lock:
        applications = load_applications()
        original_count = len(applications)
        applications = [a for a in applications if a.get("id") != app_id]
        
        if len(applications) < original_count:
            return _save_all_applications(applications)
        return False


def _save_all_applications(applications: List[Dict[str, Any]]) -> bool:
    """Internal function to save all applications."""
    apps_data = {
        "applications": applications,
        "updated_at": datetime.utcnow().isoformat()
    }
    return _write_json_file(APPLICATIONS_FILE, apps_data)


# ============================================================
# Statistics Functions
# ============================================================

def get_application_stats() -> Dict[str, int]:
    """
    Get statistics about applications.
    
    Returns:
        Dictionary with counts by status.
    """
    applications = load_applications()
    
    stats = {
        "total": len(applications),
        "pending": 0,
        "applied": 0,
        "interviewing": 0,
        "offered": 0,
        "rejected": 0,
        "withdrawn": 0,
    }
    
    for app in applications:
        status = app.get("status", "pending")
        if status in stats:
            stats[status] += 1
    
    return stats


# Initialize data directory on module load
_ensure_data_dir()
