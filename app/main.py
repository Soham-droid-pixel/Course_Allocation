from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import logging
from fastapi.middleware.cors import CORSMiddleware

from app.api.endpoints import router
from app.core.exceptions import CourseAllocationException
from app.core.logging import setup_logging

# Setup logging
logger = setup_logging()

app = FastAPI(
    title="Course Allocation Service",
    description="Microservice for dynamic allocation of courses based on student preferences",
    version="1.0.0"
)

# Configure CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(router, prefix="/api")

@app.exception_handler(CourseAllocationException)
async def course_allocation_exception_handler(request: Request, exc: CourseAllocationException):
    logger.error(f"Course allocation error: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
