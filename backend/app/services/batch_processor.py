"""
Batch Processor Service

Manages the autonomous execution of job applications in the background.
Features:
- Background worker thread
- Queue processing from apply_queue.json
- Rate limiting
- Policy enforcement
- Real-time progress tracking
"""

import threading
import time
import json
import asyncio
from pathlib import Path
from datetime import datetime
from typing import Any, Dict, List, Optional
import traceback

from app.logging_config import get_logger
from app.services.data_store import (
    load_applications,
    get_job_by_id,
    load_student_profile
)
from app.services.job_ranker import remove_queued_job
from app.services.apply_policy import check_application_policy
from app.services.application_assembler import assemble_application_package
from app.services.auto_submit import submit_application
from app.services.audit_log import log_audit_event

logger = get_logger(__name__)

DATA_DIR = Path(__file__).parent.parent.parent / "data"
APPLY_QUEUE_FILE = DATA_DIR / "apply_queue.json"

# ============================================================
# Global State (Singleton-ish for simplicity)
# ============================================================

class BatchState:
    def __init__(self):
        self.is_running = False
        self.stop_requested = False
        self.total_jobs = 0
        self.processed_count = 0
        self.success_count = 0
        self.failed_count = 0
        self.current_job_id: Optional[str] = None
        self.current_status: str = "idle"
        self.logs: List[str] = []
        self.start_time: Optional[str] = None
        self.limit: Optional[int] = None

    def reset(self, limit: Optional[int] = None):
        self.__init__()
        self.is_running = True
        self.start_time = datetime.utcnow().isoformat()
        self.limit = limit

    def log(self, message: str):
        timestamp = datetime.utcnow().strftime("%H:%M:%S")
        entry = f"[{timestamp}] {message}"
        self.logs.append(entry)
        # Keep logs manageable
        if len(self.logs) > 100:
            self.logs.pop(0)

# Global instance
_state = BatchState()
_lock = threading.Lock()

# ============================================================
# Services
# ============================================================

def get_batch_status() -> Dict[str, Any]:
    """Get current snapshot of batch processing."""
    with _lock:
        return {
            "is_running": _state.is_running,
            "processed_count": _state.processed_count,
            "success_count": _state.success_count,
            "failed_count": _state.failed_count,
            "current_job_id": _state.current_job_id,
            "current_status": _state.current_status,
            "logs": list(_state.logs), # Copy
            "start_time": _state.start_time,
            "limit": _state.limit
        }

def start_batch_processing(student_id: Optional[str] = None, limit: Optional[int] = None) -> Dict[str, Any]:
    """Start the background processing thread."""
    with _lock:
        if _state.is_running:
            return {"status": "error", "message": "Batch already running"}
        
        _state.reset(limit=limit)
        limit_msg = f" (Limit: {limit})" if limit else ""
        _state.log(f"Starting batch process{limit_msg}...")
        
    thread = threading.Thread(target=_worker, args=(student_id,))
    thread.daemon = True
    thread.start()
    
    return {"status": "started", "message": "Batch processing started in background"}

def stop_batch_processing() -> Dict[str, Any]:
    """Request the batch processor to stop."""
    with _lock:
        if not _state.is_running:
            return {"status": "error", "message": "No batch running"}
        
        _state.stop_requested = True
        _state.log("Stop requested by user...")
        
    return {"status": "stopping", "message": "Batch processing stopping..."}

# ============================================================
# Worker
# ============================================================

def _read_queue() -> List[Dict[str, Any]]:
    try:
        if APPLY_QUEUE_FILE.exists():
            with open(APPLY_QUEUE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("queue", [])
        return []
    except Exception as e:
        logger.error(f"Error reading apply queue: {e}")
        return []

def _worker(student_id: Optional[str]):
    """Background worker loops through queue."""
    
    # 1. Load Queue
    queue = _read_queue()
    with _lock:
        _state.total_jobs = len(queue)
        _state.log(f"Loaded {len(queue)} jobs from queue")

    # 2. Process Loop
    processed_count = 0
    
    # Create a new event loop for this thread since we need to call async submit_application
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        for job_entry in queue:
            # Check Limit
            if _state.limit and processed_count >= _state.limit:
                with _lock:
                    _state.log(f"Batch limit of {_state.limit} reached.")
                    _state.current_status = "limit_reached"
                break

            # Check Stop
            if _state.stop_requested:
                with _lock:
                    _state.log("Batch stopped manually.")
                    _state.current_status = "stopped"
                break
                
            job_id = job_entry.get("id")
            
            with _lock:
                _state.current_job_id = job_id
                _state.current_status = f"Processing job {job_id}"
                _state.log(f"Processing Job {job_id}...")

            # 3. Check if already applied
            applications = load_applications()
            existing = next((a for a in applications if a.get("job_id") == job_id), None)
            
            if existing and existing.get("status") in ["applied", "submitted", "interviewing", "offered", "rejected"]:
                with _lock:
                    _state.log(f"Skipping {job_id}: Already applied")
                processed_count += 1
                continue

            # 4. Check Policy
            policy_check = check_application_policy(job_id)
            if not policy_check["allowed"]:
                with _lock:
                    _state.log(f"Skipping {job_id}: Policy blocked - {policy_check['reason']}")
                log_audit_event(job_id, "policy_check", {"status": "blocked", "reason": policy_check["reason"]}, "Application Policy")
                processed_count += 1
                continue
            
            log_audit_event(job_id, "policy_check", {"status": "allowed"}, "Application Policy")

            # 5. Assemble
            try:
                with _lock:
                    _state.current_status = "Assembling package..."
                
                # Sync utility in assembler
                # Pass a lambda to check for stop request during long operations
                package = assemble_application_package(
                    job_id, 
                    should_stop=lambda: _state.stop_requested
                ) 
                
            except Exception as e:
                with _lock:
                    _state.log(f"Assembly failed for {job_id}: {e}")
                    _state.failed_count += 1
                log_audit_event(job_id, "assembly", {"status": "failed", "error": str(e)}, "Package Assembly")
                processed_count += 1
                continue

            # 6. Submit (Async)
            try:
                with _lock:
                    _state.current_status = "Submitting..."
                
                # Run async task in sync thread
                result = loop.run_until_complete(submit_application(job_id))
                
                with _lock:
                    _state.log(f"Successfully submitted to {job_id}")
                    _state.success_count += 1
                
                log_audit_event(job_id, "submission", {"status": "success", "result": result}, "Final Submission")
                    
            except Exception as e:
                with _lock:
                    _state.log(f"Submission failed for {job_id}: {e}")
                    _state.failed_count += 1
                log_audit_event(job_id, "submission", {"status": "failed", "error": str(e)}, "Final Submission")
            
            # 7. Rate Limit / Pacing
            # Sleep 5 seconds between apps
            processed_count += 1
            
            # Remove from queue (cleanup)
            remove_queued_job(job_id)
            with _lock:
                _state.log(f"Removed {job_id} from queue.")

            with _lock:
                _state.processed_count = processed_count
                
            time.sleep(5)
            
        # Done
        with _lock:
            _state.log("Batch processing completed.")
            _state.current_status = "completed"
            
    except Exception as e:
        logger.error(f"Batch worker crash: {e}")
        with _lock:
            _state.log(f"Process crashed: {e}")
            _state.current_status = "crashed"
    finally:
        with _lock:
            _state.is_running = False
            _state.stop_requested = False
            _state.current_job_id = None
        loop.close()
