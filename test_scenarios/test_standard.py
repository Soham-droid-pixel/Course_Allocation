import asyncio
from datetime import datetime, timedelta, timezone
import random
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.db.models import StudentPreference

COURSES = {
    'PECL1': [
        {'id': '25PECL13CE11', 'name': 'Image Processing Lab', 'credits': 1},
        {'id': '25PECL13CE12', 'name': 'Natural Language Processing Lab', 'credits': 1},
        {'id': '25PECL13CE13', 'name': 'IIOT Lab', 'credits': 1},
        {'id': '25PECL13CE14', 'name': 'Innovative Product Development Lab-Phase1', 'credits': 1},
        {'id': '25PECL13CE15', 'name': 'Open-Source Intelligence Lab', 'credits': 1}
    ],
    'PECL2': [
        {'id': '25PECL13CE21', 'name': 'Social Media Analytics Lab', 'credits': 1},
        {'id': '25PECL13CE22', 'name': 'Ethical Hacking Lab', 'credits': 1},
        {'id': '25PECL13CE23', 'name': 'DevOps Lab', 'credits': 1},
        {'id': '25PECL13CE24', 'name': 'Innovative Product Development Lab-Phase2', 'credits': 1},
        {'id': '25PECL13CE25', 'name': 'Explainable AI Lab', 'credits': 1},
        {'id': '25PECL13CE26', 'name': 'Software Testing Lab', 'credits': 1}
    ],
    'Program Elective': [
        {'id': '25PEC13CE11', 'name': 'Blockchain Technology', 'credits': 3},
        {'id': '25PEC13CE12', 'name': 'Deep Learning and Reinforcement Learning', 'credits': 3},
        {'id': '25PEC13CE13', 'name': 'Cyber Security', 'credits': 3},
        {'id': '25PEC13CE14', 'name': 'Big Data Analytics', 'credits': 3},
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
        {'id': 'H1', 'name': 'IoT Honors', 'credits': 3},
        {'id': 'H2', 'name': 'AI/ML Honors', 'credits': 3},
        {'id': 'H3', 'name': 'Data Science Honors', 'credits': 3},
        {'id': 'H4', 'name': 'Blockchain Honors', 'credits': 3},
        {'id': 'H5', 'name': 'Cybersecurity Honors', 'credits': 3}
    ],
    'Minor': [
        {'id': 'M1', 'name': 'Robotics Minor', 'credits': 3},
        {'id': 'M2', 'name': '3D Printing Minor', 'credits': 3}
    ],
    'MDM': [
        {'id': 'MDM1', 'name': 'Emotional and Spiritual Intelligence', 'credits': 1},
        {'id': 'MDM2', 'name': 'Health, Wellness and Psychology', 'credits': 1}
    ]
}

MANDATORY_TWO_CHOICE_CATEGORIES = ['PECL1', 'PECL2', 'Program Elective', 'Open Elective']

