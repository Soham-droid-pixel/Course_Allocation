from beanie import Document
from typing import Dict, List, Optional, Annotated
from datetime import datetime
from pydantic import BaseModel, Field
from ..api.models import CourseCategory, CourseChoice

class StudentPreference(Document):
    student_id: Annotated[str, Field(index=True, unique=True)]
    name: str
    preferences: Dict[CourseCategory, CourseChoice]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    enrollment_status: str = "pending"  # pending, allocated, waitlisted
    
    class Settings:
        name = "student_preferences"
        indexes = [
            [("created_at", -1)],
            [("enrollment_status", 1)]
        ]

class CourseEnrollment(BaseModel):
    course_id: str
    name: str
    capacity: int = 60
    min_enrollment: int = 20
    current_enrollment: int = 0
    enrolled_students: List[str] = []
    waitlist: List[str] = []

class AllocationResult(Document):
    allocation_id: Annotated[str, Field(index=True, unique=True)]
    student_allocations: Dict[str, Dict[CourseCategory, str]]
    course_enrollments: Dict[str, CourseEnrollment]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "completed"
    issues: List[str] = []

    class Settings:
        name = "allocation_results"
        indexes = [
            [("created_at", -1)]
        ]