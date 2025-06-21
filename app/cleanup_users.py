import asyncio
import motor.motor_asyncio
from beanie import init_beanie
from models.user import User

async def cleanup_corrupted_users():
    """Clean up any corrupted user documents in the database."""
    try:
        # Initialize database connection
        client = motor.motor_asyncio.AsyncIOMotorClient("mongodb://localhost:27017")
        await init_beanie(database=client.course_allocation, document_models=[User])
        
        # Get direct access to the collection
        collection = client.course_allocation.users
        
        # Find all documents in users collection
        all_docs = await collection.find({}).to_list(length=None)
        print(f"Found {len(all_docs)} user documents")
        
        # Check each document for missing required fields
        corrupted_docs = []
        for doc in all_docs:
            print(f"Checking document: {doc.get('_id')}")
            print(f"Document fields: {list(doc.keys())}")
            
            if 'hashed_password' not in doc:
                print(f"❌ Document {doc.get('_id')} is missing hashed_password")
                corrupted_docs.append(doc['_id'])
            elif 'email' not in doc:
                print(f"❌ Document {doc.get('_id')} is missing email")
                corrupted_docs.append(doc['_id'])
            elif 'role' not in doc:
                print(f"❌ Document {doc.get('_id')} is missing role")
                corrupted_docs.append(doc['_id'])
            else:
                print(f"✅ Document {doc.get('_id')} is valid")
        
        # Delete corrupted documents
        if corrupted_docs:
            print(f"\nDeleting {len(corrupted_docs)} corrupted documents...")
            result = await collection.delete_many({"_id": {"$in": corrupted_docs}})
            print(f"✅ Deleted {result.deleted_count} corrupted documents")
        else:
            print("✅ No corrupted documents found")
            
        # Verify cleanup
        remaining_docs = await collection.find({}).to_list(length=None)
        print(f"✅ {len(remaining_docs)} documents remaining in collection")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    asyncio.run(cleanup_corrupted_users())