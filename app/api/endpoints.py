from fastapi import APIRouter, HTTPException, BackgroundTasks, Query, status, Depends
from fastapi.responses import FileResponse, JSONResponse
from typing import List, Dict, Any, Optional
import uuid
import os
import asyncio
from datetime import datetime
import logging
import sys
from pathlib import Path

# Fix the import path issue
app_dir = Path(__file__).parent.parent
if str(app_dir) not in sys.path:
    sys.path.insert(0, str(app_dir))

async def cleanup_temp_file(file_path: str):
    try:
        await asyncio.sleep(300)  # Wait 5 minutes
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        logger.error(f"Error cleaning up temp file {file_path}: {e}")

# Import models
from api.models import (
    StudentPreference, 
    AllocationRequest, 
    AllocationResponse, 
    StudentAllocation,
    CourseEnrollment,
    DownloadFormat, 
    CourseCategory,
    PreferenceResponse,
    CourseChoice,
    PreferenceConfirmation
)

# Import your existing components with graceful fallbacks
try:
    from db.models import StudentPreference as StudentPreferenceDB, AllocationResult
    print("✅ Successfully imported DB models")
    DB_AVAILABLE = True
except ImportError as e:
    print(f"❌ DB models import error: {e}")
    StudentPreferenceDB = None
    AllocationResult = None
    DB_AVAILABLE = False

try:
    from core.exceptions import CourseAllocationException
    print("✅ Successfully imported core exceptions")
except ImportError as e:
    print(f"❌ Core exceptions import error: {e}")
    class CourseAllocationException(Exception):
        pass

try:
    from services.allocation import allocate_courses
    print("✅ Successfully imported allocation service")
    ALLOCATION_AVAILABLE = True
except ImportError as e:
    print(f"❌ Allocation service import error: {e}")
    ALLOCATION_AVAILABLE = False
    def allocate_courses(students):
        raise HTTPException(status_code=503, detail="Allocation service temporarily unavailable")

try:
    from services.report import generate_allocation_report
    print("✅ Successfully imported report service")
    REPORT_AVAILABLE = True
except ImportError as e:
    print(f"❌ Report service import error: {e}")
    REPORT_AVAILABLE = False
    def generate_allocation_report(*args, **kwargs):
        raise HTTPException(status_code=503, detail="Report service temporarily unavailable")

try:
    from utils.validation import validate_mdm_selection
    print("✅ Successfully imported validation utils")
    VALIDATION_AVAILABLE = True
except ImportError as e:
    print(f"❌ Validation utils import error: {e}")
    VALIDATION_AVAILABLE = False
    def validate_mdm_selection(*args, **kwargs):
        return True

# Add auth dependencies
try:
    from api.auth_bridge import get_current_user, get_current_admin, get_current_student
    from models.user import User
    print("✅ Successfully imported auth bridge")
    AUTH_AVAILABLE = True
except ImportError as e:
    print(f"❌ Auth bridge import error: {e}")
    AUTH_AVAILABLE = False
    def get_current_user():
        return None
    def get_current_admin():
        return None
    def get_current_student():
        return None

logger = logging.getLogger("course_allocation_service")
router = APIRouter()

# Service status endpoint
@router.get("/status")
async def get_service_status():
    """Get the status of all services"""
    return {
        "services": {
            "database": DB_AVAILABLE,
            "allocation": ALLOCATION_AVAILABLE,
            "reports": REPORT_AVAILABLE,
            "validation": VALIDATION_AVAILABLE,
            "authentication": AUTH_AVAILABLE
        },
        "timestamp": datetime.utcnow().isoformat()
    }

# Health check endpoint
@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "message": "API endpoints are working",
        "timestamp": datetime.utcnow().isoformat()
    }

# ==================== PREFERENCES ENDPOINTS ====================

