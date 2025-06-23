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

from dotenv import load_dotenv

# FORCE reload environment variables
env_path = project_root / ".env"
print(f"🔍 Force loading .env from: {env_path}")
print(f"📁 .env exists: {env_path.exists()}")

# Clear any existing MongoDB environment variables
if 'MONGODB_URL' in os.environ:
    del os.environ['MONGODB_URL']
if 'MONGODB_URI' in os.environ:
    del os.environ['MONGODB_URI']

# Force load the .env file
load_dotenv(dotenv_path=env_path, override=True)

# If still not loaded, set it manually
mongo_url = os.getenv("MONGODB_URL")
if not mongo_url or "localhost" in mongo_url:
    print("⚠️ MongoDB URL not loaded from .env, setting manually")
    os.environ["MONGODB_URL"] = "mongodb+srv://sohamkalg:sohu1812@cluster0.vgww7.mongodb.net/course_allocation?retryWrites=true&w=majority&appName=Cluster0"
    mongo_url = os.getenv("MONGODB_URL")

print(f"📋 Final MongoDB URL: {mongo_url[:50]}...")

# Continue with your existing imports...
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import logging
from fastapi.middleware.cors import CORSMiddleware
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
import certifi

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

# CORS Configuration
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://course-allocation-frontend.vercel.app",  # Your Vercel domain
    "https://course-allocation-frontend-*.vercel.app",  # Preview deployments
    "https://*.vercel.app",  # Allow all Vercel domains
    os.getenv("FRONTEND_URL", ""),
]

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
    """Initialize MongoDB Atlas connection with SSL/TLS."""
    try:
        # Get MongoDB Atlas connection string
        mongo_url = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI")
        
        if not mongo_url:
            logger.error("❌ MongoDB connection string not found")
            return
        
        # Verify it's not localhost
        if "localhost" in mongo_url:
            logger.error("❌ Still using localhost connection string")
            logger.error("This means .env file is not being loaded correctly")
            return
        
        logger.info(f"🔗 Connecting to MongoDB Atlas...")
        logger.info(f"Connection preview: {mongo_url[:30]}...")
        logger.info(f"📜 Using SSL certificates from: {certifi.where()}")
        
        # Create MongoDB client
        client = AsyncIOMotorClient(
            mongo_url,
            tls=True,
            tlsCAFile=certifi.where(),
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=10000,
            maxPoolSize=50,
            retryWrites=True,
            w="majority"
        )
        
        # Test connection
        await client.admin.command('ping')
        logger.info("✅ Successfully connected to MongoDB Atlas")
        
        # Initialize database
        db_name = os.getenv("MONGODB_DB_NAME", "course_allocation")
        database = client[db_name]
        
        # Initialize models
        models_to_init = []
        if User:
            models_to_init.append(User)
        if StudentPreference:
            models_to_init.append(StudentPreference)
        if AllocationResult:
            models_to_init.append(AllocationResult)
        
        if models_to_init:
            await init_beanie(database=database, document_models=models_to_init)
            logger.info(f"✅ Database initialized with {len(models_to_init)} models")
        
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {str(e)}")
        pass

# Include routers
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
        "mongodb_url_preview": (os.getenv("MONGODB_URL", "Not set"))[:30] + "...",
        "ssl_enabled": True,
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "message": "API is operational",
        "mongodb_configured": bool(os.getenv("MONGODB_URL")),
        "ssl_enabled": True,
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"🚀 Starting server on {host}:{port}")
    uvicorn.run(app, host=host, port=port)
