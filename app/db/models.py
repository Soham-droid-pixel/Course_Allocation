from beanie import Document
from typing import Dict, List, Optional, Annotated
from datetime import datetime
from pydantic import Field, validator
import logging  # Add this import
import sys
from pathlib import Path

# Fix import path
app_dir = Path(__file__).parent.parent
if str(app_dir) not in sys.path:
    sys.path.insert(0, str(app_dir))

# Import with absolute path
from api.models import CourseCategory, CourseChoice

# Add logger
logger = logging.getLogger("course_allocation_service")

class StudentPreference(Document):
    roll_number: Annotated[str, Field(index=True, unique=True)]
    name: str = Field(default="Unknown")
    preferences: Dict[str, Dict[str, str]] = Field(default_factory=dict)
    status: str = Field(default="draft")
    comments: str = Field(default="")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    enrollment_status: str = Field(default="pending")

    # REMOVE THIS VALIDATOR - it's preventing status changes
    # @validator("status", pre=True, always=True)
    # def validate_status_with_mdm(cls, v, values):
    #     # DELETE THIS ENTIRE FUNCTION - IT'S BLOCKING CONFIRMATION

    # Keep only the essential validators
    @validator("preferences", pre=True, always=True)
    def ensure_string_preferences(cls, v):
        if not isinstance(v, dict):
            v = {}
        
        for category in CourseCategory:
            if category.value not in v:
                v[category.value] = {"choice1": "", "choice2": ""}
            else:
                current = v[category.value]
                if not isinstance(current, dict):
                    current = {}
                
                v[category.value] = {
                    "choice1": str(current.get("choice1", "")).strip(),
                    "choice2": str(current.get("choice2", "")).strip()
                }
        return v

    class Settings:
        name = "student_preferences"


class AllocationResult(Document):
    allocation_id: Annotated[str, Field(index=True, unique=True)]
    student_allocations: Dict[str, Dict[str, str]] = Field(default_factory=dict)  # Keys are roll_numbers
    course_enrollments: Dict[str, List[str]] = Field(default_factory=dict)  # Values contain roll_numbers
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(default="pending")
    issues: List[str] = Field(default_factory=list)

    class Settings:
        name = "allocation_results"
        indexes = [
            [("created_at", -1)],
            [("status", 1)]
        ]