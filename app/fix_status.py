# Create file: fix_status.py in your project root
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def fix_status():
    # Connect directly to MongoDB
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.course_allocation
    collection = db.student_preferences
    
    # Update the status directly
    result = await collection.update_one(
        {"roll_number": "10192"},
        {"$set": {"status": "confirmed"}}
    )
    
    print(f"Modified {result.modified_count} documents")
    
    # Verify the change
    doc = await collection.find_one({"roll_number": "10192"})
    print(f"Current status: {doc['status']}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_status())