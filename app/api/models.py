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


class CourseChoice(BaseModel):
    choice1: str = Field(default="")
    choice2: str = Field(default="")

    @validator("choice1", "choice2", pre=True, always=True)
    def ensure_string(cls, v):
        if v is None:
            return ""
        return str(v).strip()

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"choice1": "COURSE1", "choice2": "COURSE2"}
            ]
        }
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
    student_id: str
    name: str = Field(default="Unknown")
    preferences: Dict[str, Dict[str, str]] = Field(default_factory=dict)
    status: PreferenceStatus = PreferenceStatus.DRAFT
    comments: str = Field(default="")
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @root_validator(pre=True)
    def clean_preferences(cls, values):
        prefs = values.get("preferences", {})
        cleaned_prefs = {}

        # Ensure all categories exist with proper string defaults
        for category in CourseCategory:
            val = prefs.get(category.value, {})
            if not isinstance(val, dict):
                val = {}
            
            cleaned_prefs[category.value] = {
                "choice1": "" if val.get("choice1") is None else str(val.get("choice1")).strip(),
                "choice2": "" if val.get("choice2") is None else str(val.get("choice2")).strip()
            }

        # Add additional validation for confirmed status
        if values.get("status") == PreferenceStatus.CONFIRMED:
            mdm_choices = cleaned_prefs.get("MDM", {})
            mdm_choice1 = mdm_choices.get("choice1", "").strip()
            
            if not mdm_choice1:
                raise ValueError(
                    f"Student {values.get('student_id', 'Unknown')}: "
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
    students: List[StudentPreference]

    @validator("students")
    def validate_student_preferences(cls, students):
        if not students:
            raise ValueError("No students provided for allocation")
        
        invalid_students = []
        for student in students:
            if student.status == PreferenceStatus.CONFIRMED:
                mdm_choice = student.preferences.get("MDM", {}).get("choice1", "").strip()
                if not mdm_choice:
                    invalid_students.append(student.student_id)
        
        if invalid_students:
            raise ValueError(
                f"Missing MDM first choice for confirmed students: {', '.join(invalid_students)}"
            )
        return students


class StudentAllocation(BaseModel):
    student_id: str
    name: str
    allocations: Dict[str, Optional[str]] = Field(default_factory=dict)
    issues: List[str] = Field(default_factory=list)


class CourseEnrollment(BaseModel):
    course_id: str
    name: str = Field(default="Unknown Course")
    capacity: int = Field(default=60, ge=0)
    min_enrollment: int = Field(default=20, ge=0)
    enrolled: int = Field(default=0, ge=0)
    students: List[str] = Field(default_factory=list)
    waitlist: List[str] = Field(default_factory=list)

    @validator("enrolled")
    def validate_enrollment(cls, v, values):
        if "capacity" in values and v > values["capacity"]:
            raise ValueError("Enrolled students cannot exceed capacity")
        return v


class AllocationResponse(BaseModel):
    student_allocations: List[StudentAllocation]
    course_summaries: Dict[str, CourseEnrollment]
    issues: List[str] = Field(default_factory=list)


class DownloadFormat(str, Enum):
    EXCEL = "excel"
    CSV = "csv"


class PreferenceResponse(BaseModel):
    student_id: str
    name: str = Field(default="Unknown")
    preferences: Dict[str, Dict[str, str]] = Field(default_factory=dict)  # Changed type
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
    student_id: str
    name: str = Field(default="Unknown")
    preferences: Dict[str, Dict[str, str]] = Field(default_factory=dict)
    confirm: bool = Field(default=False)
    comments: str = Field(default="")
    status: PreferenceStatus = Field(default=PreferenceStatus.DRAFT)
    updated_at: datetime = Field(default_factory=datetime.utcnow)  # Removed Optional

    @root_validator(pre=True)
    def clean_data(cls, values):
        # Initialize empty preferences with default values
        cleaned_prefs = {}
        prefs = values.get("preferences", {})

        # Ensure all categories exist with default empty strings
        for category in CourseCategory:
            current = prefs.get(category.value, {})
            if not isinstance(current, dict):
                current = {}
            
            # Convert None to empty string and ensure string type
            choice1 = current.get("choice1")
            choice2 = current.get("choice2")
            
            cleaned_prefs[category.value] = {
                "choice1": "" if choice1 is None else str(choice1).strip(),
                "choice2": "" if choice2 is None else str(choice2).strip()
            }

        # Handle datetime with proper validation - ensure it's never None
        updated_at = values.get("updated_at")
        if updated_at is None:
            values["updated_at"] = datetime.utcnow()
        elif isinstance(updated_at, str):
            try:
                values["updated_at"] = datetime.fromisoformat(
                    updated_at.replace('Z', '+00:00')
                )
            except (ValueError, TypeError):
                values["updated_at"] = datetime.utcnow()

        # Set other fields with proper defaults
        comments = values.get("comments")
        values.update({
            "preferences": cleaned_prefs,
            "comments": "" if comments is None else str(comments),
            "confirm": bool(values.get("confirm", False)),
            "status": (
                PreferenceStatus.CONFIRMED 
                if values.get("confirm") 
                else PreferenceStatus.DRAFT
            ),
            "name": str(values.get("name") or "Unknown")
        })

        return values

    class Config:
        validate_assignment = True
        arbitrary_types_allowed = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }