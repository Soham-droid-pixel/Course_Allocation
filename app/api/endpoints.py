from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from fastapi.responses import FileResponse, JSONResponse
from typing import List, Optional
import uuid
import os
import asyncio
from datetime import datetime
import logging
import os

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
    CourseChoice
)
from ..db.models import StudentPreference as StudentPreferenceDB, AllocationResult
from ..core.exceptions import CourseAllocationException
from ..services.allocation import allocate_courses
from ..services.report import generate_allocation_report
from ..utils.validation import validate_mdm_selection


logger = logging.getLogger("course_allocation_service")
router = APIRouter()

@router.post("/preferences/submit", status_code=201)
async def submit_preferences(preference: StudentPreference):
    try:
        # Convert CourseChoice objects to dictionaries
        converted_preferences = {
            category: {
                "choice1": choices.choice1,
                "choice2": choices.choice2
            }
            for category, choices in preference.preferences.items()
        }

        db_preference = StudentPreferenceDB(
            student_id=preference.student_id,
            name=preference.name,
            preferences=converted_preferences,
            created_at=datetime.utcnow()
        )
        await db_preference.insert()
        logger.info(f"Preferences submitted for student {preference.student_id}")
        return {"message": "Preferences submitted successfully"}
    except Exception as e:
        logger.error(f"Error submitting preferences: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

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

@router.get("/download/{allocation_id}")
async def download_report(
    allocation_id: str,
    background_tasks: BackgroundTasks,
    format: str = Query(..., regex="^(excel|csv)$")
):
    try:
        # Convert format to lowercase to match enum values
        format = format.lower()
        logger.info(f"Generating {format} report for allocation {allocation_id}")
        
        allocation = await AllocationResult.find_one({"allocation_id": allocation_id})
        if not allocation:
            raise HTTPException(status_code=404, detail=f"Allocation {allocation_id} not found")

        file_extension = 'xlsx' if format == 'excel' else 'csv'
        filename = f'course_allocation_{allocation_id}.{file_extension}'
        
        temp_dir = os.path.join(os.getcwd(), 'temp')
        os.makedirs(temp_dir, exist_ok=True)
        file_path = os.path.join(temp_dir, filename)

        # Generate report with string format
        generate_allocation_report(allocation, file_path, format)

        if not os.path.exists(file_path):
            raise HTTPException(status_code=500, detail="Failed to generate report file")

        # Schedule cleanup
        async def cleanup_file():
            await asyncio.sleep(300)  # 5 minutes
            try:
                if os.path.exists(file_path):
                    os.unlink(file_path)
                    logger.info(f"Cleaned up file: {file_path}")
            except Exception as e:
                logger.error(f"Error cleaning up file {file_path}: {str(e)}")

        background_tasks.add_task(cleanup_file)

        return FileResponse(
            path=file_path,
            filename=filename,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                if format == 'excel' else 'text/csv'
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
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
    try:
        # Get total completed allocations
        stats = await get_stats()
        if stats["completedAllocations"] == 0:
            raise HTTPException(
                status_code=404,
                detail="No completed allocations found"
            )

        # Get most recent completed allocation
        latest = await AllocationResult.find_one(
            {"status": "completed"},
            sort=[("created_at", -1)]
        )
        
        if not latest:
            raise HTTPException(
                status_code=404,
                detail="No completed allocation found"
            )
            
        return {"allocation_id": latest.allocation_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting latest allocation: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )