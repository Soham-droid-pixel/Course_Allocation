# seed/seed_students.py

import asyncio
from datetime import datetime, timedelta, timezone
import random
import string
import sys
from pathlib import Path

# --- Setup Path ---
sys.path.append(str(Path(__file__).resolve().parents[1]))

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.db.models import StudentPreference, CourseCategory

# --- Course Data ---
COURSES = {
    'PECL1': [
        {'id': '25PECL13CE11', 'name': 'Image processing Lab', 'credits': 1},
        {'id': '25PECL13CE12', 'name': 'Natural Language Processing Lab', 'credits': 1},
        {'id': '25PECL13CE13', 'name': 'IIOT lab', 'credits': 1},
        {'id': '25PECL13CE14', 'name': 'Innovative Product Development Lab-Phase1', 'credits': 1},
        {'id': '25PECL13CE15', 'name': 'Open-Source Intelligence and Threat Intelligence lab', 'credits': 1}
    ],
    'PECL2': [
        {'id': '25PECL13CE21', 'name': 'Social Media Analytics Lab', 'credits': 1},
        {'id': '25PECL13CE22', 'name': 'Ethical Hacking Lab', 'credits': 1},
        {'id': '25PECL13CE23', 'name': 'DevOps Lab', 'credits': 1},
        {'id': '25PECL13CE24', 'name': 'Innovative Product Development Lab-Phase2', 'credits': 1},
        {'id': '25PECL13CE25', 'name': 'Explainable AI Lab', 'credits': 1},
        {'id': '25PECL13CE26', 'name': 'Software Testing and Quality assurance lab', 'credits': 1}
    ],
    'Program Elective': [
        {'id': '25PEC13CE11', 'name': 'Block chain Technology', 'credits': 3},
        {'id': '25PEC13CE12', 'name': 'Deep Learning and Reinforcement Learning', 'credits': 3},
        {'id': '25PEC13CE13', 'name': 'Cyber Security', 'credits': 3},
        {'id': '25PEC13CE14', 'name': 'Big data analytics', 'credits': 3},
        {'id': '25PEC13CE15', 'name': 'Computer Graphics', 'credits': 3},
        {'id': '25PEC13CE16', 'name': 'HMI', 'credits': 3},
        {'id': '25PEC13CE17', 'name': 'Geographical Information Systems', 'credits': 3}
    ],
    'Open Elective': [
        {'id': 'OE1', 'name': 'Advanced Microprocessor', 'credits': 3},
        {'id': 'OE2', 'name': 'Internet of Things', 'credits': 3},
        {'id': 'OE3', 'name': 'E-Vehicle', 'credits': 3},
        {'id': 'OE4', 'name': 'Supply Chain Management', 'credits': 3},
        {'id': 'OE5', 'name': 'Design of Experiments', 'credits': 3},
        {'id': 'OE6', 'name': '3D Printing', 'credits': 3}
    ],
    'Honors': [
        {'id': 'H1', 'name': 'Internet of Things', 'credits': 3},
        {'id': 'H2', 'name': 'Artificial Intelligence and Machine Learning', 'credits': 3},
        {'id': 'H3', 'name': 'Data Science', 'credits': 3},
        {'id': 'H4', 'name': 'Blockchain', 'credits': 3},
        {'id': 'H5', 'name': 'Cybersecurity', 'credits': 3}
    ],
    'Minor': [
        {'id': 'M1', 'name': 'Robotics', 'credits': 3},
        {'id': 'M2', 'name': '3D Printing', 'credits': 3}
    ],
    'MDM': [
        {'id': 'MDM1', 'name': 'Emotional and Spiritual Intelligence', 'credits': 1},
        {'id': 'MDM2', 'name': 'Health,Wellness and Pyschology', 'credits': 1}
    ]
}

# --- Helper Functions ---

def get_random_course_from_category(category_name):
    """Get a random course ID from a specific category"""
    if category_name in COURSES and COURSES[category_name]:
        course = random.choice(COURSES[category_name])
        return course['id']
    return ""

def generate_honors_minor_preference():
    """Generate Honors/Minor preferences ensuring only one is selected or neither"""
    honors_minor_choice = random.choices(
        ['honors', 'minor', 'none'], 
        weights=[30, 30, 40],  # 30% honors, 30% minor, 40% neither
        k=1
    )[0]
    
    honors_prefs = {"choice1": "", "choice2": ""}
    minor_prefs = {"choice1": "", "choice2": ""}
    
    if honors_minor_choice == 'honors':
        available_courses = COURSES['Honors']
        if len(available_courses) >= 2:
            selected_courses = random.sample(available_courses, 2)
            honors_prefs = {
                "choice1": selected_courses[0]['id'],
                "choice2": selected_courses[1]['id']
            }
        elif len(available_courses) == 1:
            honors_prefs = {
                "choice1": available_courses[0]['id'],
                "choice2": ""
            }
    elif honors_minor_choice == 'minor':
        available_courses = COURSES['Minor']
        if len(available_courses) >= 2:
            selected_courses = random.sample(available_courses, 2)
            minor_prefs = {
                "choice1": selected_courses[0]['id'],
                "choice2": selected_courses[1]['id']
            }
        elif len(available_courses) == 1:
            minor_prefs = {
                "choice1": available_courses[0]['id'],
                "choice2": ""
            }
    
    return honors_prefs, minor_prefs

def generate_category_preferences(category_name, skip_probability=0.15):
    """Generate preferences for a specific category"""
    if category_name not in COURSES:
        return {"choice1": "", "choice2": ""}
    
    available_courses = COURSES[category_name]
    
    # Some students might not select courses for some categories
    if random.random() < skip_probability:
        return {"choice1": "", "choice2": ""}
    
    if len(available_courses) >= 2:
        # 80% chance to select both choices, 20% chance to select only choice1
        select_both = random.random() < 0.8
        
        if select_both:
            selected_courses = random.sample(available_courses, 2)
            return {
                "choice1": selected_courses[0]['id'],
                "choice2": selected_courses[1]['id']
            }
        else:
            # Select only choice1
            selected_course = random.choice(available_courses)
            return {
                "choice1": selected_course['id'],
                "choice2": ""
            }
    elif len(available_courses) == 1:
        return {
            "choice1": available_courses[0]['id'],
            "choice2": ""
        }
    else:
        return {"choice1": "", "choice2": ""}

def generate_random_preferences():
    """Generate random preferences ensuring all validation rules are met"""
    prefs = {}
    
    # Generate regular category preferences
    regular_categories = ['PECL1', 'PECL2', 'Program Elective', 'Open Elective']
    
    for category in regular_categories:
        prefs[category] = generate_category_preferences(category)
    
    # Generate Honors/Minor preferences (mutually exclusive)
    honors_prefs, minor_prefs = generate_honors_minor_preference()
    prefs['Honors'] = honors_prefs
    prefs['Minor'] = minor_prefs
    
    # MDM is mandatory - always select one course (prioritize MDM2)
    # We'll handle distribution later, for now just assign randomly
    mdm_course = random.choice(COURSES['MDM'])
    prefs['MDM'] = {
        "choice1": mdm_course['id'],
        "choice2": ""
    }
    
    return prefs

