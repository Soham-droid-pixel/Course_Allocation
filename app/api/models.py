from pydantic import BaseModel, Field, validator, root_validator
from typing import List, Dict, Optional, Union
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


class PreferenceStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    CONFIRMED = "confirmed"


class DownloadFormat(str, Enum):
    EXCEL = "excel"
    CSV = "csv"
    # Add attribute-style access for backward compatibility
    excel = "excel"
    csv = "csv"


class CourseChoice(BaseModel):
    choice1: str = Field(default="")
    choice2: str = Field(default="")

    @validator("choice1", "choice2", pre=True, always=True)
    def ensure_string(cls, v):
        if v is None:
            return ""
        return str(v).strip()

    class Config:
        json_schema_extra = {
            "examples": [
                {"choice1": "COURSE1", "choice2": "COURSE2"}
            ]
        }


class PreferenceBase(BaseModel):
    student_id: str = Field(..., description="Unique identifier for the student")
    name: str = Field(default="Unknown", description="Student's full name")
    preferences: Dict[CourseCategory, CourseChoice] = Field(default_factory=dict)

    @validator("preferences", pre=True, always=True)
    def validate_mdm_mandatory(cls, v):
        if not v:
            v = {}
        if CourseCategory.MDM not in v:
            v[CourseCategory.MDM] = CourseChoice()
        if not v[CourseCategory.MDM].choice1:
            raise ValueError("MDM first choice is mandatory")
        return v

    class Config:
        validate_assignment = True


class StudentPreference(BaseModel):
    roll_number: str  # Changed from student_id
    name: str = Field(default="Unknown")
    preferences: Dict[str, Dict[str, str]] = Field(default_factory=dict)
    status: PreferenceStatus = PreferenceStatus.DRAFT
    comments: str = Field(default="")
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @root_validator(pre=True)
    def clean_preferences(cls, values):
        prefs = values.get("preferences", {})
        cleaned_prefs = {}

        for category in CourseCategory:
            val = prefs.get(category.value, {})
            if not isinstance(val, dict):
                val = {}
            
            cleaned_prefs[category.value] = {
                "choice1": "" if val.get("choice1") is None else str(val.get("choice1")).strip(),
                "choice2": "" if val.get("choice2") is None else str(val.get("choice2")).strip()
            }

        # Only validate MDM for confirmed status, not draft
        status = values.get("status")
        if status == PreferenceStatus.CONFIRMED or status == "confirmed":
            mdm_choices = cleaned_prefs.get("MDM", {})
            mdm_choice1 = mdm_choices.get("choice1", "").strip()
            
            if not mdm_choice1:
                raise ValueError(
                    f"Student {values.get('roll_number', 'Unknown')}: "
                    "MDM first choice is mandatory for confirmed preferences"
                )

        values["preferences"] = cleaned_prefs
        return values

    class Config:
        json_schema_extra = {
            "example": {
                "student_id": "TEST001",
                "name": "Test Student",
                "preferences": {
                    "PECL1": {"choice1": "25PECL13CE11", "choice2": "25PECL13CE12"},
                    "PECL2": {"choice1": "25PECL13CE21", "choice2": "25PECL13CE22"},
                    "MDM": {"choice1": "MDM1", "choice2": ""},  # MDM choice1 is mandatory
                    "Honors": {"choice1": "", "choice2": ""},
                    "Minor": {"choice1": "", "choice2": ""},
                    "Program Elective": {"choice1": "", "choice2": ""},
                    "Open Elective": {"choice1": "", "choice2": ""}
                },
                "status": "confirmed",
                "comments": "",
                "updated_at": "2025-05-31T09:30:00"
            }
        }


class AllocationRequest(BaseModel):
    students: List[StudentPreference] = Field(default_factory=list)

    @validator("students")
    def validate_student_preferences(cls, students):
        if not students:
            raise ValueError("No students provided for allocation")
        
        invalid_students = []
        for student in students:
            if student.status == PreferenceStatus.CONFIRMED or student.status == "confirmed":
                mdm_choice = student.preferences.get("MDM", {}).get("choice1", "").strip()
                if not mdm_choice:
                    invalid_students.append(student.student_id)
        
        if invalid_students:
            raise ValueError(
                f"Missing MDM first choice for confirmed students: {', '.join(invalid_students)}"
            )
        return students


