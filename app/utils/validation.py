import logging
from typing import List
from ..api.models import StudentPreference
from ..core.exceptions import CourseAllocationException

logger = logging.getLogger("course_allocation_service")

def validate_mdm_selection(students: List[StudentPreference]) -> None:
    """Validate that all students have selected MDM first choice"""
    invalid_students = []
    
    for student in students:
        mdm_preferences = student.preferences.get("MDM", {})
        if not mdm_preferences or not mdm_preferences.get("choice1", "").strip():
            # Ensure we have a valid student_id to add to the list
            if hasattr(student, 'student_id') and student.student_id:
                invalid_students.append(str(student.student_id))
            else:
                invalid_students.append("Unknown Student")
    
    if invalid_students:
        # Filter out any empty strings or None values
        valid_invalid_students = [sid for sid in invalid_students if sid and str(sid).strip()]
        
        if valid_invalid_students:
            error_msg = f"MDM first choice is mandatory. Missing for students: {', '.join(valid_invalid_students)}"
        else:
            error_msg = f"MDM first choice is mandatory. Missing for {len(invalid_students)} student(s) with invalid IDs"
        
        logger.error(error_msg)
        raise CourseAllocationException(error_msg)

def validate_student_preferences(students: List[StudentPreference]) -> List[str]:
    """
    Validate student preferences and return list of issues found.
    
    Args:
        students: List of student preferences to validate
        
    Returns:
        List of validation issues found
    """
    issues = []
    
    for student in students:
        # Ensure student has a valid ID
        student_id = getattr(student, 'student_id', 'Unknown')
        
        # Check if student has any preferences
        if not student.preferences:
            issues.append(f"Student {student_id}: No preferences submitted")
            continue
        
        # Check for empty preference categories
        empty_categories = []
        for category, choices in student.preferences.items():
            if not choices or (not choices.get("choice1", "").strip() and
                              not choices.get("choice2", "").strip()):
                empty_categories.append(category)
        
        if empty_categories:
            issues.append(f"Student {student_id}: Empty preferences for {', '.join(empty_categories)}")
    
    if issues:
        logger.warning(f"Found {len(issues)} validation issues")
    else:
        logger.info("All student preferences validated successfully")
    
    return issues

def validate_student_data_integrity(students: List[StudentPreference]) -> List[str]:
    """
    Validate the integrity of student data before processing.
    
    Args:
        students: List of student preferences to validate
        
    Returns:
        List of data integrity issues found
    """
    issues = []
    seen_student_ids = set()
    
    for i, student in enumerate(students):
        # Check for missing student ID
        if not hasattr(student, 'student_id') or not student.student_id:
            issues.append(f"Student at index {i}: Missing student ID")
            continue
        
        student_id = str(student.student_id).strip()
        if not student_id:
            issues.append(f"Student at index {i}: Empty student ID")
            continue
        
        # Check for duplicate student IDs
        if student_id in seen_student_ids:
            issues.append(f"Duplicate student ID found: {student_id}")
        else:
            seen_student_ids.add(student_id)
        
        # Check for missing name
        if not hasattr(student, 'name') or not str(getattr(student, 'name', '')).strip():
            issues.append(f"Student {student_id}: Missing or empty name")
    
    if issues:
        logger.error(f"Found {len(issues)} data integrity issues")
    else:
        logger.info("Student data integrity validation passed")
    
    return issues