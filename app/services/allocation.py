from typing import List, Dict, Set, Tuple
from datetime import datetime
import logging
import uuid
from collections import defaultdict

from ..api.models import (
    StudentPreference, 
    AllocationResponse, 
    StudentAllocation, 
    CourseEnrollment,
    CourseCategory
)
from ..core.exceptions import CourseAllocationException

logger = logging.getLogger("course_allocation_service")

# Constants
MIN_ENROLLMENT = 20
VALID_MDM_COURSES = ["MDM1", "MDM2"]

# Mandatory categories - each student MUST get one course from each
MANDATORY_CATEGORIES = ["PECL1", "PECL2", "Program Elective", "Open Elective", "MDM"]

# Optional categories - no minimum enrollment required
OPTIONAL_CATEGORIES = {"Honors", "Minor"}

def validate_student_preferences(preferences: List[StudentPreference]) -> List[StudentPreference]:
    """Validate student preferences before allocation"""
    validated = []
    invalid_students = []
    
    for pref in preferences:
        try:
            # Check MDM selection
            mdm_prefs = pref.preferences.get("MDM", {})
            mdm_choice1 = str(mdm_prefs.get("choice1", "")).strip()
            
            if not mdm_choice1 or mdm_choice1 not in VALID_MDM_COURSES:
                invalid_students.append(pref.student_id)
                logger.warning(f"Invalid MDM selection for student {pref.student_id}: {mdm_choice1}")
                continue
                
            # Check that student has preferences for all mandatory categories
            missing_categories = []
            for category in MANDATORY_CATEGORIES:
                choices = pref.preferences.get(category, {})
                choice1 = str(choices.get("choice1", "")).strip()
                if not choice1:
                    missing_categories.append(category)
            
            if missing_categories:
                logger.warning(f"Student {pref.student_id} missing choices for: {', '.join(missing_categories)}")
                # Still include them but log the issue
                
            # Validate preferences structure
            for category, choices in pref.preferences.items():
                if not isinstance(choices, dict):
                    logger.warning(f"Invalid preference format for {pref.student_id} in {category}")
                    continue
                    
                # Ensure choices are strings
                choices["choice1"] = str(choices.get("choice1", "")).strip()
                choices["choice2"] = str(choices.get("choice2", "")).strip()
            
            validated.append(pref)
            
        except Exception as e:
            logger.error(f"Error validating preferences for {pref.student_id}: {str(e)}")
            invalid_students.append(pref.student_id)
    
    if invalid_students:
        logger.error(f"Found {len(invalid_students)} invalid preferences: {', '.join(invalid_students)}")
    
    return validated

def allocate_mandatory_courses(
    preferences: List[StudentPreference],
    course_enrollments: Dict[str, CourseEnrollment]
) -> Tuple[List[StudentAllocation], List[str]]:
    """Allocate courses for all mandatory categories"""
    student_allocations = []
    issues = []
    
    for student in preferences:
        allocation = StudentAllocation(
            student_id=student.student_id,
            name=student.name,
            allocations={},
            issues=[]
        )
        
        # Process each mandatory category
        for category in MANDATORY_CATEGORIES:
            choices = student.preferences.get(category, {})
            choice1 = str(choices.get("choice1", "")).strip()
            
            if not choice1:
                allocation.issues.append(f"No first choice provided for mandatory category {category}")
                continue
                
            # Initialize course if it doesn't exist
            if choice1 not in course_enrollments:
                course_enrollments[choice1] = CourseEnrollment(
                    course_id=choice1,
                    min_enrollment=MIN_ENROLLMENT,  # 20 for mandatory courses
                    enrolled=0,
                    students=[]
                )
                
            # Allocate to first choice
            course = course_enrollments[choice1]
            course.students.append(student.student_id)
            course.enrolled += 1
            allocation.allocations[category] = choice1
            logger.debug(f"Allocated {choice1} to {student.student_id} for {category}")
        
        student_allocations.append(allocation)
        
    return student_allocations, issues

