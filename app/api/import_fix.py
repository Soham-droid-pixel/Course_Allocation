"""
Import fix for endpoints.py - use this to fix relative import issues
"""
import sys
from pathlib import Path

# Add the app directory to Python path
app_dir = Path(__file__).parent.parent
if str(app_dir) not in sys.path:
    sys.path.insert(0, str(app_dir))

# Now you can import with absolute paths
try:
    from db.models import StudentPreference as StudentPreferenceDB, AllocationResult
    from services.allocation import CourseAllocationService
    from services.report import ReportService
    from utils.validation import ValidationService
    print("✅ All imports successful")
except ImportError as e:
    print(f"❌ Import error: {e}")