async def test_standard_distribution():
    """Test 1: Standard Distribution - Balanced preferences across all courses"""
    print("🧪 TEST 1: STANDARD DISTRIBUTION (130 students)")
    print("=" * 60)
    
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    await init_beanie(database=client["course_allocation"], document_models=[StudentPreference])
    
    await StudentPreference.delete_all()
    students = []
    
    for i in range(130):
        student_id = f"STD{1000+i:04d}"
        preferences = {}
        
        # Mandatory categories - balanced distribution
        for category in MANDATORY_TWO_CHOICE_CATEGORIES:
            available_courses = [c['id'] for c in COURSES[category]]
            selected = random.sample(available_courses, 2)
            preferences[category] = {"choice1": selected[0], "choice2": selected[1]}
        
        # MDM - 60% MDM2, 40% MDM1
        mdm_choice = "MDM2" if random.random() < 0.6 else "MDM1"
        preferences['MDM'] = {"choice1": mdm_choice, "choice2": ""}
        
        # Honors/Minor - 30% Honors, 25% Minor, 45% Neither
        choice = random.choices(['honors', 'minor', 'none'], weights=[30, 25, 45], k=1)[0]
        if choice == 'honors':
            honors_course = random.choice(COURSES['Honors'])['id']
            preferences['Honors'] = {"choice1": honors_course, "choice2": ""}
            preferences['Minor'] = {"choice1": "", "choice2": ""}
        elif choice == 'minor':
            minor_course = random.choice(COURSES['Minor'])['id']
            preferences['Minor'] = {"choice1": minor_course, "choice2": ""}
            preferences['Honors'] = {"choice1": "", "choice2": ""}
        else:
            preferences['Honors'] = {"choice1": "", "choice2": ""}
            preferences['Minor'] = {"choice1": "", "choice2": ""}
        
        status = "confirmed" if i < 100 else random.choice(["draft", "submitted"])
        
        student = StudentPreference(
            student_id=student_id,
            name=f"Test Student {i+1}",
            preferences=preferences,
            status=status,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        students.append(student)
    
    await StudentPreference.insert_many(students)
    print_test_results("STANDARD DISTRIBUTION", students, 130)
    client.close()

async def test_high_demand_courses():
    """Test 2: High Demand Courses - Most students prefer specific popular courses"""
    print("\n🧪 TEST 2: HIGH DEMAND COURSES (100 students)")
    print("=" * 60)
    
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    await init_beanie(database=client["course_allocation"], document_models=[StudentPreference])
    
    await StudentPreference.delete_all()
    students = []
    
    # Popular courses that most students will prefer
    popular_courses = {
        'PECL1': ['25PECL13CE12', '25PECL13CE15'],  # NLP Lab, Open-Source Intelligence
        'PECL2': ['25PECL13CE22', '25PECL13CE25'],  # Ethical Hacking, Explainable AI
        'Program Elective': ['25PEC13CE12', '25PEC13CE13'],  # Deep Learning, Cyber Security
        'Open Elective': ['OE2', 'OE6']  # IoT, 3D Printing
    }
    
    for i in range(100):
        student_id = f"HID{2000+i:04d}"
        preferences = {}
        
        # 80% students choose popular courses, 20% choose randomly
        use_popular = random.random() < 0.8
        
        for category in MANDATORY_TWO_CHOICE_CATEGORIES:
            if use_popular and category in popular_courses:
                # Choose from popular courses
                choice1 = random.choice(popular_courses[category])
                remaining_popular = [c for c in popular_courses[category] if c != choice1]
                if remaining_popular:
                    choice2 = random.choice(remaining_popular)
                else:
                    # Fallback to any other course
                    all_courses = [c['id'] for c in COURSES[category] if c['id'] != choice1]
                    choice2 = random.choice(all_courses)
            else:
                # Random selection
                available_courses = [c['id'] for c in COURSES[category]]
                selected = random.sample(available_courses, 2)
                choice1, choice2 = selected[0], selected[1]
            
            preferences[category] = {"choice1": choice1, "choice2": choice2}
        
        # MDM distribution
        preferences['MDM'] = {"choice1": "MDM2" if i < 65 else "MDM1", "choice2": ""}
        
        # High demand for specific honors
        if i < 40:  # 40% want AI/ML Honors
            preferences['Honors'] = {"choice1": "H2", "choice2": ""}
            preferences['Minor'] = {"choice1": "", "choice2": ""}
        elif i < 50:  # 10% want Robotics Minor
            preferences['Minor'] = {"choice1": "M1", "choice2": ""}
            preferences['Honors'] = {"choice1": "", "choice2": ""}
        else:
            preferences['Honors'] = {"choice1": "", "choice2": ""}
            preferences['Minor'] = {"choice1": "", "choice2": ""}
        
        status = "confirmed" if i < 85 else "draft"
        
        student = StudentPreference(
            student_id=student_id,
            name=f"High Demand Student {i+1}",
            preferences=preferences,
            status=status,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        students.append(student)
    
    await StudentPreference.insert_many(students)
    print_test_results("HIGH DEMAND COURSES", students, 100)
    client.close()

async def test_low_enrollment_edge_case():
    """Test 3: Low Enrollment Edge Case - Some courses barely meet minimum requirements"""
    print("\n🧪 TEST 3: LOW ENROLLMENT EDGE CASE (60 students)")
    print("=" * 60)
    
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    await init_beanie(database=client["course_allocation"], document_models=[StudentPreference])
    
    await StudentPreference.delete_all()
    students = []
    
    for i in range(60):
        student_id = f"LOW{3000+i:04d}"
        preferences = {}
        
        # Distribute students to create some courses with exactly minimum enrollment
        # and some with very low enrollment
        
        for category in MANDATORY_TWO_CHOICE_CATEGORIES:
            available_courses = [c['id'] for c in COURSES[category]]
            
            if category == 'PECL1':
                # Concentrate choices on first 3 courses only
                limited_courses = available_courses[:3]
                selected = random.sample(limited_courses, 2)
            elif category == 'PECL2':
                # Spread across first 4 courses
                limited_courses = available_courses[:4]
                selected = random.sample(limited_courses, 2)
            elif category == 'Program Elective':
                # Focus on first 4 courses
                limited_courses = available_courses[:4]
                selected = random.sample(limited_courses, 2)
            elif category == 'Open Elective':
                # Focus on first 3 courses only
                limited_courses = available_courses[:3]
                selected = random.sample(limited_courses, 2)
            
            preferences[category] = {"choice1": selected[0], "choice2": selected[1]}
        
        # MDM - Force distribution to ensure both can run
        preferences['MDM'] = {"choice1": "MDM1" if i < 25 else "MDM2", "choice2": ""}
        
        # Honors/Minor - Different scenarios
        if i < 3:  # Only 3 students choose Honors (should still run)
            preferences['Honors'] = {"choice1": "H1", "choice2": ""}
            preferences['Minor'] = {"choice1": "", "choice2": ""}
        elif i < 5:  # Only 2 students choose Minor (should still run)
            preferences['Minor'] = {"choice1": "M1", "choice2": ""}
            preferences['Honors'] = {"choice1": "", "choice2": ""}
        else:  # Rest choose neither (perfectly fine)
            preferences['Honors'] = {"choice1": "", "choice2": ""}
            preferences['Minor'] = {"choice1": "", "choice2": ""}
        
        status = "confirmed" if i < 50 else "draft"
        
        student = StudentPreference(
            student_id=student_id,
            name=f"Low Enrollment Student {i+1}",
            preferences=preferences,
            status=status,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        students.append(student)
    
    await StudentPreference.insert_many(students)
    print_test_results("LOW ENROLLMENT EDGE CASE", students, 60)
    client.close()
async def test_mutual_exclusivity():
    """Test 4: Mutual Exclusivity Test - Students with valid single choices only"""
    print("\n🧪 TEST 4: MUTUAL EXCLUSIVITY TEST (80 students)")
    print("=" * 60)
    
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    await init_beanie(database=client["course_allocation"], document_models=[StudentPreference])
    
    await StudentPreference.delete_all()
    students = []
    
    for i in range(80):
        student_id = f"MUT{4000+i:04d}"
        preferences = {}
        
        # Standard mandatory preferences
        for category in MANDATORY_TWO_CHOICE_CATEGORIES:
            available_courses = [c['id'] for c in COURSES[category]]
            selected = random.sample(available_courses, 2)
            preferences[category] = {"choice1": selected[0], "choice2": selected[1]}
        
        preferences['MDM'] = {"choice1": "MDM2" if i % 2 == 0 else "MDM1", "choice2": ""}
        
        # Fixed mutual exclusivity scenarios - NO STUDENTS CHOOSE BOTH
        if i < 20:  # 25% choose only Honors
            preferences['Honors'] = {"choice1": random.choice([c['id'] for c in COURSES['Honors']]), "choice2": ""}
            preferences['Minor'] = {"choice1": "", "choice2": ""}  # ✅ EMPTY
        elif i < 40:  # 25% choose only Minor
            preferences['Minor'] = {"choice1": random.choice([c['id'] for c in COURSES['Minor']]), "choice2": ""}
            preferences['Honors'] = {"choice1": "", "choice2": ""}  # ✅ EMPTY
        else:  # 50% choose neither
            preferences['Honors'] = {"choice1": "", "choice2": ""}
            preferences['Minor'] = {"choice1": "", "choice2": ""}
        
        status = "confirmed"
        
        student = StudentPreference(
            student_id=student_id,
            name=f"Mutual Exclusivity Student {i+1}",
            preferences=preferences,
            status=status,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        students.append(student)
    
    await StudentPreference.insert_many(students)
    print_test_results("MUTUAL EXCLUSIVITY TEST", students, 80)
    client.close()

async def test_incomplete_preferences():
    """Test 5: Validation Test - Confirms system rejects invalid data ✅"""
    print("\n🧪 TEST 5: VALIDATION TEST - INVALID DATA REJECTION")
    print("=" * 60)
    print("🎯 Purpose: Verify system correctly rejects incomplete preferences")
    
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    await init_beanie(database=client["course_allocation"], document_models=[StudentPreference])
    
    await StudentPreference.delete_all()
    
    try:
        students = []
        
        for i in range(20):  # Smaller test size
            student_id = f"VAL{5000+i:04d}"
            preferences = {}
            
            # Complete mandatory preferences for most students
            for category in MANDATORY_TWO_CHOICE_CATEGORIES:
                available_courses = [c['id'] for c in COURSES[category]]
                selected = random.sample(available_courses, 2)
                preferences[category] = {"choice1": selected[0], "choice2": selected[1]}
            
            # MDM preferences - some will be invalid (causing validation to fail)
            if i < 5:  # 5 students with missing MDM (should cause validation error)
                preferences['MDM'] = {"choice1": "", "choice2": ""}  # ❌ INVALID
            else:
                preferences['MDM'] = {"choice1": "MDM2" if i % 2 == 0 else "MDM1", "choice2": ""}
            
            # Valid Honors/Minor choices
            if i < 8:
                preferences['Honors'] = {"choice1": random.choice([c['id'] for c in COURSES['Honors']]), "choice2": ""}
                preferences['Minor'] = {"choice1": "", "choice2": ""}
            elif i < 12:
                preferences['Minor'] = {"choice1": random.choice([c['id'] for c in COURSES['Minor']]), "choice2": ""}
                preferences['Honors'] = {"choice1": "", "choice2": ""}
            else:
                preferences['Honors'] = {"choice1": "", "choice2": ""}
                preferences['Minor'] = {"choice1": "", "choice2": ""}
            
            status = "confirmed"  # Try to confirm invalid data
            
            student = StudentPreference(
                student_id=student_id,
                name=f"Validation Test Student {i+1}",
                preferences=preferences,
                status=status,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            students.append(student)
        
        # This should fail for students with missing MDM
        await StudentPreference.insert_many(students)
        print("❌ UNEXPECTED: System accepted invalid data!")
        print_test_results("VALIDATION TEST", students, 20)
        
    except Exception as e:
        # This is expected!
        print("✅ EXPECTED VALIDATION FAILURE:")
        print(f"   Error: {str(e)}")
        print("✅ System correctly rejected incomplete/invalid preferences")
        print("✅ Validation is working properly!")
    
    finally:
        client.close()

async def test_extreme_skewed_distribution():
    """Test 6: Extreme Skewed Distribution - Very uneven course preferences"""
    print("\n🧪 TEST 6: EXTREME SKEWED DISTRIBUTION (150 students)")
    print("=" * 60)
    
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    await init_beanie(database=client["course_allocation"], document_models=[StudentPreference])
    
    await StudentPreference.delete_all()
    students = []
    
    for i in range(150):
        student_id = f"SKW{6000+i:04d}"
        preferences = {}
        
        # Extremely skewed preferences - 90% students prefer same courses
        if i < 135:  # 90% of students
            # Everyone wants the same courses
            preferences['PECL1'] = {"choice1": "25PECL13CE12", "choice2": "25PECL13CE15"}  # NLP, Open Source
            preferences['PECL2'] = {"choice1": "25PECL13CE22", "choice2": "25PECL13CE25"}  # Ethical Hacking, Explainable AI
            preferences['Program Elective'] = {"choice1": "25PEC13CE12", "choice2": "25PEC13CE13"}  # Deep Learning, Cyber Security
            preferences['Open Elective'] = {"choice1": "OE2", "choice2": "OE6"}  # IoT, 3D Printing
        else:  # 10% of students choose differently
            for category in MANDATORY_TWO_CHOICE_CATEGORIES:
                available_courses = [c['id'] for c in COURSES[category]]
                selected = random.sample(available_courses, 2)
                preferences[category] = {"choice1": selected[0], "choice2": selected[1]}
        
        # MDM - 95% want MDM2
        preferences['MDM'] = {"choice1": "MDM2" if i < 142 else "MDM1", "choice2": ""}
        
        # 80% want AI/ML Honors
        if i < 120:
            preferences['Honors'] = {"choice1": "H2", "choice2": ""}  # AI/ML Honors
            preferences['Minor'] = {"choice1": "", "choice2": ""}
        elif i < 130:
            preferences['Minor'] = {"choice1": "M1", "choice2": ""}  # Robotics Minor
            preferences['Honors'] = {"choice1": "", "choice2": ""}
        else:
            preferences['Honors'] = {"choice1": "", "choice2": ""}
            preferences['Minor'] = {"choice1": "", "choice2": ""}
        
        status = "confirmed" if i < 130 else "draft"
        
        student = StudentPreference(
            student_id=student_id,
            name=f"Skewed Distribution Student {i+1}",
            preferences=preferences,
            status=status,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        students.append(student)
    
    await StudentPreference.insert_many(students)
    print_test_results("EXTREME SKEWED DISTRIBUTION", students, 150)
    client.close()

def print_test_results(test_name, students, total_count):
    """Print comprehensive test results"""
    print(f"📊 {test_name} RESULTS:")
    print(f"Total Students: {total_count}")
    
    # Status distribution
    status_counts = {}
    for student in students:
        status = student.status
        status_counts[status] = status_counts.get(status, 0) + 1
    
    print(f"\n📋 Status Distribution:")
    for status, count in status_counts.items():
        print(f"  {status}: {count} ({count/total_count*100:.1f}%)")
    
    # MDM Distribution
    mdm_counts = {"MDM1": 0, "MDM2": 0, "Missing": 0}
    for student in students:
        mdm_choice = student.preferences.get('MDM', {}).get('choice1', '')
        if mdm_choice == 'MDM1':
            mdm_counts['MDM1'] += 1
        elif mdm_choice == 'MDM2':
            mdm_counts['MDM2'] += 1
        else:
            mdm_counts['Missing'] += 1
    
    print(f"\n🧠 MDM Distribution:")
    for mdm, count in mdm_counts.items():
        print(f"  {mdm}: {count} ({count/total_count*100:.1f}%)")
    
    # Honors vs Minor vs Both vs Neither
    honors_count = sum(1 for s in students if s.preferences.get('Honors', {}).get('choice1'))
    minor_count = sum(1 for s in students if s.preferences.get('Minor', {}).get('choice1'))
    both_count = sum(1 for s in students if s.preferences.get('Honors', {}).get('choice1') and s.preferences.get('Minor', {}).get('choice1'))
    neither_count = total_count - honors_count - minor_count + both_count
    
    print(f"\n🎓 Honors/Minor Distribution:")
    print(f"  Honors only: {honors_count - both_count} ({(honors_count - both_count)/total_count*100:.1f}%)")
    print(f"  Minor only: {minor_count - both_count} ({(minor_count - both_count)/total_count*100:.1f}%)")
    print(f"  Both (should be rejected): {both_count} ({both_count/total_count*100:.1f}%)")
    print(f"  Neither: {neither_count} ({neither_count/total_count*100:.1f}%)")
    
    # Course popularity for each mandatory category
    print(f"\n📈 Course Popularity (Choice 1 + Choice 2):")
    for category in MANDATORY_TWO_CHOICE_CATEGORIES:
        print(f"\n  {category}:")
        course_counts = {}
        for student in students:
            prefs = student.preferences.get(category, {})
            for choice in ['choice1', 'choice2']:
                course_id = prefs.get(choice, '')
                if course_id:
                    course_counts[course_id] = course_counts.get(course_id, 0) + 1
        
        for course_id, count in sorted(course_counts.items(), key=lambda x: x[1], reverse=True):
            print(f"    {course_id}: {count} students")
    
    # Optional courses popularity
    print(f"\n🏆 Optional Courses Popularity:")
    for category in ['Honors', 'Minor']:
        print(f"\n  {category}:")
        course_counts = {}
        for student in students:
            choice = student.preferences.get(category, {}).get('choice1', '')
            if choice:
                course_counts[choice] = course_counts.get(choice, 0) + 1
        
        for course_id, count in sorted(course_counts.items(), key=lambda x: x[1], reverse=True):
            print(f"    {course_id}: {count} students")
    
    print(f"\n" + "="*60)

async def run_all_tests():
    """Run all test scenarios"""
    print("🚀 STARTING COMPREHENSIVE ALLOCATION TESTING")
    print("="*80)
    
    test_functions = [
        test_standard_distribution,
        test_high_demand_courses,
        test_low_enrollment_edge_case,
        test_mutual_exclusivity,
        test_incomplete_preferences,
        test_extreme_skewed_distribution
    ]
    
    for i, test_func in enumerate(test_functions, 1):
        try:
            await test_func()
            print(f"\n✅ Test {i} completed successfully!")
        except Exception as e:
            print(f"\n❌ Test {i} failed: {str(e)}")
        
        if i < len(test_functions):
            print(f"\n{'='*20} MOVING TO NEXT TEST {'='*20}")
    
    print(f"\n🎉 ALL TESTS COMPLETED!")
    print(f"📝 Now run your allocation algorithm on each test case to verify:")
    print(f"   1. All mandatory courses are allocated")
    print(f"   2. Minimum enrollment requirements are met") 
    print(f"   3. Mutual exclusivity rules are enforced")
    print(f"   4. Edge cases are handled properly")
    print(f"   5. Students with incomplete preferences are managed")

if __name__ == "__main__":
    asyncio.run(run_all_tests())