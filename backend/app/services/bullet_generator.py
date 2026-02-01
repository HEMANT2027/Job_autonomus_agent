"""
Bullet Generator Service

Generates achievement bullets from student profile facts using LLM.
Ensures bullets follow action verb + quantifiable result format.
All bullets are grounded to specific projects/experiences from the profile.
"""

import json
import re
from typing import Any, Dict, List, Optional
import uuid
from datetime import datetime

from app.services.llm_client import generate_json, LLMClientError
from app.logging_config import get_logger

logger = get_logger(__name__)

# Category definitions for bullet classification
BULLET_CATEGORIES = {
    "backend": ["api", "server", "database", "sql", "rest", "graphql", "microservice", "django", "flask", "fastapi", "node", "express", "postgresql", "mongodb", "redis", "aws", "docker", "kubernetes"],
    "frontend": ["react", "vue", "angular", "javascript", "typescript", "css", "html", "ui", "ux", "responsive", "tailwind", "bootstrap", "nextjs", "redux"],
    "ml": ["machine learning", "ml", "ai", "deep learning", "neural", "tensorflow", "pytorch", "scikit", "nlp", "computer vision", "model", "prediction", "classification", "regression", "data science"],
    "data": ["data", "analytics", "visualization", "pandas", "numpy", "sql", "etl", "pipeline", "warehouse", "tableau", "powerbi", "spark"],
    "mobile": ["ios", "android", "react native", "flutter", "swift", "kotlin", "mobile app"],
    "devops": ["ci/cd", "jenkins", "github actions", "terraform", "ansible", "monitoring", "deployment", "infrastructure", "cloud"],
    "leadership": ["led", "managed", "mentored", "coordinated", "directed", "supervised", "team", "cross-functional"],
    "collaboration": ["collaborated", "partnered", "worked with", "stakeholder", "cross-team"],
}

# Prompt for bullet generation
BULLET_GENERATION_PROMPT = """You are an expert resume writer. Generate achievement bullets from the following profile data.

STRICT RULES:
1. Each bullet MUST start with a strong action verb (e.g., Developed, Implemented, Led, Designed, Built, Optimized)
2. Each bullet MUST include quantifiable results when possible (numbers, percentages, metrics)
3. Each bullet MUST reference the specific project or experience it comes from (grounding)
4. Do NOT invent facts - only use information explicitly provided in the profile
5. Format: "[Action Verb] [what you did] [using what technology/method], [resulting in quantifiable impact]"
6. Keep bullets concise (1-2 lines max)

For each project and experience in the profile, generate 2-3 achievement bullets.

Return a JSON array with this structure:
[
  {
    "bullet": "The achievement bullet text",
    "source_type": "project" or "experience",
    "source_name": "Name of the project or company",
    "technologies": ["list", "of", "technologies", "mentioned"],
    "has_metrics": true or false
  }
]


Profile Data:
{profile_data}

User Preferences:
{preferences}
"""


class BulletGenerationError(Exception):
    """Exception raised when bullet generation fails."""
    pass


def categorize_bullet(bullet_text: str, technologies: List[str]) -> List[str]:
    """
    Categorize a bullet based on its content and technologies.
    
    Args:
        bullet_text: The bullet text to categorize.
        technologies: List of technologies mentioned in the bullet.
        
    Returns:
        List of category tags.
    """
    categories = set()
    text_lower = bullet_text.lower()
    tech_lower = [t.lower() for t in technologies]
    
    for category, keywords in BULLET_CATEGORIES.items():
        for keyword in keywords:
            if keyword in text_lower or keyword in " ".join(tech_lower):
                categories.add(category)
                break
    
    # Default to "general" if no categories matched
    if not categories:
        categories.add("general")
    
    return list(categories)


