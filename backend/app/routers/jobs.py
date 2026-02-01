"""Jobs API endpoints."""

from typing import List, Optional, Union

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services import (
    load_jobs,
    save_jobs,
    add_job,
    get_job_by_id,
    delete_job,
)
from app.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/jobs", tags=["Jobs"])


# ============================================================
# Pydantic Schemas
# ============================================================

class JobBase(BaseModel):
    """Base job schema."""
    model_config = {"extra": "allow"}  # Allow extra fields from job_listings.json
    
    title: str = Field(..., min_length=1, max_length=255)
    company: str = Field(..., min_length=1, max_length=255)
    location: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    requirements: Optional[Union[str, List[str]]] = None
    url: Optional[str] = None
    salary_min: Optional[int] = Field(None, ge=0)
    salary_max: Optional[int] = Field(None, ge=0)
    job_type: Optional[str] = None  # full-time, part-time, contract, internship
    remote: Optional[bool] = None
    posted_at: Optional[str] = None
    deadline: Optional[str] = None
    source: Optional[str] = None  # linkedin, indeed, company website, etc.
    tags: Optional[list[str]] = None
    notes: Optional[str] = None
    is_favorite: Optional[bool] = None
    # Additional fields from job_listings.json
    skills: Optional[list[str]] = None
    visa_sponsorship: Optional[bool] = None
    experience_required: Optional[str] = None
    match_score: Optional[float] = None
    stored_at: Optional[str] = None
    status: Optional[str] = None


class JobCreate(JobBase):
    """Schema for creating a job."""
    pass


