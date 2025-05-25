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