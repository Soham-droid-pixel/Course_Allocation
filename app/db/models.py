from beanie import Document
from typing import Dict, List, Optional, Annotated
from datetime import datetime
from pydantic import Field, validator
from ..api.models import CourseCategory, CourseChoice


class StudentPreference(Document):
    student_id: Annotated[str, Field(index=True, unique=True)]
    name: str = Field(default="Unknown")
    preferences: Dict[str, Dict[str, str]] = Field(default_factory=dict)  # Changed to ensure string values
    status: str = Field(default="draft")
    comments: str = Field(default="")  # Removed Optional and set default
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)  # Removed Optional and set default
    enrollment_status: str = Field(default="pending")

    @validator("preferences", pre=True, always=True)
    def ensure_string_preferences(cls, v):
        """Ensure all preference values are strings, never None"""
        if not isinstance(v, dict):
            v = {}
        
        # Ensure all categories exist with proper defaults
        for category in CourseCategory:
            if category.value not in v:
                v[category.value] = {"choice1": "", "choice2": ""}
            else:
                current = v[category.value]
                if not isinstance(current, dict):
                    current = {}
                
                # Ensure choice1 and choice2 are strings, never None
                v[category.value] = {
                    "choice1": "" if current.get("choice1") is None else str(current.get("choice1", "")).strip(),
                    "choice2": "" if current.get("choice2") is None else str(current.get("choice2", "")).strip()
                }
        
        return v

    @validator("comments", pre=True, always=True)
    def ensure_string_comments(cls, v):
        """Ensure comments is always a string, never None"""
        return "" if v is None else str(v)

    @validator("updated_at", pre=True, always=True)
    def ensure_datetime(cls, v):
        """Ensure updated_at is always a datetime, never None"""
        if v is None:
            return datetime.utcnow()
        if isinstance(v, str):
            try:
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
            except (ValueError, TypeError):
                return datetime.utcnow()
        return v

    def convert_preferences(self) -> Dict[str, CourseChoice]:
        """Convert raw preferences to CourseChoice objects"""
        converted = {}
        for category, choices in self.preferences.items():
            if isinstance(choices, dict):
                converted[category] = CourseChoice(
                    choice1=choices.get('choice1', ''),
                    choice2=choices.get('choice2', '')
                )
        return converted

    @property
    def is_confirmed(self) -> bool:
        return self.status == "confirmed"

    class Settings:
        name = "student_preferences"
        indexes = [
            [("created_at", -1)],
            [("enrollment_status", 1)]
        ]


class AllocationResult(Document):
    allocation_id: Annotated[str, Field(index=True, unique=True)]
    student_allocations: Dict[str, Dict[str, str]] = Field(default_factory=dict)
    course_enrollments: Dict[str, List[str]] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(default="pending")
    issues: List[str] = Field(default_factory=list)

    class Settings:
        name = "allocation_results"
        indexes = [
            [("created_at", -1)],
            [("status", 1)]
        ]