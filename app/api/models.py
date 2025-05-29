from pydantic import BaseModel, Field, validator
from typing import List, Dict, Optional, Any
from enum import Enum
from datetime import datetime

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

    def to_dict(self) -> dict:
        """Convert CourseChoice to dictionary"""
        return {
            "choice1": self.choice1,
            "choice2": self.choice2
        }

class PreferenceBase(BaseModel):
    student_id: str = Field(..., description="Unique identifier for the student")
    name: str = Field(default="Unknown", description="Student's full name")
    preferences: Dict[CourseCategory, CourseChoice] = Field(
        default_factory=dict,
        description="Student's course preferences by category"
    )
    
    @validator('preferences')
    def validate_mdm_mandatory(cls, v):
        if CourseCategory.MDM not in v:
            raise ValueError("MDM course selection is mandatory")
        
        mdm_choice = v.get(CourseCategory.MDM)
        if not mdm_choice or not mdm_choice.choice1:
            raise ValueError("At least choice1 for MDM is mandatory")
            
        return v

class StudentPreference(PreferenceBase):
    def to_db_model(self) -> dict:
        """Convert to database model format"""
        return {
            "student_id": self.student_id,
            "name": self.name,
            "preferences": {
                category: choices.to_dict()
                for category, choices in self.preferences.items()
            }
        }

class AllocationRequest(BaseModel):
    students: List[StudentPreference]

    @validator('students')
    def validate_student_preferences(cls, students):
        if not students:
            raise ValueError("No students provided for allocation")
        
        for student in students:
            # Validate MDM selection
            mdm_choice = student.preferences.get(CourseCategory.MDM)
            if not mdm_choice or not mdm_choice.choice1:
                raise ValueError(f"Student {student.student_id}: MDM course selection (choice1) is mandatory")
        
        return students

class StudentAllocation(BaseModel):
    student_id: str
    name: str
    allocations: Dict[CourseCategory, Optional[str]] = {}
    issues: List[str] = []

class CourseEnrollment(BaseModel):
    course_id: str
    name: str = Field(default="Unknown Course")
    capacity: int = Field(default=60, ge=0)
    min_enrollment: int = Field(default=20, ge=0)
    enrolled: int = Field(default=0, ge=0)
    students: List[str] = Field(default_factory=list)
    waitlist: List[str] = Field(default_factory=list)

    @validator('enrolled')
    def validate_enrollment(cls, v, values):
        if 'capacity' in values and v > values['capacity']:
            raise ValueError("Enrolled students cannot exceed capacity")
        return v

class AllocationResponse(BaseModel):
    student_allocations: List[StudentAllocation]
    course_summaries: Dict[str, CourseEnrollment]
    issues: List[str] = []

class DownloadFormat(str, Enum):
    EXCEL = "excel"
    CSV = "csv"

class PreferenceResponse(BaseModel):
    student_id: str
    name: str = Field(default="Unknown")
    preferences: Dict[str, CourseChoice] = Field(default_factory=dict)

    class Config:
        from_attributes = True
        arbitrary_types_allowed = True