def reallocate_underenrolled_courses(
    student_allocations: List[StudentAllocation],
    preferences: List[StudentPreference],
    course_enrollments: Dict[str, CourseEnrollment]
) -> List[str]:
    """Reallocate students from underenrolled mandatory courses to their second choices"""
    
    # Find underenrolled mandatory courses
    underenrolled_courses = set()
    for course_id, course in course_enrollments.items():
        if course.enrolled < course.min_enrollment and course.min_enrollment > 0:
            underenrolled_courses.add(course_id)
    
    issues = []
    if not underenrolled_courses:
        return issues
        
    logger.info(f"Found {len(underenrolled_courses)} underenrolled courses: {underenrolled_courses}")
    
    # Create student preference lookup
    pref_lookup = {pref.student_id: pref for pref in preferences}
    
    for student_alloc in student_allocations:
        student_pref = pref_lookup.get(student_alloc.student_id)
        if not student_pref:
            continue
            
        # Check each mandatory category allocation
        for category in MANDATORY_CATEGORIES:
            allocated_course = student_alloc.allocations.get(category)
            
            if allocated_course and allocated_course in underenrolled_courses:
                # Try to reallocate to second choice
                choices = student_pref.preferences.get(category, {})
                second_choice = str(choices.get("choice2", "")).strip()
                
                if second_choice:
                    # Initialize second choice course if needed
                    if second_choice not in course_enrollments:
                        course_enrollments[second_choice] = CourseEnrollment(
                            course_id=second_choice,
                            min_enrollment=MIN_ENROLLMENT,
                            enrolled=0,
                            students=[]
                        )
                    
                    # Remove from first choice
                    old_course = course_enrollments[allocated_course]
                    old_course.students.remove(student_alloc.student_id)
                    old_course.enrolled -= 1
                    
                    # Add to second choice
                    new_course = course_enrollments[second_choice]
                    new_course.students.append(student_alloc.student_id)
                    new_course.enrolled += 1
                    
                    # Update allocation
                    student_alloc.allocations[category] = second_choice
                    student_alloc.issues.append(
                        f"Reallocated from {allocated_course} to {second_choice} in {category} due to insufficient enrollment"
                    )
                    logger.info(f"Reallocated {student_alloc.student_id}: {allocated_course} → {second_choice}")
                    
                else:
                    # No second choice - this is a problem for mandatory categories
                    student_alloc.issues.append(
                        f"CRITICAL: Cannot reallocate from {allocated_course} in mandatory {category} - no second choice"
                    )
                    logger.error(f"Cannot reallocate {student_alloc.student_id} from {allocated_course} in {category}")
    
    # Remove courses that still don't meet minimum enrollment
    final_underenrolled = []
    for course_id, course in list(course_enrollments.items()):
        if course.enrolled < course.min_enrollment and course.min_enrollment > 0:
            final_underenrolled.append(course_id)
            issues.append(f"Course {course_id} canceled due to insufficient enrollment ({course.enrolled}/{course.min_enrollment})")
            del course_enrollments[course_id]
    
    if final_underenrolled:
        logger.warning(f"Final canceled courses: {final_underenrolled}")
    
    return issues

def ensure_complete_allocation(
    student_allocations: List[StudentAllocation],
    preferences: List[StudentPreference],
    course_enrollments: Dict[str, CourseEnrollment]
) -> List[str]:
    """Ensure each student has all 5 mandatory courses allocated"""
    
    issues = []
    pref_lookup = {pref.student_id: pref for pref in preferences}
    
    for student_alloc in student_allocations:
        missing_categories = []
        
        # Check which mandatory categories are missing
        for category in MANDATORY_CATEGORIES:
            if category not in student_alloc.allocations:
                missing_categories.append(category)
        
        if missing_categories:
            logger.warning(f"Student {student_alloc.student_id} missing allocations for: {', '.join(missing_categories)}")
            
            # Try to allocate to any available course in missing categories
            student_pref = pref_lookup.get(student_alloc.student_id)
            if student_pref:
                for category in missing_categories:
                    choices = student_pref.preferences.get(category, {})
                    
                    # Try choice1, then choice2
                    allocated = False
                    for choice_key in ["choice1", "choice2"]:
                        course_choice = str(choices.get(choice_key, "")).strip()
                        if not course_choice:
                            continue
                            
                        # Check if this course still exists (wasn't canceled)
                        if course_choice in course_enrollments:
                            # Allocate to this course
                            course_enrollments[course_choice].students.append(student_alloc.student_id)
                            course_enrollments[course_choice].enrolled += 1
                            student_alloc.allocations[category] = course_choice
                            student_alloc.issues.append(f"Late allocation to {course_choice} in {category}")
                            logger.info(f"Late allocation: {student_alloc.student_id} to {course_choice} in {category}")
                            allocated = True
                            break
                    
                    if not allocated:
                        issues.append(f"CRITICAL: Student {student_alloc.student_id} could not be allocated to {category}")
                        student_alloc.issues.append(f"FAILED to allocate {category}")
    
    return issues

