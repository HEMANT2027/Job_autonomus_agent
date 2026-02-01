"""
Application Assembler Service

Orchestrates the creation of a complete application package including:
- Tailored Resume
- Personalized Cover Letter
- Evidence Map
- Questionnaire Answers
"""

import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
import traceback

from app.logging_config import get_logger
from app.services.data_store import (
    get_job_by_id, 
    load_student_profile,
    save_application,
    update_application,
    get_application_by_id
)
from app.services.resume_tailor import tailor_resume
from app.services.cover_letter import generate_cover_letter
from app.services.evidence_mapper import map_evidence
from app.services.answer_library import generate_answers
from app.services.audit_log import log_audit_event

logger = get_logger(__name__)

class AssemblerError(Exception):
    """Base exception for application assembly errors."""
    pass

def assemble_application_package(job_id: str, profile_data: Optional[Dict[str, Any]] = None, should_stop: Optional[callable] = None) -> Dict[str, Any]:
    """
    Assemble all artifacts into a final application package.
    """
    try:
        # 1. Fetch Context
        if should_stop and should_stop(): raise AssemblerError("Stopped by user")
        
        job = get_job_by_id(job_id)
        if not job:
            raise AssemblerError(f"Job not found: {job_id}")
            
        if not profile_data:
            profile_data = load_student_profile()
            if not profile_data:
                raise AssemblerError("Student profile not found")
        
        # Log Data Snapshot
        log_audit_event(job_id, "snapshot", {"profile_snapshot": profile_data}, "Profile Data Loaded")

        logger.info(f"Assembling application for {job.get('title')} at {job.get('company')}")

        # 2. Generate Components (sequentially for now, could be async)
        
        # Resume
        if should_stop and should_stop(): raise AssemblerError("Stopped by user")
        logger.info("Tailoring resume...")
        resume = tailor_resume(job_id, profile_data)
        log_audit_event(job_id, "generation", {"type": "resume", "content": resume}, "Resume Tailored")
        
        # Cover Letter
        if should_stop and should_stop(): raise AssemblerError("Stopped by user")
        logger.info("Generating cover letter...")
        cl_result = generate_cover_letter(job_id, profile_data)
        cover_letter_text = cl_result.get("cover_letter_text", "")
        log_audit_event(job_id, "generation", {"type": "cover_letter", "content": cl_result}, "Cover Letter Generated")
        
        # Evidence Map
        if should_stop and should_stop(): raise AssemblerError("Stopped by user")
        logger.info("Mapping evidence...")
        evidence_map = map_evidence(job_id, profile_data)
        log_audit_event(job_id, "generation", {"type": "evidence", "content": evidence_map}, "Evidence Mapped")
        
        # Answers (Standard Questions)
        if should_stop and should_stop(): raise AssemblerError("Stopped by user")
        logger.info("Generating answers...")
        # Get answers for standard categories
        answers_map = generate_answers(profile_data)
        
        # 3. Construct Package
        package_id = str(uuid.uuid4())
        package = {
            "id": package_id,
            "job_id": job_id,
            "job_title": job.get("title"),
            "company": job.get("company"),
            "assembled_at": datetime.utcnow().isoformat(),
            "artifacts": {
                "resume": resume,
                "cover_letter": cover_letter_text,
                "evidence_map": evidence_map,
                "questionnaire_answers": answers_map,
            },
            "profile_snapshot": {
                "name": profile_data.get("personal_info", {}).get("name") or profile_data.get("name"),
                "email": profile_data.get("personal_info", {}).get("email") or profile_data.get("email"),
                "phone": profile_data.get("personal_info", {}).get("phone") or profile_data.get("phone"),
                "linkedin": profile_data.get("links", {}).get("linkedin")
            },
            "status": "ready_to_submit"
        }
        
        # 4. Save to Audit Trail (Applications DB)
        # Check if application already exists for this job, if so update it, else create
        # For now, simplistic approach: always create new assembled record or find existing pending?
        # Let's create a new application entry with detailed metadata using the generic save
        
        app_data = {
            "job_id": job_id,
            "company_name": job.get("company", ""),
            "job_title": job.get("title", ""),
            "job_url": job.get("url"),
            "location": job.get("location"),
            "remote": job.get("remote", False),
            "status": "assembled",
            "resume_used": "tailored_v1", # Placeholder for actual file path if we rendered PDF
            "cover_letter": cover_letter_text,
            "notes": f"Package assembled with {len(evidence_map)} mapped evidence items.",
            "application_package": package # Storing full JSON blob in a custom field (might need schema update or just generic dict support)
        }
        
        # Note: application_package is not in standard schema, but data_store uses dicts so it should pass through
        # if the schema relies on Pydantic it might strip it.
        # But data_store saves what is passed usually if it just dumps JSON.
        # Let's return the package regardless.
        
        app_id = save_application(app_data)
        package["application_id"] = app_id
        
        logger.info(f"Assembly complete. Package ID: {package_id}")
        return package

    except Exception as e:
        logger.error(f"Assembly failed: {traceback.format_exc()}")
        raise AssemblerError(f"Assembly failed: {str(e)}")
