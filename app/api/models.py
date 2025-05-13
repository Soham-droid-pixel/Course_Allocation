from pydantic import BaseModel, Field, validator
from typing import List, Dict, Optional, Any
from enum import Enum

class CourseCategory(str, Enum):
    PECL1 = "PECL1"
    PECL2 = "PECL2"
    PROGRAM_ELECTIVE = "Program Elective"
    OPEN_ELECTIVE = "Open Elective"
    HONORS = "Honors"
    MINOR = "Minor"
    MDM = "MDM"

class CourseChoice(BaseModel):
    choice1: Optional[str] = None
    choice2: Optional[str] = None

class StudentPreference(BaseModel):
    student_id: str
    name: str
    preferences: Dict[CourseCategory, CourseChoice] = {}
    
    @validator('preferences')
    def validate_mdm_mandatory(cls, v):
        # Ensure MDM is present as it's mandatory
        if CourseCategory.MDM not in v:
            raise ValueError("MDM course selection is mandatory")
        
        # Check that at least choice1 is provided for MDM
        if not v[CourseCategory.MDM].choice1:
            raise ValueError("At least choice1 for MDM is mandatory")
            
        return v

class AllocationRequest(BaseModel):
    students: List[StudentPreference]

class StudentAllocation(BaseModel):
    student_id: str
    name: str
    allocations: Dict[CourseCategory, Optional[str]] = {}
    issues: List[str] = []

class CourseEnrollment(BaseModel):
    course_id: str
    capacity: int = 0
    enrolled: int = 0
    students: List[str] = []

class AllocationResponse(BaseModel):
    student_allocations: List[StudentAllocation]
    course_summaries: Dict[str, CourseEnrollment]
    issues: List[str] = []

class DownloadFormat(str, Enum):
    EXCEL = "excel"
    CSV = "csv"
