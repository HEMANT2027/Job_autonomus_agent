"""
Answer Library Service

Generates reusable answers for common job application questions.
Uses student profile data and constraints to create personalized responses.
"""

import json
import re
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.services.llm_client import generate_json, LLMClientError
from app.logging_config import get_logger

logger = get_logger(__name__)

# Data directory path
DATA_DIR = Path(__file__).parent.parent / "data"
ANSWER_LIBRARY_FILE = DATA_DIR / "answer_library.json"

# Thread lock for concurrent access
_answers_lock = threading.RLock()

# Standard question categories
QUESTION_CATEGORIES = {
    "work_authorization": {
        "question": "What is your work authorization status?",
        "variants": [
            "Are you authorized to work in the US?",
            "Do you require visa sponsorship?",
            "What is your work permit status?",
        ]
    },
    "availability": {
        "question": "What is your availability/start date?",
        "variants": [
            "When can you start?",
            "What is your notice period?",
            "How soon can you join?",
        ]
    },
    "relocation": {
        "question": "Are you willing to relocate?",
        "variants": [
            "Would you consider relocating for this position?",
            "Are you open to relocation?",
            "Can you relocate to our office location?",
        ]
    },
    "salary_expectations": {
        "question": "What are your salary expectations?",
        "variants": [
            "What is your expected compensation?",
            "What salary range are you looking for?",
            "What are your compensation requirements?",
        ]
    },
    "why_company": {
        "question": "Why do you want to work for this company?",
        "variants": [
            "Why are you interested in this role?",
            "What attracts you to our company?",
            "Why should we hire you?",
        ]
    },
    "strengths": {
        "question": "What are your greatest strengths?",
        "variants": [
            "What do you consider your key strengths?",
            "What makes you a good candidate?",
        ]
    },
    "career_goals": {
        "question": "What are your career goals?",
        "variants": [
            "Where do you see yourself in 5 years?",
            "What are your long-term career aspirations?",
        ]
    },
}

# Answer generation prompt
ANSWER_GENERATION_PROMPT = """You are a career advisor helping a job applicant prepare answers for common application questions.

Generate professional, concise answers for the following questions based on the student's profile data.

RULES:
1. Use ONLY information from the provided profile - do NOT invent facts
2. Keep answers professional and concise (2-4 sentences each)
3. For "Why this company" - create a TEMPLATE with [COMPANY_NAME] and [ROLE] placeholders
4. If information is not available, provide a generic professional template that can be edited
5. Mark answers that need editing/personalization with "[EDIT]" prefix

Profile Data:
{profile_data}

Additional Constraints (if provided):
{constraints}

User Preferences:
{preferences}

Generate answers for these questions:
{questions}

Return a JSON object with question category as key and answer as value:
{{
  "category_name": "The answer text"
}}
"""


class AnswerGenerationError(Exception):
    """Exception raised when answer generation fails."""
    pass


