from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from .models import StudentPreference, AllocationResult

async def init_db(db_url: str, db_name: str):
    """Initialize database connection and models"""
    client = AsyncIOMotorClient(db_url)
    await init_beanie(
        database=client[db_name],
        document_models=[
            StudentPreference,
            AllocationResult
        ]
    )