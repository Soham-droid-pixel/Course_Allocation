from fastapi import APIRouter, HTTPException, BackgroundTasks, Query, status
from fastapi.responses import FileResponse, JSONResponse
from typing import List, Dict, Any
import uuid
import os
import asyncio
from datetime import datetime
import logging

async def cleanup_temp_file(file_path: str):
    try:
        await asyncio.sleep(300)  # Wait 5 minutes
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        logger.error(f"Error cleaning up temp file {file_path}: {e}")

from .models import (
    StudentPreference, 
    AllocationRequest, 
    AllocationResponse, 
    DownloadFormat, 
    CourseCategory,
    PreferenceResponse,
    CourseChoice,
    PreferenceConfirmation
)
from ..db.models import StudentPreference as StudentPreferenceDB, AllocationResult
from ..core.exceptions import CourseAllocationException
from ..services.allocation import allocate_courses
from ..services.report import generate_allocation_report, DownloadFormat
from ..utils.validation import validate_mdm_selection


logger = logging.getLogger("course_allocation_service")
router = APIRouter()

@router.post("/preferences/submit", status_code=201)
async def submit_preferences(request_data: Dict[str, Any]):
    try:
        logger.info(f"Received preference submission: {request_data}")
        
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

@router.get("/preferences", response_model=List[PreferenceResponse])
async def get_all_preferences():
    try:
        db_preferences = await StudentPreferenceDB.find_all().to_list()
        logger.info(f"Retrieved {len(db_preferences)} student preferences")
        
        # Convert DB preferences to response format
        response_preferences = []
        for pref in db_preferences:
            try:
                # Convert raw preferences to CourseChoice objects
                converted_preferences = {}
                for category, choices in pref.preferences.items():
                    if isinstance(choices, dict):
                        converted_preferences[category] = CourseChoice(
                            choice1=choices.get('choice1'),
                            choice2=choices.get('choice2')
                        )
                
                # Create response object
                response_pref = PreferenceResponse(
                    student_id=pref.student_id,
                    name=pref.name if hasattr(pref, 'name') else "Unknown",
                    preferences=converted_preferences
                )
                response_preferences.append(response_pref)
            except Exception as e:
                logger.error(f"Error converting preference for student: {str(e)}")
                continue

        return response_preferences

    except Exception as e:
        logger.error(f"Error retrieving preferences: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/allocate", response_model=AllocationResponse)
async def allocate(request: AllocationRequest):
    try:
        logger.info("Starting course allocation process")
        db_preferences = await StudentPreferenceDB.find_all().to_list()
        
        if not db_preferences:
            raise CourseAllocationException("No preferences found for allocation")

        # Convert DB preferences to API model format
        preferences = []
        for db_pref in db_preferences:
            try:
                converted = StudentPreference(
                    student_id=db_pref.student_id,
                    name=db_pref.name,
                    preferences=db_pref.convert_preferences()
                )
                preferences.append(converted)
            except Exception as e:
                logger.error(f"Error converting preferences for {db_pref.student_id}: {str(e)}")
                continue

        # Continue with allocation if we have valid preferences
        if not preferences:
            raise CourseAllocationException("No valid preferences found after conversion")

        # Validate and allocate
        validate_mdm_selection(preferences)
        allocation_result = allocate_courses(preferences)
        
        # Save allocation result
        allocation_id = str(uuid.uuid4())
        db_allocation = AllocationResult(
            allocation_id=allocation_id,
            student_allocations={
                student.student_id: student.allocations 
                for student in allocation_result.student_allocations
            },
            course_enrollments={
                course_id: course.students 
                for course_id, course in allocation_result.course_summaries.items()
            },
            created_at=datetime.utcnow(),
            status="completed",
            issues=allocation_result.issues
        )
        await db_allocation.insert()
        
        logger.info(f"Allocation completed. ID: {allocation_id}")
        return {
            "allocation_id": allocation_id,
            **allocation_result.dict()
        }

    except CourseAllocationException as e:
        logger.error(f"Allocation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during allocation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/stats", response_model=dict)