def ensure_course_minimum_enrollment(students, min_students_per_course=5):
    """Ensure each course has minimum enrollment, redistribute if needed"""
    course_counts = {}
    
    # Count all course selections
    for student in students:
        for category, choices in student.preferences.items():
            choice1 = choices.get('choice1', '')
            choice2 = choices.get('choice2', '')
            
            if choice1:
                course_counts[choice1] = course_counts.get(choice1, 0) + 1
            if choice2:
                course_counts[choice2] = course_counts.get(choice2, 0) + 1
    
    print(f"📊 Course enrollment counts: {course_counts}")
    
    # Identify under-enrolled courses (excluding empty selections)
    under_enrolled = {
        course_id: count for course_id, count in course_counts.items() 
        if count < min_students_per_course and count > 0
    }
    
    if under_enrolled:
        print(f"⚠️  Under-enrolled courses: {under_enrolled}")
        
        # For each under-enrolled course, try to redistribute students
        for course_id, current_count in under_enrolled.items():
            needed = min_students_per_course - current_count
            print(f"📈 Course {course_id} needs {needed} more students")
            
            # Find category of this course
            course_category = None
            for cat, courses in COURSES.items():
                if any(c['id'] == course_id for c in courses):
                    course_category = cat
                    break
            
            if course_category:
                # Find students who can be reassigned to this course
                candidates = []
                for student in students:
                    cat_prefs = student.preferences.get(course_category, {})
                    choice1 = cat_prefs.get('choice1', '')
                    choice2 = cat_prefs.get('choice2', '')
                    
                    # Can reassign if they have choice2 empty or different choice1
                    if choice2 == '' and choice1 != course_id:
                        candidates.append((student, 'choice2'))
                    elif choice1 != course_id and choice2 != course_id:
                        candidates.append((student, 'choice1'))
                
                # Reassign random candidates
                random.shuffle(candidates)
                reassigned = 0
                for student, choice_slot in candidates[:needed]:
                    if choice_slot == 'choice2':
                        student.preferences[course_category]['choice2'] = course_id
                    else:
                        # Shift current choice1 to choice2, put new course in choice1
                        old_choice1 = student.preferences[course_category]['choice1']
                        student.preferences[course_category]['choice1'] = course_id
                        if old_choice1:
                            student.preferences[course_category]['choice2'] = old_choice1
                    
                    reassigned += 1
                
                print(f"✅ Reassigned {reassigned} students to {course_id}")

def ensure_mdm_distribution(students, min_students_per_course=20):
    """Ensure MDM distribution with preference for Health,Wellness,Psychology (MDM2)"""
    total_students = len(students)
    
    # Target: Prioritize MDM2 (Health, Wellness, Psychology) as requested
    target_mdm2 = max(min_students_per_course, int(total_students * 0.6))  # 60% prefer MDM2
    target_mdm1 = total_students - target_mdm2
    
    # Ensure both courses have minimum students
    if target_mdm1 < min_students_per_course:
        target_mdm1 = min_students_per_course
        target_mdm2 = total_students - target_mdm1
    
    print(f"🎯 MDM Target Distribution: MDM1={target_mdm1}, MDM2={target_mdm2}")
    
    # Shuffle students for random assignment
    shuffled_students = students.copy()
    random.shuffle(shuffled_students)
    
    # Assign MDM courses based on targets
    for i, student in enumerate(shuffled_students):
        if i < target_mdm2:
            student.preferences['MDM'] = {'choice1': 'MDM2', 'choice2': ''}
        else:
            student.preferences['MDM'] = {'choice1': 'MDM1', 'choice2': ''}
    
    # Verify final distribution
    final_counts = {'MDM1': 0, 'MDM2': 0}
    for student in students:
        mdm_choice = student.preferences.get('MDM', {}).get('choice1', '')
        if mdm_choice in final_counts:
            final_counts[mdm_choice] += 1
    
    print(f"✅ Final MDM Distribution: {final_counts}")

def generate_student_status_and_preferences():
    """Generate status ensuring validation rules are met"""
    preferences = generate_random_preferences()
    
    # Check if MDM choice1 is filled (it should always be filled now)
    mdm_choice1 = preferences.get('MDM', {}).get('choice1', '')
    
    if mdm_choice1:
        # Can use any status including confirmed
        status = random.choice(["draft", "confirmed", "submitted"])
    else:
        # This shouldn't happen with new logic, but just in case
        status = random.choice(["draft", "submitted"])
    
    return status, preferences

