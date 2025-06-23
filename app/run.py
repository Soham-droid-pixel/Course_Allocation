import uvicorn
from dotenv import load_dotenv
import os
from pathlib import Path

# Load environment variables from the parent directory
env_path = Path("../.env")
print(f"🔍 Looking for .env at: {env_path.resolve()}")
print(f"📁 .env exists: {env_path.exists()}")

load_dotenv(dotenv_path="../.env")

if __name__ == "__main__":
    # Print MongoDB URL for debugging (first 50 chars only)
    mongo_url = os.getenv("MONGODB_URL", "Not found")
    print(f"📋 MongoDB URL loaded: {mongo_url[:50]}...")
    
    # Check if it's the Atlas URL or localhost
    if "mongodb+srv://" in mongo_url:
        print("✅ Atlas connection string detected")
    elif "localhost" in mongo_url:
        print("❌ Still using localhost - .env not loaded properly")
    else:
        print("⚠️ Unexpected MongoDB URL format")
    
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)