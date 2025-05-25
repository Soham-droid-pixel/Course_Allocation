from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, status
from fastapi.responses import FileResponse, JSONResponse
import logging
import os
import uuid
import tempfile
import asyncio
from typing import List, Optional

from app.api.models import AllocationRequest, AllocationResponse, DownloadFormat, StudentPreference
from app.services.allocation import allocate_courses
from app.services.report import generate_allocation_report
from app.core.exceptions import CourseAllocationException
from ..db.models import AllocationResult

logger = logging.getLogger("course_allocation_service")

router = APIRouter()

# In-memory storage for allocation results (in production, use a database or cache)
allocations_store = {}

@router.post("/allocate", response_model=AllocationResponse)
async def allocate(request: AllocationRequest):
    """
    Allocate courses to students based on their preferences.
    """
    try:
        logger.info(f"Processing allocation request for {len(request.students)} students")
        
        # Perform course allocation
        allocation_result = allocate_courses(request.students)
        
        # Store allocation result with a unique ID
        allocation_id = str(uuid.uuid4())
        allocations_store[allocation_id] = allocation_result
        
        # Add allocation ID to response
        response_data = allocation_result.dict()
        response_data["allocation_id"] = allocation_id
        
        logger.info(f"Allocation completed successfully. Allocation ID: {allocation_id}")
        return response_data
        
    except CourseAllocationException as e:
        logger.error(f"Allocation error: {str(e)}")
        raise
    except Exception as e:
        logger.exception("Unexpected error during allocation")
        raise CourseAllocationException(detail=f"Allocation failed: {str(e)}")

@router.get("/download/{allocation_id}")
async def download_report(
    allocation_id: str,
    background_tasks: BackgroundTasks,
    format: DownloadFormat = Query(DownloadFormat.EXCEL)
):
    """
    Generate and download the allocation report in Excel or CSV format.
    """
    try:
        if allocation_id not in allocations_store:
            raise HTTPException(status_code=404, detail="Allocation result not found")
        
        allocation_result = allocations_store[allocation_id]
        
        # Create temp file with unique name
        temp_dir = tempfile.gettempdir()
        file_extension = 'xlsx' if format == DownloadFormat.EXCEL else 'csv'
        temp_file = os.path.join(temp_dir, f'course_allocation_{allocation_id}.{file_extension}')
        
        logger.info(f"Creating report at: {temp_file}")
        
        # Generate report
        generate_allocation_report(allocation_result, temp_file, format)
        
        # Schedule file cleanup with delay
        async def delete_file(path: str, delay: int = 5):
            await asyncio.sleep(delay)
            try:
                if os.path.exists(path):
                    os.unlink(path)
            except Exception as e:
                logger.error(f"Error deleting temporary file {path}: {str(e)}")
        
        background_tasks.add_task(delete_file, temp_file)
        
        logger.info(f"Allocation report generated: {temp_file}")
        return FileResponse(
            path=temp_file,
            filename=f'course_allocation_{allocation_id}.{file_extension}',
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                if format == DownloadFormat.EXCEL else 'text/csv'
        )
    
    except Exception as e:
        logger.exception("Error generating report")
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")

@router.post("/preferences")
async def submit_preferences(preference: StudentPreference):
    try:
        await preference.insert()
        return {"status": "success", "message": "Preferences submitted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/preferences", response_model=List[StudentPreference])
async def get_all_preferences():
    preferences = await StudentPreference.find_all().to_list()
    return preferences

@router.get("/status/{student_id}")
async def get_student_status(student_id: str):
    # Find latest allocation that includes this student
    allocation = await AllocationResult.find_one({
        f"student_allocations.{student_id}": {"$exists": True}
    }, sort=[("created_at", -1)])
    
    if not allocation:
        raise HTTPException(status_code=404, detail="No allocation found for student")
    
    return {
        "allocation_id": allocation.allocation_id,
        "allocations": allocation.student_allocations[student_id]
    }

@router.post("/allocate")
async def trigger_allocation():
    # Get all student preferences
    preferences = await StudentPreference.find_all().to_list()
    
    if not preferences:
        raise HTTPException(status_code=400, detail="No preferences found")
    
    # Your existing allocation logic here...
    # Instead of storing in memory, save to MongoDB:
    allocation_id = str(uuid.uuid4())
    result = AllocationResult(
        allocation_id=allocation_id,
        student_allocations={},  # Fill with actual allocations
        course_enrollments={},   # Fill with actual enrollments
    )
    await result.insert()
    
    return {"allocation_id": allocation_id}