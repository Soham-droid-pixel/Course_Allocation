from typing import List
from ..core.exceptions import CourseAllocationException
from ..api.models import CourseCategory
from ..db.models import StudentPreference
from ..db.models import CourseChoice

def validate_mdm_selection(preferences: List[StudentPreference]) -> None:
    """Validates MDM course selections"""
    invalid_students = []
    valid_mdm_courses = ["MDM1", "MDM2"]  # Course IDs for Health Wellness and Emotional Intelligence

    for student in preferences:
        # Get MDM preferences
        mdm_prefs = student.preferences.get("MDM", {})
        if not isinstance(mdm_prefs, CourseChoice):
            mdm_prefs = CourseChoice(**mdm_prefs if isinstance(mdm_prefs, dict) else {})

        # Validate choice
        if not mdm_prefs.choice1 or mdm_prefs.choice1 not in valid_mdm_courses:
            invalid_students.append(f"{student.student_id} (invalid or missing selection)")
            continue

    if invalid_students:
        raise CourseAllocationException(
            f"Invalid MDM selections for students: {', '.join(invalid_students)}"
        )