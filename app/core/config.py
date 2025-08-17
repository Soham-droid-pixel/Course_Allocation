
# This file manages configuration settings for the Course Allocation Service.

# - API_V1_STR → Base path for version 1 of the API (e.g., /v1).
# - PROJECT_NAME → Name of the project.
# - MIN_COURSE_ENROLLMENT → Minimum number of students required for a course.
# - DEBUG → Enables debug mode if DEBUG=true in environment variables.
# - LOG_LEVEL → Logging level (default = INFO, can be DEBUG, WARNING, etc.).
# - MONGODB_URL → MongoDB connection string (default: local MongoDB).
# - DB_NAME → Name of the MongoDB database.

# ⚙️ Config class:
# - Reads environment variables from a `.env` file automatically.


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
    
    # MongoDB settings
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DB_NAME: str = "course_allocation"
    
    class Config:
        env_file = ".env"

settings = Settings()
