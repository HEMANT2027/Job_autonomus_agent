"""
Cover Letter Generator Service

Generates a personalized 3-paragraph cover letter using:
1. Job Description (for context)
2. Bullet Bank (for relevant experience)
3. Proof Pack (for evidence)
4. Answer Library (for logistics/CTA)
"""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional
import traceback

from app.services.llm_client import generate_text, LLMClientError
from app.logging_config import get_logger
from app.services.data_store import get_job_by_id, load_student_profile
from app.services.job_search import get_stored_jobs
from app.services.bullet_storage import get_all_bullets
from app.services.proof_pack import get_latest_proof_pack
from app.services.answer_library import get_all_answers, get_answer_by_category
from app.services.grounding_verifier import verify_content
from app.services.resume_storage import get_latest_resume

logger = get_logger(__name__)

class CoverLetterError(Exception):
    """Base exception for cover letter generation errors."""
    pass

def generate_cover_letter(job_id: str, profile_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Generate a personalized cover letter.
    """
    try:
        # 1. Fetch Job
        job = get_job_by_id(job_id)
        if not job:
            search_jobs = get_stored_jobs(limit=1000)
            for j in search_jobs:
                if j.get("id") == job_id:
                    job = j
                    break
        
        if not job:
            raise CoverLetterError(f"Job not found: {job_id}")

        # 2. Fetch Profile (if not provided)
        if not profile_data:
            profile_data = load_student_profile()
            if not profile_data:
                raise CoverLetterError("Student profile not found")

        # 3. Fetch Supporting Data
        bullets = get_all_bullets()
        proof_pack = get_latest_proof_pack()
        answers = get_all_answers()
        
        # 4. Build complete resume text from profile
        resume_sections = []
        
        personal_info = profile_data.get('personal_info', {})
        links = profile_data.get('links', {})
        
        # Header
        name = personal_info.get('name')
        if name:
            resume_sections.append(f"NAME: {name}")
            
        email = personal_info.get('email')
        if email:
            resume_sections.append(f"EMAIL: {email}")
            
        phone = personal_info.get('phone')
        if phone:
            resume_sections.append(f"PHONE: {phone}")
            
        linkedin = links.get('linkedin')
        if linkedin:
            resume_sections.append(f"LINKEDIN: {linkedin}")
            
        github = links.get('github')
        if github:
            resume_sections.append(f"GITHUB: {github}")
        
        # Education
        education_list = profile_data.get('education', [])
        if education_list:
            resume_sections.append("\nEDUCATION:")
            for edu in education_list:
                edu_line = f"- {edu.get('degree', '')} in {edu.get('field', '')} from {edu.get('institution', '')}"
                if edu.get('graduation_date'):
                    edu_line += f" ({edu.get('graduation_date')})"
                if edu.get('gpa'):
                    edu_line += f" GPA: {edu.get('gpa')}"
                resume_sections.append(edu_line)
        
        # Skills
        skills_list = profile_data.get('skills', [])
        if skills_list:
            resume_sections.append(f"\nSKILLS: {', '.join(skills_list)}")
        
        # Experience
        experience_list = profile_data.get('experience', [])
        if experience_list:
            resume_sections.append("\nEXPERIENCE:")
            for exp in experience_list:
                exp_header = f"- {exp.get('title', '')} at {exp.get('company', '')}"
                if exp.get('duration'):
                    exp_header += f" ({exp.get('duration')})"
                resume_sections.append(exp_header)
                if exp.get('description'):
                    resume_sections.append(f"  {exp.get('description')}")
                if exp.get('bullets'):
                    for bullet in exp.get('bullets', []):
                        resume_sections.append(f"  • {bullet}")
        
        # Projects
        projects_list = profile_data.get('projects', [])
        if projects_list:
            resume_sections.append("\nPROJECTS:")
            for proj in projects_list:
                proj_line = f"- {proj.get('name', '')}"
                if proj.get('technologies'):
                    proj_line += f" [{', '.join(proj.get('technologies', []))}]"
                resume_sections.append(proj_line)
                if proj.get('description'):
                    resume_sections.append(f"  {proj.get('description')}")
        
        # Certifications
        certs_list = profile_data.get('certifications', [])
        if certs_list:
            resume_sections.append("\nCERTIFICATIONS:")
            for cert in certs_list:
                resume_sections.append(f"- {cert}")
        
        full_resume_text = "\n".join(resume_sections)
        
        # Prepare context for LLM
        
        # Relevant Answers (Availability, Relocation, Why Company)
        logistics_context = {}
        relevant_cats = ["availability", "relocation", "why_company"]
        for ans in answers:
            if ans.get("category") in relevant_cats:
                logistics_context[ans.get("category")] = ans.get("answer")
                
        # Proof Items (Top 3)
        proof_items = []
        if proof_pack and proof_pack.get("items"):
             proof_items = proof_pack.get("items")[:3]
             
        # Selected relevant bullets (simple keyword match similar to resume_tailor)
        job_desc = job.get("description", "").lower()
        job_skills = set(s.lower() for s in job.get("skills_required", []))
        
        relevant_bullets = []
        for b in bullets:
            text = b.get("text", "")
            score = 0
            for skill in job_skills:
                if skill in text.lower():
                    score += 1
            if score > 0:
                relevant_bullets.append(text)
        
        # Limit bullets
        relevant_bullets = relevant_bullets[:5]
        
        # Get candidate name - ensure it's never a placeholder
        candidate_name = personal_info.get('name', '').strip()
        if not candidate_name or candidate_name.lower() in ['the candidate', 'candidate', '']:
            # Fallback if personal_info.name is missing (should not happen with good profile)
            candidate_name = profile_data.get('name', 'The Applicant').strip()
        
        if candidate_name.lower() in ['the candidate', 'candidate', 'the applicant', '']:
             candidate_name = "The Applicant"  # Final fallback for LLM instructions
        
        # Construct Prompt
        prompt = f"""
You are an expert recruiter-grade cover letter writer.

Write a **fully finalized, submission-ready cover letter**.
Under NO circumstances may the output contain:
- placeholders (e.g. [EDIT], TBD, INSERT, The Candidate, The Applicant)
- bracketed text of any kind
- missing names or vague availability

If information is missing, you must **infer a professional default** instead of exposing placeholders.

━━━━━━━━━━━━━━━━━━━━━━
COMPLETE JOB/COMPANY INFORMATION (USE ALL RELEVANT DETAILS)
━━━━━━━━━━━━━━━━━━━━━━
JOB TITLE: {job.get('title', 'N/A')}
COMPANY NAME: {job.get('company', 'N/A')}
LOCATION: {job.get('location', 'Not specified')}
WORK TYPE: {'Remote' if job.get('is_remote') else 'On-site/Hybrid'}
EXPERIENCE LEVEL: {job.get('experience_level', 'Not specified')}
SALARY RANGE: {job.get('salary_range', 'Competitive')}
VISA SPONSORSHIP: {'Available' if job.get('visa_sponsorship') else 'Not specified'}

FULL JOB DESCRIPTION:
{job.get('description', 'No description available')}

REQUIRED SKILLS:
{', '.join(job.get('skills_required', [])) if job.get('skills_required') else 'Not specified'}

RESPONSIBILITIES:
{job.get('responsibilities', 'See job description above')}

QUALIFICATIONS:
{job.get('qualifications', 'See job description above')}

BENEFITS:
{job.get('benefits', 'Not specified')}

ABOUT THE COMPANY:
{job.get('company_description', job.get('about_company', 'Refer to the job description for company context'))}

━━━━━━━━━━━━━━━━━━━━━━
COMPLETE CANDIDATE RESUME (USE THIS AS YOUR PRIMARY SOURCE)
━━━━━━━━━━━━━━━━━━━━━━
{full_resume_text}

━━━━━━━━━━━━━━━━━━━━━━
CANDIDATE NAME (MANDATORY - USE EXACTLY AS WRITTEN)
━━━━━━━━━━━━━━━━━━━━━━
{candidate_name}

━━━━━━━━━━━━━━━━━━━━━━
ACHIEVEMENTS (SELECT 2–3 ONLY)
━━━━━━━━━━━━━━━━━━━━━━
{json.dumps(relevant_bullets, indent=2)}

━━━━━━━━━━━━━━━━━━━━━━
PROOF OF WORK (OPTIONAL – MAX 1)
━━━━━━━━━━━━━━━━━━━━━━
{json.dumps(proof_items, indent=2)}

━━━━━━━━━━━━━━━━━━━━━━
AVAILABILITY RULES
━━━━━━━━━━━━━━━━━━━━━━
If exact dates are provided → use them.
If not → say:
"I am available to start immediately or as per the team's timeline."

{json.dumps(logistics_context, indent=2)}

━━━━━━━━━━━━━━━━━━━━━━
STRICT WRITING RULES (NON-NEGOTIABLE - FAILURE TO COMPLY = REJECTION)
━━━━━━━━━━━━━━━━━━━━━━
FORMAT RULES:
- Exactly 3 paragraphs (no more, no less)
- Must start with: "Dear Hiring Team,"
- Must end with: "Sincerely," followed by the candidate's EXACT name: "{candidate_name}"

NAME RULES:
- The candidate's name "{candidate_name}" MUST appear in the sign-off
- NEVER use "The Candidate", "The Applicant", "[Name]", or any placeholder
- If the name looks incomplete, use it exactly as provided

CONTENT RULES:
- Every claim MUST be backed by specific data from the resume above
- Every skill mentioned MUST appear in the candidate's resume
- Every achievement MUST come from the candidate's actual experience
- NO invented or assumed qualifications
- NO generic buzzwords: "passionate", "hardworking", "fast learner", "team player" UNLESS tied to specific evidence
- NO filler sentences or padding
- The company name "{job.get('company')}" MUST appear at least twice
- The job title "{job.get('title')}" MUST appear explicitly

PROHIBITED (INSTANT REJECTION):
- Any text in [brackets]
- Any placeholder like TBD, INSERT, EDIT, TODO
- Any sentence that could apply to ANY job without modification
- Any claim not grounded in the resume provided
- Generic sign-offs like "Best regards, A Candidate"

━━━━━━━━━━━━━━━━━━━━━━
STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━
Paragraph 1 — Hook:
- Express genuine interest in the {job.get('title')} role at {job.get('company')}
- Reference something SPECIFIC about what {job.get('company')} does
- Make this paragraph IMPOSSIBLE to reuse for another company

Paragraph 2 — Evidence:
- Select 2-3 achievements from the resume that DIRECTLY match job requirements
- Quantify impact where possible (numbers, percentages, scale)
- Show HOW skills were applied, not just THAT you have them

Paragraph 3 — Closing:
- Reaffirm fit for THIS specific role (not generic enthusiasm)
- State availability from logistics, or use: "I am available to start immediately or as per the team's timeline."
- End with confident call-to-action for interview

Sign-off:
Sincerely,
{candidate_name}

━━━━━━━━━━━━━━━━━━━━━━
FINAL SELF-CHECK (PERFORM SILENTLY BEFORE OUTPUT)
━━━━━━━━━━━━━━━━━━━━━━
✓ Is the candidate's name "{candidate_name}" in the sign-off? (MANDATORY)
✓ Is the company name "{job.get('company')}" mentioned at least twice?
✓ Is the job title "{job.get('title')}" explicitly stated?
✓ Are all claims backed by the resume data provided above?
✓ Are there ZERO placeholders or brackets?
✓ Would this letter make no sense if sent to a different company?

━━━━━━━━━━━━━━━━━━━━━━
OUTPUT
━━━━━━━━━━━━━━━━━━━━━━
Return ONLY the finished cover letter with proper sign-off.
"""
        
        # Call Gemini API via llm_client
        cover_letter_text = generate_text(
            prompt=prompt,
            system_prompt="You are an expert career coach writing a cover letter. Never use placeholders or generic names.",
            temperature=0.7
        )
        
        # Verify Grounding
        verification = verify_content(cover_letter_text, context_type="cover_letter")
        
        return {
            "job_id": job_id,
            "generated_at": datetime.utcnow().isoformat(),
            "cover_letter_text": cover_letter_text,
            "verification": verification,
            "is_grounded": verification.get("is_grounded", False),
            "context_used": {
                "bullet_count": len(relevant_bullets),
                "proof_item_count": len(proof_items),
                "logistics_found": list(logistics_context.keys())
            }
        }

    except Exception as e:
        logger.error(f"Cover letter generation failed: {traceback.format_exc()}")
        raise CoverLetterError(f"Generation failed: {str(e)}")