def validate_student_data(student):
    """Validate student data before insertion to prevent None values"""
    # Ensure all required fields are strings, not None
    if student.student_id is None:
        student.student_id = f"STU{random.randint(1000, 9999)}"
    
    if student.name is None:
        student.name = "Unknown Student"
    
    if student.status is None:
        student.status = "draft"
    
    if student.comments is None:
        student.comments = ""
    
    if student.enrollment_status is None:
        student.enrollment_status = "pending"
    
    # Validate preferences structure
    if not isinstance(student.preferences, dict):
        student.preferences = {}
    
    # Ensure all categories have proper structure
    for category in CourseCategory:
        if category.value not in student.preferences:
            student.preferences[category.value] = {"choice1": "", "choice2": ""}
        else:
            prefs = student.preferences[category.value]
            if not isinstance(prefs, dict):
                student.preferences[category.value] = {"choice1": "", "choice2": ""}
            else:
                # Ensure choice1 and choice2 are strings, not None
                if prefs.get('choice1') is None:
                    prefs['choice1'] = ""
                if prefs.get('choice2') is None:
                    prefs['choice2'] = ""
    
    return student

# --- Main Seeding Function ---

async def seed_students(n=130):
    """Seed students with improved validation and distribution"""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    await init_beanie(
        database=client["course_allocation"],  # Replace with your DB name
        document_models=[StudentPreference]
    )

    print(f"🌱 Starting to seed {n} students...")
    
    students = []
    for i in range(n):
        student_id = f"STU{1000+i}"
        name = f"Student {i+1}"
        
        # Generate preferences and status
        status, preferences = generate_student_status_and_preferences()
        
        # Debug: Print first few students' data
        if i < 3:
            print(f"Debug - Student {i+1} MDM: {preferences.get('MDM', {})}, Status: {status}")

        student = StudentPreference(
            student_id=student_id,
            name=name,
            preferences=preferences,
            status=status,
            comments=random.choice(["", "Needs review", "Confirmed choices", "Ready for allocation"]),
            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, 10)),
            updated_at=datetime.now(timezone.utc),
            enrollment_status=random.choice(["pending", "completed"])
        )
        
        # Validate student data to prevent None values
        student = validate_student_data(student)
        students.append(student)

    print("🔄 Optimizing course distributions...")
    
    # Ensure MDM distribution meets requirements (minimum 20 each, prefer MDM2)
    ensure_mdm_distribution(students, min_students_per_course=20)
    
    # Ensure other courses have minimum enrollment
    ensure_course_minimum_enrollment(students, min_students_per_course=5)

    print("💾 Inserting students into database...")
    await StudentPreference.insert_many(students)
    print(f"✅ Successfully inserted {n} student records!")
    
    # Print final statistics
    print("\n📊 Final Distribution Summary:")
    
    # Honors vs Minor vs Neither
    honors_count = sum(1 for s in students if s.preferences.get('Honors', {}).get('choice1'))
    minor_count = sum(1 for s in students if s.preferences.get('Minor', {}).get('choice1'))
    neither_count = n - honors_count - minor_count
    
    print(f"  🎓 Honors selected: {honors_count} students ({honors_count/n*100:.1f}%)")
    print(f"  📚 Minor selected: {minor_count} students ({minor_count/n*100:.1f}%)")
    print(f"  ⚪ Neither selected: {neither_count} students ({neither_count/n*100:.1f}%)")
    
    # MDM Distribution
    mdm_counts = {'MDM1': 0, 'MDM2': 0}
    for student in students:
        mdm_choice = student.preferences.get('MDM', {}).get('choice1', '')
        if mdm_choice in mdm_counts:
            mdm_counts[mdm_choice] += 1
    
    print(f"  🧠 MDM1 (Emotional & Spiritual): {mdm_counts['MDM1']} students")
    print(f"  💊 MDM2 (Health, Wellness & Psychology): {mdm_counts['MDM2']} students")
    
    # Status Distribution
    status_counts = {}
    for student in students:
        status = student.status
        status_counts[status] = status_counts.get(status, 0) + 1
    
    print(f"  📋 Status Distribution: {status_counts}")
    
    print("\n🎉 Seeding completed successfully!")

# --- Run Script ---

if __name__ == "__main__":
    print("🚀 Starting Student Seeding Process...")
    asyncio.run(seed_students(130))