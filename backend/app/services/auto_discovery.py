"""
Auto Discovery Service

Autonomous agent that periodically searches for jobs, ranks them, 
and adds high-scoring matches to the apply queue.
"""

import threading
import time
import asyncio
from pathlib import Path
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.logging_config import get_logger
from app.services.apply_policy import get_policy
from app.services.data_store import load_student_profile
from app.services.job_search import search_and_store_jobs
from app.services.job_ranker import rank_jobs, add_to_apply_queue

logger = get_logger(__name__)

# ============================================================
# Global State 
# ============================================================

class DiscoveryState:
    def __init__(self):
        self.is_running = False
        self.last_run_time: Optional[str] = None
        self.last_run_status: str = "idle"
        self.jobs_found_last_run: int = 0
        self.jobs_queued_last_run: int = 0
        self.total_jobs_queued: int = 0

_state = DiscoveryState()
_lock = threading.Lock()
_stop_event = threading.Event()
_trigger_event = threading.Event()

# ============================================================
# Service Control
# ============================================================

def get_discovery_status() -> Dict[str, Any]:
    """Get current status of auto discovery."""
    with _lock:
        return {
            "is_running": _state.is_running,
            "last_run_time": _state.last_run_time,
            "last_run_status": _state.last_run_status,
            "jobs_found_last_run": _state.jobs_found_last_run,
            "jobs_queued_last_run": _state.jobs_queued_last_run,
            "total_jobs_queued": _state.total_jobs_queued
        }

def start_auto_discovery_service():
    """Start the background discovery thread."""
    if _state.is_running:
        logger.warning("Auto discovery service already running")
        return

    _stop_event.clear()
    thread = threading.Thread(target=_discovery_worker, name="AutoDiscoveryWorker")
    thread.daemon = True
    thread.start()
    
    with _lock:
        _state.is_running = True
        _state.last_run_status = "started"
        
    logger.info("Auto discovery service started")

def stop_auto_discovery_service():
    """Stop the background service."""
    _stop_event.set()
    with _lock:
        _state.is_running = False
        _state.last_run_status = "stopped"
    logger.info("Auto discovery service stopping...")

def trigger_immediate_discovery():
    """Signals the worker to run a discovery cycle immediately."""
    logger.info("Immediate auto discovery triggered")
    _trigger_event.set()

# ============================================================
# Worker Logic
# ============================================================

def _discovery_worker():
    """Main worker loop."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    while not _stop_event.is_set():
        try:
            # Wait for trigger OR timeout (600s = 10 mins)
            triggered = _trigger_event.wait(timeout=600)
            if triggered:
                _trigger_event.clear()
                logger.info("Worker: Processing immediate discovery trigger")
            
            # DEBUG: Log start of loop
            debug_path = Path(__file__).parent.parent.parent / "data/debug_discovery.log"
            with open(debug_path, "a") as f:
                f.write(f"{datetime.utcnow().isoformat()} - Loop Start\n")
            
            # 1. Check Policy
            policy = get_policy()
            
            # If triggered (webhook), we bypass the auto_discovery_enabled check
            if not triggered and not policy.get("auto_discovery_enabled"):
                with _lock:
                    _state.last_run_status = "paused (policy disabled)"
                time.sleep(10)  # Sleep briefly
                continue

            # 2. Run Cycle
            with _lock:
                _state.last_run_status = "running search..."
                _state.last_run_time = datetime.utcnow().isoformat()
            
            logger.info("Auto discovery cycle started...")
            
            # 3. Get Profile Settings
            profile = load_student_profile()
            if not profile:
                logger.warning("Auto discovery skipped: No profile found")
                with _lock:
                    _state.last_run_status = "skipped (no profile)"
                time.sleep(60)
                continue
                
            required_skills = profile.get("skills", [])
            # We could also use preferred locations from profile?
            # For now just skills.
            
            # 4. Search & Store (Async)
            result = loop.run_until_complete(
                search_and_store_jobs(
                    required_skills=required_skills,
                    # We can add other constraints here from profile/policy if needed
                    remote_only=policy.get("remote_only_enforced", False)
                )
            )
            
            found_count = result.get("new_jobs_stored", 0)
            
            # 5. Rank (if new jobs found OR just periodically rank all new jobs?)
            # search_and_store_jobs already returns 'unique_jobs'.
            # But we should rank *all* available "new" jobs to be sure we catch everything?
            # Or just the ones returned? 
            # Let's rank the ones returned in result["jobs"] to be efficient.
            # But wait, rank_jobs expects stored jobs format?
            
            candidate_jobs = result.get("jobs", [])
            
            queued_count = 0
            
            if candidate_jobs:
                with _lock:
                    _state.last_run_status = "ranking..."
                
                # Fetch constraints from policy or profile?
                # Using basic profile ranking
                ranked_jobs = rank_jobs(
                    jobs=candidate_jobs,
                    profile=profile,
                    remote_only=policy.get("remote_only_enforced", False)
                )
                
                # 6. Filter by Threshold
                threshold = policy.get("discovery_min_match_score", 60)
                logger.info(f"Auto discovery: Filtering with threshold {threshold} (Type: {type(threshold)})")
                
                to_queue = []
                for job in ranked_jobs:
                    score = job.get("match_score", 0)
                    logger.info(f"Job {job.get('id')} Score: {score}")
                    
                    if score >= threshold:
                        to_queue.append(job)
                    else:
                        logger.info(f"Skipping {job.get('id')} - Score {score} < {threshold}")
                        
                # 7. Add to Queue
                if to_queue:
                    added = add_to_apply_queue(to_queue)
                    queued_count = added
                    logger.info(f"Auto discovery: Queued {added} jobs (Threshold {threshold})")
                    
                    # --- NEW: Global Autonomy Auto-Start ---
                    if added > 0 and policy.get("global_autonomy_enabled"):
                        logger.info("Global Autonomy Active: Automatically starting batch processor...")
                        from app.services.batch_processor import start_batch_processing
                        start_batch_processing()
                else:
                    logger.info("Auto discovery: No jobs met the threshold.")
            
            # 8. Update State
            with _lock:
                _state.jobs_found_last_run = len(candidate_jobs)
                _state.jobs_queued_last_run = queued_count
                _state.total_jobs_queued += queued_count
                _state.last_run_status = "sleeping"
            
            # DEBUG: Write status to file
            try:
                debug_path = Path("data/debug_discovery.log") # Use relative since cwd is backend
                with open(debug_path, "a") as f:
                    top_scores = [f"{j.get('match_score')}" for j in ranked_jobs[:3]] if candidate_jobs else []
                    f.write(f"{datetime.utcnow().isoformat()} - Found: {len(candidate_jobs)}, Threshold: {threshold}, Queued: {queued_count}, TopScores: {top_scores}\n")
            except Exception as ex:
                pass

            # Sleep Interval handled by .wait() at start of loop
            pass
                
        except Exception as e:
            logger.error(f"Auto discovery error: {e}")
            with _lock:
                _state.last_run_status = f"error: {str(e)}"
            
            # DEBUG LOG ERROR
            try:
                with open("data/debug_discovery.log", "a") as f:
                    f.write(f"{datetime.utcnow().isoformat()} - ERROR: {str(e)}\n")
            except:
                pass

            time.sleep(10)
            
    loop.close()
