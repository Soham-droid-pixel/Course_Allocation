# 📌 This file initializes the MongoDB connection for the course allocation service.
#
# - init_mongodb() → Sets up database connection:
#   • Creates AsyncIOMotorClient using settings.MONGODB_URL
#   • Initializes Beanie ODM with database = settings.DB_NAME
#   • Registers document models: StudentPreference, AllocationResult
#
# 👉 Summary:
# Call init_mongodb() once at startup to ensure DB and models are ready for use.


from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from ..core.config import settings
from .models import StudentPreference, AllocationResult

async def init_mongodb():
    # Create motor client
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    
    # Initialize beanie with the document models
    await init_beanie(
        database=client[settings.DB_NAME],
        document_models=[StudentPreference, AllocationResult]
    )