def generate_bullets_from_profile(profile_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Generate achievement bullets from a student profile using LLM.
    
    Args:
        profile_data: The extracted student profile data.
        
    Returns:
        List of generated bullets with metadata.
        
    Raises:
        BulletGenerationError: If bullet generation fails.
    """
    # Validate profile has content to generate bullets from
    has_experience = profile_data.get("experience") and len(profile_data["experience"]) > 0
    has_projects = profile_data.get("projects") and len(profile_data["projects"]) > 0
    
    if not has_experience and not has_projects:
        raise BulletGenerationError("Profile must have at least one project or experience to generate bullets")
    
    try:
        # Prepare profile data for prompt (exclude validation metadata)
        profile_for_prompt = {
            k: v for k, v in profile_data.items() 
            if not k.startswith("_")
        }
        
        # Call Gemini API via llm_client
        preferences = profile_data.get("preferences", {})
        prefs_text = json.dumps(preferences, indent=2) if preferences else "None provided"

        # Use replace() instead of format() to avoid issues with JSON braces in the prompt
        final_prompt = BULLET_GENERATION_PROMPT.replace(
            "{profile_data}", json.dumps(profile_for_prompt, indent=2)
        ).replace(
            "{preferences}", prefs_text
        )

        response_text = generate_json(
            prompt=final_prompt,
            system_prompt="You are an expert resume writer. Generate achievement bullets that are grounded in facts. Return only valid JSON array.",
            temperature=0.3
        )
        
        # Extract JSON from response
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response_text)
        if json_match:
            response_text = json_match.group(1)
        
        # Parse JSON
        try:
            raw_bullets = json.loads(response_text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            raise BulletGenerationError("Failed to parse generated bullets as JSON")
        
        if not isinstance(raw_bullets, list):
            raise BulletGenerationError("Expected array of bullets")
        
        # Process and enrich bullets
        processed_bullets = []
        for raw_bullet in raw_bullets:
            if not isinstance(raw_bullet, dict) or "bullet" not in raw_bullet:
                continue
            
            bullet_text = raw_bullet.get("bullet", "").strip()
            if not bullet_text:
                continue
            
            technologies = raw_bullet.get("technologies", [])
            categories = categorize_bullet(bullet_text, technologies)
            
            processed_bullet = {
                "id": str(uuid.uuid4()),
                "bullet": bullet_text,
                "source_type": raw_bullet.get("source_type", "unknown"),
                "source_name": raw_bullet.get("source_name", "unknown"),
                "technologies": technologies,
                "categories": categories,
                "has_metrics": raw_bullet.get("has_metrics", False),
                "created_at": datetime.utcnow().isoformat(),
            }
            processed_bullets.append(processed_bullet)
        
        if not processed_bullets:
            raise BulletGenerationError("No valid bullets were generated")
        
        logger.info(f"Generated {len(processed_bullets)} achievement bullets")
        return processed_bullets
        
    except LLMClientError as e:
        raise BulletGenerationError(str(e))
    except BulletGenerationError:
        raise
    except Exception as e:
        logger.error(f"Bullet generation failed: {e}")
        raise BulletGenerationError(f"Bullet generation failed: {str(e)}")


def validate_bullets_grounding(
    bullets: List[Dict[str, Any]], 
    profile_data: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Validate that bullets are grounded to actual profile facts.
    
    Args:
        bullets: List of generated bullets.
        profile_data: The original profile data.
        
    Returns:
        Bullets with grounding validation flags.
    """
    # Get all valid source names from profile
    valid_sources = set()
    
    if profile_data.get("experience"):
        for exp in profile_data["experience"]:
            if exp.get("company"):
                valid_sources.add(exp["company"].lower())
            if exp.get("role"):
                valid_sources.add(exp["role"].lower())
    
    if profile_data.get("projects"):
        for proj in profile_data["projects"]:
            if proj.get("name"):
                valid_sources.add(proj["name"].lower())
    
    # Validate each bullet
    for bullet in bullets:
        source_name = bullet.get("source_name", "").lower()
        is_grounded = any(
            source in source_name or source_name in source 
            for source in valid_sources
        )
        bullet["is_grounded"] = is_grounded
        if not is_grounded:
            bullet["grounding_warning"] = f"Source '{bullet.get('source_name')}' not found in profile"
    
    return bullets


def group_bullets_by_category(bullets: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Group bullets by their categories.
    
    Args:
        bullets: List of bullets with categories.
        
    Returns:
        Dictionary with categories as keys and bullet lists as values.
    """
    grouped = {}
    
    for bullet in bullets:
        for category in bullet.get("categories", ["general"]):
            if category not in grouped:
                grouped[category] = []
            grouped[category].append(bullet)
    
    return grouped
