from collections import defaultdict
from typing import List, Dict, Set, Tuple
import logging

from app.api.models import (
    StudentPreference, StudentAllocation, CourseEnrollment, 
    AllocationResponse, CourseCategory
)
from app.core.config import settings
from app.core.exceptions import CourseAllocationException

logger = logging.getLogger("course_allocation_service")

def allocate_courses(students: List[StudentPreference]) -> AllocationResponse:
    """
    Main course allocation logic.
    
    Allocates courses to students based on preferences with priority rules:
    1. First choice is prioritized over second choice
    2. Minimum enrollment criteria must be met
    3. MDM is mandatory
    4. Honors and minors are optional
    
    Returns complete allocation results with student and course summaries.
    """
    # Validate input
    if not students:
        raise CourseAllocationException("No students provided for allocation")
    
    logger.info(f"Starting course allocation for {len(students)} students")
    
    # Initialize tracking structures
    choice1_requests = defaultdict(list)  # course_id -> [student_ids]
    choice2_requests = defaultdict(list)  # course_id -> [student_ids]
    student_allocations = {}  # student_id -> StudentAllocation object
    course_enrollments = {}   # course_id -> CourseEnrollment object
    issues = []
    
    # Step 1: Create allocation objects for each student
    for student in students:
        student_allocations[student.student_id] = StudentAllocation(
            student_id=student.student_id,
            name=student.name,
            allocations={},
            issues=[]
        )
    
    # Step 2: Collect all course choices
    for student in students:
        for category, choices in student.preferences.items():
            if choices.choice1:
                choice1_requests[choices.choice1].append(student.student_id)
            if choices.choice2:
                choice2_requests[choices.choice2].append(student.student_id)
    
    # Initialize course enrollment objects
    all_courses = set(list(choice1_requests.keys()) + list(choice2_requests.keys()))
    for course_id in all_courses:
        course_enrollments[course_id] = CourseEnrollment(course_id=course_id)
    
    # Step 3: Process allocations category by category
    for category in CourseCategory:
        logger.info(f"Processing allocations for category: {category}")
        
        process_category_allocation(
            category=category,
            students=students,
            student_allocations=student_allocations,
            course_enrollments=course_enrollments,
            choice1_requests=choice1_requests,
            choice2_requests=choice2_requests,
            issues=issues
        )
    
    # Step 4: Convert to response model
    return AllocationResponse(
        student_allocations=list(student_allocations.values()),
        course_summaries=course_enrollments,
        issues=issues
    )

def process_category_allocation(
    category: CourseCategory,
    students: List[StudentPreference],
    student_allocations: Dict[str, StudentAllocation],
    course_enrollments: Dict[str, CourseEnrollment],
    choice1_requests: Dict[str, List[str]],
    choice2_requests: Dict[str, List[str]],
    issues: List[str]
):
    """
    Process allocations for a specific course category.
    """
    # First pass: Try to allocate first choices
    allocated_students = set()
    
    # Collect all first choices for this category
    category_choice1 = defaultdict(list)
    category_choice2 = defaultdict(list)
    
    for student in students:
        if category in student.preferences:
            choices = student.preferences[category]
            if choices.choice1:
                category_choice1[choices.choice1].append(student.student_id)
            if choices.choice2:
                category_choice2[choices.choice2].append(student.student_id)
    
    # Determine which courses meet minimum enrollment with first choices
    viable_courses = {
        course_id: student_ids
        for course_id, student_ids in category_choice1.items()
        if len(student_ids) >= settings.MIN_COURSE_ENROLLMENT
    }
    
    # Allocate first choices for viable courses
    for course_id, student_ids in viable_courses.items():
        for student_id in student_ids:
            allocate_student_to_course(
                student_id=student_id,
                course_id=course_id,
                category=category,
                student_allocations=student_allocations,
                course_enrollments=course_enrollments
            )
            allocated_students.add(student_id)
    
    # Second pass: Try to allocate second choices for unallocated students
    for student in students:
        if (
            category in student.preferences and
            student.student_id not in allocated_students and
            student.preferences[category].choice2
        ):
            second_choice = student.preferences[category].choice2
            second_choice_count = len(category_choice2[second_choice])
            
            # If second choice meets minimum enrollment, allocate it
            if second_choice_count >= settings.MIN_COURSE_ENROLLMENT:
                allocate_student_to_course(
                    student_id=student.student_id,
                    course_id=second_choice,
                    category=category,
                    student_allocations=student_allocations,
                    course_enrollments=course_enrollments
                )
                allocated_students.add(student.student_id)
            else:
                # Record issue for courses not meeting minimum enrollment
                issue = f"Course {second_choice} in category {category} has insufficient enrollment ({second_choice_count}/{settings.MIN_COURSE_ENROLLMENT})"
                if issue not in issues:
                    issues.append(issue)
    
    # Third pass: Handle unallocated mandatory courses
    if category == CourseCategory.MDM:
        for student in students:
            if student.student_id not in allocated_students:
                student_alloc = student_allocations[student.student_id]
                student_alloc.issues.append(f"No MDM course allocated - choices didn't meet minimum enrollment")
                issues.append(f"Student {student.student_id} ({student.name}) has no MDM allocation")
    
    # Optional categories don't need special handling if not allocated

def allocate_student_to_course(
    student_id: str,
    course_id: str,
    category: CourseCategory,
    student_allocations: Dict[str, StudentAllocation],
    course_enrollments: Dict[str, CourseEnrollment]
):
    """
    Allocate a specific student to a course and update tracking structures.
    """
    # Update student allocation
    student_allocations[student_id].allocations[category] = course_id
    
    # Update course enrollment
    course = course_enrollments[course_id]
    course.enrolled += 1
    course.students.append(student_id)
    
    logger.debug(f"Allocated student {student_id} to course {course_id} in category {category}")
