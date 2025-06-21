import sys
import os
from pathlib import Path

# Add the current directory to Python path
current_dir = Path(__file__).parent
project_root = current_dir.parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import logging
from fastapi.middleware.cors import CORSMiddleware
from beanie import init_beanie
import motor.motor_asyncio
from dotenv import load_dotenv

# Import your existing components with error handling
try:
    from routers.auth import router as auth_router
    from models.user import User
    print("✅ Successfully imported auth components")
except ImportError as e:
    print(f"❌ Auth import error: {e}")
    auth_router = None
    User = None

try:
    from api.endpoints import router as api_router
    print("✅ Successfully imported API endpoints")
except ImportError as e:
    print(f"❌ API endpoints import error: {e}")
    api_router = None

try:
    from db.models import StudentPreference, AllocationResult
    print("✅ Successfully imported DB models")
except ImportError as e:
    print(f"❌ DB models import error: {e}")
    StudentPreference = None
    AllocationResult = None

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Course Allocation System",
    description="A system for course allocation with JWT authentication",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database initialization
@app.on_event("startup")
async def init_db():
    """Initialize database connection."""
    try:
        mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        client = motor.motor_asyncio.AsyncIOMotorClient(mongo_url)
        
        # Initialize with available models
        models_to_init = []
        if User:
            models_to_init.append(User)
        if StudentPreference:
            models_to_init.append(StudentPreference)
        if AllocationResult:
            models_to_init.append(AllocationResult)
        
        if models_to_init:
            await init_beanie(
                database=client.course_allocation,
                document_models=models_to_init
            )
            logger.info(f"Database initialized successfully with {len(models_to_init)} models")
        else:
            logger.warning("No models available for database initialization")
            
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        # Don't raise the exception - let the app start anyway
        pass

# Include routers that are available
if auth_router:
    app.include_router(auth_router)
    logger.info("✅ Auth router included")

if api_router:
    app.include_router(api_router, prefix="/api")
    logger.info("✅ API router included")

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

@app.get("/")
async def root():
    return {
        "message": "Course Allocation System API is running",
        "available_services": {
            "auth": auth_router is not None,
            "api": api_router is not None,
            "user_model": User is not None,
            "preference_model": StudentPreference is not None,
            "allocation_model": AllocationResult is not None
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "API is operational"}
