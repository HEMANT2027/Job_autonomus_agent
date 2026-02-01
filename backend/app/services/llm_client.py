"""
Unified LLM Client using Groq API.

This module provides a simple interface for making LLM calls using Groq's
fast inference API with Llama models.
"""

import requests
import json
import time
from typing import Optional
from app.config import settings
from app.logging_config import get_logger

logger = get_logger(__name__)

# Groq API endpoint
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# Model to use - Using llama-3.1-8b-instant for higher rate limits
GROQ_MODEL = "llama-3.1-8b-instant"

# Retry settings
MAX_RETRIES = 5
INITIAL_BACKOFF = 5  # seconds


class LLMClientError(Exception):
    """Exception for LLM client errors."""
    pass


def _make_request(
    messages: list,
    temperature: float = 0.7,
    max_tokens: int = 2048
) -> str:
    """Make a request to Groq API with retry logic for rate limiting."""
    if not settings.groq_api_key:
        raise LLMClientError("GROQ_API_KEY not configured in .env")
    
    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    
    last_error = None
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.post(
                GROQ_API_URL,
                headers=headers,
                json=payload,
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"]
            
            # Handle rate limiting with retry
            if response.status_code == 429:
                backoff_time = INITIAL_BACKOFF * (2 ** attempt)
                logger.warning(f"Rate limited. Retrying in {backoff_time}s (attempt {attempt + 1}/{MAX_RETRIES})")
                time.sleep(backoff_time)
                last_error = LLMClientError(f"Rate limit exceeded. Please wait a moment and try again.")
                continue
            
            # Other errors - don't retry
            error_detail = response.text
            logger.error(f"Groq API error: {response.status_code} - {error_detail}")
            raise LLMClientError(f"Groq API error: {response.status_code} - {error_detail}")
            
        except requests.exceptions.Timeout:
            last_error = LLMClientError("Groq API request timed out")
            if attempt < MAX_RETRIES - 1:
                time.sleep(INITIAL_BACKOFF)
                continue
            raise last_error
        except requests.exceptions.RequestException as e:
            logger.error(f"Groq request error: {e}")
            raise LLMClientError(f"Groq request failed: {e}")
        except (KeyError, IndexError) as e:
            logger.error(f"Groq response parsing error: {e}")
            raise LLMClientError("Invalid response from Groq API")
    
    # If we exhausted all retries
    if last_error:
        raise last_error
    raise LLMClientError("Failed after multiple retries")


def generate_text(
    prompt: str,
    system_prompt: Optional[str] = None,
    max_tokens: int = 2048,
    temperature: float = 0.7
) -> str:
    """
    Generate text using Groq API.
    
    Args:
        prompt: The user prompt to send to the model.
        system_prompt: Optional system prompt to set context.
        max_tokens: Maximum tokens in response.
        temperature: Creativity/randomness (0.0-1.0).
    
    Returns:
        The generated text response.
    
    Raises:
        LLMClientError: If API key is not configured or API call fails.
    """
    messages = []
    
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    
    messages.append({"role": "user", "content": prompt})
    
    return _make_request(messages, temperature, max_tokens)


def generate_json(
    prompt: str,
    system_prompt: Optional[str] = None,
    max_tokens: int = 2048,
    temperature: float = 0.3
) -> str:
    """
    Generate JSON output using Groq API.
    Uses lower temperature for more deterministic output.
    
    Args:
        prompt: The user prompt (should request JSON output).
        system_prompt: Optional system prompt.
        max_tokens: Maximum tokens in response.
        temperature: Creativity (default lower for JSON).
    
    Returns:
        The generated text (caller should parse as JSON).
    """
    json_system = "You are a helpful assistant that always responds with valid JSON only. Do not include any text outside the JSON object. Do not use markdown code blocks."
    if system_prompt:
        json_system = f"{system_prompt}\n\n{json_system}"
    
    return generate_text(
        prompt=prompt,
        system_prompt=json_system,
        max_tokens=max_tokens,
        temperature=temperature
    )
