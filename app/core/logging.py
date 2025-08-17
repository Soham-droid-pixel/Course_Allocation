# 📌 This file sets up logging for the course allocation service.
#
# - setup_logging() → Creates and configures a logger:
#   • Logger name: "course_allocation_service"
#   • Log level comes from settings.LOG_LEVEL (e.g., INFO, DEBUG, WARNING).
#   • Logs are written to console (stdout).
#   • Format includes timestamp, logger name, level, and message.
#
# 👉 Summary:
# Call setup_logging() at app startup to get a ready-to-use logger.
# This ensures consistent logging across the project.


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