class JobUpdate(BaseModel):
    """Schema for updating a job."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    company: Optional[str] = Field(None, min_length=1, max_length=255)
    location: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    requirements: Optional[str] = None
    url: Optional[str] = None
    salary_min: Optional[int] = Field(None, ge=0)
    salary_max: Optional[int] = Field(None, ge=0)
    job_type: Optional[str] = None
    remote: Optional[bool] = None
    posted_at: Optional[str] = None
    deadline: Optional[str] = None
    source: Optional[str] = None
    tags: Optional[list[str]] = None
    notes: Optional[str] = None
    is_favorite: Optional[bool] = None


class JobResponse(JobBase):
    """Schema for job response."""
    id: str
    created_at: Optional[str] = None


class JobListResponse(BaseModel):
    """Schema for jobs list response."""
    jobs: List[JobResponse]
    total: int


# ============================================================
# API Endpoints
# ============================================================

@router.get("/queue/stats")
async def get_queue_stats():
    """Get current size of the application queue."""
    from app.services.job_ranker import get_queued_jobs
    queue = get_queued_jobs()
    return {"count": len(queue)}


@router.delete("/queue")
async def clear_queue():
    """Clear all jobs from the application queue."""
    from app.services.job_ranker import clear_apply_queue
    success = clear_apply_queue()
    return {"success": success}

@router.get("")
async def list_jobs(
    search: Optional[str] = Query(None, description="Search in title and company"),
    company: Optional[str] = Query(None, description="Filter by company"),
    location: Optional[str] = Query(None, description="Filter by location"),
    remote: Optional[bool] = Query(None, description="Filter by remote status"),
    job_type: Optional[str] = Query(None, description="Filter by job type"),
    is_favorite: Optional[bool] = Query(None, description="Filter by favorite status"),
):
    """
    List all jobs with optional filtering.
    """
    jobs = load_jobs()
    
    # Apply filters
    if search:
        search_lower = search.lower()
        jobs = [j for j in jobs if 
                search_lower in j.get("title", "").lower() or 
                search_lower in j.get("company", "").lower()]
    
    if company:
        jobs = [j for j in jobs if company.lower() in j.get("company", "").lower()]
    
    if location:
        jobs = [j for j in jobs if location.lower() in j.get("location", "").lower()]
    
    if remote is not None:
        jobs = [j for j in jobs if j.get("remote") == remote]
    
    if job_type:
        jobs = [j for j in jobs if j.get("job_type") == job_type]
    
    if is_favorite is not None:
        jobs = [j for j in jobs if j.get("is_favorite") == is_favorite]
    
    return {"jobs": jobs, "total": len(jobs)}


@router.post("", response_model=JobResponse, status_code=201)
async def create_job(job: JobCreate):
    """
    Create a new job entry.
    """
    job_data = job.model_dump()
    job_id = add_job(job_data)
    
    if not job_id:
        raise HTTPException(status_code=500, detail="Failed to create job")
    
    created_job = get_job_by_id(job_id)
    return created_job


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str):
    """
    Get a specific job by ID.
    """
    job = get_job_by_id(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return job


@router.put("/{job_id}", response_model=JobResponse)
async def update_job(job_id: str, job_update: JobUpdate):
    """
    Update a job entry.
    """
    existing_job = get_job_by_id(job_id)
    
    if not existing_job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Merge updates
    update_data = job_update.model_dump(exclude_unset=True)
    existing_job.update(update_data)
    
    # Save all jobs
    jobs = load_jobs()
    jobs = [existing_job if j.get("id") == job_id else j for j in jobs]
    
    if not save_jobs(jobs):
        raise HTTPException(status_code=500, detail="Failed to update job")
    
    return get_job_by_id(job_id)


@router.delete("/{job_id}", status_code=204)
async def remove_job(job_id: str):
    """
    Delete a job entry.
    """
    if not get_job_by_id(job_id):
        raise HTTPException(status_code=404, detail="Job not found")
    
    if not delete_job(job_id):
        raise HTTPException(status_code=500, detail="Failed to delete job")
    
    return None


@router.post("/{job_id}/favorite", response_model=JobResponse)
async def toggle_favorite(job_id: str):
    """
    Toggle the favorite status of a job.
    """
    job = get_job_by_id(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job["is_favorite"] = not job.get("is_favorite", False)
    
    # Save all jobs
    jobs = load_jobs()
    jobs = [job if j.get("id") == job_id else j for j in jobs]
    
    if not save_jobs(jobs):
        raise HTTPException(status_code=500, detail="Failed to update job")
    
    return job


@router.post("/bulk", response_model=JobListResponse)
async def bulk_create_jobs(jobs: List[JobCreate]):
    """
    Create multiple jobs at once.
    """
    existing_jobs = load_jobs()
    new_jobs = []
    
    for job in jobs:
        job_data = job.model_dump()
        new_jobs.append(job_data)
    
    all_jobs = existing_jobs + new_jobs
    
    if not save_jobs(all_jobs):
        raise HTTPException(status_code=500, detail="Failed to save jobs")
    
    # Reload to get IDs
    saved_jobs = load_jobs()
    return JobListResponse(jobs=saved_jobs, total=len(saved_jobs))


# ============================================================
# Job Search Endpoint
# ============================================================

class JobSearchRequest(BaseModel):
    """Schema for job search request."""
    required_skills: Optional[List[str]] = None
    preferred_locations: Optional[List[str]] = None
    remote_only: bool = False
    visa_sponsorship_required: bool = False
    min_salary: Optional[int] = None
    experience_levels: Optional[List[str]] = None
    job_types: Optional[List[str]] = None


class JobSearchResponse(BaseModel):
    """Schema for job search response."""
    success: bool
    message: str
    jobs: List[dict]  # Using dict to allow flexibility with external API response structure
    total_fetched: int
    total_matching: int
    new_jobs_stored: int


@router.post("/search", response_model=JobSearchResponse)
async def search_jobs(request: JobSearchRequest):
    """
    Search for jobs from external sources (sandbox) based on constraints.
    """
    from app.services.job_search import search_and_store_jobs
    
    result = await search_and_store_jobs(
        required_skills=request.required_skills,
        preferred_locations=request.preferred_locations,
        remote_only=request.remote_only,
        visa_sponsorship_required=request.visa_sponsorship_required,
        min_salary=request.min_salary,
        experience_levels=request.experience_levels,
        job_types=request.job_types,
    )
    
    return result


@router.get("/discovery/status")
async def discovery_status():
    """Get status of autonomous discovery agent."""
    from app.services.auto_discovery import get_discovery_status
    return get_discovery_status()


# ============================================================
# Job Ranking Endpoint
# ============================================================

class JobRankRequest(BaseModel):
    """Schema for job ranking request."""
    profile_data: dict  # Full profile data
    remote_only: bool = False
    visa_required: bool = False
    preferred_locations: Optional[List[str]] = None
    limit: int = 10
    auto_queue: bool = True


class JobRankResponse(BaseModel):
    """Schema for job ranking response."""
    ranked_jobs: List[dict]
    queued_count: int


@router.post("/rank", response_model=JobRankResponse)
async def rank_jobs(request: JobRankRequest):
    """
    Rank stored jobs based on profile match and queue top candidates.
    """
    from app.services.job_search import get_stored_jobs
    from app.services.job_ranker import rank_jobs as service_rank_jobs
    from app.services.job_ranker import add_to_apply_queue
    
    # Get currently stored jobs
    # First try 'new' jobs, then fallback to all if search just happened
    jobs = get_stored_jobs(status="new", limit=100)
    
    if not jobs:
        # Fallback: if we just searched, the jobs might be in the system but status='new' check failed 
        # for some reason, or we want to rank EVERYTHING available.
        jobs = get_stored_jobs(status=None, limit=100)
    
    if not jobs:
        return JobRankResponse(ranked_jobs=[], queued_count=0)
    
    # Rank them
    ranked = service_rank_jobs(
        jobs=jobs,
        profile=request.profile_data,
        remote_only=request.remote_only,
        visa_required=request.visa_required,
        preferred_locations=request.preferred_locations,
    )
    
    # Take top N
    top_matches = ranked[:request.limit]
    
    # Add to apply queue if requested
    queued_count = 0
    if request.auto_queue:
        queued_count = add_to_apply_queue(top_matches)
    
    return JobRankResponse(
        ranked_jobs=top_matches,
        queued_count=queued_count
    )
    
    # Check for global autonomy and trigger batch if needed
    if request.auto_queue and queued_count > 0:
        from app.services.apply_policy import get_policy
        policy = get_policy()
        if policy.get("global_autonomy_enabled", False):
            # Fire and forget batch start
            from app.services.batch_processor import start_batch_processing
            try:
                start_batch_processing()
                logger.info("Auto-triggered batch processing after ranking")
            except Exception as e:
                logger.error(f"Failed to auto-trigger batch: {e}")

@router.post("/queue/{job_id}")
async def queue_job_endpoint(job_id: str):
    """
    Manually add a specific job to the apply queue.
    """
    from app.services.data_store import get_job_by_id
    from app.services.job_ranker import add_to_apply_queue
    
    job = get_job_by_id(job_id)
    if not job:
        # Check storage if not in main db
        from app.services.job_search import get_stored_jobs
        all_jobs = get_stored_jobs(status=None, limit=500)
        job = next((j for j in all_jobs if j["id"] == job_id), None)
        
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    added = add_to_apply_queue([job])
    return {"success": True, "added": added > 0}



