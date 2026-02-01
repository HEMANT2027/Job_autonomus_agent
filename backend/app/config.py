"""Application configuration using Pydantic Settings."""

from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict

# Get absolute path to .env file (in backend directory)
ENV_FILE_PATH = Path(__file__).parent.parent / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignore extra env vars not defined in model
    )

    # Application Settings
    app_name: str = "Job Application Automation"
    app_env: str = "development"
    debug: bool = True

    # Server Settings
    host: str = "0.0.0.0"
    port: int = 8000

    # Database Settings
    database_url: str = "postgresql://postgres:postgres@localhost:5432/job_automation"
    db_echo: bool = False

    # Security Settings
    secret_key: str = "your-super-secret-key-change-in-production"
    access_token_expire_minutes: int = 30

    # CORS Settings
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # Logging
    log_level: str = "INFO"

    # Groq API for LLM calls
    groq_api_key: str = ""


    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins string into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


# Create settings instance on module load
settings = Settings()

