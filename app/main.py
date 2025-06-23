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

# Load environment variables first
load_dotenv()

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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Course Allocation System",
    description="A system for course allocation with JWT authentication",
    version="1.0.0"
)

# CORS Configuration - Add your production domains here
allowed_origins = [
    "http://localhost:3000",  # React dev server
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3001",  # Alternative React port
    os.getenv("FRONTEND_URL", ""),  # Production frontend URL
]

# Filter out empty strings
allowed_origins = [origin for origin in allowed_origins if origin]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database initialization
@app.on_event("startup")
async def init_db():
    """Initialize MongoDB Atlas connection."""
    try:
        # Get MongoDB Atlas connection string from environment
        mongo_url = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI")
        
        if not mongo_url:
            logger.error("❌ MongoDB connection string not found in environment variables")
            logger.error("Please set MONGODB_URL or MONGODB_URI in your .env file")
            return
        
        # Log connection attempt (without showing full connection string for security)
        logger.info(f"🔗 Attempting to connect to MongoDB Atlas...")
        logger.info(f"Connection string preview: {mongo_url[:20]}...")
        
        # Create MongoDB client with Atlas-specific settings
        client = motor.motor_asyncio.AsyncIOMotorClient(
            mongo_url,
            serverSelectionTimeoutMS=5000,  # 5 second timeout
            connectTimeoutMS=10000,         # 10 second connection timeout
            maxPoolSize=50,                 # Max connection pool size
            retryWrites=True,               # Enable retryable writes
            w="majority"                    # Write concern
        )
        
        # Test the connection
        await client.admin.command('ping')
        logger.info("✅ Successfully connected to MongoDB Atlas")
        
        # Get database name from environment or use default
        db_name = os.getenv("MONGODB_DB_NAME", "course_allocation")
        database = client[db_name]
        
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
                database=database,
                document_models=models_to_init
            )
            logger.info(f"✅ Database '{db_name}' initialized successfully with {len(models_to_init)} models")
            logger.info(f"📋 Models initialized: {[model.__name__ for model in models_to_init]}")
        else:
            logger.warning("⚠️ No models available for database initialization")
            
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {str(e)}")
        logger.error("Please check your MongoDB Atlas connection string and network connectivity")
        # Don't raise the exception - let the app start anyway for debugging
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
        "version": "1.0.0",
        "database": "MongoDB Atlas",
        "available_services": {
            "auth": auth_router is not None,
            "api": api_router is not None,
            "user_model": User is not None,
            "preference_model": StudentPreference is not None,
            "allocation_model": AllocationResult is not None
        },
        "environment": {
            "mongodb_configured": bool(os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI")),
            "database_name": os.getenv("MONGODB_DB_NAME", "course_allocation"),
            "cors_origins": len(allowed_origins)
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint with database connectivity status."""
    try:
        # Try to get MongoDB client if available
        mongo_url = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI")
        
        if mongo_url:
            client = motor.motor_asyncio.AsyncIOMotorClient(mongo_url)
            await client.admin.command('ping')
            db_status = "connected"
        else:
            db_status = "not_configured"
            
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "message": "API is operational",
        "database_status": db_status,
        "timestamp": str(os.times())
    }

# Optional: Add a test endpoint for database connectivity
@app.get("/test-db")
async def test_database():
    """Test database connectivity."""
    try:
        mongo_url = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI")
        
        if not mongo_url:
            return JSONResponse(
                status_code=500,
                content={"error": "MongoDB connection string not configured"}
            )
        
        client = motor.motor_asyncio.AsyncIOMotorClient(mongo_url)
        
        # Test connection
        result = await client.admin.command('ping')
        
        # Get database info
        db_name = os.getenv("MONGODB_DB_NAME", "course_allocation")
        database = client[db_name]
        collections = await database.list_collection_names()
        
        return {
            "status": "success",
            "message": "Database connection successful",
            "database_name": db_name,
            "collections": collections,
            "ping_result": result
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": f"Database connection failed: {str(e)}"
            }
        )

if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment or use default
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"🚀 Starting server on {host}:{port}")
    uvicorn.run(app, host=host, port=port)
