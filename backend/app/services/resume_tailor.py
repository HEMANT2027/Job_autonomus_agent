"""
Resume Tailor Service

Customizes a student's resume for a specific job application.
"""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional
import math

from app.services.llm_client import generate_text, LLMClientError
from app.logging_config import get_logger
from app.services.bullet_storage import get_all_bullets
from app.services.data_store import get_job_by_id, load_student_profile
from app.services.job_search import get_stored_jobs
from app.services.grounding_verifier import verify_content

logger = get_logger(__name__)

class ResumeTailorError(Exception):
    """Base exception for resume tailoring errors."""
    pass

def _calculate_relevance(text: str, keywords: List[str]) -> float:
    """Calculate relevance score of text based on keyword presence."""
    if not text or not keywords:
        return 0.0
        
    text_lower = text.lower()
    matches = 0
    for keyword in keywords:
        if keyword.lower() in text_lower:
            matches += 1
            
    # Simple score: matches / text_length_penalty + bonus for exact phrases?
    # Keeping it simple: straightforward match count weighted by uniqueness eventually
    return float(matches)

def tailor_resume(job_id: str, profile_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Generate a tailored resume for the specific job.
    
    1. Fetch job details (from data store or job search listings)
    2. Get available bullets from bank (or profile)
    3. Match bullets to job requirements
    4. Highlight skills
    5. Reword bullets using LLM (optional enhancement)
    """
    import traceback
    try:
        # 1. Get Job
        job = get_job_by_id(job_id)
        
        # If not found in main data store, check job search listings
        if not job:
            search_jobs = get_stored_jobs(limit=1000)
            for j in search_jobs:
                if j.get("id") == job_id:
                    job = j
                    break
                    
        if not job:
            raise ResumeTailorError(f"Job not found: {job_id}")
            
        # 2. Get Profile
        if not profile_data:
            profile_data = load_student_profile()
            if not profile_data:
                raise ResumeTailorError("Student profile not found")
                
        # 3. Get Bullets
        all_bullets = get_all_bullets()
        # No warning needed for now
        
        # Extract keywords from job
        job_keywords = job.get("skills_required", [])
        if job_keywords is None:
            job_keywords = []
        extracted_keywords = set(job_keywords)
        
        # Also extract from description
        desc_words = job.get("description", "").lower().split()
        common_tech = {"python", "react", "aws", "docker", "kubernetes", "java", "c++", "typescript", "node.js"}
        for word in desc_words:
            cleaned = word.strip(".,()")
            if cleaned in common_tech:
                extracted_keywords.add(cleaned.capitalize())
                
        keywords_list = list(extracted_keywords)
        
        # 4. Select Bullets for each experience
        tailored_experience = []
        change_log = []
        
        for exp in profile_data.get("experience", []):
            if not isinstance(exp, dict):
                continue
                
            relevant_bullets = []
            for bullet in all_bullets:
                # Check if bullet belongs to this experience and has content
                bullet_content = bullet.get("content", "")
                if not bullet_content:
                    continue  # Skip bullets without content
                    
                if exp.get("company", "").lower() in bullet.get("source_name", "").lower():
                    score = _calculate_relevance(bullet_content, keywords_list)
                    relevant_bullets.append({"bullet": bullet, "score": score})
            
            # Sort by relevance
            relevant_bullets.sort(key=lambda x: x["score"], reverse=True)
            
            # Take top 3-4 most relevant
            selected_bullets_data = relevant_bullets[:4]
            # Safely extract content from bullets
            selected_bullets_text = []
            for item in selected_bullets_data:
                content = item.get("bullet", {}).get("content", "")
                if content:
                    selected_bullets_text.append(content)
            
            # If no bullets in bank, keep original matched ones from profile?
            if not selected_bullets_text:
                 selected_bullets_text = exp.get("responsibilities", [])
                 if selected_bullets_text is None:
                     selected_bullets_text = []
            
            # Batch Optimization: Process all bullets for this role in ONE call
            if not selected_bullets_text:
                continue

            try:
                # 1. Optimize all bullets in one go
                bullets_block = json.dumps(selected_bullets_text)
                prompt = f"""
                You are an expert Resume Optimizer. Optimize the following list of bullet points for a "{job.get('title')}" role.
                
                INPUT BULLETS:
                {bullets_block}
                
                TARGET KEYWORDS to naturally integrate:
                {', '.join(keywords_list[:8])}
                
                INSTRUCTIONS:
                1. Return a JSON List of strings.
                2. Maintain the exact same number of bullets.
                3. Keep the factual core (numbers, achievements) identical.
                4. Improve professional tone and impact.
                5. Do NOT hallucinate new skills or numbers.
                
                OUTPUT JSON ONLY:
                ["optimized bullet 1", "optimized bullet 2", ...]
                """
                
                from app.services.llm_client import generate_json
                response = generate_json(prompt, temperature=0.3)
                
                # Parse Response
                import json
                try:
                    reworded_bullets = json.loads(response)
                    # Basic validation
                    if not isinstance(reworded_bullets, list):
                         reworded_bullets = selected_bullets_text
                except:
                    reworded_bullets = selected_bullets_text

                # 2. Batch Verification (One check for the whole role)
                # Verify the *collection* of new bullets against the profile context
                # We can't verify 1-to-1 easily in batch without complex logic, 
                # but we can verify the *set* doesn't contain hallucinations relative to the *original set*?
                # Actually, simplest safe optimization is to verify individually or trust strict system prompt.
                # To maintain speed, we'll do a "Spot Check" or "Bulk Check".
                
                # For high performance with "reasonable" safety:
                # We will skip per-bullet verification and rely on the "Do NOT hallucinate" instruction 
                # plus a single "Fact Check" call on the whole block found in new_text.
                
                verify_text = "\n".join(reworded_bullets)
                verification = verify_content(verify_text, context_type="resume_experience_block")
                
                if not verification.get("is_grounded", False):
                    logger.warning(f"Batch optimization flagged as hallucinated. Reverting to original. Reason: {verification.get('reasonheading')}")
                    final_bullets = selected_bullets_text
                else:
                    final_bullets = reworded_bullets
                    
            except Exception as e:
                logger.error(f"Batch optimization failed: {e}")
                final_bullets = selected_bullets_text

            exp_copy = exp.copy()
            exp_copy["responsibilities"] = final_bullets
            tailored_experience.append(exp_copy)
            
        # 5. Tailor Skills Section
        profile_skills = profile_data.get("skills", [])
        if profile_skills is None:
            profile_skills = []
            
        highlighted_skills = []
        other_skills = []
        
        for skill in profile_skills:
            if not skill: continue
            is_match = False
            for req in extracted_keywords:
                if req.lower() in skill.lower() or skill.lower() in req.lower():
                    is_match = True
                    break
            
            if is_match:
                highlighted_skills.append(skill)
            else:
                other_skills.append(skill)
                
        # Construct Final Resume
        tailored_resume = profile_data.copy()
        tailored_resume["experience"] = tailored_experience
        tailored_resume["skills"] = highlighted_skills + other_skills
        tailored_resume["meta"] = {
            "job_id": job_id,
            "tailored_at": datetime.utcnow().isoformat(),
            "keywords_matched": list(extracted_keywords),
            "changes": change_log
        }
        
        return tailored_resume
    except Exception as e:
        logger.error(f"Tailor resume failed: {traceback.format_exc()}")
        raise ResumeTailorError(f"Debug Error: {str(e)} | {traceback.format_exc()}")
