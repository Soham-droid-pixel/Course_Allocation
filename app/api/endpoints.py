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
async def submit_preferences(
    request_data: Dict[str, Any],
    current_user: User = Depends(get_current_student)  # Require authentication
):
    """Submit student preferences"""
    try:
        logger.info(f"Received preference submission from authenticated user: {current_user.email}")
        
        if not DB_AVAILABLE:
            raise HTTPException(status_code=503, detail="Database service temporarily unavailable")
        
        # Use authenticated user's roll_number
        roll_number = current_user.roll_number
        if not roll_number:
            raise HTTPException(status_code=400, detail="Roll number not found for authenticated user")
        
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

        # Prepare validated data using roll_number
        preference_data = {
            "roll_number": roll_number,
            "name": request_data.get("name", current_user.email.split('@')[0]),  # Fallback to email prefix
            "preferences": processed_preferences,
            "status": request_data.get("status", "draft"),
            "comments": request_data.get("comments", ""),
            "updated_at": datetime.utcnow()
        }

        # Validate using Pydantic model
        validated_preference = StudentPreference(**preference_data)

        # Save to database
        existing = await StudentPreferenceDB.find_one({"roll_number": roll_number})
        
        if existing:
            existing.name = validated_preference.name
            existing.preferences = validated_preference.preferences
            existing.status = validated_preference.status
            existing.comments = validated_preference.comments
            existing.updated_at = datetime.utcnow()
            await existing.save()
            logger.info(f"Updated preferences for student {roll_number}")
        else:
            db_preference = StudentPreferenceDB(
                roll_number=validated_preference.roll_number,
                name=validated_preference.name,
                preferences=validated_preference.preferences,
                status=validated_preference.status,
                comments=validated_preference.comments,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            await db_preference.save()
            logger.info(f"Created new preferences for student {roll_number}")

        return {
            "message": "Preferences submitted successfully",
            "roll_number": roll_number,
            "status": validated_preference.status
        }

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error submitting preferences: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/preferences/confirm")
async def confirm_preferences(
    request_data: Dict[str, Any],
    current_user: User = Depends(get_current_student)
):
    """Confirm preferences endpoint - fixed to handle frontend data structure"""
    try:
        roll_number = current_user.roll_number
        logger.info(f"=== PROCESSING CONFIRMATION for {roll_number} ===")
        logger.info(f"Request data received: {request_data}")
        
        student = await StudentPreferenceDB.find_one({"roll_number": roll_number})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        # Get the confirm flag from request
        confirm_flag = request_data.get("confirm", False)
        logger.info(f"Confirm flag from frontend: {confirm_flag}")
        
        # Update status based on confirm flag
        if confirm_flag:
            student.status = "confirmed"
            message = "Preferences confirmed successfully"
            logger.info(f"Setting status to CONFIRMED")
        else:
            student.status = "draft"  
            message = "Preferences saved as draft"
            logger.info(f"Setting status to DRAFT")
        
        # Update other fields if provided
        if "preferences" in request_data:
            # Process preferences if they're included in the confirm request
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
            
            student.preferences = processed_preferences
        
        # Update other fields
        if "name" in request_data:
            student.name = request_data.get("name", student.name)
        
        if "comments" in request_data:
            student.comments = request_data.get("comments", student.comments or "")
        
        student.updated_at = datetime.utcnow()
        await student.save()
        
        logger.info(f"=== SUCCESS: Status changed to {student.status.upper()} for {roll_number} ===")
        
        return {
            "message": message,
            "status": student.status,
            "roll_number": roll_number,
            "confirm": confirm_flag
        }
        
    except Exception as e:
        logger.error(f"Error in confirm_preferences: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/preferences/me")
async def get_my_preferences(current_user: User = Depends(get_current_student)):
    """Get preferences for authenticated student"""
    try:
        if not DB_AVAILABLE:
            raise HTTPException(status_code=503, detail="Database service temporarily unavailable")
        
        roll_number = current_user.roll_number
        preference = await StudentPreferenceDB.find_one({"roll_number": roll_number})
        
        if not preference:
            raise HTTPException(status_code=404, detail="Preferences not found")
        
        return {
            "roll_number": preference.roll_number,
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

@router.get("/student/me/status")
async def get_my_allocation_status(current_user: User = Depends(get_current_student)):
    """Get allocation status for authenticated student"""
    try:
        if not DB_AVAILABLE:
            raise HTTPException(status_code=503, detail="Database service temporarily unavailable")
        
        roll_number = current_user.roll_number
        
        # Get student preferences
        preference = await StudentPreferenceDB.find_one({"roll_number": roll_number})
        if not preference:
            raise HTTPException(status_code=404, detail="Student preferences not found")
        
        # Get latest allocation
        latest_allocation = await AllocationResult.find_one(sort=[("created_at", -1)])
        
        status_info = {
            "roll_number": roll_number,
            "name": preference.name,
            "preference_status": preference.status,
            "allocation_status": "not_allocated",
            "allocated_courses": {},
            "allocation_date": None
        }
        
        if latest_allocation and latest_allocation.student_allocations:
            student_allocation = latest_allocation.student_allocations.get(roll_number)
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
        
        # Convert to API models - USE ROLL_NUMBER
        api_students = []
        
        for student in confirmed_students:
            try:
                # Create API model with proper data conversion using roll_number
                api_student = StudentPreference(
                    roll_number=student.roll_number,  # Changed from student_id
                    name=student.name,
                    preferences=student.preferences,
                    status="confirmed"
                )
                api_students.append(api_student)
                
            except Exception as e:
                logger.error(f"Error converting student {student.roll_number}: {str(e)}")  # Changed
                continue
        
        if not api_students:
            raise HTTPException(status_code=400, detail="No valid student preferences after conversion")
            
        logger.info(f"Processing {len(api_students)} valid students")
        
        # Run allocation
        allocation_result = allocate_courses(api_students)
        
        # Save allocation result - USE ROLL_NUMBER
        db_allocation = AllocationResult(
            allocation_id=allocation_result.allocation_id,
            student_allocations={
                student.roll_number: student.allocations  # Changed from student_id
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
    """Get detailed preferences analysis with error handling"""
    try:
        if not DB_AVAILABLE:
            raise HTTPException(status_code=503, detail="Database service temporarily unavailable")
        
        logger.info("Fetching preferences analysis")
        
        # Use raw MongoDB query to handle invalid documents
        from motor.motor_asyncio import AsyncIOMotorClient
        import os
        from pymongo.errors import PyMongoError
        
        try:
            # Direct MongoDB access to avoid Pydantic validation issues
            client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
            db = client.course_allocation
            collection = db.student_preferences
            
            # Find documents with required fields only
            all_preferences_raw = await collection.find({
                "roll_number": {"$exists": True, "$ne": None, "$ne": ""},
                "preferences": {"$exists": True}
            }).to_list(None)
            
            logger.info(f"Found {len(all_preferences_raw)} valid preference documents")
            
        except Exception as e:
            logger.error(f"Direct MongoDB query failed: {e}")
            # Fallback to Beanie with error handling
            try:
                all_preferences_raw = []
                async for pref in StudentPreferenceDB.find():
                    try:
                        # Convert to dict to avoid validation
                        pref_dict = pref.dict() if hasattr(pref, 'dict') else pref
                        if pref_dict.get('roll_number'):
                            all_preferences_raw.append(pref_dict)
                    except Exception as doc_error:
                        logger.warning(f"Skipping invalid document: {doc_error}")
                        continue
            except Exception as beanie_error:
                logger.error(f"Beanie query also failed: {beanie_error}")
                all_preferences_raw = []
        
        if not all_preferences_raw:
            logger.info("No valid preferences found")
            return {
                "summary": {
                    "total_students": 0,
                    "confirmed_students": 0,
                    "draft_students": 0,
                    "completion_rate": 0
                },
                "course_demand": {},
                "category_analysis": {},
                "student_details": []
            }
        
        # Process the raw data safely
        valid_preferences = []
        for pref_raw in all_preferences_raw:
            try:
                # Ensure required fields exist
                if not pref_raw.get('roll_number'):
                    logger.warning(f"Skipping document without roll_number: {pref_raw.get('_id')}")
                    continue
                
                # Create a normalized preference object
                normalized_pref = {
                    'roll_number': str(pref_raw.get('roll_number', '')),
                    'name': str(pref_raw.get('name', 'Unknown')),
                    'status': str(pref_raw.get('status', 'draft')),
                    'preferences': pref_raw.get('preferences', {}),
                    'comments': str(pref_raw.get('comments', '')),
                    'created_at': pref_raw.get('created_at'),
                    'updated_at': pref_raw.get('updated_at')
                }
                
                # Ensure preferences is a dict
                if not isinstance(normalized_pref['preferences'], dict):
                    normalized_pref['preferences'] = {}
                
                valid_preferences.append(normalized_pref)
                
            except Exception as e:
                logger.warning(f"Error processing preference document: {e}")
                continue
        
        logger.info(f"Successfully processed {len(valid_preferences)} valid preferences")
        
        # Calculate summary
        total_students = len(valid_preferences)
        confirmed_students = sum(1 for p in valid_preferences if p['status'] == "confirmed")
        draft_students = total_students - confirmed_students
        completion_rate = (confirmed_students / total_students * 100) if total_students > 0 else 0
        
        # Initialize data structures
        course_demand = {}
        category_analysis = {}
        student_details = []
        
        # Categories to analyze
        categories = ['PECL1', 'PECL2', 'Program Elective', 'Open Elective', 'MDM', 'Honors', 'Minor']
        
        # Initialize category structures
        for category in categories:
            course_demand[category] = {}
            category_analysis[category] = {
                "students_submitted": 0,
                "total_first_choices": 0,
                "total_second_choices": 0,
                "courses_with_demand": 0,
                "most_popular_first": None,
                "most_popular_second": None
            }
        
        # Track course popularity
        category_stats = {cat: {"choice1": {}, "choice2": {}} for cat in categories}
        
        # Process each student
        for pref in valid_preferences:
            try:
                # Process student details
                student_prefs = {}
                total_preferences = 0
                
                pref_data = pref.get('preferences', {})
                
                for category in categories:
                    choices = pref_data.get(category, {})
                    if not isinstance(choices, dict):
                        choices = {}
                    
                    choice1 = str(choices.get("choice1", "")).strip()
                    choice2 = str(choices.get("choice2", "")).strip()
                    
                    student_prefs[category] = {
                        "choice1": {"id": choice1, "name": get_course_name(choice1) if choice1 else ""},
                        "choice2": {"id": choice2, "name": get_course_name(choice2) if choice2 else ""}
                    }
                    
                    # Count total preferences
                    if choice1 or choice2:
                        total_preferences += 1
                    
                    # Track course demand
                    if choice1:
                        # Initialize course demand structure
                        if category not in course_demand:
                            course_demand[category] = {}
                        if choice1 not in course_demand[category]:
                            course_demand[category][choice1] = {
                                "course_name": get_course_name(choice1),
                                "first_choice_count": 0,
                                "second_choice_count": 0,
                                "total_demand": 0,
                                "students_first_choice": [],
                                "students_second_choice": []
                            }
                        
                        course_demand[category][choice1]["first_choice_count"] += 1
                        course_demand[category][choice1]["total_demand"] += 1
                        course_demand[category][choice1]["students_first_choice"].append({
                            "student_id": pref['roll_number'],
                            "name": pref['name']
                        })
                        
                        # Category stats
                        category_stats[category]["choice1"][choice1] = category_stats[category]["choice1"].get(choice1, 0) + 1
                        category_analysis[category]["total_first_choices"] += 1
                    
                    if choice2:
                        # Initialize course demand structure
                        if category not in course_demand:
                            course_demand[category] = {}
                        if choice2 not in course_demand[category]:
                            course_demand[category][choice2] = {
                                "course_name": get_course_name(choice2),
                                "first_choice_count": 0,
                                "second_choice_count": 0,
                                "total_demand": 0,
                                "students_first_choice": [],
                                "students_second_choice": []
                            }
                        
                        course_demand[category][choice2]["second_choice_count"] += 1
                        course_demand[category][choice2]["total_demand"] += 1
                        course_demand[category][choice2]["students_second_choice"].append({
                            "student_id": pref['roll_number'],
                            "name": pref['name']
                        })
                        
                        # Category stats
                        category_stats[category]["choice2"][choice2] = category_stats[category]["choice2"].get(choice2, 0) + 1
                        category_analysis[category]["total_second_choices"] += 1
                
                # Add student details
                student_details.append({
                    "student_id": pref['roll_number'],
                    "name": pref['name'],
                    "status": pref['status'],
                    "total_preferences": total_preferences,
                    "preferences": student_prefs
                })
                
            except Exception as e:
                logger.error(f"Error processing student {pref.get('roll_number', 'unknown')}: {e}")
                continue
        
        # Calculate category analysis
        for category in categories:
            choice1_data = category_stats[category]["choice1"]
            choice2_data = category_stats[category]["choice2"]
            
            # Students who submitted this category
            students_with_first = len(choice1_data)
            students_with_second = len(choice2_data)
            students_with_choices = max(students_with_first, students_with_second)
            
            category_analysis[category]["students_submitted"] = students_with_choices
            category_analysis[category]["courses_with_demand"] = len(set(list(choice1_data.keys()) + list(choice2_data.keys())))
            
            # Most popular courses
            if choice1_data:
                most_popular_first = max(choice1_data.items(), key=lambda x: x[1])
                category_analysis[category]["most_popular_first"] = {
                    "course_id": most_popular_first[0],
                    "course_name": get_course_name(most_popular_first[0]),
                    "count": most_popular_first[1]
                }
            
            if choice2_data:
                most_popular_second = max(choice2_data.items(), key=lambda x: x[1])
                category_analysis[category]["most_popular_second"] = {
                    "course_id": most_popular_second[0],
                    "course_name": get_course_name(most_popular_second[0]),
                    "count": most_popular_second[1]
                }
        
        response_data = {
            "summary": {
                "total_students": total_students,
                "confirmed_students": confirmed_students,
                "draft_students": draft_students,
                "completion_rate": round(completion_rate, 2)
            },
            "course_demand": course_demand,
            "category_analysis": category_analysis,
            "student_details": student_details
        }
        
        logger.info(f"Successfully generated analysis for {total_students} students")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in preferences analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# ==================== STUDENT STATUS ENDPOINTS ====================

@router.get("/student/{student_id}/status")
async def get_student_allocation_status(student_id: str):
    """Get allocation status for a specific student (legacy endpoint)"""
    try:
        if not DB_AVAILABLE:
            raise HTTPException(status_code=503, detail="Database service temporarily unavailable")
        
        # Try to find by roll_number first (new way), then by student_id (legacy)
        preference = await StudentPreferenceDB.find_one({"roll_number": student_id})
        if not preference:
            # For backward compatibility, try to find by old student_id field if it exists
            preference = await StudentPreferenceDB.find_one({"student_id": student_id})
        
        if not preference:
            raise HTTPException(status_code=404, detail="Student preferences not found")
        
        # Get latest allocation
        latest_allocation = await AllocationResult.find_one(sort=[("created_at", -1)])
        
        status_info = {
            "student_id": student_id,  # Keep for backward compatibility
            "roll_number": preference.roll_number,  # Add roll_number
            "name": preference.name,
            "preference_status": preference.status,
            "allocation_status": "not_allocated",
            "allocated_courses": {},
            "allocation_date": None
        }
        
        if latest_allocation and latest_allocation.student_allocations:
            # Look for allocation by roll_number
            student_allocation = latest_allocation.student_allocations.get(preference.roll_number)
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

# Add new legacy endpoints for old student_id based operations
@router.get("/preferences/{student_id}")
async def get_student_preferences_legacy(student_id: str):
    """Get student preferences by student_id (legacy endpoint)"""
    try:
        if not DB_AVAILABLE:
            raise HTTPException(status_code=503, detail="Database service temporarily unavailable")
        
        # Try roll_number first, then student_id for backward compatibility
        preference = await StudentPreferenceDB.find_one({"roll_number": student_id})
        if not preference:
            preference = await StudentPreferenceDB.find_one({"student_id": student_id})
        
        if not preference:
            raise HTTPException(status_code=404, detail="Preferences not found")
        
        return {
            "student_id": student_id,  # Keep for backward compatibility
            "roll_number": preference.roll_number,
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

@router.post("/preferences/{student_id}/confirm")
async def confirm_student_preferences_legacy(
    student_id: str,
    request_data: Dict[str, Any]
):
    """Confirm student preferences by student_id (legacy endpoint)"""
    try:
        if not DB_AVAILABLE:
            raise HTTPException(status_code=503, detail="Database service temporarily unavailable")
        
        logger.info(f"Confirming preferences for student {student_id} (legacy)")
        
        # Try to find by roll_number first, then student_id
        existing = await StudentPreferenceDB.find_one({"roll_number": student_id})
        if not existing:
            existing = await StudentPreferenceDB.find_one({"student_id": student_id})
        
        if not existing:
            raise HTTPException(status_code=404, detail="Student preferences not found")
        
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
            "roll_number": existing.roll_number,  # Use existing roll_number
            "name": request_data.get("name", existing.name),
            "preferences": processed_preferences,
            "confirm": request_data.get("confirm", False),
            "comments": request_data.get("comments", ""),
            "status": "confirmed" if request_data.get("confirm") else "draft",
            "updated_at": datetime.utcnow()
        }

        # Validate the confirmation
        validated_confirmation = PreferenceConfirmation(**confirmation_data)

        # Update database
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
        
        # Convert database model to API model for report generation - USE ROLL_NUMBER
        student_allocations = []
        for roll_number, allocations in allocation_db.student_allocations.items():
            # Get student name from preferences using roll_number
            try:
                student_pref = await StudentPreferenceDB.find_one({"roll_number": roll_number})
                student_name = student_pref.name if student_pref else f"Student {roll_number}"
            except Exception as e:
                logger.warning(f"Could not get name for student {roll_number}: {e}")
                student_name = f"Student {roll_number}"
            
            student_allocation = StudentAllocation(
                roll_number=roll_number,  # Make sure this is set correctly
                name=student_name,
                allocations=allocations,
                issues=[]  # Issues are stored at allocation level
            )
            student_allocations.append(student_allocation)

        logger.info(f"Created {len(student_allocations)} student allocations for report")
        
        # Convert course enrollments to course summaries
        course_summaries = {}
        for course_id, students in allocation_db.course_enrollments.items():
            course_enrollment = CourseEnrollment(
                course_id=course_id,
                name=get_course_name(course_id),
                enrolled=len(students),
                students=students,  # These should now be roll_numbers
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
        
        # Open Electives
        'OE1': 'Advanced Microprocessor',
        'OE2': 'Internet of Things',
        'OE3': 'E-Vehicle',
        'OE4': 'Supply Chain Management',
        'OE5': 'Design of Experiments',
        'OE6': '3D Printing',
        
        # Honors
        'H1': 'IoT Honors',
        'H2': 'AI/ML Honors', 
        'H3': 'Data Science Honors',
        'H4': 'Blockchain Honors',
        'H5': 'Cybersecurity Honors',
        
        # Minor
        'M1': 'Robotics Minor',
        'M2': '3D Printing Minor',
        
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

@router.post("/preferences/confirm-final")
async def confirm_final(current_user: User = Depends(get_current_student)):
    """Confirm preferences - simple endpoint"""
    try:
        roll_number = current_user.roll_number
        logger.info(f"=== FINAL CONFIRMATION for {roll_number} ===")
        
        student = await StudentPreferenceDB.find_one({"roll_number": roll_number})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        logger.info(f"Current status: {student.status}")
        
        student.status = "confirmed"
        student.updated_at = datetime.utcnow()
        await student.save()
        
        logger.info(f"=== SUCCESS: Status changed to CONFIRMED for {roll_number} ===")
        
        return {
            "message": "Preferences confirmed successfully", 
            "status": "confirmed",
            "roll_number": roll_number
        }
        
    except Exception as e:
        logger.error(f"Error confirming final: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/preferences/save-draft")
async def save_draft(current_user: User = Depends(get_current_student)):
    """Save as draft - simple endpoint"""
    try:
        roll_number = current_user.roll_number
        logger.info(f"=== SAVING AS DRAFT for {roll_number} ===")
        
        student = await StudentPreferenceDB.find_one({"roll_number": roll_number})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        student.status = "draft"
        student.updated_at = datetime.utcnow()
        await student.save()
        
        logger.info(f"=== SUCCESS: Status changed to DRAFT for {roll_number} ===")
        
        return {
            "message": "Preferences saved as draft", 
            "status": "draft",
            "roll_number": roll_number
        }
        
    except Exception as e:
        logger.error(f"Error saving draft: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ADD this direct MongoDB update endpoint:
@router.post("/preferences/direct-confirm")
async def direct_confirm(current_user: User = Depends(get_current_student)):
    """Direct MongoDB update - bypasses all validation"""
    try:
        roll_number = current_user.roll_number
        
        # Direct MongoDB update
        from motor.motor_asyncio import AsyncIOMotorClient
        import os
        
        client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
        db = client.course_allocation
        
        result = await db.student_preferences.update_one(
            {"roll_number": roll_number},
            {"$set": {"status": "confirmed", "updated_at": datetime.utcnow()}}
        )
        
        if result.modified_count > 0:
            logger.info(f"DIRECT UPDATE SUCCESS: {roll_number} status = confirmed")
            return {"message": "Confirmed successfully", "status": "confirmed"}
        else:
            raise HTTPException(status_code=404, detail="Student not found")
            
    except Exception as e:
        logger.error(f"Direct update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ADD this new endpoint:
@router.post("/preferences/set-confirmed")
async def set_confirmed(current_user: User = Depends(get_current_student)):
    """Dedicated endpoint to confirm preferences"""
    try:
        roll_number = current_user.roll_number
        logger.info(f"SETTING CONFIRMED STATUS for {roll_number}")
        
        student = await StudentPreferenceDB.find_one({"roll_number": roll_number})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        student.status = "confirmed"
        student.updated_at = datetime.utcnow()
        await student.save()
        
        logger.info(f"SUCCESS: Status is now CONFIRMED for {roll_number}")
        
        return {
            "message": "Preferences confirmed successfully",
            "status": "confirmed"
        }
        
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/courses")
async def get_courses():
    """Get available courses"""
    courses_data = {
        'PECL1': [
            {'id': '25PECL13CE11', 'name': 'Image Processing Lab'},
            {'id': '25PECL13CE12', 'name': 'Natural Language Processing Lab'},
            {'id': '25PECL13CE13', 'name': 'IIOT Lab'},
            {'id': '25PECL13CE14', 'name': 'Innovative Product Development Lab-Phase1'},
            {'id': '25PECL13CE15', 'name': 'Open-Source Intelligence Lab'},
        ],
        'PECL2': [
            {'id': '25PECL13CE21', 'name': 'Social Media Analytics Lab'},
            {'id': '25PECL13CE22', 'name': 'Ethical Hacking Lab'},
            {'id': '25PECL13CE23', 'name': 'DevOps Lab'},
            {'id': '25PECL13CE24', 'name': 'Innovative Product Development Lab-Phase2'},
            {'id': '25PECL13CE25', 'name': 'Explainable AI Lab'},
            {'id': '25PECL13CE26', 'name': 'Software Testing Lab'},
        ],
        'Program Elective': [
            {'id': '25PEC13CE11', 'name': 'Blockchain Technology'},
            {'id': '25PEC13CE12', 'name': 'Deep Learning and Reinforcement Learning'},
            {'id': '25PEC13CE13', 'name': 'Cyber Security'},
            {'id': '25PEC13CE14', 'name': 'Big Data Analytics'},
            {'id': '25PEC13CE15', 'name': 'Computer Graphics'},
            {'id': '25PEC13CE16', 'name': 'HMI'},
            {'id': '25PEC13CE17', 'name': 'Geographical Information Systems'},
        ],
        'Open Elective': [
            {'id': 'OE1', 'name': 'Advanced Microprocessor'},
            {'id': 'OE2', 'name': 'Internet of Things'},
            {'id': 'OE3', 'name': 'E-Vehicle'},
            {'id': 'OE4', 'name': 'Supply Chain Management'},
            {'id': 'OE5', 'name': 'Design of Experiments'},
            {'id': 'OE6', 'name': '3D Printing'},
        ],
        'Honors': [
            {'id': 'H1', 'name': 'IoT Honors'},
            {'id': 'H2', 'name': 'AI/ML Honors'},
            {'id': 'H3', 'name': 'Data Science Honors'},
            {'id': 'H4', 'name': 'Blockchain Honors'},
            {'id': 'H5', 'name': 'Cybersecurity Honors'},
        ],
        'Minor': [
            {'id': 'M1', 'name': 'Robotics Minor'},
            {'id': 'M2', 'name': '3D Printing Minor'},
        ],
        'MDM': [
            {'id': 'MDM1', 'name': 'Emotional and Spiritual Intelligence'},
            {'id': 'MDM2', 'name': 'Health, Wellness and Psychology'},
        ]
    }
    
    return {"courses": courses_data}

@router.get("/student/stats")
async def get_student_stats_endpoint(current_user: User = Depends(get_current_student)):
    """Get student-specific stats"""
    try:
        # Get the general stats and return them
        stats = await get_stats()
        return stats
    except Exception as e:
        logger.error(f"Error fetching student stats: {e}")
        return {
            "totalSubmissions": 0,
            "pendingAllocations": 0, 
            "completedAllocations": 0,
            "error": str(e)
        }