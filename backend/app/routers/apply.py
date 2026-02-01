"""Apply API endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional, List

from app.services.application_assembler import assemble_application_package, AssemblerError
from app.services.auto_submit import submit_application, SubmissionError
from app.services.batch_processor import start_batch_processing, stop_batch_processing, get_batch_status
from app.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/v1/apply", tags=["Apply"])

class AssembleApplicationRequest(BaseModel):
    """Request schema for assembling an application."""
    job_id: str
    profile_data: Optional[Dict[str, Any]] = None

class SubmitApplicationRequest(BaseModel):
    """Request schema for submitting an application."""
    job_id: str

class StartBatchRequest(BaseModel):
    """Request schema for starting batch processing."""
    student_id: Optional[str] = None
    limit: Optional[int] = None

@router.post("/assemble", response_model=Dict[str, Any])
def assemble_package(request: AssembleApplicationRequest):
    """
    Assemble a complete application package.
    
    Generates: Resume, Cover Letter, Evidence Map, Answers.
    Returns the full JSON package and saves a record.
    """
    try:
        package = assemble_application_package(request.job_id, request.profile_data)
        return package
        
    except AssemblerError as e:
        logger.error(f"Assembly error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
        
    except Exception as e:
        logger.error(f"Unexpected error assembling application: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/submit", response_model=Dict[str, Any])
async def submit_package(request: SubmitApplicationRequest):
    """
    Submit an assembled application to the Sandbox Portal.
    
    Requires prior assembly (status='assembled').
    Handles retries and status updates.
    """
    try:
        result = await submit_application(request.job_id)
        return result
        
    except SubmissionError as e:
        logger.error(f"Submission error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
        
    except Exception as e:
        logger.error(f"Unexpected error submitting application: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Batch Endpoints

@router.post("/batch/start", response_model=Dict[str, Any])
def start_batch(request: StartBatchRequest):
    """Start the autonomous batch application process."""
    return start_batch_processing(request.student_id, request.limit)

@router.post("/batch/stop", response_model=Dict[str, Any])
def stop_batch():
    """Stop the batch application process."""
    return stop_batch_processing()

@router.get("/batch/status", response_model=Dict[str, Any])
def batch_status():
    """Get the current status of the batch process."""
    return get_batch_status()

# Queue Management Endpoints

@router.get("/queue", response_model=Dict[str, Any])
def get_queue():
    """Get current apply queue."""
    try:
        logger.info("Fetching apply queue...")
        from app.services.job_ranker import get_queued_jobs
        queue = get_queued_jobs()
        logger.info(f"Queue fetched: {len(queue)} items")
        return {"queue": queue}
    except Exception as e:
        import traceback
        logger.error(f"Failed to get queue: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/queue/{job_id}", response_model=Dict[str, Any])
def remove_from_queue(job_id: str):
    """Remove a job from the queue."""
    from app.services.job_ranker import remove_queued_job
    if remove_queued_job(job_id):
        return {"success": True, "message": "Job removed from queue"}
    raise HTTPException(status_code=404, detail="Job not found in queue")

class ReorderRequest(BaseModel):
    job_ids: List[str]

@router.post("/queue/reorder", response_model=Dict[str, Any])
def reorder_queue_endpoint(request: ReorderRequest):
    """Reorder queue based on ID list."""
    from app.services.job_ranker import reorder_queue
    new_queue = reorder_queue(request.job_ids)
    return {"success": True, "queue": new_queue}