async def get_stats():
    try:
        # Get all preferences
        total_submissions = await StudentPreferenceDB.find_all().count()
        
        # Get completed allocations
        completed = await AllocationResult.find({"status": "completed"}).count()

        return {
            "totalSubmissions": total_submissions,
            "pendingAllocations": total_submissions - completed,
            "completedAllocations": completed
        }
    except Exception as e:
        logger.error(f"Error fetching stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Fix for your endpoints.py file

# Remove the duplicate route and fix the existing ones
@router.get("/allocations/recent")  # This will be /api/allocations/recent
async def get_recent_allocation():
    try:
        # Get most recent allocation
        recent = await AllocationResult.find(
            {"status": "completed"}
        ).sort([("created_at", -1)]).first()
        
        if not recent:
            logger.info("No completed allocations found")
            return {
                "allocation_id": None,
                "status": "no_allocations",
                "message": "No completed allocations found"
            }
            
        return {"allocation_id": recent.allocation_id}
    except Exception as e:
        logger.error(f"Error fetching recent allocation: {str(e)}")
        return {
            "allocation_id": None,
            "status": "error", 
            "message": f"Error fetching recent allocation: {str(e)}"
        }

# Replace your existing get_latest_allocation function with this:

# Replace your existing get_latest_allocation function with this:

# Replace your existing get_latest_allocation function with this working version:

# THE ISSUE: Route order matters in FastAPI!
# The route /allocations/{allocation_id} is catching /allocations/latest
# because "latest" is being treated as an allocation_id

# SOLUTION: Put the specific route BEFORE the dynamic route

# Move this route BEFORE @router.get("/allocations/{allocation_id}")
@router.get("/allocations/latest")
async def get_latest_allocation():
    """Get the most recent allocation - MUST BE BEFORE /allocations/{allocation_id}"""
    try:
        logger.info("Fetching latest allocation...")
        
        latest = await AllocationResult.find_one(sort=[("created_at", -1)])
        
        if not latest:
            logger.info("No allocations found in database")
            return {
                "allocation_id": None,
                "status": "no_allocations",
                "message": "No allocations found yet. Please run an allocation first.",
                "created_at": None
            }

        # Build response with only existing fields
        response = {
            "allocation_id": latest.allocation_id,
            "status": latest.status,
            "created_at": latest.created_at,
            "_id": str(latest.id),
            "student_allocations": getattr(latest, 'student_allocations', {}),
            "issues": getattr(latest, 'issues', []) or []
        }
        
        # Add course data
        if hasattr(latest, 'course_enrollments'):
            response["course_enrollments"] = latest.course_enrollments
        elif hasattr(latest, 'course_summaries'):
            response["course_summaries"] = latest.course_summaries
        else:
            response["course_enrollments"] = {}
        
        logger.info(f"Successfully returning latest allocation: {latest.allocation_id}")
        return response
        
    except Exception as e:
        logger.error(f"Error fetching latest allocation: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching latest allocation: {str(e)}"
        )

# This route should come AFTER the /latest route
@router.get("/allocations/{allocation_id}")
async def get_allocation(allocation_id: str):
    """Get specific allocation by ID - MUST BE AFTER /allocations/latest"""
    try:
        logger.info(f"Fetching allocation with ID: {allocation_id}")
        
        # Remove the "latest" check since it's handled by the route above
        # if allocation_id == "latest":
        #     return await get_latest_allocation()
            
        # Try both _id and allocation_id fields
        allocation = await AllocationResult.find_one({
            "$or": [
                {"_id": allocation_id},
                {"allocation_id": allocation_id}
            ]
        })
        
        if not allocation:
            raise HTTPException(
                status_code=404,
                detail=f"Allocation {allocation_id} not found"
            )
            
        # Build response with only existing fields
        response = {
            "allocation_id": allocation.allocation_id,
            "status": allocation.status,
            "created_at": allocation.created_at,
            "_id": str(allocation.id),
            "student_allocations": getattr(allocation, 'student_allocations', {}),
            "issues": getattr(allocation, 'issues', []) or []
        }
        
        # Add course data
        if hasattr(allocation, 'course_enrollments'):
            response["course_enrollments"] = allocation.course_enrollments
        elif hasattr(allocation, 'course_summaries'):
            response["course_summaries"] = allocation.course_summaries
        else:
            response["course_enrollments"] = {}
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching allocation {allocation_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error fetching allocation"
        )
@router.get("/download/{allocation_id}")
async def download_allocation(
    allocation_id: str,
    background_tasks: BackgroundTasks,
    format: str = Query("excel", regex="^(excel|csv)$")
):
    """Download allocation results"""
    try:
        # Try both _id and allocation_id fields
        allocation = await AllocationResult.find_one({
            "$or": [
                {"_id": allocation_id},
                {"allocation_id": allocation_id}
            ]
        })
        
        if not allocation:
            raise HTTPException(
                status_code=404,
                detail=f"Allocation {allocation_id} not found"
            )
        
        # Convert database allocation to AllocationResponse format
        allocation_response = AllocationResponse(
            allocation_id=allocation.allocation_id,
            student_allocations=allocation.student_allocations or [],
            course_summaries=getattr(allocation, 'course_summaries', {}),
            issues=getattr(allocation, 'issues', [])
        )
        
        # Create temporary file path
        temp_dir = "/tmp" if os.path.exists("/tmp") else "."
        file_extension = "xlsx" if format == "excel" else "csv"
        temp_filename = f"allocation_report_{allocation_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{file_extension}"
        output_path = os.path.join(temp_dir, temp_filename)
        
        # Generate report with correct parameters
        generated_path = generate_allocation_report(
            allocation=allocation_response,
            output_path=output_path,
            format=format
        )
        
        # Schedule cleanup
        background_tasks.add_task(cleanup_temp_file, generated_path)
        
        return FileResponse(
            path=generated_path,
            filename=f"allocation_report_{allocation_id}.{file_extension}",
            media_type=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                if format == "excel"
                else "text/csv"
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating report: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating report: {str(e)}"
        )
    
@router.get("/debug/latest-simple")
async def debug_latest_simple():
    """Test the exact same logic as get_latest_allocation"""
    try:
        latest = await AllocationResult.find_one(sort=[("created_at", -1)])
        
        if not latest:
            return {"message": "No allocation found"}
            
        # Test each field access
        response = {"fields": {}}
        
        try:
            response["fields"]["allocation_id"] = latest.allocation_id
        except Exception as e:
            response["fields"]["allocation_id"] = f"Error: {e}"
            
        try:
            response["fields"]["status"] = latest.status
        except Exception as e:
            response["fields"]["status"] = f"Error: {e}"
            
        try:
            response["fields"]["created_at"] = latest.created_at
        except Exception as e:
            response["fields"]["created_at"] = f"Error: {e}"
            
        try:
            response["fields"]["id"] = str(latest.id)
        except Exception as e:
            response["fields"]["id"] = f"Error: {e}"
            
        try:
            response["fields"]["student_allocations"] = latest.student_allocations
        except Exception as e:
            response["fields"]["student_allocations"] = f"Error: {e}"
            
        try:
            response["fields"]["course_summaries"] = latest.course_summaries
        except Exception as e:
            response["fields"]["course_summaries"] = f"Error: {e}"
            
        try:
            response["fields"]["issues"] = latest.issues
        except Exception as e:
            response["fields"]["issues"] = f"Error: {e}"
        
        return response
        
    except Exception as e:
        return {"error": str(e), "type": type(e).__name__}
# Also add a more detailed debug endpoint
@router.get("/debug/latest-detailed")
async def debug_latest_detailed():
    """Detailed debugging for latest allocation"""
    try:
        # Test different query methods
        debug_info = {
            "methods": {}
        }
        
        # Method 1: find_one with sort
        try:
            result1 = await AllocationResult.find_one(sort=[("created_at", -1)])
            debug_info["methods"]["find_one_with_sort"] = {
                "success": result1 is not None,
                "allocation_id": result1.allocation_id if result1 else None,
                "error": None
            }
        except Exception as e:
            debug_info["methods"]["find_one_with_sort"] = {
                "success": False,
                "allocation_id": None,
                "error": str(e)
            }
        
        # Method 2: find with sort and limit
        try:
            result2_list = await AllocationResult.find().sort([("created_at", -1)]).limit(1).to_list()
            result2 = result2_list[0] if result2_list else None
            debug_info["methods"]["find_with_sort_limit"] = {
                "success": result2 is not None,
                "allocation_id": result2.allocation_id if result2 else None,
                "error": None
            }
        except Exception as e:
            debug_info["methods"]["find_with_sort_limit"] = {
                "success": False,
                "allocation_id": None,
                "error": str(e)
            }
        
        # Method 3: find_all and sort in Python
        try:
            all_results = await AllocationResult.find_all().to_list()
            result3 = max(all_results, key=lambda x: x.created_at) if all_results else None
            debug_info["methods"]["find_all_python_sort"] = {
                "success": result3 is not None,
                "allocation_id": result3.allocation_id if result3 else None,
                "total_count": len(all_results),
                "error": None
            }
        except Exception as e:
            debug_info["methods"]["find_all_python_sort"] = {
                "success": False,
                "allocation_id": None,
                "error": str(e)
            }
        
        return debug_info
        
    except Exception as e:
        return {"error": str(e)}
# Fix the get_allocation function
@router.post("/preferences/{student_id}/confirm")
async def confirm_preferences(student_id: str, request_data: Dict[str, Any]):
    try:
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

@router.get("/admin/summary")
async def get_preference_summary():
    try:
        # Get all confirmed preferences
        preferences = await StudentPreferenceDB.find(
            {"status": "confirmed"}
        ).to_list()

        # Initialize summary
        summary = {
            "total_submissions": len(preferences),
            "course_selections": {},
            "status_counts": {
                "draft": 0,
                "submitted": 0,
                "confirmed": 0
            }
        }

        # Count status distribution
        all_preferences = await StudentPreferenceDB.find_all().to_list()
        for pref in all_preferences:
            summary["status_counts"][pref.status] += 1

        # Count course selections
        for pref in preferences:
            for category, choices in pref.preferences.items():
                if category not in summary["course_selections"]:
                    summary["course_selections"][category] = {}
                
                for choice_num, course in choices.items():
                    if course not in summary["course_selections"][category]:
                        summary["course_selections"][category][course] = 0
                    summary["course_selections"][category][course] += 1

        return summary

    except Exception as e:
        logger.error(f"Error generating summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/debug/preferences")
async def debug_preferences():
    preferences = await get_all_preferences()  # Your existing function
    return {
        "count": len(preferences),
        "data": [pref.dict() if hasattr(pref, 'dict') else pref for pref in preferences]
    }

# Add this temporary debug endpoint
@router.get("/debug/allocations")
async def debug_allocations():
    try:
        count = await AllocationResult.find_all().count()
        all_allocations = await AllocationResult.find_all().to_list()
        return {
            "count": count,
            "allocations": [
                {
                    "id": str(alloc.id),
                    "allocation_id": getattr(alloc, 'allocation_id', None),
                    "status": getattr(alloc, 'status', None),
                    "created_at": getattr(alloc, 'created_at', None)
                } for alloc in all_allocations
            ]
        }
    except Exception as e:
        return {"error": str(e)}
# Add this debug endpoint to identify the exact error
@router.get("/debug/latest-step-by-step")
async def debug_latest_step_by_step():
    """Debug each step of the latest allocation process"""
    debug_steps = {}
    
    try:
        # Step 1: Log the start
        debug_steps["step1_start"] = "✅ Function started"
        logger.info("Debug: Starting latest allocation fetch")
        
        # Step 2: Try the database query
        try:
            latest = await AllocationResult.find_one(sort=[("created_at", -1)])
            debug_steps["step2_query"] = "✅ Database query successful"
            debug_steps["step2_found"] = latest is not None
        except Exception as e:
            debug_steps["step2_query"] = f"❌ Database query failed: {str(e)}"
            return debug_steps
        
        # Step 3: Check if allocation exists
        if not latest:
            debug_steps["step3_check"] = "❌ No allocation found"
            return debug_steps
        else:
            debug_steps["step3_check"] = "✅ Allocation found"
        
        # Step 4: Access basic fields
        try:
            allocation_id = latest.allocation_id
            debug_steps["step4_allocation_id"] = f"✅ allocation_id: {allocation_id}"
        except Exception as e:
            debug_steps["step4_allocation_id"] = f"❌ Error accessing allocation_id: {str(e)}"
            return debug_steps
        
        try:
            status = latest.status
            debug_steps["step4_status"] = f"✅ status: {status}"
        except Exception as e:
            debug_steps["step4_status"] = f"❌ Error accessing status: {str(e)}"
            return debug_steps
        
        try:
            created_at = latest.created_at
            debug_steps["step4_created_at"] = f"✅ created_at: {created_at}"
        except Exception as e:
            debug_steps["step4_created_at"] = f"❌ Error accessing created_at: {str(e)}"
            return debug_steps
        
        try:
            obj_id = str(latest.id)
            debug_steps["step4_id"] = f"✅ id: {obj_id}"
        except Exception as e:
            debug_steps["step4_id"] = f"❌ Error accessing id: {str(e)}"
            return debug_steps
        
        # Step 5: Build basic response
        try:
            basic_response = {
                "allocation_id": allocation_id,
                "status": status,
                "created_at": created_at,
                "_id": obj_id
            }
            debug_steps["step5_basic_response"] = "✅ Basic response built"
        except Exception as e:
            debug_steps["step5_basic_response"] = f"❌ Error building basic response: {str(e)}"
            return debug_steps
        
        # Step 6: Add student_allocations
        try:
            student_allocations = getattr(latest, 'student_allocations', {})
            basic_response["student_allocations"] = student_allocations
            debug_steps["step6_student_allocations"] = "✅ Student allocations added"
        except Exception as e:
            debug_steps["step6_student_allocations"] = f"❌ Error adding student_allocations: {str(e)}"
            return debug_steps
        
        # Step 7: Add issues
        try:
            issues = getattr(latest, 'issues', []) or []
            basic_response["issues"] = issues
            debug_steps["step7_issues"] = "✅ Issues added"
        except Exception as e:
            debug_steps["step7_issues"] = f"❌ Error adding issues: {str(e)}"
            return debug_steps
        
        # Step 8: Add course data
        try:
            if hasattr(latest, 'course_summaries'):
                basic_response["course_summaries"] = latest.course_summaries
                debug_steps["step8_course_summaries"] = "✅ Course summaries added"
            elif hasattr(latest, 'course_enrollments'):
                basic_response["course_enrollments"] = latest.course_enrollments
                debug_steps["step8_course_enrollments"] = "✅ Course enrollments added"
            else:
                basic_response["course_summaries"] = {}
                debug_steps["step8_course_fallback"] = "✅ Course fallback added"
        except Exception as e:
            debug_steps["step8_course_data"] = f"❌ Error adding course data: {str(e)}"
            return debug_steps
        
        # Step 9: Final response
        debug_steps["step9_final"] = "✅ All steps completed successfully"
        debug_steps["final_response"] = basic_response
        
        return debug_steps
        
    except Exception as e:
        debug_steps["fatal_error"] = f"❌ Fatal error: {str(e)} (Type: {type(e).__name__})"
        import traceback
        debug_steps["traceback"] = traceback.format_exc()
        return debug_steps

# Also create a minimal working version
@router.get("/allocations/latest-minimal")
async def get_latest_allocation_minimal():
    """Minimal version that only returns basic info"""
    try:
        latest = await AllocationResult.find_one(sort=[("created_at", -1)])
        
        if not latest:
            return {
                "allocation_id": None,
                "status": "no_allocations",
                "message": "No allocations found"
            }
        
        # Return only the basic fields we know work
        return {
            "allocation_id": latest.allocation_id,
            "status": latest.status,
            "created_at": str(latest.created_at),  # Convert to string to avoid serialization issues
            "_id": str(latest.id)
        }
        
    except Exception as e:
        logger.error(f"Minimal latest error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))