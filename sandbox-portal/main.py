"""
Sandbox Job Portal - Mock API for Demo

A standalone FastAPI application that simulates a job portal
with realistic job postings for testing the job application automation system.
"""

import json
import secrets
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional
import random
import httpx
import asyncio

from fastapi import FastAPI, HTTPException, Header, Depends, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ============================================================
# Configuration
# ============================================================

DATA_DIR = Path(__file__).parent / "data"
JOBS_FILE = DATA_DIR / "jobs.json"
APPLICATIONS_FILE = DATA_DIR / "applications.json"
COMPANIES_FILE = DATA_DIR / "companies.json"

# Valid API keys for authentication
VALID_API_KEYS = {
    "sandbox_demo_key_2026",
    "test_api_key_12345",
    "dev_portal_key_abc",
}

# ============================================================
# FastAPI App
# ============================================================

app = FastAPI(
    title="Sandbox Job Portal",
    description="Mock job portal API for testing job application automation",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Data Models
# ============================================================

class JobPosting(BaseModel):
    """Job posting data model."""
    id: str
    title: str
    company: str
    location: str
    job_type: str  # full-time, internship, contract
    experience_level: str  # entry, mid, senior
    salary_range: Optional[str] = None
    description: str
    requirements: List[str]
    responsibilities: List[str]
    skills_required: List[str]
    benefits: List[str]
    posted_date: str
    application_deadline: Optional[str] = None
    is_remote: bool = False
    visa_sponsorship: bool = False
    
class JobListItem(BaseModel):
    """Simplified job item for list view."""
    id: str
    title: str
    company: str
    location: str
    job_type: str
    experience_level: str
    salary_range: Optional[str] = None
    posted_date: str
    is_remote: bool
    skills_required: List[str]

class CompanyJobDetails(BaseModel):
    """Specific job details for the company."""
    status: str = "Accepting Applications"
    salary_range: str = "$100k - $150k"
    is_remote: bool = True
    posted_date: str = Field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d"))

class Company(BaseModel):
    """Expanded Company data model."""
    name: str
    location: str
    description: str = "A forward-thinking technology company."
    requirements: List[str] = ["Strong problem-solving skills", "Team player"]
    responsibilities: List[str] = ["Develop high-quality code", "Collaborate with cross-functional teams"]
    skills_required: List[str] = ["Python", "React"]
    job_details: CompanyJobDetails = Field(default_factory=CompanyJobDetails)

class ApplicationForm(BaseModel):
    """Application submission form."""
    applicant_name: str
    email: str
    phone: Optional[str] = None
    resume_text: str
    cover_letter: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    work_authorization: str = Field(..., description="e.g., 'US Citizen', 'Visa Required'")
    availability: str = Field(..., description="e.g., 'Immediately', '2 weeks notice'")
    salary_expectation: Optional[str] = None
    additional_info: Optional[str] = None

class ApplicationResponse(BaseModel):
    """Response after successful application submission."""
    application_id: str
    job_id: str
    status: str
    submitted_at: str
    message: str

class JobsListResponse(BaseModel):
    """Response for job listing."""
    jobs: List[JobListItem]
    total: int
    page: int
    per_page: int

# ============================================================
# Backend Notification
# ============================================================

async def _notify_backend():
    """Notify the main app that new jobs are available."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Main app is usually on 8000
            await client.post("http://localhost:8000/api/v1/autonomy/notify-new-jobs")
            print("Successfully notified backend of new jobs")
    except Exception as e:
        print(f"Failed to notify backend: {e}")

# ============================================================
# Data Persistence
# ============================================================

def _ensure_data_dir():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

def _read_jobs() -> List[Dict[str, Any]]:
    try:
        if JOBS_FILE.exists():
            with open(JOBS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("jobs", [])
        return []
    except Exception:
        return []

def _write_jobs(jobs: List[Dict[str, Any]]) -> bool:
    try:
        _ensure_data_dir()
        with open(JOBS_FILE, "w", encoding="utf-8") as f:
            json.dump({"jobs": jobs}, f, indent=2)
        return True
    except Exception:
        return False

def _read_applications() -> List[Dict[str, Any]]:
    try:
        if APPLICATIONS_FILE.exists():
            with open(APPLICATIONS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("applications", [])
        return []
    except Exception:
        return []

def _write_applications(applications: List[Dict[str, Any]]) -> bool:
    try:
        _ensure_data_dir()
        with open(APPLICATIONS_FILE, "w", encoding="utf-8") as f:
            json.dump({"applications": applications}, f, indent=2)
        return True
    except Exception:
        return False

def _read_companies() -> List[Dict[str, str]]:
    try:
        if COMPANIES_FILE.exists():
            with open(COMPANIES_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("companies", [])
        return []
    except Exception:
        return []

def _write_companies(companies: List[Dict[str, str]]) -> bool:
    try:
        _ensure_data_dir()
        with open(COMPANIES_FILE, "w", encoding="utf-8") as f:
            json.dump({"companies": companies}, f, indent=2)
        return True
    except Exception:
        return False

# ============================================================
# API Key Authentication
# ============================================================

async def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")):
    """Verify API key for protected endpoints."""
    if x_api_key not in VALID_API_KEYS:
        raise HTTPException(
            status_code=401,
            detail="Invalid API key. Use X-API-Key header with a valid key."
        )
    return x_api_key

# ============================================================
# API Endpoints
# ============================================================

@app.get("/")
async def root():
    """Sandbox portal root."""
    return {
        "name": "Sandbox Job Portal",
        "version": "1.0.0",
        "endpoints": {
            "list_jobs": "GET /sandbox/jobs",
            "job_details": "GET /sandbox/jobs/{id}",
            "apply": "POST /sandbox/jobs/{id}/apply (requires X-API-Key)",
            "list_companies": "GET /sandbox/companies",
            "add_company": "POST /sandbox/companies (requires X-API-Key)",
        },
        "demo_api_keys": list(VALID_API_KEYS),
    }

@app.get("/sandbox/companies", response_model=List[Company])
async def list_companies():
    """List all available companies."""
    return _read_companies()

@app.post("/sandbox/companies", response_model=Company)
async def add_company(company: Company, background_tasks: BackgroundTasks, api_key: str = Depends(verify_api_key)):
    """Add a new company to the sandbox."""
    companies = _read_companies()
    
    # Check if company already exists
    if any(c["name"].lower() == company.name.lower() for c in companies):
        raise HTTPException(status_code=400, detail="Company already exists")
        
    new_company = {
        "name": company.name,
        "location": company.location,
        "description": company.description,
        "requirements": company.requirements,
        "responsibilities": company.responsibilities,
        "skills_required": company.skills_required,
        "job_details": company.job_details.model_dump()
    }
    
    companies.append(new_company)
    _write_companies(companies)
    
    # --- Auto-generate 1-2 jobs for this new company ---
    try:
        initial_jobs_count = len(_read_jobs())
        jobs = _read_jobs()
        role_types = list(ROLE_TEMPLATES.keys())
        
        for _ in range(random.randint(1, 2)):
            role_type = random.choice(role_types)
            template = ROLE_TEMPLATES[role_type]
            
            title = random.choice(template["titles"])
            is_remote = company.job_details.is_remote
            location = "Remote" if is_remote else company.location
            
            skills = []
            skills.extend(random.sample(SKILLS["languages"], 2))
            if role_type in ["frontend", "fullstack"]:
                skills.extend(random.sample(SKILLS["frontend"], 2))
            if role_type in ["backend", "fullstack"]:
                skills.extend(random.sample(SKILLS["backend"], 2))
            if role_type == "ml_engineer":
                skills.extend(random.sample(SKILLS["ml"], 3))
            skills.extend(random.sample(SKILLS["cloud"], 2))
            
            job = {
                "id": str(uuid.uuid4()),
                "title": title,
                "company": company.name,
                "location": location,
                "job_type": template["job_type"],
                "experience_level": template["experience_level"],
                "salary_range": company.job_details.salary_range,
                "description": generate_job_description(role_type, company.name, title),
                "requirements": template["requirements"] + [f"Experience with {random.choice(skills)}"],
                "responsibilities": RESPONSIBILITIES_TEMPLATES.get(role_type, RESPONSIBILITIES_TEMPLATES["fullstack"]),
                "skills_required": list(set(skills)),
                "benefits": random.sample(BENEFITS, 5),
                "posted_date": datetime.now().strftime("%Y-%m-%d"),
                "application_deadline": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
                "is_remote": is_remote,
                "visa_sponsorship": random.random() < 0.4,
            }
            jobs.append(job)
            
        _write_jobs(jobs)
        print(f"Auto-generated {len(jobs) - initial_jobs_count} jobs for new company {company.name}")
        
    except Exception as e:
        print(f"Error generating jobs for new company: {e}")
    
    # Notify backend that new jobs might be here
    background_tasks.add_task(_notify_backend)
    
    return new_company

@app.get("/sandbox/jobs", response_model=JobsListResponse)
async def list_jobs(
    page: int = 1,
    per_page: int = 20,
    job_type: Optional[str] = None,
    experience_level: Optional[str] = None,
    is_remote: Optional[bool] = None,
    skill: Optional[str] = None,
    search: Optional[str] = None,
):
    """
    List all available job postings.
    
    Supports filtering by job_type, experience_level, is_remote, skill, and search query.
    """
    jobs = _read_jobs()
    
    # Apply search filter
    if search:
        search_lower = search.lower()
        jobs = [
            j for j in jobs 
            if search_lower in j.get("title", "").lower() or 
               search_lower in j.get("company", "").lower()
        ]
    
    # Apply filters
    if job_type:
        jobs = [j for j in jobs if j.get("job_type", "").lower() == job_type.lower()]
    if experience_level:
        jobs = [j for j in jobs if j.get("experience_level", "").lower() == experience_level.lower()]
    if is_remote is not None:
        jobs = [j for j in jobs if j.get("is_remote") == is_remote]
    if skill:
        jobs = [j for j in jobs if skill.lower() in [s.lower() for s in j.get("skills_required", [])]]
    
    # Pagination
    total = len(jobs)
    start = (page - 1) * per_page
    end = start + per_page
    paginated_jobs = jobs[start:end]
    
    # Convert to list items
    job_items = [
        JobListItem(
            id=j["id"],
            title=j["title"],
            company=j["company"],
            location=j["location"],
            job_type=j["job_type"],
            experience_level=j["experience_level"],
            salary_range=j.get("salary_range"),
            posted_date=j["posted_date"],
            is_remote=j.get("is_remote", False),
            skills_required=j.get("skills_required", [])[:5],  # Limit to 5 for list view
        )
        for j in paginated_jobs
    ]
    
    return JobsListResponse(
        jobs=job_items,
        total=total,
        page=page,
        per_page=per_page,
    )

@app.get("/sandbox/jobs/{job_id}", response_model=JobPosting)
async def get_job(job_id: str):
    """Get detailed information about a specific job posting."""
    jobs = _read_jobs()
    
    for job in jobs:
        if job["id"] == job_id:
            return JobPosting(**job)
    
    raise HTTPException(status_code=404, detail="Job not found")

@app.post("/sandbox/jobs/{job_id}/apply", response_model=ApplicationResponse)
async def apply_to_job(
    job_id: str,
    application: ApplicationForm,
    api_key: str = Depends(verify_api_key),
):
    """
    Submit an application to a job posting.
    
    Requires X-API-Key header for authentication.
    """
    # Verify job exists
    jobs = _read_jobs()
    job = next((j for j in jobs if j["id"] == job_id), None)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Create application record
    applications = _read_applications()
    
    application_record = {
        "id": str(uuid.uuid4()),
        "job_id": job_id,
        "job_title": job["title"],
        "company": job["company"],
        "submitted_at": datetime.utcnow().isoformat(),
        "status": "submitted",
        "applicant": application.model_dump(),
    }
    
    applications.append(application_record)
    _write_applications(applications)
    
    return ApplicationResponse(
        application_id=application_record["id"],
        job_id=job_id,
        status="submitted",
        submitted_at=application_record["submitted_at"],
        message=f"Application submitted successfully for {job['title']} at {job['company']}",
    )

@app.get("/sandbox/applications")
async def list_applications(
    enrich: bool = Query(False, description="Include messages and meetings for each application"),
    api_key: str = Depends(verify_api_key)
):
    """List all submitted applications (for testing/demo purposes)."""
    applications = _read_applications()
    
    if enrich:
        messages = _read_messages()
        meetings = _read_meetings()
        scheduled_msgs = _read_scheduled_messages()
        
        for app in applications:
            app_id = app.get("id")
            app["messages"] = [m for m in messages if m.get("application_id") == app_id]
            app["meetings"] = [m for m in meetings if m.get("application_id") == app_id]
            app["scheduled_messages"] = [m for m in scheduled_msgs if m.get("application_id") == app_id]
            
    return applications

@app.get("/sandbox/applications/{application_id}")
async def get_application(
    application_id: str,
    enrich: bool = Query(True, description="Include messages and meetings"),
    api_key: str = Depends(verify_api_key)
):
    """Get a specific application with its messages and meetings."""
    applications = _read_applications()
    app = next((a for a in applications if a.get("id") == application_id), None)
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    if enrich:
        messages = _read_messages()
        meetings = _read_meetings()
        scheduled_msgs = _read_scheduled_messages()
        app["messages"] = [m for m in messages if m.get("application_id") == application_id]
        app["meetings"] = [m for m in meetings if m.get("application_id") == application_id]
        app["scheduled_messages"] = [m for m in scheduled_msgs if m.get("application_id") == application_id]
        
    return app

@app.delete("/sandbox/applications/{application_id}")
async def delete_application(application_id: str, api_key: str = Depends(verify_api_key)):
    """Delete an application by ID."""
    applications = _read_applications()
    initial_len = len(applications)
    applications = [a for a in applications if a.get("id") != application_id]
    
    if len(applications) < initial_len:
        _write_applications(applications)
        return {"success": True, "message": "Application deleted"}
    
    raise HTTPException(status_code=404, detail="Application not found")

# ============================================================
# Recruiter Response Features
# ============================================================

MESSAGES_FILE = DATA_DIR / "messages.json"
SCHEDULED_MESSAGES_FILE = DATA_DIR / "scheduled_messages.json"
MEETINGS_FILE = DATA_DIR / "meetings.json"

def _read_scheduled_messages() -> List[Dict[str, Any]]:
    try:
        if SCHEDULED_MESSAGES_FILE.exists():
            with open(SCHEDULED_MESSAGES_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("scheduled_messages", [])
        return []
    except Exception:
        return []

def _write_scheduled_messages(messages: List[Dict[str, Any]]) -> bool:
    try:
        _ensure_data_dir()
        with open(SCHEDULED_MESSAGES_FILE, "w", encoding="utf-8") as f:
            json.dump({"scheduled_messages": messages}, f, indent=2)
        return True
    except Exception:
        return False

def _read_messages() -> List[Dict[str, Any]]:
    try:
        if MESSAGES_FILE.exists():
            with open(MESSAGES_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("messages", [])
        return []
    except Exception:
        return []

def _write_messages(messages: List[Dict[str, Any]]) -> bool:
    try:
        _ensure_data_dir()
        with open(MESSAGES_FILE, "w", encoding="utf-8") as f:
            json.dump({"messages": messages}, f, indent=2)
        return True
    except Exception:
        return False

def _read_meetings() -> List[Dict[str, Any]]:
    try:
        if MEETINGS_FILE.exists():
            with open(MEETINGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("meetings", [])
        return []
    except Exception:
        return []

def _write_meetings(meetings: List[Dict[str, Any]]) -> bool:
    try:
        _ensure_data_dir()
        with open(MEETINGS_FILE, "w", encoding="utf-8") as f:
            json.dump({"meetings": meetings}, f, indent=2)
        return True
    except Exception:
        return False

# --- Pydantic Models for Recruiter Features ---

class StatusUpdate(BaseModel):
    """Update application status."""
    status: str = Field(..., description="pending, interviewing, accepted, rejected")

class MessageCreate(BaseModel):
    """Send a message."""
    sender: str = Field(..., description="recruiter or applicant")
    content: str

class MessageScheduleCreate(BaseModel):
    """Schedule a message to be sent later."""
    content: str
    scheduled_for: str  # ISO datetime

class MeetingSchedule(BaseModel):
    """Schedule a meeting."""
    date: str
    time: str
    duration: int = 30  # minutes
    meeting_type: str = "interview"
    notes: Optional[str] = None

# --- API Endpoints ---

@app.patch("/sandbox/applications/{application_id}/status")
async def update_application_status(
    application_id: str, 
    status_update: StatusUpdate,
    api_key: str = Depends(verify_api_key)
):
    """Update the status of an application (accept, reject, etc.)."""
    valid_statuses = ["pending", "interviewing", "accepted", "rejected"]
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    applications = _read_applications()
    for app in applications:
        if app.get("id") == application_id:
            app["status"] = status_update.status
            app["status_updated_at"] = datetime.utcnow().isoformat()
            _write_applications(applications)
            return {"success": True, "status": status_update.status, "application_id": application_id}
    
    raise HTTPException(status_code=404, detail="Application not found")

@app.get("/sandbox/applications/{application_id}/messages")
async def get_messages(application_id: str, api_key: str = Depends(verify_api_key)):
    """Get all messages for an application."""
    messages = _read_messages()
    app_messages = [m for m in messages if m.get("application_id") == application_id]
    return {"messages": app_messages}

@app.post("/sandbox/applications/{application_id}/messages")
async def send_message(
    application_id: str,
    message: MessageCreate,
    api_key: str = Depends(verify_api_key)
):
    """Send a message to an applicant."""
    # Verify application exists
    applications = _read_applications()
    if not any(a.get("id") == application_id for a in applications):
        raise HTTPException(status_code=404, detail="Application not found")
    
    messages = _read_messages()
    new_message = {
        "id": str(uuid.uuid4()),
        "application_id": application_id,
        "sender": message.sender,
        "content": message.content,
        "sent_at": datetime.utcnow().isoformat(),
        "read": False
    }
    messages.append(new_message)
    _write_messages(messages)
    
    return {"success": True, "message": new_message}

@app.post("/sandbox/applications/{application_id}/messages/schedule")
async def schedule_message(
    application_id: str,
    schedule: MessageScheduleCreate,
    api_key: str = Depends(verify_api_key)
):
    """Schedule a message to be sent to an applicant."""
    # Verify application exists
    applications = _read_applications()
    if not any(a.get("id") == application_id for a in applications):
        raise HTTPException(status_code=404, detail="Application not found")
    
    scheduled_msgs = _read_scheduled_messages()
    new_schedule = {
        "id": str(uuid.uuid4()),
        "application_id": application_id,
        "content": schedule.content,
        "scheduled_for": schedule.scheduled_for,
        "created_at": datetime.utcnow().isoformat(),
        "status": "pending"
    }
    scheduled_msgs.append(new_schedule)
    _write_scheduled_messages(scheduled_msgs)
    
    return {"success": True, "scheduled_message": new_schedule}

@app.get("/sandbox/applications/{application_id}/meetings")
async def get_meetings(application_id: str, api_key: str = Depends(verify_api_key)):
    """Get all meetings for an application."""
    meetings = _read_meetings()
    app_meetings = [m for m in meetings if m.get("application_id") == application_id]
    return {"meetings": app_meetings}

@app.post("/sandbox/applications/{application_id}/schedule")
async def schedule_meeting(
    application_id: str,
    meeting: MeetingSchedule,
    api_key: str = Depends(verify_api_key)
):
    """Schedule a meeting with an applicant."""
    # Verify application exists
    applications = _read_applications()
    app = next((a for a in applications if a.get("id") == application_id), None)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    meetings = _read_meetings()
    new_meeting = {
        "id": str(uuid.uuid4()),
        "application_id": application_id,
        "applicant_name": app.get("applicant", {}).get("applicant_name", "Unknown"),
        "job_title": app.get("job_title", ""),
        "company": app.get("company", ""),
        "date": meeting.date,
        "time": meeting.time,
        "duration": meeting.duration,
        "meeting_type": meeting.meeting_type,
        "notes": meeting.notes,
        "created_at": datetime.utcnow().isoformat(),
        "status": "scheduled"
    }
    meetings.append(new_meeting)
    _write_meetings(meetings)
    
    # Also update application status to interviewing
    for a in applications:
        if a.get("id") == application_id:
            a["status"] = "interviewing"
            a["status_updated_at"] = datetime.utcnow().isoformat()
    _write_applications(applications)
    
    return {"success": True, "meeting": new_meeting}

@app.get("/sandbox/meetings")
async def list_all_meetings(api_key: str = Depends(verify_api_key)):
    """List all scheduled meetings."""
    return {"meetings": _read_meetings()}

# ============================================================
# Seed Data Generation
# ============================================================

# Company templates
COMPANIES = [
    ("Google", "Mountain View, CA"),
    ("Meta", "Menlo Park, CA"),
    ("Amazon", "Seattle, WA"),
    ("Microsoft", "Redmond, WA"),
    ("Apple", "Cupertino, CA"),
    ("Netflix", "Los Gatos, CA"),
    ("Stripe", "San Francisco, CA"),
    ("Airbnb", "San Francisco, CA"),
    ("Uber", "San Francisco, CA"),
    ("Lyft", "San Francisco, CA"),
    ("Spotify", "New York, NY"),
    ("Twitter/X", "San Francisco, CA"),
    ("LinkedIn", "Sunnyvale, CA"),
    ("Salesforce", "San Francisco, CA"),
    ("Adobe", "San Jose, CA"),
    ("Nvidia", "Santa Clara, CA"),
    ("Intel", "Santa Clara, CA"),
    ("Qualcomm", "San Diego, CA"),
    ("Databricks", "San Francisco, CA"),
    ("Snowflake", "Bozeman, MT"),
    ("Palantir", "Denver, CO"),
    ("Coinbase", "San Francisco, CA"),
    ("Robinhood", "Menlo Park, CA"),
    ("Square/Block", "San Francisco, CA"),
    ("Shopify", "Ottawa, ON (Remote)"),
    ("Notion", "San Francisco, CA"),
    ("Figma", "San Francisco, CA"),
    ("Vercel", "San Francisco, CA"),
    ("Supabase", "San Francisco, CA"),
    ("OpenAI", "San Francisco, CA"),
]

# Role templates
ROLE_TEMPLATES = {
    "swe_intern": {
        "titles": [
            "Software Engineering Intern",
            "SWE Intern - Summer 2026",
            "Software Developer Intern",
            "Engineering Intern",
        ],
        "experience_level": "entry",
        "job_type": "internship",
        "salary_range": "$40-60/hr",
        "requirements": [
            "Currently pursuing BS/MS in Computer Science or related field",
            "Strong programming skills in at least one language",
            "Understanding of data structures and algorithms",
            "Ability to work collaboratively in a team environment",
        ],
    },
    "fullstack": {
        "titles": [
            "Full Stack Engineer",
            "Full Stack Developer",
            "Software Engineer - Full Stack",
            "Full Stack Web Developer",
        ],
        "experience_level": "mid",
        "job_type": "full-time",
        "salary_range": "$120,000-180,000",
        "requirements": [
            "3+ years of experience in full-stack development",
            "Proficiency in React, Vue, or Angular",
            "Experience with Node.js, Python, or Go backend",
            "Strong understanding of RESTful APIs and databases",
        ],
    },
    "ml_engineer": {
        "titles": [
            "Machine Learning Engineer",
            "ML Engineer",
            "AI/ML Engineer",
            "Applied ML Scientist",
        ],
        "experience_level": "senior",
        "job_type": "full-time",
        "salary_range": "$180,000-250,000",
        "requirements": [
            "MS/PhD in Computer Science, ML, or related field",
            "5+ years of experience in machine learning",
            "Strong knowledge of PyTorch, TensorFlow, or JAX",
            "Experience deploying ML models at scale",
        ],
    },
    "frontend": {
        "titles": [
            "Frontend Engineer",
            "Frontend Developer",
            "UI Engineer",
            "React Developer",
        ],
        "experience_level": "mid",
        "job_type": "full-time",
        "salary_range": "$100,000-160,000",
        "requirements": [
            "3+ years of frontend development experience",
            "Expert knowledge of React and TypeScript",
            "Strong CSS/Tailwind skills",
            "Experience with testing frameworks",
        ],
    },
    "backend": {
        "titles": [
            "Backend Engineer",
            "Backend Developer",
            "Server-Side Engineer",
            "API Developer",
        ],
        "experience_level": "mid",
        "job_type": "full-time",
        "salary_range": "$120,000-170,000",
        "requirements": [
            "3+ years of backend development experience",
            "Strong knowledge of Python, Go, or Java",
            "Experience with PostgreSQL, Redis, Kafka",
            "Understanding of distributed systems",
        ],
    },
    "new_grad": {
        "titles": [
            "Software Engineer - New Grad",
            "New Graduate Software Engineer",
            "Junior Software Engineer",
            "Associate Software Engineer",
        ],
        "experience_level": "entry",
        "job_type": "full-time",
        "salary_range": "$90,000-130,000",
        "requirements": [
            "BS/MS in Computer Science or related field",
            "Strong foundation in algorithms and data structures",
            "Experience with at least one programming language",
            "Internship experience preferred",
        ],
    },
}

# Skills pools
SKILLS = {
    "languages": ["Python", "JavaScript", "TypeScript", "Go", "Java", "C++", "Rust", "Ruby", "Kotlin", "Swift"],
    "frontend": ["React", "Vue.js", "Angular", "Next.js", "Tailwind CSS", "HTML/CSS", "Webpack", "Redux"],
    "backend": ["Node.js", "FastAPI", "Django", "Flask", "Express.js", "Spring Boot", "GraphQL", "gRPC"],
    "ml": ["PyTorch", "TensorFlow", "Scikit-learn", "Pandas", "NumPy", "Hugging Face", "LangChain", "MLflow"],
    "data": ["PostgreSQL", "MongoDB", "Redis", "Elasticsearch", "Kafka", "Spark", "Snowflake", "BigQuery"],
    "cloud": ["AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform", "CI/CD"],
}

BENEFITS = [
    "Competitive salary and equity",
    "Health, dental, and vision insurance",
    "Unlimited PTO",
    "401(k) matching",
    "Remote work flexibility",
    "Learning and development budget",
    "Free meals and snacks",
    "Gym membership",
    "Mental health support",
    "Parental leave",
]

RESPONSIBILITIES_TEMPLATES = {
    "swe_intern": [
        "Work on real-world projects with mentorship from senior engineers",
        "Write clean, maintainable code following best practices",
        "Participate in code reviews and design discussions",
        "Collaborate with cross-functional teams",
        "Present project outcomes to stakeholders",
    ],
    "fullstack": [
        "Design and implement end-to-end features",
        "Build and maintain RESTful APIs",
        "Optimize application performance and scalability",
        "Mentor junior developers",
        "Participate in system architecture decisions",
    ],
    "ml_engineer": [
        "Design and implement machine learning models",
        "Build data pipelines for training and inference",
        "Deploy and monitor ML models in production",
        "Collaborate with research scientists",
        "Stay current with latest ML research",
    ],
    "frontend": [
        "Build responsive, accessible user interfaces",
        "Implement complex UI components",
        "Optimize frontend performance",
        "Collaborate with designers and product managers",
        "Write comprehensive tests",
    ],
    "backend": [
        "Design and build scalable backend services",
        "Develop and maintain APIs",
        "Optimize database queries and system performance",
        "Implement security best practices",
        "Participate in on-call rotations",
    ],
    "new_grad": [
        "Develop and maintain software applications",
        "Learn and apply engineering best practices",
        "Collaborate with team members on projects",
        "Participate in code reviews",
        "Contribute to technical documentation",
    ],
}

def generate_job_description(role_type: str, company: str, title: str) -> str:
    """Generate a realistic job description."""
    templates = [
        f"""Join {company} as a {title}!

We're looking for talented engineers to help us build the next generation of products. You'll work alongside world-class engineers and have the opportunity to make a significant impact.

At {company}, we believe in empowering our engineers to take ownership of their work and drive innovation. This is an exciting opportunity to grow your career while working on challenging problems at scale.

If you're passionate about technology and want to work with a team that values creativity and collaboration, we'd love to hear from you!""",

        f"""{company} is hiring a {title}!

We are on a mission to transform the industry, and we need exceptional engineers to help us achieve our goals. As a {title}, you will be instrumental in shaping our technical direction and building products that millions of users love.

We offer a collaborative environment where you'll learn from experienced engineers while having the autonomy to make meaningful contributions. Come join us and be part of something special!""",

        f"""Exciting opportunity at {company}!

We're seeking a {title} to join our growing engineering team. You'll work on cutting-edge technology and have the chance to solve complex problems that matter.

{company} is committed to creating an inclusive environment where everyone can thrive. We value diverse perspectives and believe that the best ideas come from teams with varied backgrounds and experiences.""",
    ]
    return random.choice(templates)

