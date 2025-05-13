from pydantic_settings import BaseSettings
from typing import List, Dict, Any
import os

class Settings(BaseSettings):
    API_V1_STR: str = "/v1"
    PROJECT_NAME: str = "Course Allocation Service"
    
    # Course allocation settings
    MIN_COURSE_ENROLLMENT: int = 20
    
    # Debugging flag
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # Logging configuration
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    class Config:
        env_file = ".env"

settings = Settings()