@router.post("/preferences/submit", status_code=201)
async def submit_preferences(request_data: Dict[str, Any]):
    """Submit student preferences"""
    try:
        logger.info(f"Received preference submission: {request_data}")
        
        if not DB_AVAILABLE:
            raise HTTPException(status_code=503, detail="Database service temporarily unavailable")
        
        # Extract and validate required fields
        student_id = request_data.get("student_id")
        if not student_id:
            raise HTTPException(status_code=400, detail="student_id is required")
        
        # Process preferences and convert to expected format
        processed_preferences = {}
        raw_preferences = request_data.get("preferences", {})
        
        for category in CourseCategory:
            category_key = category.value
            category_data = raw_preferences.get(category_key, {})
            
            if isinstance(category_data, dict):
                processed_preferences[category_key] = {
                    "choice1": str(category_data.get("choice1") or "").strip(),
                    "choice2": str(category_data.get("choice2") or "").strip()
                }
            else:
                processed_preferences[category_key] = {
                    "choice1": "",
                    "choice2": ""
                }

        # Prepare validated data
        preference_data = {
            "student_id": student_id,
            "name": request_data.get("name", "Unknown"),
            "preferences": processed_preferences,
            "status": request_data.get("status", "draft"),
            "comments": request_data.get("comments", ""),
            "updated_at": datetime.utcnow()
        }

        # Validate using Pydantic model
        validated_preference = StudentPreference(**preference_data)

        # Save to database
        existing = await StudentPreferenceDB.find_one({"student_id": student_id})
        
        if existing:
            existing.name = validated_preference.name
            existing.preferences = validated_preference.preferences
            existing.status = validated_preference.status
            existing.comments = validated_preference.comments
            existing.updated_at = datetime.utcnow()
            await existing.save()
            logger.info(f"Updated preferences for student {student_id}")
        else:
            db_preference = StudentPreferenceDB(
                student_id=validated_preference.student_id,
                name=validated_preference.name,
                preferences=validated_preference.preferences,
                status=validated_preference.status,
                comments=validated_preference.comments,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            await db_preference.save()
            logger.info(f"Created new preferences for student {student_id}")

        return {
            "message": "Preferences submitted successfully",
            "student_id": student_id,
            "status": validated_preference.status
        }

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error submitting preferences: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/preferences/{student_id}/confirm")
async def confirm_preferences(student_id: str, request_data: Dict[str, Any]):
    """Confirm student preferences"""
    try:
        if not DB_AVAILABLE:
            raise HTTPException(status_code=503, detail="Database service temporarily unavailable")
        
        logger.info(f"Confirming preferences for student {student_id}")
        
        # Process preferences
        processed_preferences = {}
        raw_preferences = request_data.get("preferences", {})
        
        for category in CourseCategory:
            category_key = category.value
            category_data = raw_preferences.get(category_key, {})
            
            if isinstance(category_data, dict):
                processed_preferences[category_key] = {
                    "choice1": str(category_data.get("choice1") or "").strip(),
                    "choice2": str(category_data.get("choice2") or "").strip()
                }
            else:
                processed_preferences[category_key] = {
                    "choice1": "",
                    "choice2": ""
                }

        confirmation_data = {
            "student_id": student_id,
            "name": request_data.get("name", "Unknown"),
            "preferences": processed_preferences,
            "confirm": request_data.get("confirm", False),
            "comments": request_data.get("comments", ""),
            "status": "confirmed" if request_data.get("confirm") else "draft",
            "updated_at": datetime.utcnow()
        }

        # Validate the confirmation
        validated_confirmation = PreferenceConfirmation(**confirmation_data)

        # Update database
        existing = await StudentPreferenceDB.find_one({"student_id": student_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Preferences not found")

        existing.preferences = validated_confirmation.preferences
        existing.status = validated_confirmation.status
        existing.comments = validated_confirmation.comments
        existing.updated_at = datetime.utcnow()
        await existing.save()

        return {
            "message": "Preferences confirmed successfully" if validated_confirmation.confirm else "Preferences saved as draft",
            "status": existing.status
        }

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error confirming preferences: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/preferences/{student_id}")
async def get_student_preferences(student_id: str):
    """Get preferences for a specific student"""
    try:
        if not DB_AVAILABLE:
            raise HTTPException(status_code=503, detail="Database service temporarily unavailable")
        
        preference = await StudentPreferenceDB.find_one({"student_id": student_id})
        if not preference:
            raise HTTPException(status_code=404, detail="Preferences not found")
        
        return {
            "student_id": preference.student_id,
            "name": preference.name,
            "preferences": preference.preferences,
            "status": preference.status,
            "comments": preference.comments,
            "created_at": preference.created_at,
            "updated_at": preference.updated_at
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching preferences: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# ==================== ALLOCATION ENDPOINTS ====================

@router.post("/allocate", response_model=AllocationResponse)
async def allocate():
    """Trigger course allocation for confirmed students"""
    try:
        logger.info("Starting course allocation process")
        
        if not DB_AVAILABLE:
            raise HTTPException(status_code=503, detail="Database service temporarily unavailable")
        
        if not ALLOCATION_AVAILABLE:
            raise HTTPException(status_code=503, detail="Allocation service temporarily unavailable")
        
        # Get only confirmed students
        confirmed_students = await StudentPreferenceDB.find(
            {"status": "confirmed"}
        ).to_list()
        
        if not confirmed_students:
            raise HTTPException(status_code=400, detail="No confirmed student preferences found")
            
        logger.info(f"Found {len(confirmed_students)} confirmed students")
        
        # Convert to API models
        api_students = []
        
        for student in confirmed_students:
            try:
                # Create API model with proper data conversion
                api_student = StudentPreference(
                    student_id=student.student_id,
                    name=student.name,
                    preferences=student.preferences,
                    status="confirmed"
                )
                api_students.append(api_student)
                
            except Exception as e:
                logger.error(f"Error converting student {student.student_id}: {str(e)}")
                continue
        
        if not api_students:
            raise HTTPException(status_code=400, detail="No valid student preferences after conversion")
            
        logger.info(f"Processing {len(api_students)} valid students")
        
        # Run allocation
        allocation_result = allocate_courses(api_students)
        
        # Save allocation result
        db_allocation = AllocationResult(
            allocation_id=allocation_result.allocation_id,
            student_allocations={
                student.student_id: student.allocations 
                for student in allocation_result.student_allocations
            },
            course_enrollments={
                course_id: course.students 
                for course_id, course in allocation_result.course_summaries.items()
            },
            status="completed",
            issues=allocation_result.issues
        )
        
        await db_allocation.insert()
        
        logger.info(f"Allocation completed successfully. ID: {allocation_result.allocation_id}")
        
        return allocation_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/allocations/latest")
async def get_latest_allocation():
    """Get the most recent allocation"""
    try:
        if not DB_AVAILABLE:
            return {
                "allocation_id": None,
                "status": "service_unavailable",
                "message": "Database service temporarily unavailable"
            }
        
        latest = await AllocationResult.find_one(sort=[("created_at", -1)])
        
        if not latest:
            return {
                "allocation_id": None,
                "status": "no_allocations",
                "message": "No allocations found yet"
            }

        return {
            "allocation_id": latest.allocation_id,
            "status": latest.status,
            "created_at": latest.created_at,
            "student_allocations": getattr(latest, 'student_allocations', {}),
            "course_enrollments": getattr(latest, 'course_enrollments', {}),
            "issues": getattr(latest, 'issues', [])
        }
        
    except Exception as e:
        logger.error(f"Error fetching latest allocation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== STATS ENDPOINTS ====================

@router.get("/stats", response_model=dict)
async def get_stats():
    """Get system statistics"""
    try:
        if not DB_AVAILABLE:
            return {
                "totalSubmissions": 0,
                "pendingAllocations": 0,
                "completedAllocations": 0,
                "message": "Database service temporarily unavailable"
            }
        
        # Get total confirmed students (these are the ones that should be allocated)
        confirmed_students = await StudentPreferenceDB.find({"status": "confirmed"}).count()
        
        # Get completed allocations count
        completed_allocations = await AllocationResult.find({"status": "completed"}).count()
        
        # Get latest allocation to count actually allocated students
        latest_allocation = await AllocationResult.find_one(sort=[("created_at", -1)])
        
        allocated_students = 0
        if latest_allocation and latest_allocation.student_allocations:
            allocated_students = len(latest_allocation.student_allocations)

        return {
            "totalSubmissions": confirmed_students,
            "pendingAllocations": max(0, confirmed_students - allocated_students),
            "completedAllocations": allocated_students
        }
    except Exception as e:
        logger.error(f"Error fetching stats: {str(e)}")
        return {
            "totalSubmissions": 0,
            "pendingAllocations": 0,
            "completedAllocations": 0,
            "error": str(e)
        }

# ==================== ADMIN ENDPOINTS ====================

@router.get("/admin/summary")
async def get_admin_summary():
    """Get admin summary of preferences"""
    try:
        if not DB_AVAILABLE:
            raise HTTPException(status_code=503, detail="Database service temporarily unavailable")
        
        all_preferences = await StudentPreferenceDB.find().to_list()
        
        summary = {
            "total_students": len(all_preferences),
            "by_status": {"draft": 0, "submitted": 0, "confirmed": 0},
            "course_popularity": {}
        }
        
        # Count by status
        for pref in all_preferences:
            status = pref.status
            if status in summary["by_status"]:
                summary["by_status"][status] += 1
        
        # Count course popularity
        course_counts = {}
        for pref in all_preferences:
            for category, choices in pref.preferences.items():
                if isinstance(choices, dict):
                    for choice_key, course in choices.items():
                        if course and course.strip():
                            course_counts[course] = course_counts.get(course, 0) + 1
        
        # Sort by popularity
        summary["course_popularity"] = dict(sorted(course_counts.items(), key=lambda x: x[1], reverse=True))
        
        return summary
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching admin summary: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/admin/preferences-analysis")
async def get_preferences_analysis():
    """Get detailed preferences analysis"""
    try:
        if not DB_AVAILABLE:
            raise HTTPException(status_code=503, detail="Database service temporarily unavailable")
        
        all_preferences = await StudentPreferenceDB.find().to_list()
        
        analysis = {
            "overview": {
                "total_students": len(all_preferences),
                "submitted_preferences": sum(1 for p in all_preferences if p.status != "draft"),
                "confirmed_preferences": sum(1 for p in all_preferences if p.status == "confirmed")
            },
            "course_popularity": {},
            "category_stats": {}
        }
        
        course_counts = {}
        category_counts = {}
        
        for pref in all_preferences:
            for category, choices in pref.preferences.items():
                if category not in category_counts:
                    category_counts[category] = {"choice1": {}, "choice2": {}}
                
                if isinstance(choices, dict):
                    # Count choice1
                    choice1 = choices.get("choice1", "").strip()
                    if choice1:
                        course_counts[choice1] = course_counts.get(choice1, 0) + 1
                        category_counts[category]["choice1"][choice1] = category_counts[category]["choice1"].get(choice1, 0) + 1
                    
                    # Count choice2
                    choice2 = choices.get("choice2", "").strip()
                    if choice2:
                        course_counts[choice2] = course_counts.get(choice2, 0) + 1
                        category_counts[category]["choice2"][choice2] = category_counts[category]["choice2"].get(choice2, 0) + 1
        
        # Sort by popularity
        analysis["course_popularity"] = dict(sorted(course_counts.items(), key=lambda x: x[1], reverse=True))
        analysis["category_stats"] = category_counts
        
        return analysis
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching preferences analysis: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# ==================== STUDENT STATUS ENDPOINTS ====================

@router.get("/student/{student_id}/status")
async def get_student_allocation_status(student_id: str):
    """Get allocation status for a specific student"""
    try:
        if not DB_AVAILABLE:
            raise HTTPException(status_code=503, detail="Database service temporarily unavailable")
        
        # Get student preferences
        preference = await StudentPreferenceDB.find_one({"student_id": student_id})
        if not preference:
            raise HTTPException(status_code=404, detail="Student preferences not found")
        
        # Get latest allocation
        latest_allocation = await AllocationResult.find_one(sort=[("created_at", -1)])
        
        status_info = {
            "student_id": student_id,
            "name": preference.name,
            "preference_status": preference.status,
            "allocation_status": "not_allocated",
            "allocated_courses": {},
            "allocation_date": None
        }
        
        if latest_allocation and latest_allocation.student_allocations:
            student_allocation = latest_allocation.student_allocations.get(student_id)
            if student_allocation:
                status_info["allocation_status"] = "allocated"
                status_info["allocated_courses"] = student_allocation
                status_info["allocation_date"] = latest_allocation.created_at
        
        return status_info
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching student status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# ==================== DOWNLOAD/REPORT ENDPOINTS ====================

@router.get("/download/{allocation_id}")
async def download_allocation_report(
    allocation_id: str,
    format: DownloadFormat = Query(DownloadFormat.EXCEL),
    background_tasks: BackgroundTasks = None
):
    """Download allocation report in specified format"""
    try:
        logger.info(f"Starting report generation for allocation {allocation_id} in format {format}")
        
        if not DB_AVAILABLE:
            raise HTTPException(status_code=503, detail="Database service temporarily unavailable")
        
        if not REPORT_AVAILABLE:
            raise HTTPException(status_code=503, detail="Report service temporarily unavailable")
        
        # Get allocation data from database
        allocation_db = await AllocationResult.find_one({"allocation_id": allocation_id})
        if not allocation_db:
            raise HTTPException(status_code=404, detail="Allocation not found")
        
        logger.info(f"Found allocation with {len(allocation_db.student_allocations)} students")
        
        # Convert database model to API model for report generation
        student_allocations = []
        for student_id, allocations in allocation_db.student_allocations.items():
            # Get student name from preferences
            try:
                student_pref = await StudentPreferenceDB.find_one({"student_id": student_id})
                student_name = student_pref.name if student_pref else f"Student {student_id}"
            except Exception as e:
                logger.warning(f"Could not get name for student {student_id}: {e}")
                student_name = f"Student {student_id}"
            
            student_allocation = StudentAllocation(
                student_id=student_id,
                name=student_name,
                allocations=allocations,
                issues=[]  # Issues are stored at allocation level
            )
            student_allocations.append(student_allocation)
        
        # Convert course enrollments to course summaries
        course_summaries = {}
        for course_id, students in allocation_db.course_enrollments.items():
            course_enrollment = CourseEnrollment(
                course_id=course_id,
                name=get_course_name(course_id),
                enrolled=len(students),
                students=students,
                min_enrollment=20  # Default minimum enrollment
            )
            course_summaries[course_id] = course_enrollment
        
        # Create AllocationResponse object
        allocation_response = AllocationResponse(
            allocation_id=allocation_db.allocation_id,
            student_allocations=student_allocations,
            course_summaries=course_summaries,
            issues=allocation_db.issues or []
        )
        
        logger.info(f"Created allocation response with {len(student_allocations)} students and {len(course_summaries)} courses")
        
        # Create temp directory if it doesn't exist
        temp_dir = Path("temp_reports")
        temp_dir.mkdir(exist_ok=True)
        
        # Generate unique filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        file_extension = "xlsx" if format == DownloadFormat.EXCEL else "csv"
        filename = f"allocation_report_{allocation_id}_{timestamp}.{file_extension}"
        file_path = temp_dir / filename
        
        logger.info(f"Generating report at path: {file_path}")
        
        # Generate report using the corrected function call
        try:
            # Call the report generation function with proper arguments
            from services.report import generate_simple_allocation_report
            
            generated_file_path = generate_simple_allocation_report(
                allocation_response, 
                str(file_path), 
                format.value
            )
            
            logger.info(f"Report generated successfully at: {generated_file_path}")
            
        except Exception as report_error:
            logger.error(f"Report generation failed: {report_error}")
            raise HTTPException(status_code=500, detail=f"Report generation failed: {str(report_error)}")
        
        # Verify the file exists
        if not os.path.exists(generated_file_path):
            raise HTTPException(status_code=500, detail=f"Report file not found at {generated_file_path}")
        
        # Schedule cleanup
        if background_tasks:
            background_tasks.add_task(cleanup_temp_file, generated_file_path)
        
        # Determine media type
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" if format == DownloadFormat.EXCEL else "text/csv"
        
        logger.info(f"Returning file response for {generated_file_path}")
        
        return FileResponse(
            path=generated_file_path,
            media_type=media_type,
            filename=f"allocation_report_{allocation_id}.{file_extension}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating download: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# ==================== UTILITY FUNCTIONS ====================

def get_course_name(course_id: str) -> str:
    """Get readable course names"""
    course_names = {
        # PECL1 courses
        '25PECL13CE11': 'Image Processing Lab',
        '25PECL13CE12': 'Natural Language Processing Lab',
        '25PECL13CE13': 'IIOT Lab',
        '25PECL13CE14': 'Innovative Product Development Lab-Phase1',
        '25PECL13CE15': 'Open-Source Intelligence Lab',
        
        # PECL2 courses  
        '25PECL13CE21': 'Social Media Analytics Lab',
        '25PECL13CE22': 'Ethical Hacking Lab',
        '25PECL13CE23': 'DevOps Lab',
        '25PECL13CE24': 'Innovative Product Development Lab-Phase2',
        '25PECL13CE25': 'Explainable AI Lab',
        '25PECL13CE26': 'Software Testing Lab',
        
        # Program Electives
        '25PEC13CE11': 'Blockchain Technology',
        '25PEC13CE12': 'Deep Learning and Reinforcement Learning',
        '25PEC13CE13': 'Cyber Security',
        '25PEC13CE14': 'Big Data Analytics',
        '25PEC13CE15': 'Computer Graphics',
        '25PEC13CE16': 'HMI',
        '25PEC13CE17': 'Geographical Information Systems',
        
        # MDM
        'MDM1': 'Emotional and Spiritual Intelligence',
        'MDM2': 'Health, Wellness and Psychology'
    }
    
    return course_names.get(course_id, course_id)

# Add a comprehensive test endpoint
@router.get("/test")
async def test_endpoint():
    """Test endpoint to check all services"""
    return {
        "message": "API endpoints are working",
        "timestamp": datetime.utcnow().isoformat(),
        "available_services": {
            "database": DB_AVAILABLE,
            "allocation": ALLOCATION_AVAILABLE,
            "reports": REPORT_AVAILABLE,
            "validation": VALIDATION_AVAILABLE,
            "authentication": AUTH_AVAILABLE
        },
        "endpoints": [
            "GET /api/health - Health check",
            "GET /api/status - Service status",
            "POST /api/preferences/submit - Submit preferences",
            "POST /api/preferences/{student_id}/confirm - Confirm preferences",
            "GET /api/preferences/{student_id} - Get student preferences",
            "POST /api/allocate - Trigger allocation",
            "GET /api/allocations/latest - Get latest allocation",
            "GET /api/stats - Get system stats",
            "GET /api/admin/summary - Admin summary",
            "GET /api/admin/preferences-analysis - Preferences analysis",
            "GET /api/student/{student_id}/status - Student allocation status",
            "GET /api/download/{allocation_id} - Download reports"
        ]
    }