def seed_jobs():
    """Generate and seed 50+ realistic job postings."""
    jobs = []
    
    role_types = list(ROLE_TEMPLATES.keys())
    
    for i in range(55):
        # Pick random company from persisted companies
        companies = _read_companies()
        if not companies:
            companies = [{"name": c[0], "location": c[1]} for c in COMPANIES]
            
        company_data = random.choice(companies)
        company = company_data["name"]
        default_location = company_data["location"]
        
        role_type = random.choice(role_types)
        template = ROLE_TEMPLATES[role_type]
        
        # Generate job details
        title = random.choice(template["titles"])
        is_remote = random.random() < 0.3  # 30% remote
        location = "Remote" if is_remote else default_location
        
        # Generate skills based on role
        skills = []
        skills.extend(random.sample(SKILLS["languages"], 2))
        if role_type in ["frontend", "fullstack"]:
            skills.extend(random.sample(SKILLS["frontend"], 2))
        if role_type in ["backend", "fullstack"]:
            skills.extend(random.sample(SKILLS["backend"], 2))
        if role_type == "ml_engineer":
            skills.extend(random.sample(SKILLS["ml"], 3))
        skills.extend(random.sample(SKILLS["cloud"], 2))
        
        # Random posted date (within last 30 days)
        days_ago = random.randint(0, 30)
        posted_date = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d")
        
        # Application deadline (7-30 days from posting)
        deadline_days = random.randint(7, 30)
        deadline = (datetime.now() - timedelta(days=days_ago) + timedelta(days=deadline_days)).strftime("%Y-%m-%d")
        
        job = {
            "id": str(uuid.uuid4()),
            "title": title,
            "company": company,
            "location": location,
            "job_type": template["job_type"],
            "experience_level": template["experience_level"],
            "salary_range": template["salary_range"],
            "description": generate_job_description(role_type, company, title),
            "requirements": template["requirements"] + [f"Experience with {random.choice(skills)}"],
            "responsibilities": RESPONSIBILITIES_TEMPLATES.get(role_type, RESPONSIBILITIES_TEMPLATES["fullstack"]),
            "skills_required": list(set(skills)),
            "benefits": random.sample(BENEFITS, 5),
            "posted_date": posted_date,
            "application_deadline": deadline,
            "is_remote": is_remote,
            "visa_sponsorship": random.random() < 0.4,  # 40% offer sponsorship
        }
        
        jobs.append(job)
    
    _write_jobs(jobs)
    return len(jobs)

@app.post("/sandbox/seed")
async def seed_database(background_tasks: BackgroundTasks):
    """Seed the database with sample job postings."""
    count = seed_jobs()
    background_tasks.add_task(_notify_backend)
    return {"message": f"Successfully seeded {count} job postings"}

# ============================================================
# Startup Event
# ============================================================

@app.on_event("startup")
async def startup_event():
    """Seed jobs on startup if database is empty."""
    _ensure_data_dir()
    jobs = _read_jobs()
    if not jobs:
        seed_jobs()
        print(f"Seeded database with {len(_read_jobs())} job postings")
        # Notify backend on initial seed
        await _notify_backend()
        
    # Initialize companies if empty
    existing_companies = _read_companies()
    if not existing_companies:
        initial_companies = [{"name": c[0], "location": c[1]} for c in COMPANIES]
        _write_companies(initial_companies)
        print(f"Initialized {len(initial_companies)} companies")
