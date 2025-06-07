# seed/seed_students.py

import asyncio
from datetime import datetime, timedelta
import random
import string
import sys
from pathlib import Path

# --- Setup Path ---
sys.path.append(str(Path(__file__).resolve().parents[1]))

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.db.models import StudentPreference, CourseCategory


# --- Helper Functions ---

def random_course_id(prefix="25PECL13CE", count=30):
    return f"{prefix}{random.randint(1, count):02}"

def random_string(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def generate_random_preferences():
    prefs = {}
    for category in CourseCategory:
        if category == CourseCategory.MDM:
            prefs[category.value] = {
                "choice1": f"MDM{random.randint(1, 5)}",
                "choice2": ""
            }
        else:
            prefs[category.value] = {
                "choice1": random_course_id(),
                "choice2": random_course_id()
            }
    return prefs


# --- Main Seeding Function ---

async def seed_students(n=130):
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    await init_beanie(
        database=client["course_allocation"],  # Replace with your DB name
        document_models=[StudentPreference]
    )

    students = []
    for i in range(n):
        student_id = f"STU{1000+i}"
        name = f"Student {i+1}"

        student = StudentPreference(
            student_id=student_id,
            name=name,
            preferences=generate_random_preferences(),
            status=random.choice(["draft", "confirmed", "submitted"]),
            comments=random.choice(["", "Needs review", "Confirmed choices"]),
            created_at=datetime.utcnow() - timedelta(days=random.randint(0, 10)),
            updated_at=datetime.utcnow(),
            enrollment_status=random.choice(["pending", "completed"])
        )
        students.append(student)

    await StudentPreference.insert_many(students)
    print(f"✅ Inserted {n} student records successfully.")


# --- Run Script ---

if __name__ == "__main__":
    asyncio.run(seed_students(130))
