from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
import logging
import os
import uuid
import tempfile
from typing import Optional

from app.api.models import AllocationRequest, AllocationResponse, DownloadFormat
from app.services.allocation import allocate_courses
from app.services.report import generate_allocation_report
from app.core.exceptions import CourseAllocationException

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
    format: DownloadFormat = Query(DownloadFormat.EXCEL, description="Output format (excel or csv)")
):
    """
    Generate and download the allocation report in Excel or CSV format.
    """
    try:
        if allocation_id not in allocations_store:
            raise HTTPException(status_code=404, detail="Allocation result not found")
        
        allocation_result = allocations_store[allocation_id]
        
        # Generate unique filename
        filename = f"course_allocation_{allocation_id}.{'xlsx' if format == DownloadFormat.EXCEL else 'csv'}"
        
        # Use tempfile module to get system's temp directory - works cross-platform
        temp_dir = tempfile.gettempdir()
        file_path = os.path.join(temp_dir, filename)
        
        logger.info(f"Creating report at: {file_path}")
        
        # Generate report
        generate_allocation_report(allocation_result, file_path, format)
        
        # Make sure the file exists before trying to return it
        if not os.path.exists(file_path):
            raise HTTPException(status_code=500, detail="Failed to generate report file")
        
        # Schedule file cleanup after response is sent
        background_tasks.add_task(lambda path: os.unlink(path) if os.path.exists(path) else None, file_path)
        
        logger.info(f"Allocation report generated: {filename}")
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
            if format == DownloadFormat.EXCEL else "text/csv"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error generating report")
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")