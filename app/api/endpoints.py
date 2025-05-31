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

@router.get("/allocations/{allocation_id}")
async def get_allocation(allocation_id: str):
    """Get specific allocation by ID"""
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
            
        return allocation
        
    except Exception as e:
        logger.error(f"Error fetching allocation {allocation_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error fetching allocation"
        )

@router.get("/download/{allocation_id}")
async def download_allocation(
    allocation_id: str,
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
            
        # Generate report
        output_path = await generate_allocation_report(
            allocation=allocation,
            format=format
        )
        
        return FileResponse(
            path=output_path,
            filename=f"allocation_report_{allocation_id}.{format}",
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
            detail="Error generating report"
        )

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

@router.get("/allocations/recent", response_model=dict)
async def get_recent_allocation():
    try:
        # Get most recent allocation
        recent = await AllocationResult.find(
            {"status": "completed"}
        ).sort([("created_at", -1)]).first()
        
        if not recent:
            raise HTTPException(
                status_code=404,
                detail="No completed allocations found"
            )
            
        return {"allocation_id": recent.allocation_id}
    except Exception as e:
        logger.error(f"Error fetching recent allocation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/allocations/latest")
async def get_latest_allocation():
    """Get the most recent allocation"""
    try:
        # Find the latest allocation by created_at
        latest = await AllocationResult.find_one(
            sort=[("created_at", -1)]
        )
        
        if not latest:
            raise HTTPException(
                status_code=404,
                detail="No allocations found"
            )

        # Convert to response format
        return {
            "allocation_id": latest.allocation_id,
            "status": latest.status,
            "created_at": latest.created_at,
            "_id": str(latest.id),  # Convert ObjectId to string
            "student_allocations": latest.student_allocations,
            "course_summaries": latest.course_summaries,
            "issues": latest.issues or []
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching latest allocation: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching latest allocation: {str(e)}"
        )

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