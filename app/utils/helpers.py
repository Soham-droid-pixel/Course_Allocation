from typing import Dict, List, Any, Optional
import json
import logging

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
