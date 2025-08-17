# 📌 This file sets up the MongoDB connection for the allocation service.
#
# - init_db(db_url, db_name) → Asynchronously connects to MongoDB:
#   • Uses Motor (AsyncIOMotorClient) for async driver
#   • Initializes Beanie ODM with defined document models
#
# - Models registered:
#   • StudentPreference → Stores student course choices and status
#   • AllocationResult  → Stores course allocation outcomes and metadata
#
# 👉 Summary:
# This file ensures that once init_db() is called, the app has a ready-to-use
# MongoDB + Beanie setup for reading/writing StudentPreference and AllocationResult.


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