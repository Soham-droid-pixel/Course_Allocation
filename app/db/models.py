from beanie import Document
from typing import Dict, List, Optional, Annotated
from datetime import datetime
from pydantic import Field
from ..api.models import CourseCategory, CourseChoice

class StudentPreference(Document):
    student_id: Annotated[str, Field(index=True, unique=True)]
    name: str = Field(default="Unknown")
    preferences: Dict[str, dict] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    enrollment_status: str = Field(default="pending")

    def convert_preferences(self) -> Dict[str, CourseChoice]:
        """Convert raw preferences to CourseChoice objects"""
        converted = {}
        for category, choices in self.preferences.items():
            if isinstance(choices, dict):
                converted[category] = CourseChoice(
                    choice1=choices.get('choice1'),
                    choice2=choices.get('choice2')
                )
        return converted

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