class StudentAllocation(BaseModel):
    roll_number: str  # Primary identifier
    student_id: Optional[str] = None  # For backward compatibility
    name: str
    allocations: Dict[str, str] = Field(default_factory=dict)
    issues: List[str] = Field(default_factory=list)
    
    @validator("allocations", pre=True, always=True)
    def clean_allocations(cls, v):
        """Ensure no None or empty values in allocations"""
        if not isinstance(v, dict):
            return {}
        
        # Filter out None, empty strings, and whitespace-only strings
        return {
            category: course_id.strip() 
            for category, course_id in v.items() 
            if course_id is not None and str(course_id).strip()
        }
    

class CourseEnrollment(BaseModel):
    course_id: str
    name: str = ""
    min_enrollment: int = 20
    enrolled: int = 0
    students: List[str] = Field(default_factory=list)

    @validator("enrolled")
    def validate_enrollment(cls, v, values):
        if "capacity" in values and v > values["capacity"]:
            raise ValueError("Enrolled students cannot exceed capacity")
        return v


class AllocationResponse(BaseModel):
    allocation_id: str = Field(default="")
    student_allocations: List[StudentAllocation] = Field(default_factory=list)
    course_summaries: Dict[str, CourseEnrollment] = Field(default_factory=dict)
    issues: List[str] = Field(default_factory=list)


class PreferenceResponse(BaseModel):
    roll_number: str  # Changed from student_id
    name: str = Field(default="Unknown")
    preferences: Dict[str, Dict[str, str]] = Field(default_factory=dict)
    status: PreferenceStatus = Field(default=PreferenceStatus.DRAFT)
    comments: str = Field(default="")
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @root_validator(pre=True)
    def clean_data(cls, values):
        prefs = values.get("preferences", {})
        cleaned_prefs = {}

        # Convert preferences to proper format
        for category in CourseCategory:
            val = prefs.get(category.value, {})
            if not isinstance(val, dict):
                val = {}
            
            cleaned_prefs[category.value] = {
                "choice1": "" if val.get("choice1") is None else str(val.get("choice1")).strip(),
                "choice2": "" if val.get("choice2") is None else str(val.get("choice2")).strip()
            }

        values["preferences"] = cleaned_prefs
        return values

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class PreferenceConfirmation(BaseModel):
    roll_number: str
    name: str = Field(default="Unknown")
    preferences: Dict[str, Dict[str, str]] = Field(default_factory=dict)
    confirm: bool = Field(default=False)  # Simple boolean flag
    comments: str = Field(default="")
    status: str = Field(default="draft")
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_schema_extra = {
            "example": {
                "roll_number": "21CS001",
                "name": "Test Student",
                "preferences": {},
                "confirm": True,  # true = confirmed, false = draft
                "comments": "Updated preferences",
                "status": "confirmed"
            }
        }


class ReportRequest(BaseModel):
    allocation_id: str
    format: DownloadFormat = DownloadFormat.EXCEL
    include_waitlist: bool = Field(default=True)
    include_issues: bool = Field(default=True)

    class Config:
        json_schema_extra = {
            "example": {
                "allocation_id": "abc123-def456",
                "format": "excel",
                "include_waitlist": True,
                "include_issues": True
            }
        }


class HealthCheck(BaseModel):
    status: str = "healthy"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    version: str = "1.0.0"
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class AllocationSummary(BaseModel):
    """Summary response for allocation endpoints when no allocation exists"""
    allocation_id: Optional[str] = None
    status: str = "no_allocations"
    message: str = "No allocations found"
    created_at: Optional[datetime] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class ErrorResponse(BaseModel):
    """Standard error response model"""
    error: str
    detail: str
    status_code: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }