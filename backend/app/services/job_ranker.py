"""
Job Ranker Service

 ranks jobs based on match score and generates reasoning using LLM.
"""

import json
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
import math

from app.services.llm_client import generate_text, LLMClientError
from app.services.data_store import load_applications
from app.logging_config import get_logger

logger = get_logger(__name__)

# Data persistence
DATA_DIR = Path(__file__).parent.parent.parent / "data"
APPLY_QUEUE_FILE = DATA_DIR / "apply_queue.json"

_queue_lock = threading.RLock()

# Weights
WEIGHT_SKILLS = 0.4
WEIGHT_EXPERIENCE = 0.3
WEIGHT_CONSTRAINTS = 0.3

def _ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

def _read_apply_queue() -> List[Dict[str, Any]]:
    try:
        if APPLY_QUEUE_FILE.exists():
            with open(APPLY_QUEUE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("queue", [])
        return []
    except Exception as e:
        logger.error(f"Error reading apply queue: {e}")
        return []

def _write_apply_queue(queue: List[Dict[str, Any]]) -> bool:
    try:
        _ensure_data_dir()
        with open(APPLY_QUEUE_FILE, "w", encoding="utf-8") as f:
            json.dump({"queue": queue}, f, indent=2, default=str)
        return True
    except Exception as e:
        logger.error(f"Error writing apply queue: {e}")
        return False

def calculate_skill_score(job_skills: List[str], profile_skills: List[str]) -> float:
    if not job_skills:
        return 100.0  # No specific skills required
    
    # Normalize
    job_skills_norm = {s.lower() for s in job_skills}
    profile_skills_norm = {s.lower() for s in profile_skills}
    
    if not job_skills_norm:
        return 100.0

    matched = 0
    for j_skill in job_skills_norm:
        # Direct match or substring match
        if any(j_skill in p_skill or p_skill in j_skill for p_skill in profile_skills_norm):
            matched += 1
            
    return (matched / len(job_skills_norm)) * 100.0

def calculate_experience_score(job_level: str, student_years: int) -> float:
    # Normalize job level
    level = job_level.lower()
    
    target_years = 0
    if "senior" in level or "lead" in level:
        target_years = 5
    elif "mid" in level or "experienced" in level:
        target_years = 3
    elif "entry" in level or "junior" in level or "intern" in level or "new grad" in level:
        target_years = 0
        
    diff = abs(student_years - target_years)
    
    if diff <= 1:
        return 100.0
    elif diff <= 2:
        return 75.0
    elif diff <= 3:
        return 50.0
    else:
        return 25.0

def calculate_constraint_score(
    job: Dict[str, Any],
    remote_only: bool,
    visa_required: bool,
    preferred_locations: List[str]
) -> float:
    score = 0.0
    total_checks = 0
    
    # Remote check
    if remote_only:
        total_checks += 1
        if job.get("is_remote", False):
            score += 100.0
    
    # Visa check
    if visa_required:
        total_checks += 1
        if job.get("visa_sponsorship", False):
            score += 100.0
            
    # Location check
    if preferred_locations and not job.get("is_remote"):
        total_checks += 1
        job_loc = job.get("location", "").lower()
        if any(loc.lower() in job_loc for loc in preferred_locations):
            score += 100.0
    
    if total_checks == 0:
        return 100.0
        
    return score / total_checks

def generate_match_reasoning(job: Dict[str, Any], profile: Dict[str, Any]) -> str:
    """Generate reasoning using Gemini LLM."""
    try:
        job_summary = f"{job['title']} at {job['company']}. Skills: {', '.join(job.get('skills_required', [])[:5])}."
        profile_summary = f"Skills: {', '.join(profile.get('skills', [])[:5])}, Experience: {len(profile.get('experience', []))} roles."
        
        prompt = f"""
        Explain why this job is a good match for the candidate in 2 sentences.
        Job: {job_summary}
        Candidate: {profile_summary}
        Focus on skill overlap and fit.
        """
        
        # Call Gemini API via llm_client
        return generate_text(
            prompt=prompt,
            temperature=0.3,
            max_tokens=100
        )
    except Exception as e:
        logger.error(f"LLM reasoning failed: {e}")
        return "Matched based on skill overlap and role requirements."

def rank_jobs(
    jobs: List[Dict[str, Any]],
    profile: Dict[str, Any],
    remote_only: bool = False,
    visa_required: bool = False,
    preferred_locations: List[str] = None
) -> List[Dict[str, Any]]:
    """
    Rank jobs based on student profile.
    """
    if preferred_locations is None:
        preferred_locations = []
        
    ranked_jobs = []
    
    # Estimate student experience years
    student_years = 0
    for exp in profile.get("experience", []):
        # Basic heuristic - could be improved with actual date parsing
        # For now assume each entry is ~1 year if parsing fails? 
        # Or just count entries? Let's verify data format later.
        # Assuming simplistic count for now, or parsing "duration" string if possible.
        # Let's just use number of experience entries * 1.5 as a proxy for now.
        student_years += 1.5
    
    for job in jobs:
        # 1. Skill Score
        skill_score = calculate_skill_score(
            job.get("skills_required", []),
            profile.get("skills", [])
        )
        
        # 2. Experience Score
        exp_score = calculate_experience_score(
            job.get("experience_level", "entry"),
            int(student_years)
        )
        
        # 3. Constraint Score
        constraint_score = calculate_constraint_score(
            job,
            remote_only,
            visa_required,
            preferred_locations
        )
        
        total_score = (
            (skill_score * WEIGHT_SKILLS) +
            (exp_score * WEIGHT_EXPERIENCE) +
            (constraint_score * WEIGHT_CONSTRAINTS)
        )
        
        job_copy = job.copy()
        job_copy["match_score"] = round(total_score, 1)
        job_copy["scores"] = {
            "skills": round(skill_score, 1),
            "experience": round(exp_score, 1),
            "constraints": round(constraint_score, 1)
        }
        
        ranked_jobs.append(job_copy)
        
    # Sort descending
    ranked_jobs.sort(key=lambda x: x["match_score"], reverse=True)
    
    # Generate reasoning for top 5 only to save time/tokens
    for i in range(min(5, len(ranked_jobs))):
        ranked_jobs[i]["match_reasoning"] = generate_match_reasoning(ranked_jobs[i], profile)
        
    return ranked_jobs

def add_to_apply_queue(jobs: List[Dict[str, Any]]) -> int:
    """Add ranked jobs to the apply queue."""
    with _queue_lock:
        queue = _read_apply_queue()
        existing_ids = {item["id"] for item in queue}
        
        # Deduplication against historical applications
        applications = load_applications()
        applied_ids = {app.get("job_id") for app in applications if app.get("job_id")}
        
        added_count = 0
        for job in jobs:
            # Check if in queue OR already applied
            if job["id"] not in existing_ids and job["id"] not in applied_ids:
                job["queued_at"] = str(datetime.now())
                job["status"] = "queued"
                queue.append(job)
                existing_ids.add(job["id"])
                added_count += 1
                
        # Sort queue by match_score descending to keep high priority jobs on top
        queue.sort(key=lambda x: x.get("match_score", 0), reverse=True)

        _write_apply_queue(queue)
        return added_count

def get_queued_jobs() -> List[Dict[str, Any]]:
    """Get all queued jobs."""
    with _queue_lock:
        return _read_apply_queue()

def remove_queued_job(job_id: str) -> bool:
    """Remove a job from the queue."""
    with _queue_lock:
        queue = _read_apply_queue()
        initial_len = len(queue)
        queue = [j for j in queue if j.get("id") != job_id]
        
        if len(queue) < initial_len:
            return _write_apply_queue(queue)
        return False

def reorder_queue(job_ids: List[str]) -> List[Dict[str, Any]]:
    """
    Reorder the queue to match the provided list of IDs.
    Any existing jobs not in the list are appended at the end.
    """
    with _queue_lock:
        current_queue = _read_apply_queue()
        job_map = {j["id"]: j for j in current_queue}
        
        new_queue = []
        seen_ids = set()
        
        # Add in requested order
        for jid in job_ids:
            if jid in job_map:
                new_queue.append(job_map[jid])
                seen_ids.add(jid)
        
        # Append remaining
        for job in current_queue:
            if job["id"] not in seen_ids:
                new_queue.append(job)
                
        _write_apply_queue(new_queue)
        return new_queue

def clear_apply_queue() -> bool:
    """Clear all jobs from the apply queue."""
    with _queue_lock:
        return _write_apply_queue([])
