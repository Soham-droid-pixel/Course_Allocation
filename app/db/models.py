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
    
    class Settings:
        name = "student_preferences"

class AllocationResult(Document):
    allocation_id: Annotated[str, Field(index=True, unique=True)]
    student_allocations: Dict[str, Dict[CourseCategory, str]]  # student_id -> {category: course_id}
    course_enrollments: Dict[str, List[str]]  # course_id -> [student_ids]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "completed"
    issues: List[str] = []

    class Settings:
        name = "allocation_results"