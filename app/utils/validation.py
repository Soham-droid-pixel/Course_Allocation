from typing import List, Dict
import logging
from ..core.exceptions import CourseAllocationException
from ..api.models import CourseCategory, PreferenceStatus
from ..db.models import StudentPreference

# Configure logger
logger = logging.getLogger("course_allocation_service")

def validate_mdm_selection(preferences: List[StudentPreference]) -> None:
    """
    Validates MDM course selections for confirmed preferences
    
    Args:
        preferences: List of student preferences to validate
        
    Raises:
        CourseAllocationException: If any confirmed preferences have invalid MDM selections
    """
    invalid_students = []
    valid_mdm_courses = ["MDM1", "MDM2"]  # Valid MDM courses
    
    logger.info(f"Starting MDM validation for {len(preferences)} students")
    
    for student in preferences:
        if student.status != PreferenceStatus.CONFIRMED:
            continue
            
        logger.info(f"Validating MDM for student {student.student_id}")
        
        # Get and validate MDM preferences
        mdm_prefs = student.preferences.get("MDM", {})
        if not isinstance(mdm_prefs, dict):
            logger.warning(f"Invalid MDM preference format for student {student.student_id}")
            invalid_students.append(student.student_id)
            continue

        # Extract and validate choice1
        mdm_choice1 = str(mdm_prefs.get("choice1", "")).strip()
        logger.info(f"Student {student.student_id} MDM choice1: {mdm_choice1}")

        if not mdm_choice1 or mdm_choice1 not in valid_mdm_courses:
            logger.warning(
                f"Student {student.student_id}: Invalid MDM choice "
                f"'{mdm_choice1}', valid options are: {valid_mdm_courses}"
            )
            invalid_students.append(student.student_id)
            continue
            
        logger.info(f"Student {student.student_id}: Valid MDM choice found")

    if invalid_students:
        error_msg = (
            f"Invalid MDM selections for students: {', '.join(invalid_students)} "
            "(invalid or missing selection)"
        )
        logger.error(error_msg)
        raise CourseAllocationException(error_msg)
    
    logger.info("All MDM selections are valid")