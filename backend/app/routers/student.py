"""Student API endpoints including resume upload."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.services.resume_parser import (
    ResumeParseError,
    extract_text_from_pdf,
    get_text_preview,
    MAX_FILE_SIZE,
)
from app.services.resume_storage import (
    save_resume_data,
    get_all_resumes,
    get_resume_by_id,
    get_latest_resume,
    delete_resume,
)
from app.services.profile_extractor import (
    ProfileExtractionError,
    extract_profile_from_text,
    get_empty_profile_template,
)
from app.services.bullet_generator import (
    BulletGenerationError,
    generate_bullets_from_profile,
    validate_bullets_grounding,
    group_bullets_by_category,
)
from app.services.bullet_storage import (
    save_bullets,
    get_all_bullets,
    get_bullets_by_category,
    get_bullet_stats,
)
from app.services.answer_library import (
    AnswerGenerationError,
    generate_answers,
    save_answers,
    get_all_answers,
    get_answer_by_id,
    update_answer,
    get_question_categories,
)
from app.services.proof_pack import (
    ProofPackError,
    build_proof_pack_from_profile,
    save_proof_pack,
    save_proof_pack,
    get_latest_proof_pack,
)
from app.routers.profile import StudentProfileCreate, StudentProfileResponse
from app.services.data_store import (
    save_student_profile,
    load_student_profile,
)
from app.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/v1/student", tags=["Student"])


# ============================================================
# Response Schemas
# ============================================================

class ResumeUploadResponse(BaseModel):
    """Response schema for resume upload."""
    id: str
    filename: str
    file_size: int
    text_preview: str
    full_text_length: int
    message: str


class ResumeDataResponse(BaseModel):
    """Response schema for resume data."""
    id: str
    filename: str
    extracted_text: str
    file_size: int
    created_at: str


class ResumeListResponse(BaseModel):
    """Response schema for resume list."""
    resumes: list[dict]
    total: int


class ExtractProfileRequest(BaseModel):
    """Request schema for profile extraction."""
    resume_id: Optional[str] = None
    resume_text: Optional[str] = None


class ExtractProfileResponse(BaseModel):
    """Response schema for extracted profile."""
    profile: Dict[str, Any]
    source: str
    message: str


class GenerateBulletsRequest(BaseModel):
    """Request schema for bullet generation."""
    profile_data: Dict[str, Any]
    save_to_bank: bool = True


class GenerateBulletsResponse(BaseModel):
    """Response schema for generated bullets."""
    bullets: List[Dict[str, Any]]
    by_category: Dict[str, List[Dict[str, Any]]]
    total: int
    saved: bool
    message: str


class BulletStatsResponse(BaseModel):
    """Response schema for bullet bank statistics."""
    total_bullets: int
    by_category: Dict[str, int]
    by_source_type: Dict[str, int]
    with_metrics: int
    grounded: int


class GenerateAnswersRequest(BaseModel):
    """Request schema for answer generation."""
    profile_data: Dict[str, Any]
    constraints: Optional[Dict[str, Any]] = None
    categories: Optional[List[str]] = None
    save_to_library: bool = True


class GenerateAnswersResponse(BaseModel):
    """Response schema for generated answers."""
    answers: Dict[str, Dict[str, Any]]
    total: int
    saved: bool
    message: str


class UpdateAnswerRequest(BaseModel):
    """Request schema for updating an answer."""
    answer_text: str


class BuildProofPackRequest(BaseModel):
    """Request schema for building a proof pack."""
    profile_data: Dict[str, Any]
    save_to_pack: bool = True


class ProofItem(BaseModel):
    """Schema for a single proof item."""
    id: str
    title: str
    url: str
    category: str
    description: str
    related_skills: List[str]
    related_project_name: Optional[str] = None
    created_at: str


class ProofPackResponse(BaseModel):
    """Response schema for a proof pack."""
    items: List[ProofItem]
    total: int
    saved: bool
    message: str


# ============================================================
# API Endpoints
# ============================================================

@router.post("/upload-resume", response_model=ResumeUploadResponse)
async def upload_resume(file: UploadFile = File(...)):
    """
    Upload and parse a resume PDF file.
    
    - Accepts PDF file upload (max 5MB)
    - Extracts raw text from the PDF
    - Stores extracted text in database
    - Returns text preview
    
    Raises:
        HTTPException 400: If file is not a PDF or exceeds size limit
        HTTPException 422: If PDF is corrupted or cannot be parsed
    """
    # Validate file type
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400, 
            detail="Only PDF files are accepted. Please upload a .pdf file."
        )
    
    # Validate content type
    if file.content_type and file.content_type != 'application/pdf':
        logger.warning(f"Unexpected content type: {file.content_type}")
    
    try:
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        
        # Check file size before processing
        if file_size > MAX_FILE_SIZE:
            size_mb = file_size / (1024 * 1024)
            raise HTTPException(
                status_code=400,
                detail=f"File size ({size_mb:.2f}MB) exceeds maximum allowed size (5MB)"
            )
        
        if file_size == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
        
        # Extract text from PDF
        extracted_text = extract_text_from_pdf(file_content)
        
        # Save to database
        resume_record = save_resume_data(
            filename=file.filename,
            extracted_text=extracted_text,
            file_size=file_size,
        )
        
        if not resume_record:
            raise HTTPException(
                status_code=500, 
                detail="Failed to save resume data"
            )
        
        # Generate preview
        text_preview = get_text_preview(extracted_text, max_length=500)
        
        logger.info(f"Resume uploaded successfully: {file.filename}")
        
        return ResumeUploadResponse(
            id=resume_record["id"],
            filename=file.filename,
            file_size=file_size,
            text_preview=text_preview,
            full_text_length=len(extracted_text),
            message="Resume uploaded and parsed successfully"
        )
        
    except ResumeParseError as e:
        logger.error(f"Resume parse error: {e}")
        raise HTTPException(status_code=422, detail=str(e))
    
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"Unexpected error processing resume: {e}")
        raise HTTPException(
            status_code=500, 
            detail="An unexpected error occurred while processing the resume"
        )


@router.get("/resumes", response_model=ResumeListResponse)
async def list_resumes():
    """
    List all uploaded resumes.
    
    Returns a list of resume records with metadata (without full text).
    """
    resumes = get_all_resumes()
    
    # Return metadata only (exclude full extracted_text for list view)
    resume_list = [
        {
            "id": r["id"],
            "filename": r["filename"],
            "file_size": r["file_size"],
            "created_at": r["created_at"],
            "text_preview": get_text_preview(r.get("extracted_text", ""), 200),
        }
        for r in resumes
    ]
    
    return ResumeListResponse(resumes=resume_list, total=len(resume_list))


@router.get("/resumes/{resume_id}", response_model=ResumeDataResponse)
async def get_resume(resume_id: str):
    """
    Get a specific resume by ID.
    
    Returns the full resume data including extracted text.
    """
    resume = get_resume_by_id(resume_id)
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    return ResumeDataResponse(**resume)


@router.get("/resumes/latest", response_model=Optional[ResumeDataResponse])
async def get_latest():
    """
    Get the most recently uploaded resume.
    """
    resume = get_latest_resume()
    
    if not resume:
        return None
    
    return ResumeDataResponse(**resume)


@router.delete("/resumes/{resume_id}", status_code=204)
async def remove_resume(resume_id: str):
    """
    Delete a resume by ID.
    """
    if not get_resume_by_id(resume_id):
        raise HTTPException(status_code=404, detail="Resume not found")
    
    if not delete_resume(resume_id):
        raise HTTPException(status_code=500, detail="Failed to delete resume")
    
    return None


@router.post("/extract-profile", response_model=ExtractProfileResponse)
async def extract_profile(request: ExtractProfileRequest):
    """
    Extract structured profile data from resume text using LLM.
    
    Provide either:
    - resume_id: ID of a previously uploaded resume
    - resume_text: Raw text to extract from
    
    Returns editable JSON with:
    - Education (degree, institution, year, GPA)
    - Projects (name, description, technologies, dates)
    - Experience (company, role, duration, responsibilities)
    - Skills (technical skills only)
    - Links (GitHub, LinkedIn, portfolio)
    
    Includes validation warnings for potentially hallucinated data.
    """
    resume_text = None
    source = "text"
    
    # Get resume text from ID or direct input
    if request.resume_id:
        resume = get_resume_by_id(request.resume_id)
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        resume_text = resume.get("extracted_text", "")
        source = f"resume:{request.resume_id}"
    elif request.resume_text:
        resume_text = request.resume_text
        source = "direct_text"
    else:
        raise HTTPException(
            status_code=400, 
            detail="Either resume_id or resume_text must be provided"
        )
    
    if not resume_text or len(resume_text.strip()) < 50:
        raise HTTPException(
            status_code=400, 
            detail="Resume text is too short to extract meaningful data"
        )
    
    try:
        # Extract profile using LLM
        extracted_profile = extract_profile_from_text(resume_text)
        
        # Save profile to data store
        save_student_profile(extracted_profile)
        
        logger.info(f"Profile extracted successfully from {source}")
        
        return ExtractProfileResponse(
            profile=extracted_profile,
            source=source,
            message="Profile extracted and saved successfully. Please review for accuracy."
        )
        
    except ProfileExtractionError as e:
        logger.error(f"Profile extraction error: {e}")
        raise HTTPException(status_code=422, detail=str(e))
    
    except Exception as e:
        logger.error(f"Unexpected error extracting profile: {e}")
        raise HTTPException(
            status_code=500, 
            detail="An unexpected error occurred while extracting profile"
        )


@router.get("/profile-template")
async def get_profile_template():
    """
    Get an empty profile template for manual editing.
    
    Returns the expected structure for student profile data.
    """
    return get_empty_profile_template()


@router.get("/profile", response_model=Optional[Dict[str, Any]])
async def get_profile():
    """
    Get the currently stored student profile.
    """
    return load_student_profile()


@router.put("/profile", response_model=StudentProfileResponse)
async def update_profile(profile: StudentProfileCreate):
    """
    Update the student profile data manually.
    """
    try:
        # Convert Pydantic model to dict
        profile_data = profile.model_dump()
        
        # Save to data store
        save_student_profile(profile_data)
        
        logger.info("Profile updated successfully")
        return profile_data
        
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to update profile")


@router.post("/generate-bullets", response_model=GenerateBulletsResponse)
async def generate_bullets(request: GenerateBulletsRequest):
    """
    Generate achievement bullets from student profile data using LLM.
    
    Takes extracted profile data (from /extract-profile endpoint) and generates
    professional achievement bullets in action verb + quantifiable result format.
    
    Features:
    - Bullets are grounded to specific projects/experiences
    - Each bullet is categorized (backend, frontend, ML, leadership, etc.)
    - Validation flags for ungrounded bullets
    - Optional storage in bullet bank
    
    Returns categorized bullet list with source references.
    """
    profile_data = request.profile_data
    
    # Validate profile has content
    if not profile_data:
        raise HTTPException(status_code=400, detail="Profile data is required")
    
    has_experience = profile_data.get("experience") and len(profile_data["experience"]) > 0
    has_projects = profile_data.get("projects") and len(profile_data["projects"]) > 0
    
    if not has_experience and not has_projects:
        raise HTTPException(
            status_code=400,
            detail="Profile must have at least one project or experience to generate bullets"
        )
    
    try:
        # Generate bullets using LLM
        bullets = generate_bullets_from_profile(profile_data)
        
        # Validate grounding
        bullets = validate_bullets_grounding(bullets, profile_data)
        
        # Group by category
        by_category = group_bullets_by_category(bullets)
        
        # Save to bullet bank if requested
        saved = False
        if request.save_to_bank:
            saved = save_bullets(bullets)
        
        logger.info(f"Generated {len(bullets)} bullets, saved={saved}")
        
        return GenerateBulletsResponse(
            bullets=bullets,
            by_category=by_category,
            total=len(bullets),
            saved=saved,
            message=f"Generated {len(bullets)} achievement bullets. Review for accuracy."
        )
        
    except BulletGenerationError as e:
        logger.error(f"Bullet generation error: {e}")
        raise HTTPException(status_code=422, detail=str(e))
    
    except Exception as e:
        logger.error(f"Unexpected error generating bullets: {e}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while generating bullets"
        )


@router.get("/bullets", response_model=List[Dict[str, Any]])
async def list_bullets(category: Optional[str] = None):
    """
    List all bullets from the bullet bank.
    
    Optionally filter by category.
    """
    if category:
        return get_bullets_by_category(category)
    return get_all_bullets()


@router.get("/bullets/stats", response_model=BulletStatsResponse)
async def bullet_stats():
    """
    Get statistics about the bullet bank.
    """
    stats = get_bullet_stats()
    return BulletStatsResponse(**stats)


@router.post("/generate-answers", response_model=GenerateAnswersResponse)
async def generate_answers_endpoint(request: GenerateAnswersRequest):
    """
    Generate answers for common job application questions using LLM.
    
    Takes student profile data and optional constraints to generate
    personalized answers for standard questions like:
    - Work authorization status
    - Availability/start date
    - Relocation willingness
    - Salary expectations
    - Why this company/role (template)
    
    Answers are editable and stored in the answer library.
    """
    profile_data = request.profile_data
    
    if not profile_data:
        raise HTTPException(status_code=400, detail="Profile data is required")
    
    try:
        # Generate answers using LLM
        answers = generate_answers(
            profile_data=profile_data,
            constraints=request.constraints,
            categories=request.categories,
        )
        
        # Save to library if requested
        saved = False
        if request.save_to_library:
            saved = save_answers(answers)
        
        logger.info(f"Generated {len(answers)} answers, saved={saved}")
        
        return GenerateAnswersResponse(
            answers=answers,
            total=len(answers),
            saved=saved,
            message=f"Generated {len(answers)} answers. Review and edit as needed."
        )
        
    except AnswerGenerationError as e:
        logger.error(f"Answer generation error: {e}")
        raise HTTPException(status_code=422, detail=str(e))
    
    except Exception as e:
        logger.error(f"Unexpected error generating answers: {e}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while generating answers"
        )


@router.get("/answers")
async def list_answers():
    """
    List all answers from the answer library.
    """
    return get_all_answers()


@router.get("/answers/categories")
async def list_answer_categories():
    """
    Get all available question categories with their variants.
    """
    return get_question_categories()


@router.patch("/answers/{answer_id}")
async def edit_answer(answer_id: str, request: UpdateAnswerRequest):
    """
    Update an answer's text.
    
    Allows editing of generated answers for personalization.
    """
    updated = update_answer(answer_id, request.answer_text)
    
    if not updated:
        raise HTTPException(status_code=404, detail="Answer not found")
    
    return updated


@router.get("/answers/{answer_id}")
async def get_answer(answer_id: str):
    """
    Get a specific answer by ID.
    """
    answer = get_answer_by_id(answer_id)
    
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")
    
    return answer


@router.post("/build-proof-pack", response_model=ProofPackResponse)
async def build_proof_pack(request: BuildProofPackRequest):
    """
    Extract and organize key links/artifacts from a student's profile.
    
    Identifies GitHub repos, portfolio items, live demos, and case studies.
    Generates professional descriptions and maps them to relevant skills.
    """
    profile_data = request.profile_data
    
    if not profile_data:
        raise HTTPException(status_code=400, detail="Profile data is required")
        
    try:
        # Build proof pack using LLM
        items = build_proof_pack_from_profile(profile_data)
        
        # Save if requested
        saved = False
        if request.save_to_pack:
            saved = save_proof_pack(items)
            
        logger.info(f"Built Proof Pack with {len(items)} items, saved={saved}")
        
        return ProofPackResponse(
            items=items,
            total=len(items),
            saved=saved,
            message=f"Success: Collected {len(items)} proof artifacts from profile."
        )
        
    except ProofPackError as e:
        logger.error(f"Proof Pack error: {e}")
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error building proof pack: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while building proof pack")

@router.get("/proof-pack", response_model=Optional[Dict[str, Any]])
async def get_latest_pack():
    """
    Get the most recently built proof pack.
    """
    return get_latest_proof_pack()