def _ensure_data_dir() -> None:
    """Ensure the data directory exists."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def _read_answer_library() -> Dict[str, Any]:
    """Read the answer library JSON file."""
    try:
        if ANSWER_LIBRARY_FILE.exists():
            with open(ANSWER_LIBRARY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        return {"answers": []}
    except Exception as e:
        logger.error(f"Error reading answer library: {e}")
        return {"answers": []}


def _write_answer_library(data: Dict[str, Any]) -> bool:
    """Write to the answer library JSON file."""
    try:
        _ensure_data_dir()
        temp_path = ANSWER_LIBRARY_FILE.with_suffix(".tmp")
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)
        temp_path.replace(ANSWER_LIBRARY_FILE)
        return True
    except Exception as e:
        logger.error(f"Error writing answer library: {e}")
        return False


def generate_answers(
    profile_data: Dict[str, Any],
    constraints: Optional[Dict[str, Any]] = None,
    categories: Optional[List[str]] = None,
) -> Dict[str, Dict[str, Any]]:
    """
    Generate answers for common questions using LLM.
    
    Args:
        profile_data: Student profile data from extraction.
        constraints: Optional constraints (work auth, salary range, etc.).
        categories: Optional list of question categories to generate.
        
    Returns:
        Dictionary of generated answers by category.
        
    Raises:
        AnswerGenerationError: If generation fails.
    """
    # Default to all categories if not specified
    if not categories:
        categories = list(QUESTION_CATEGORIES.keys())
    
    # Build questions list for prompt
    questions_text = "\n".join([
        f"- {cat}: {QUESTION_CATEGORIES[cat]['question']}"
        for cat in categories
        if cat in QUESTION_CATEGORIES
    ])
    
    # Prepare profile data (exclude validation metadata)
    profile_for_prompt = {
        k: v for k, v in profile_data.items()
        if not k.startswith("_")
    }
    
    # Build constraints text
    constraints_text = "None provided"
    if constraints:
        constraints_text = json.dumps(constraints, indent=2)
    
    try:
        # Extract preferences
        preferences = profile_data.get("preferences", {})
        prefs_text = json.dumps(preferences, indent=2) if preferences else "None provided"

        # Use replace() for robust formatting
        prompt = ANSWER_GENERATION_PROMPT.replace(
            "{profile_data}", json.dumps(profile_for_prompt, indent=2)
        ).replace(
            "{constraints}", constraints_text
        ).replace(
            "{questions}", questions_text
        ).replace(
            "{preferences}", prefs_text
        )
        
        # Call Gemini API via llm_client
        response_text = generate_json(
            prompt=prompt,
            system_prompt="You are a career advisor. Generate professional, factual answers. Return only valid JSON.",
            temperature=0.3
        )
        
        # Extract JSON from response
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response_text)
        if json_match:
            response_text = json_match.group(1)
        
        try:
            raw_answers = json.loads(response_text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response: {e}")
            raw_answers = {}
            
        # Ensure raw_answers is a dict
        if not isinstance(raw_answers, dict):
            logger.warning(f"Expected dict for answers, got {type(raw_answers)}")
            raw_answers = {}
        
        # Process and enrich answers
        processed_answers = {}
        for category in categories:
            if category not in QUESTION_CATEGORIES:
                continue
            
            answer_text = raw_answers.get(category, "")
            if not answer_text:
                answer_text = f"[EDIT] Please provide your response to: {QUESTION_CATEGORIES[category]['question']}"
            
            needs_editing = answer_text.startswith("[EDIT]") or "[COMPANY_NAME]" in answer_text or "[ROLE]" in answer_text
            
            processed_answers[category] = {
                "id": str(uuid.uuid4()),
                "category": category,
                "question": QUESTION_CATEGORIES[category]["question"],
                "question_variants": QUESTION_CATEGORIES[category]["variants"],
                "answer": answer_text,
                "needs_editing": needs_editing,
                "is_template": "[COMPANY_NAME]" in answer_text or "[ROLE]" in answer_text,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }
        
        logger.info(f"Generated {len(processed_answers)} answers")
        return processed_answers
        
    except LLMClientError as e:
        raise AnswerGenerationError(str(e))
    except AnswerGenerationError:
        raise
    except Exception as e:
        logger.error(f"Answer generation failed: {e}")
        raise AnswerGenerationError(f"Answer generation failed: {str(e)}")


def save_answers(answers: Dict[str, Dict[str, Any]]) -> bool:
    """
    Save generated answers to the answer library.
    
    Args:
        answers: Dictionary of answers by category.
        
    Returns:
        True if save was successful.
    """
    with _answers_lock:
        data = _read_answer_library()
        
        # Convert dict to list and add/update
        for category, answer_data in answers.items():
            # Check if answer for this category already exists
            existing_idx = None
            for i, existing in enumerate(data["answers"]):
                if existing.get("category") == category:
                    existing_idx = i
                    break
            
            if existing_idx is not None:
                # Update existing
                answer_data["updated_at"] = datetime.utcnow().isoformat()
                data["answers"][existing_idx] = answer_data
            else:
                # Add new
                data["answers"].append(answer_data)
        
        if _write_answer_library(data):
            logger.info(f"Saved {len(answers)} answers to library")
            return True
        return False


def get_all_answers() -> List[Dict[str, Any]]:
    """Get all answers from the library."""
    with _answers_lock:
        data = _read_answer_library()
        return data.get("answers", [])


def get_answer_by_category(category: str) -> Optional[Dict[str, Any]]:
    """Get an answer by category."""
    with _answers_lock:
        data = _read_answer_library()
        for answer in data.get("answers", []):
            if answer.get("category") == category:
                return answer
        return None


def get_answer_by_id(answer_id: str) -> Optional[Dict[str, Any]]:
    """Get an answer by ID."""
    with _answers_lock:
        data = _read_answer_library()
        for answer in data.get("answers", []):
            if answer.get("id") == answer_id:
                return answer
        return None


def update_answer(answer_id: str, new_answer_text: str) -> Optional[Dict[str, Any]]:
    """
    Update an answer's text.
    
    Args:
        answer_id: ID of the answer to update.
        new_answer_text: New answer text.
        
    Returns:
        Updated answer or None if not found.
    """
    with _answers_lock:
        data = _read_answer_library()
        
        for answer in data["answers"]:
            if answer.get("id") == answer_id:
                answer["answer"] = new_answer_text
                answer["updated_at"] = datetime.utcnow().isoformat()
                answer["needs_editing"] = False
                
                if _write_answer_library(data):
                    return answer
                return None
        
        return None


def delete_answer(answer_id: str) -> bool:
    """Delete an answer by ID."""
    with _answers_lock:
        data = _read_answer_library()
        original_count = len(data["answers"])
        data["answers"] = [a for a in data["answers"] if a.get("id") != answer_id]
        
        if len(data["answers"]) < original_count:
            return _write_answer_library(data)
        return False


def get_question_categories() -> Dict[str, Dict[str, Any]]:
    """Get all available question categories."""
    return QUESTION_CATEGORIES
