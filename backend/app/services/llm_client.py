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
MAX_RETRIES = 3
INITIAL_BACKOFF = 2  # seconds


class LLMClientError(Exception):
    """Exception for LLM client errors."""
    pass


# API Key Pool for strict rotation (one call per key, then next)
_api_keys: list = []
_current_key_index: int = 0
_keys_loaded: bool = False

def _load_api_keys() -> list:
    """Load API keys from numbered env vars (GROQ_API_KEY_1 to GROQ_API_KEY_10)."""
    global _api_keys, _keys_loaded
    if not _keys_loaded:
        import os
        from pathlib import Path
        from dotenv import load_dotenv
        
        # Load .env file from backend directory
        env_path = Path(__file__).parent.parent.parent / ".env"
        load_dotenv(env_path, override=True)
        
        _api_keys = []
        for i in range(1, 11):  # Keys 1-10
            key = os.getenv(f"GROQ_API_KEY_{i}", "").strip()
            if key:
                _api_keys.append(key)
                logger.debug(f"Loaded GROQ_API_KEY_{i}")
        logger.info(f"Loaded {len(_api_keys)} API key(s) for strict rotation")
        _keys_loaded = True
    return _api_keys

def _get_current_key() -> str:
    """Get current API key without advancing index."""
    global _current_key_index
    keys = _load_api_keys()
    if not keys:
        raise LLMClientError("No GROQ_API_KEY_N configured in .env (N=1-10)")
    return keys[_current_key_index % len(keys)]

def _advance_to_next_key() -> str:
    """Advance to next API key (strict: always move forward after each call)."""
    global _current_key_index
    keys = _load_api_keys()
    _current_key_index = (_current_key_index + 1) % len(keys)
    logger.info(f"Advanced to API key {_current_key_index + 1}/{len(keys)}")
    return keys[_current_key_index]


def _make_request(
    messages: list,
    temperature: float = 0.7,
    max_tokens: int = 2048
) -> str:
    """Make request with AGGRESSIVE key rotation. Cycles through ALL keys repeatedly until success."""
    keys = _load_api_keys()
    if not keys:
        raise LLMClientError("No GROQ_API_KEY_N configured in .env (N=1-10)")
    
    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    
    # Keep cycling through all keys until success
    MAX_FULL_CYCLES = 10  # Maximum full rotations through all keys
    cycle_backoff = 5  # Seconds to wait between full cycles
    
    for cycle in range(MAX_FULL_CYCLES):
        if cycle > 0:
            wait_time = cycle_backoff * cycle
            logger.info(f"Starting cycle {cycle + 1}/{MAX_FULL_CYCLES}. Waiting {wait_time}s before retrying all keys...")
            time.sleep(wait_time)
        
        for key_idx in range(len(keys)):
            current_key = keys[key_idx]
            key_num = key_idx + 1
            
            headers = {
                "Authorization": f"Bearer {current_key}",
                "Content-Type": "application/json"
            }
            
            try:
                logger.info(f"[Cycle {cycle + 1}] Using API key {key_num}/{len(keys)}")
                response = requests.post(
                    GROQ_API_URL,
                    headers=headers,
                    json=payload,
                    timeout=60
                )
                
                if response.status_code == 200:
                    result = response.json()
                    # Update global index to continue from here next time
                    global _current_key_index
                    _current_key_index = (key_idx + 1) % len(keys)
                    return result["choices"][0]["message"]["content"]
                
                # Rate limited - try next key
                if response.status_code == 429:
                    logger.warning(f"Rate limited on key {key_num}. Trying next key...")
                    time.sleep(1)  # Small delay before next key
                    continue
                
                # Auth error - skip this key
                if response.status_code in [401, 403]:
                    logger.warning(f"Auth error on key {key_num}. Trying next key...")
                    continue
                
                # Other errors - log and try next
                error_detail = response.text
                logger.warning(f"Key {key_num} error: {response.status_code} - {error_detail[:100]}")
                continue
                
            except requests.exceptions.Timeout:
                logger.warning(f"Timeout on key {key_num}. Trying next key...")
                continue
            except requests.exceptions.RequestException as e:
                logger.warning(f"Request error on key {key_num}: {e}. Trying next key...")
                continue
            except (KeyError, IndexError) as e:
                logger.warning(f"Parse error on key {key_num}: {e}. Trying next key...")
                continue
        
        logger.warning(f"All {len(keys)} keys failed in cycle {cycle + 1}. Will retry...")
    
    # All cycles exhausted
    raise LLMClientError(f"All API keys failed after {MAX_FULL_CYCLES} full cycles. Please check your keys or try again later.")



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
