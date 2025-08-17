# Import necessary typing utilities for type hints (Dict, List, Any, Optional)
# Import json for deep copy and sanitization
# Import logging for logging errors/info
# Import StudentPreference and CourseCategory models from api

# Configure logger for course_allocation_service

# Function: sanitize_input
# - Purpose: Clean and validate input data safely
# - Args: input_data (dictionary of raw input)
# - Returns: sanitized deep-copied version of the input
# - Implementation: Uses JSON deep copy to avoid mutating original data
# - Note: Placeholder for extra validation logic

# Function: validate_student_preferences
# - Purpose: Validate list of student preferences
# - Args: preferences (list of StudentPreference objects)
# - Returns: list of validation error messages
# - Implementation details:
#   - Initializes errors list
#   - For each student preference:
#       - Checks if MDM course is chosen (mandatory rule)
#       - Defines required categories (PECL1, PECL2, PROGRAM_ELECTIVE, OPEN_ELECTIVE)
#       - For each required category: ensures both choice1 and choice2 are provided
#       - If validation fails, adds error message with student_id and missing requirement
# - Finally returns list of all error messages


from typing import Dict, List, Any, Optional
import json
import logging
from ..api.models import StudentPreference, CourseCategory

logger = logging.getLogger("course_allocation_service")

def sanitize_input(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitize and validate input data.
    
    Args:
        input_data: The input data to sanitize
        
    Returns:
        Sanitized input data
    """
    # Deep copy to avoid modifying input
    sanitized = json.loads(json.dumps(input_data))
    
    # Additional validation can be added here
    
    return sanitized

def validate_student_preferences(preferences: List[StudentPreference]) -> List[str]:
    """Validate student preferences and return list of validation errors."""
    errors = []
    
    for pref in preferences:
        # Check MDM
        mdm_choice = pref.preferences.get(CourseCategory.MDM)
        if not mdm_choice or not mdm_choice.choice1:
            errors.append(f"Student {pref.student_id}: MDM course selection is mandatory")
            
        # Check required categories
        required_categories = [
            CourseCategory.PECL1,
            CourseCategory.PECL2,
            CourseCategory.PROGRAM_ELECTIVE,
            CourseCategory.OPEN_ELECTIVE
        ]
        
        for category in required_categories:
            choices = pref.preferences.get(category)
            if not choices or not (choices.choice1 and choices.choice2):
                errors.append(f"Student {pref.student_id}: Two choices required for {category}")
    
    return errors
