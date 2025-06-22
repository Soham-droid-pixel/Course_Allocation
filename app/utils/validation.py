import sys
from pathlib import Path
app_dir = Path(__file__).parent.parent
if str(app_dir) not in sys.path:
    sys.path.insert(0, str(app_dir))

import logging
from typing import List
from api.models import StudentPreference
from core.exceptions import CourseAllocationException

logger = logging.getLogger("course_allocation_service")

def validate_mdm_selection(students: List[StudentPreference]) -> None:
    """Validate that all students have selected MDM first choice"""
    invalid_students = []
    
    for student in students:
        mdm_preferences = student.preferences.get("MDM", {})
        if not mdm_preferences or not mdm_preferences.get("choice1", "").strip():
            # Use roll_number instead of student_id
            if hasattr(student, 'roll_number') and student.roll_number:
                invalid_students.append(str(student.roll_number))
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
        # Use roll_number instead of student_id
        roll_number = getattr(student, 'roll_number', 'Unknown')
        
        # Check if student has any preferences
        if not student.preferences:
            issues.append(f"Student {roll_number}: No preferences submitted")
            continue
        
        # Check for empty preference categories
        empty_categories = []
        for category, choices in student.preferences.items():
            if not choices or (not choices.get("choice1", "").strip() and
                              not choices.get("choice2", "").strip()):
                empty_categories.append(category)
        
        if empty_categories:
            issues.append(f"Student {roll_number}: Empty preferences for {', '.join(empty_categories)}")
    
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
    seen_roll_numbers = set()  # Changed from seen_student_ids
    
    for i, student in enumerate(students):
        # Check for missing roll_number (changed from student_id)
        if not hasattr(student, 'roll_number') or not student.roll_number:
            issues.append(f"Student at index {i}: Missing roll number")
            continue
        
        roll_number = str(student.roll_number).strip()  # Changed from student_id
        if not roll_number:
            issues.append(f"Student at index {i}: Empty roll number")
            continue
        
        # Check for duplicate roll numbers (changed from student IDs)
        if roll_number in seen_roll_numbers:
            issues.append(f"Duplicate roll number found: {roll_number}")
        else:
            seen_roll_numbers.add(roll_number)
        
        # Check for missing name
        if not hasattr(student, 'name') or not str(getattr(student, 'name', '')).strip():
            issues.append(f"Student {roll_number}: Missing or empty name")
    
    if issues:
        logger.error(f"Found {len(issues)} data integrity issues")
    else:
        logger.info("Student data integrity validation passed")
    
    return issues

# Additional helper function for roll_number validation
def validate_roll_number_format(roll_number: str) -> bool:
    """
    Validate roll number format (optional - adjust pattern as needed)
    
    Args:
        roll_number: The roll number to validate
        
    Returns:
        True if format is valid, False otherwise
    """
    if not roll_number or not isinstance(roll_number, str):
        return False
    
    # Example format validation - adjust as per your requirements
    # This assumes format like: 21CS001, 22ME015, etc.
    import re
    pattern = r'^[0-9]{2}[A-Z]{2,3}[0-9]{3}$'
    return bool(re.match(pattern, roll_number.strip().upper()))

def validate_confirmed_preferences(students: List[StudentPreference]) -> List[str]:
    """
    Validate that confirmed students have all required preferences
    
    Args:
        students: List of student preferences to validate
        
    Returns:
        List of validation issues for confirmed students
    """
    issues = []
    
    # Required categories for confirmation
    required_categories = ["PECL1", "PECL2", "Program Elective", "Open Elective", "MDM"]
    
    confirmed_students = [s for s in students if getattr(s, 'status', '') == 'confirmed']
    
    for student in confirmed_students:
        roll_number = getattr(student, 'roll_number', 'Unknown')
        
        # Check that all required categories have first choice
        missing_required = []
        for category in required_categories:
            choices = student.preferences.get(category, {})
            choice1 = str(choices.get("choice1", "")).strip()
            if not choice1:
                missing_required.append(category)
        
        if missing_required:
            issues.append(f"Confirmed student {roll_number}: Missing required first choices for {', '.join(missing_required)}")
        
        # Special validation for MDM
        mdm_choices = student.preferences.get("MDM", {})
        mdm_choice1 = str(mdm_choices.get("choice1", "")).strip()
        if mdm_choice1 not in ["MDM1", "MDM2"]:
            issues.append(f"Confirmed student {roll_number}: Invalid MDM choice '{mdm_choice1}'. Must be MDM1 or MDM2")
    
    if issues:
        logger.warning(f"Found {len(issues)} issues with confirmed preferences")
    
    return issues