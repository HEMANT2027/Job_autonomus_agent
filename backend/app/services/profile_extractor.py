"""
Profile Extractor Service

Uses Gemini LLM API to extract structured profile information from resume text.
Extracts: Education, Projects, Experience, Skills, Links
"""

import json
import re
from typing import Any, Dict, List, Optional

from app.services.llm_client import generate_json, LLMClientError
from app.logging_config import get_logger

logger = get_logger(__name__)


# Extraction prompt - strict instructions to avoid hallucinations
EXTRACTION_PROMPT = """You are a resume parser. Extract ONLY facts present in the text. Do NOT invent or infer information.

Extract the following information from the resume text and return as valid JSON:

{
  "education": [
    {
      "degree": "exact degree name",
      "institution": "exact institution name", 
      "year": "graduation year or year range",
      "gpa": "GPA if mentioned, null otherwise"
    }
  ],
  "projects": [
    {
      "name": "project name",
      "description": "brief description if provided",
      "technologies": ["list", "of", "technologies"],
      "dates": "date range if provided, null otherwise"
    }
  ],
  "experience": [
    {
      "company": "company name",
      "role": "job title/role",
      "duration": "employment duration/dates",
      "responsibilities": ["list", "of", "responsibilities"]
    }
  ],
  "skills": ["list", "of", "technical", "skills", "only"],
  "links": {
    "github": "GitHub URL if present, null otherwise",
    "linkedin": "LinkedIn URL if present, null otherwise",
    "portfolio": "Portfolio/website URL if present, null otherwise",
    "other": ["any", "other", "relevant", "links"]
  },
  "personal_info": {
    "name": "full name if present",
    "email": "email if present",
    "phone": "phone if present",
    "location": "location if present"
  }
}

CRITICAL RULES:
1. Extract ONLY facts explicitly stated in the resume
2. Do NOT invent, infer, or assume any information
3. If information is not present, use null or empty arrays
4. For skills, extract ONLY technical skills (programming languages, frameworks, tools)
5. Do NOT add generic skills not mentioned in the text
6. Return valid JSON only, no additional text

Resume Text:
"""


class ProfileExtractionError(Exception):
    """Exception raised when profile extraction fails."""
    pass


def extract_profile_from_text(resume_text: str) -> Dict[str, Any]:
    """
    Extract structured profile data from resume text using Gemini LLM.
    
    Args:
        resume_text: The raw text extracted from a resume.
        
    Returns:
        Structured profile data as a dictionary.
        
    Raises:
        ProfileExtractionError: If extraction fails.
    """
    if not resume_text or len(resume_text.strip()) < 50:
        raise ProfileExtractionError("Resume text is too short to extract meaningful data")
    
    try:
        # Call Gemini API via llm_client
        response_text = generate_json(
            prompt=EXTRACTION_PROMPT + resume_text,
            system_prompt="You are a precise resume parser. Return only valid JSON. Never invent information.",
            temperature=0.1
        )
        
        # Extract JSON from response (handle markdown code blocks)
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response_text)
        if json_match:
            response_text = json_match.group(1)
        
        # Parse JSON
        try:
            extracted_data = json.loads(response_text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            logger.debug(f"Response was: {response_text[:500]}")
            raise ProfileExtractionError("Failed to parse extracted data as JSON")
        
        # Validate and flag suspicious entries
        validated_data = validate_extracted_data(extracted_data, resume_text)
        
        logger.info("Successfully extracted profile from resume")
        return validated_data
        
    except LLMClientError as e:
        raise ProfileExtractionError(str(e))
    except ProfileExtractionError:
        raise
    except Exception as e:
        logger.error(f"Profile extraction failed: {e}")
        raise ProfileExtractionError(f"Profile extraction failed: {str(e)}")


def validate_extracted_data(data: Dict[str, Any], original_text: str) -> Dict[str, Any]:
    """
    Validate extracted data and flag potentially hallucinated entries.
    
    Args:
        data: The extracted profile data.
        original_text: The original resume text for verification.
        
    Returns:
        Validated data with warning flags for suspicious entries.
    """
    warnings = []
    original_lower = original_text.lower()
    
    # Check education entries
    if "education" in data and data["education"]:
        for i, edu in enumerate(data["education"]):
            inst = edu.get("institution")
            if inst and isinstance(inst, str):
                if inst.lower() not in original_lower:
                    warnings.append(f"Education[{i}]: Institution '{inst}' may not be in original text")
    
    # Check experience entries
    if "experience" in data and data["experience"]:
        for i, exp in enumerate(data["experience"]):
            comp = exp.get("company")
            if comp and isinstance(comp, str):
                if comp.lower() not in original_lower:
                    warnings.append(f"Experience[{i}]: Company '{comp}' may not be in original text")
    
    # Check for suspiciously generic skills
    generic_skills = ["problem solving", "communication", "teamwork", "leadership", "time management"]
    if "skills" in data and data["skills"]:
        flagged_skills = []
        for skill in data["skills"]:
            skill_lower = skill.lower()
            if skill_lower in generic_skills:
                flagged_skills.append(skill)
            elif skill_lower not in original_lower and len(skill) < 20:
                # Check if skill appears in text (allow some flexibility)
                words = skill_lower.split()
                if not any(word in original_lower for word in words if len(word) > 3):
                    flagged_skills.append(skill)
        
        if flagged_skills:
            warnings.append(f"Skills: Some skills may not be in original text: {flagged_skills}")
    
    # Check links
    if "links" in data:
        links = data["links"]
        for key in ["github", "linkedin", "portfolio"]:
            val = links.get(key)
            if val and isinstance(val, str):
                if val not in original_text and "http" not in original_lower:
                    warnings.append(f"Links: {key} URL may be hallucinated")
    
    # Add validation metadata
    data["_validation"] = {
        "warnings": warnings,
        "has_warnings": len(warnings) > 0,
        "original_text_length": len(original_text)
    }
    
    return data


def get_empty_profile_template() -> Dict[str, Any]:
    """Return an empty profile template for manual editing."""
    return {
        "education": [],
        "projects": [],
        "experience": [],
        "skills": [],
        "links": {
            "github": None,
            "linkedin": None,
            "portfolio": None,
            "other": []
        },
        "personal_info": {
            "name": None,
            "email": None,
            "phone": None,
            "location": None
        },
        "_validation": {
            "warnings": [],
            "has_warnings": False,
            "original_text_length": 0
        }
    }
