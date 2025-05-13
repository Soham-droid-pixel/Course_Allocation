import logging
import sys
from app.core.config import settings

def setup_logging():
    logger = logging.getLogger("course_allocation_service")
    logger.setLevel(getattr(logging, settings.LOG_LEVEL))
    
    # Create console handler and set level
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(getattr(logging, settings.LOG_LEVEL))
    
    # Create formatter
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    handler.setFormatter(formatter)
    
    # Add handler to logger
    logger.addHandler(handler)
    
    return logger