def allocate_optional_courses(
    student_allocations: List[StudentAllocation],
    preferences: List[StudentPreference],
    course_enrollments: Dict[str, CourseEnrollment]
) -> List[str]:
    """Allocate optional courses (Honors XOR Minor) with NO minimum enrollment"""
    
    issues = []
    
    for i, student in enumerate(preferences):
        student_alloc = student_allocations[i]
        
        # Check Honors and Minor preferences
        honors_choices = student.preferences.get("Honors", {})
        minor_choices = student.preferences.get("Minor", {})
        
        honors_choice1 = str(honors_choices.get("choice1", "")).strip()
        minor_choice1 = str(minor_choices.get("choice1", "")).strip()
        
        # Apply mutual exclusivity rule
        if honors_choice1 and minor_choice1:
            # Student chose both - prioritize Honors, reject Minor
            student_alloc.issues.append("Cannot choose both Honors and Minor - allocated to Honors only")
            issues.append(f"Student {student.student_id} chose both Honors and Minor - allocated Honors only")
            
            # Allocate only Honors (NO minimum enrollment)
            if honors_choice1 not in course_enrollments:
                course_enrollments[honors_choice1] = CourseEnrollment(
                    course_id=honors_choice1,
                    min_enrollment=0,  # NO minimum enrollment for Honors
                    enrolled=0,
                    students=[]
                )
            
            course_enrollments[honors_choice1].students.append(student.student_id)
            course_enrollments[honors_choice1].enrolled += 1
            student_alloc.allocations["Honors"] = honors_choice1
            logger.info(f"Allocated Honors {honors_choice1} to {student.student_id} (rejected Minor)")
            
        elif honors_choice1:
            # Only Honors chosen (NO minimum enrollment)
            if honors_choice1 not in course_enrollments:
                course_enrollments[honors_choice1] = CourseEnrollment(
                    course_id=honors_choice1,
                    min_enrollment=0,  # NO minimum enrollment
                    enrolled=0,
                    students=[]
                )
            
            course_enrollments[honors_choice1].students.append(student.student_id)
            course_enrollments[honors_choice1].enrolled += 1
            student_alloc.allocations["Honors"] = honors_choice1
            logger.debug(f"Allocated Honors {honors_choice1} to {student.student_id}")
            
        elif minor_choice1:
            # Only Minor chosen (NO minimum enrollment)
            if minor_choice1 not in course_enrollments:
                course_enrollments[minor_choice1] = CourseEnrollment(
                    course_id=minor_choice1,
                    min_enrollment=0,  # NO minimum enrollment
                    enrolled=0,
                    students=[]
                )
            
            course_enrollments[minor_choice1].students.append(student.student_id)
            course_enrollments[minor_choice1].enrolled += 1
            student_alloc.allocations["Minor"] = minor_choice1
            logger.debug(f"Allocated Minor {minor_choice1} to {student.student_id}")
    
    return issues

def get_course_name(course_id: str) -> str:
    """Get readable course names"""
    course_names = {
        # PECL1 courses
        '25PECL13CE11': 'Image Processing Lab',
        '25PECL13CE12': 'Natural Language Processing Lab',
        '25PECL13CE13': 'IIOT Lab',
        '25PECL13CE14': 'Innovative Product Development Lab-Phase1',
        '25PECL13CE15': 'Open-Source Intelligence Lab',
        
        # PECL2 courses  
        '25PECL13CE21': 'Social Media Analytics Lab',
        '25PECL13CE22': 'Ethical Hacking Lab',
        '25PECL13CE23': 'DevOps Lab',
        '25PECL13CE24': 'Innovative Product Development Lab-Phase2',
        '25PECL13CE25': 'Explainable AI Lab',
        '25PECL13CE26': 'Software Testing Lab',
        
        # Program Electives
        '25PEC13CE11': 'Blockchain Technology',
        '25PEC13CE12': 'Deep Learning and Reinforcement Learning',
        '25PEC13CE13': 'Cyber Security',
        '25PEC13CE14': 'Big Data Analytics',
        '25PEC13CE15': 'Computer Graphics',
        '25PEC13CE16': 'HMI',
        '25PEC13CE17': 'Geographical Information Systems',
        
        # Open Electives
        'OE1': 'Advanced Microprocessor',
        'OE2': 'Internet of Things',
        'OE3': 'E-Vehicle',
        'OE4': 'Supply Chain Management',
        'OE5': 'Design of Experiments',
        'OE6': '3D Printing',
        
        # Honors
        'H1': 'IoT Honors',
        'H2': 'AI/ML Honors', 
        'H3': 'Data Science Honors',
        'H4': 'Blockchain Honors',
        'H5': 'Cybersecurity Honors',
        
        # Minor
        'M1': 'Robotics Minor',
        'M2': '3D Printing Minor',
        
        # MDM
        'MDM1': 'Emotional and Spiritual Intelligence',
        'MDM2': 'Health, Wellness and Psychology'
    }
    
    return course_names.get(course_id, course_id)

