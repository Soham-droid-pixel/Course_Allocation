import asyncio
from datetime import datetime
from models.user import User, UserRole
from utils.auth_utils import get_password_hash
from beanie import init_beanie
import motor.motor_asyncio

async def test_user_creation():
    # Initialize database connection
    client = motor.motor_asyncio.AsyncIOMotorClient("mongodb://localhost:27017")
    await init_beanie(database=client.course_allocation, document_models=[User])
    
    try:
        # Test password hashing
        password = "testpass123"
        hashed_password = get_password_hash(password)
        print(f"✅ Password hashed successfully: {len(hashed_password)} characters")
        
        # Test user creation
        user_data = {
            "email": "debug@test.com",
            "hashed_password": hashed_password,
            "role": UserRole.STUDENT,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        print(f"Creating user with data: {user_data}")
        
        # Create user
        user = User(**user_data)
        print(f"✅ User object created: {user}")
        
        # Save to database
        await user.insert()
        print(f"✅ User saved to database with ID: {user.id}")
        
        # Clean up - delete the test user
        await user.delete()
        print("✅ Test user deleted")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    asyncio.run(test_user_creation())