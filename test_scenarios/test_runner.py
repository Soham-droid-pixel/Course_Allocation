import asyncio
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.services.allocation import allocate_courses
from app.db.models import StudentPreference
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

async def run_allocation_test():
    """Run allocation on current database and show results"""
    print("🔄 RUNNING ALLOCATION TEST ON CURRENT DATA")
    print("="*60)
    
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    await init_beanie(database=client["course_allocation"], document_models=[StudentPreference])
    
    # Get all confirmed preferences
    preferences = await StudentPreference.find({"status": "confirmed"}).to_list()
    
    if not preferences:
        print("❌ No confirmed preferences found!")
        client.close()
        return
    
    print(f"📊 Found {len(preferences)} confirmed student preferences")
    
    # Show test scenario being analyzed
    print(f"\n🔍 ANALYZING TEST SCENARIO:")
    sample_prefs = preferences[0].preferences if preferences else {}
    
    # Detect which test scenario this is based on student IDs
    student_id = preferences[0].student_id if preferences else ""
    if student_id.startswith("STD"):
        print("📋 Test Scenario: STANDARD DISTRIBUTION")
        expected_success = "95-100%"
        expected_issues = "0-2"
    elif student_id.startswith("HID"):
        print("📋 Test Scenario: HIGH DEMAND COURSES")
        expected_success = "100%" 
        expected_issues = "0 (everyone gets choice1)"
    elif student_id.startswith("LOW"):
        print("📋 Test Scenario: LOW ENROLLMENT EDGE CASE")
        expected_success = "80-90%"
        expected_issues = "5-15 (course cancellations)"
    elif student_id.startswith("MUT"):
        print("📋 Test Scenario: MUTUAL EXCLUSIVITY TEST")
        expected_success = "100%"
        expected_issues = "0 (no invalid data created)"
    elif student_id.startswith("SKW"):
        print("📋 Test Scenario: EXTREME SKEWED DISTRIBUTION")
        expected_success = "100%"
        expected_issues = "0 (everyone gets popular courses)"
    else:
        print("📋 Test Scenario: UNKNOWN")
        expected_success = "varies"
        expected_issues = "varies"
    
    print(f"🎯 Expected Success Rate: {expected_success}")
    print(f"⚠️  Expected Issues: {expected_issues}")
    
    # Run allocation
    try:
        result = allocate_courses(preferences)
        
        print(f"\n🎯 ALLOCATION RESULTS:")
        print(f"Allocation ID: {result.allocation_id}")
        print(f"Students processed: {len(result.student_allocations)}")
        print(f"Courses running: {len(result.course_summaries)}")
        print(f"Issues found: {len(result.issues)}")
        
        # Detailed statistics
        mandatory_categories = ["PECL1", "PECL2", "Program Elective", "Open Elective", "MDM"]
        
        print(f"\n📈 MANDATORY COURSE ALLOCATION RATES:")
        for category in mandatory_categories:
            allocated = sum(1 for s in result.student_allocations if category in s.allocations)
            rate = (allocated / len(result.student_allocations)) * 100
            status = "✅" if rate >= 95 else "⚠️" if rate >= 80 else "❌"
            print(f"  {status} {category}: {allocated}/{len(result.student_allocations)} ({rate:.1f}%)")
        
        # Optional courses
        print(f"\n🏆 OPTIONAL COURSE ALLOCATION (No Minimum Required):")
        for category in ["Honors", "Minor"]:
            allocated = sum(1 for s in result.student_allocations if category in s.allocations)
            rate = (allocated / len(result.student_allocations)) * 100
            print(f"  ✅ {category}: {allocated}/{len(result.student_allocations)} ({rate:.1f}%) - Runs regardless of count")
        
        # Course enrollment summary
        print(f"\n📚 COURSE ENROLLMENT SUMMARY:")
        mandatory_courses = []
        optional_courses = []
        
        for course_id, enrollment in result.course_summaries.items():
            # Determine if course is optional (Honors/Minor) or mandatory
            if any(course_id.startswith(prefix) for prefix in ['H', 'M']):
                optional_courses.append((course_id, enrollment))
            else:
                mandatory_courses.append((course_id, enrollment))
        
        print(f"\n  📚 Mandatory Courses (Min 20 students required):")
        for course_id, enrollment in sorted(mandatory_courses, key=lambda x: x[1].enrolled, reverse=True):
            if enrollment.enrolled >= 20:
                status = "✅ RUNNING"
            else:
                status = "❌ CANCELED (underenrolled)"
            print(f"    {course_id}: {enrollment.enrolled} students {status}")
        
        print(f"\n  🏆 Optional Courses (No minimum, run if anyone enrolled):")
        for course_id, enrollment in sorted(optional_courses, key=lambda x: x[1].enrolled, reverse=True):
            if enrollment.enrolled > 0:
                status = "✅ RUNNING"
            else:
                status = "⭕ NOT CHOSEN"
            print(f"    {course_id}: {enrollment.enrolled} students {status}")
        
        # Issues summary with categorization
        if result.issues:
            print(f"\n⚠️  ISSUES FOUND ({len(result.issues)} total):")
            
            # Categorize issues
            reallocation_issues = [i for i in result.issues if "reallocated" in i.lower()]
            mutual_exclusivity_issues = [i for i in result.issues if "both honors and minor" in i.lower()]
            critical_issues = [i for i in result.issues if "CRITICAL" in i]
            other_issues = [i for i in result.issues if i not in reallocation_issues + mutual_exclusivity_issues + critical_issues]
            
            if reallocation_issues:
                print(f"  📍 Reallocation Issues ({len(reallocation_issues)}):")
                for issue in reallocation_issues[:3]:
                    print(f"    - {issue}")
                if len(reallocation_issues) > 3:
                    print(f"    ... and {len(reallocation_issues) - 3} more reallocation issues")
            
            if mutual_exclusivity_issues:
                print(f"  🚫 Mutual Exclusivity Issues ({len(mutual_exclusivity_issues)}):")
                for issue in mutual_exclusivity_issues[:3]:
                    print(f"    - {issue}")
                if len(mutual_exclusivity_issues) > 3:
                    print(f"    ... and {len(mutual_exclusivity_issues) - 3} more exclusivity issues")
            
            if critical_issues:
                print(f"  🚨 Critical Issues ({len(critical_issues)}):")
                for issue in critical_issues:
                    print(f"    - {issue}")
            
            if other_issues:
                print(f"  ℹ️  Other Issues ({len(other_issues)}):")
                for issue in other_issues[:3]:
                    print(f"    - {issue}")
                if len(other_issues) > 3:
                    print(f"    ... and {len(other_issues) - 3} more issues")
        else:
            print(f"\n✅ NO ISSUES FOUND!")
        
        # Students with problems
        students_with_issues = [s for s in result.student_allocations if s.issues]
        if students_with_issues:
            print(f"\n👥 STUDENTS WITH ISSUES: {len(students_with_issues)}")
            for student in students_with_issues[:5]:
                print(f"  {student.student_id}: {'; '.join(student.issues)}")
            if len(students_with_issues) > 5:
                print(f"  ... and {len(students_with_issues) - 5} more students with issues")
        
        # Success metrics
        complete_allocations = sum(1 for s in result.student_allocations 
                                 if all(cat in s.allocations for cat in mandatory_categories))
        success_rate = (complete_allocations / len(result.student_allocations)) * 100
        
        print(f"\n🎯 SUCCESS METRICS:")
        print(f"  Complete allocations (all 5 mandatory): {complete_allocations}/{len(result.student_allocations)} ({success_rate:.1f}%)")
        
        # Honors/Minor mutual exclusivity check
        mutual_exclusive_violations = sum(1 for s in result.student_allocations 
                                        if 'Honors' in s.allocations and 'Minor' in s.allocations)
        
        if mutual_exclusive_violations == 0:
            print(f"  ✅ Honors/Minor mutual exclusivity: ENFORCED (0 violations)")
        else:
            print(f"  ❌ Honors/Minor mutual exclusivity: {mutual_exclusive_violations} violations!")
        
        # Optional course participation
        students_with_honors = sum(1 for s in result.student_allocations if 'Honors' in s.allocations)
        students_with_minor = sum(1 for s in result.student_allocations if 'Minor' in s.allocations)
        students_with_neither = len(result.student_allocations) - students_with_honors - students_with_minor
        
        print(f"  📊 Optional course participation:")
        print(f"    Honors: {students_with_honors} students")
        print(f"    Minor: {students_with_minor} students") 
        print(f"    Neither: {students_with_neither} students (perfectly fine!)")
        
        # Course distribution analysis for skewed tests
        if student_id.startswith("SKW") or student_id.startswith("HID"):
            print(f"\n📊 COURSE DISTRIBUTION ANALYSIS:")
            print(f"  This test checks how system handles popular vs unpopular courses")
            
            # Count courses with different enrollment levels
            high_enrollment = sum(1 for _, e in result.course_summaries.items() if e.enrolled > 50)
            medium_enrollment = sum(1 for _, e in result.course_summaries.items() if 20 <= e.enrolled <= 50)
            low_enrollment = sum(1 for _, e in result.course_summaries.items() if 0 < e.enrolled < 20)
            zero_enrollment = len([c for c in ['25PECL13CE11', '25PECL13CE13', '25PECL13CE14'] if c not in result.course_summaries])
            
            print(f"    High enrollment (50+ students): {high_enrollment} courses")
            print(f"    Medium enrollment (20-50 students): {medium_enrollment} courses")  
            print(f"    Low enrollment (1-19 students): {low_enrollment} courses")
            print(f"    Zero enrollment (canceled): {zero_enrollment} courses")
            
        print(f"\n🏁 ALLOCATION COMPLETED SUCCESSFULLY!")
        
    except Exception as e:
        print(f"❌ ALLOCATION FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(run_allocation_test())