def allocate_courses(preferences: List[StudentPreference]) -> AllocationResponse:
    """Main allocation function with Honors/Minor mutual exclusivity"""
    try:
        allocation_id = str(uuid.uuid4())
        logger.info(f"Starting allocation with mutual exclusivity rules {allocation_id}")
        
        # Validate preferences
        valid_preferences = validate_student_preferences(preferences)
        if not valid_preferences:
            raise CourseAllocationException("No valid preferences found")
            
        logger.info(f"Processing {len(valid_preferences)} valid preferences")
        
        # Initialize tracking
        course_enrollments: Dict[str, CourseEnrollment] = {}
        issues: List[str] = []
        
        # Phase 1: Allocate mandatory courses (5 required courses)
        student_allocations, allocation_issues = allocate_mandatory_courses(
            valid_preferences, 
            course_enrollments
        )
        issues.extend(allocation_issues)
        logger.info(f"Phase 1: Mandatory allocation completed")
        
        # Phase 2: Handle underenrolled mandatory courses
        reallocation_issues = reallocate_underenrolled_courses(
            student_allocations,
            valid_preferences,
            course_enrollments
        )
        issues.extend(reallocation_issues)
        logger.info(f"Phase 2: Reallocation completed")
        
        # Phase 3: Allocate optional courses (Honors XOR Minor)
        optional_issues = allocate_optional_courses(
            student_allocations,
            valid_preferences,
            course_enrollments
        )
        issues.extend(optional_issues)
        logger.info(f"Phase 3: Optional courses allocated with mutual exclusivity")
        
        # Phase 4: Ensure complete mandatory allocation
        completion_issues = ensure_complete_allocation(
            student_allocations,
            valid_preferences,
            course_enrollments
        )
        issues.extend(completion_issues)
        logger.info(f"Phase 4: Completion check done")
        
        # Phase 5: Generate comprehensive statistics
        total_allocations = sum(len(student.allocations) for student in student_allocations)
        
        # Count allocations per mandatory category
        category_stats = {}
        for category in MANDATORY_CATEGORIES:
            allocated_count = sum(
                1 for student in student_allocations 
                if category in student.allocations
            )
            category_stats[category] = f"{allocated_count}/{len(student_allocations)}"
        
        # Count optional allocations
        for category in OPTIONAL_CATEGORIES:
            allocated_count = sum(
                1 for student in student_allocations 
                if category in student.allocations
            )
            category_stats[category] = f"{allocated_count}/{len(student_allocations)}"
        
        # Students with complete allocation (all 5 mandatory)
        complete_students = sum(
            1 for student in student_allocations 
            if all(cat in student.allocations for cat in MANDATORY_CATEGORIES)
        )
        
        # Phase 5: Log final comprehensive results
        logger.info(f"=== ALLOCATION COMPLETED ===")
        logger.info(f"Students processed: {len(student_allocations)}")
        logger.info(f"Total course allocations: {total_allocations}")
        logger.info(f"Students with complete allocation (5 courses): {complete_students}/{len(student_allocations)}")
        logger.info(f"Category allocation rates:")
        for category, stats in category_stats.items():
            logger.info(f"  - {category}: {stats}")
        logger.info(f"Active courses: {len(course_enrollments)}")
        logger.info(f"Issues reported: {len(issues)}")
        
        return AllocationResponse(
            allocation_id=allocation_id,
            student_allocations=student_allocations,
            course_summaries=course_enrollments,
            issues=issues
        )
        
    except CourseAllocationException:
        raise
    except Exception as e:
        error_msg = f"Unexpected error during allocation: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise CourseAllocationException(error_msg)