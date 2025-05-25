from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from fastapi.responses import FileResponse, JSONResponse
from typing import List, Optional
import uuid
import os
import asyncio
from datetime import datetime
import logging

from .models import StudentPreference, AllocationRequest, AllocationResponse, DownloadFormat
from ..db.models import StudentPreference as StudentPreferenceDB, AllocationResult
from ..core.exceptions import CourseAllocationException
from ..services.allocation import allocate_courses
from ..services.report import generate_allocation_report

logger = logging.getLogger("course_allocation_service")
router = APIRouter()

@router.post("/preferences/submit", status_code=201)
async def submit_preferences(preference: StudentPreference):
    try:
        db_preference = StudentPreferenceDB(
            student_id=preference.student_id,
            name=preference.name,
            preferences=preference.preferences,
            created_at=datetime.utcnow()
        )
        await db_preference.insert()
        logger.info(f"Preferences submitted for student {preference.student_id}")
        return {"message": "Preferences submitted successfully"}
    except Exception as e:
        logger.error(f"Error submitting preferences: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/preferences", response_model=List[StudentPreference])
async def get_all_preferences():
    try:
        preferences = await StudentPreferenceDB.find_all().to_list()
        logger.info(f"Retrieved {len(preferences)} student preferences")
        return preferences
    except Exception as e:
        logger.error(f"Error retrieving preferences: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/allocate", response_model=AllocationResponse)
async def allocate(request: AllocationRequest):
    try:
        logger.info("Starting course allocation process")
        preferences = await StudentPreferenceDB.find_all().to_list()
        
        if not preferences:
            raise CourseAllocationException("No preferences found for allocation")

        allocation_result = allocate_courses(preferences)
        
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
    format: DownloadFormat = Query(DownloadFormat.EXCEL)
):
    try:
        logger.info(f"Generating report for allocation {allocation_id}")
        allocation = await AllocationResult.find_one(
            {"allocation_id": allocation_id}
        )
        if not allocation:
            raise HTTPException(status_code=404, detail="Allocation result not found")

        file_extension = 'xlsx' if format == DownloadFormat.EXCEL else 'csv'
        filename = f'course_allocation_{allocation_id}.{file_extension}'
        
        # Use temp directory for file storage
        temp_dir = os.path.join(os.getcwd(), 'temp')
        os.makedirs(temp_dir, exist_ok=True)
        file_path = os.path.join(temp_dir, filename)

        # Convert DB model to API model for report generation
        api_allocation = AllocationResponse(
            student_allocations=[
                StudentPreference(student_id=sid, allocations=alloc)
                for sid, alloc in allocation.student_allocations.items()
            ],
            course_summaries={
                cid: {"students": students}
                for cid, students in allocation.course_enrollments.items()
            },
            issues=allocation.issues
        )

        generate_allocation_report(api_allocation, file_path, format)

        async def cleanup_file(path: str, delay: int = 5):
            await asyncio.sleep(delay)
            try:
                if os.path.exists(path):
                    os.unlink(path)
                    logger.info(f"Cleaned up temporary file: {path}")
            except Exception as e:
                logger.error(f"Error cleaning up file {path}: {str(e)}")

        background_tasks.add_task(cleanup_file, file_path)

        return FileResponse(
            path=file_path,
            filename=filename,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                if format == DownloadFormat.EXCEL else 'text/csv'
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")