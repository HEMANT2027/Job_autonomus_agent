"""Student profile API endpoints."""

from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field

from app.services import load_student_profile, save_student_profile
from app.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/profile", tags=["Profile"])


# ============================================================
# Pydantic Schemas
# ============================================================

class Education(BaseModel):
    """Education entry schema."""
    institution: str
    degree: str
    field_of_study: Optional[str] = None
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    gpa: Optional[float] = None
    score: Optional[str] = None  # Generic score (GPA, Percentage, Grade)


class Experience(BaseModel):
    """Work experience entry schema."""
    company: str
    title: str
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    current: bool = False
    description: Optional[str] = None


class StudentProfileCreate(BaseModel):
    """Schema for creating/updating student profile."""
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    location: Optional[str] = Field(None, max_length=255)
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    summary: Optional[str] = None
    skills: list[str] = []
    education: list[Education] = []
    experience: list[Experience] = []
    certifications: list[str] = []
    languages: list[str] = []
    preferred_job_types: list[str] = []  # full-time, part-time, contract, internship
    preferred_locations: list[str] = []
    remote_preference: Optional[str] = None  # remote, hybrid, onsite, any
    expected_salary_min: Optional[int] = None
    expected_salary_max: Optional[int] = None
    preferences: Optional[Dict[str, str]] = None  # Target role, tone, strengths, etc.


class StudentProfileResponse(StudentProfileCreate):
    """Schema for profile response."""
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ============================================================
# API Endpoints
# ============================================================

@router.get("", response_model=Optional[StudentProfileResponse])
async def get_profile():
    """
    Get the current student profile.
    
    Returns the student profile if it exists, otherwise returns null.
    """
    profile = load_student_profile()
    if profile is None:
        return None
    
    # Transform legacy nested format to flat format if needed
    if "personal_info" in profile:
        personal_info = profile.get("personal_info", {})
        links = profile.get("links", {})
        
        transformed = {
            "name": personal_info.get("name", ""),
            "email": personal_info.get("email", "").replace("#", ""),  # Remove # if present
            "phone": personal_info.get("phone"),
            "location": personal_info.get("location"),
            "linkedin_url": links.get("linkedin"),
            "github_url": links.get("github"),
            "portfolio_url": links.get("portfolio"),
            "summary": profile.get("summary", ""),
            "skills": profile.get("skills", []),
            "education": [
                {
                    "institution": edu.get("institution", ""),
                    "degree": edu.get("degree", ""),
                    "field_of_study": edu.get("field_of_study"),
                    "start_year": edu.get("start_year"),
                    "end_year": edu.get("end_year"),
                    "gpa": float(str(edu.get("gpa", "0")).split("/")[0]) if edu.get("gpa") else None,
                    "score": edu.get("score") or (str(edu.get("gpa")) if edu.get("gpa") else None)
                }
                for edu in profile.get("education", [])
            ],
            "experience": [
                {
                    "company": exp.get("company", ""),
                    "title": exp.get("title", ""),
                    "location": exp.get("location"),
                    "start_date": exp.get("start_date"),
                    "end_date": exp.get("end_date"),
                    "current": exp.get("current", False),
                    "description": exp.get("description")
                }
                for exp in profile.get("experience", [])
            ],
            "certifications": profile.get("certifications", []),
            "languages": profile.get("languages", []),
            "preferred_job_types": profile.get("preferred_job_types", []),
            "preferred_locations": profile.get("preferred_locations", []),
            "remote_preference": profile.get("remote_preference"),
            "expected_salary_min": profile.get("expected_salary_min"),
            "expected_salary_max": profile.get("expected_salary_max"),
            "created_at": profile.get("created_at"),
            "updated_at": profile.get("updated_at")
        }
        return transformed
    
    return profile


@router.post("", response_model=StudentProfileResponse)
async def create_or_update_profile(profile: StudentProfileCreate):
    """
    Create or update the student profile.
    
    This endpoint will create a new profile if none exists,
    or update the existing profile with the provided data.
    """
    profile_data = profile.model_dump()
    
    # Preserve created_at if updating
    existing = load_student_profile()
    if existing and "created_at" in existing:
        profile_data["created_at"] = existing["created_at"]
    
    success = save_student_profile(profile_data)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save profile")
    
    # Return the saved profile
    saved_profile = load_student_profile()
    return saved_profile


@router.patch("", response_model=StudentProfileResponse)
async def partial_update_profile(updates: Dict[str, Any]):
    """
    Partially update the student profile.
    
    Only the provided fields will be updated.
    """
    existing = load_student_profile()
    
    if existing is None:
        raise HTTPException(status_code=404, detail="Profile not found. Create one first.")
    
    # Merge updates with existing data
    existing.update(updates)
    
    success = save_student_profile(existing)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update profile")
    
    return load_student_profile()


@router.delete("", status_code=204)
async def delete_profile():
    """
    Delete the student profile.
    """
    success = save_student_profile(None)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete profile")
    
    return None
