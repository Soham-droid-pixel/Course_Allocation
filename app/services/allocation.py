import logging
from typing import Dict, List, Set, Optional
from collections import defaultdict
from datetime import datetime

from ..api.models import (
    StudentPreference, 
    AllocationResponse, 
    StudentAllocation, 
    CourseEnrollment, 
    CourseCategory
)
from ..core.exceptions import CourseAllocationException
from app.utils.validation import validate_mdm_selection, validate_student_preferences, validate_student_data_integrity

logger = logging.getLogger("course_allocation_service")

# Course capacity and minimum enrollment configuration
COURSE_CONFIG = {
    "default_capacity": 60,
    "min_enrollment": 20,
}

def allocate_courses(students: List[StudentPreference]) -> AllocationResponse:
    """
    Main allocation function that processes all students in batch.
    
    Args:
        students: List of all student preferences
        
    Returns:
        AllocationResponse with complete allocation results
    """
    logger.info(f"Starting batch allocation for {len(students)} students")
    
    # Debug: Log data structure
    if students:
        sample = students[0]
        logger.info(f"Sample student type: {type(sample)}")
        logger.info(f"Sample student attributes: {dir(sample)}")
        if hasattr(sample, 'preferences'):
            logger.info(f"Sample preferences type: {type(sample.preferences)}")
            logger.info(f"Sample preferences: {sample.preferences}")
        if hasattr(sample, 'status'):
            logger.info(f"Sample status: {sample.status}")
    
    # Filter students - only process confirmed students
    confirmed_students = []
    validation_issues = []
    
    for student in students:
        student_id = getattr(student, 'student_id', 'Unknown')
        status = getattr(student, 'status', 'draft')
        
        # Only process confirmed students
        if status != 'confirmed':
            logger.debug(f"Skipping student {student_id} with status: {status}")
            continue
            
        # Validate that student has preferences
        if not hasattr(student, 'preferences') or not student.preferences:
            issue = f"Student {student_id}: No preferences found despite confirmed status"
            validation_issues.append(issue)
            continue
            
        # Check MDM preference specifically
        mdm_prefs = student.preferences.get('MDM', {})
        mdm_choice1 = ''
        
        if isinstance(mdm_prefs, dict):
            mdm_choice1 = str(mdm_prefs.get('choice1', '')).strip()
        
        if not mdm_choice1:
            issue = f"Student {student_id}: Missing MDM first choice despite confirmed status"
            validation_issues.append(issue)
            continue
            
        confirmed_students.append(student)
    
    logger.info(f"Processing {len(confirmed_students)} confirmed students out of {len(students)} total")
    
    if not confirmed_students:
        return AllocationResponse(
            student_allocations=[],
            course_summaries={},
            issues=validation_issues + ["No confirmed students found for allocation"]
        )
    
    # Pre-validation checks on confirmed students only
    try:
        # Check data integrity
        integrity_issues = validate_student_data_integrity(confirmed_students)
        if integrity_issues:
            logger.warning(f"Data integrity issues found: {len(integrity_issues)}")
            validation_issues.extend(integrity_issues)
        
        # Validate MDM selections for confirmed students
        validate_mdm_selection(confirmed_students)
        logger.info("MDM validation passed for confirmed students")
        
        # Get general validation issues
        general_issues = validate_student_preferences(confirmed_students)
        validation_issues.extend(general_issues)
        
    except CourseAllocationException as e:
        logger.error(f"Validation failed: {str(e)}")
        return AllocationResponse(
            student_allocations=[],
            course_summaries={},
            issues=validation_issues + [f"Validation Error: {str(e)}"]
        )
    except Exception as e:
        logger.error(f"Unexpected error during validation: {str(e)}")
        return AllocationResponse(
            student_allocations=[],
            course_summaries={},
            issues=validation_issues + [f"Unexpected validation error: {str(e)}"]
        )
    
    # Initialize tracking structures
    course_enrollments = defaultdict(lambda: {
        "enrolled": [],
        "capacity": COURSE_CONFIG["default_capacity"],
        "min_enrollment": COURSE_CONFIG["min_enrollment"]
    })
    
    student_allocations = {}
    allocation_issues = validation_issues.copy()
    
    # Phase 1: Allocate first choices
    logger.info("Phase 1: Processing first choices")
    _allocate_first_choices(confirmed_students, course_enrollments, student_allocations, allocation_issues)
    
    # Phase 2: Allocate second choices for unallocated students
    logger.info("Phase 2: Processing second choices")
    _allocate_second_choices(confirmed_students, course_enrollments, student_allocations, allocation_issues)
    
    # Phase 3: Handle minimum enrollment requirements
    logger.info("Phase 3: Checking minimum enrollment requirements")
    canceled_courses = _handle_minimum_enrollment(course_enrollments, allocation_issues)
    
    # Phase 4: Reallocate students from canceled courses
    if canceled_courses:
        logger.info(f"Phase 4: Reallocating students from {len(canceled_courses)} canceled courses")
        _reallocate_canceled_courses(canceled_courses, confirmed_students, course_enrollments, 
                                   student_allocations, allocation_issues)
    
    # Build final response
    response = _build_allocation_response(course_enrollments, student_allocations, allocation_issues)
    
    logger.info(f"Allocation completed. Total issues: {len(allocation_issues)}")
    return response


def _allocate_first_choices(students: List[StudentPreference], 
                          course_enrollments: Dict, 
                          student_allocations: Dict, 
                          issues: List[str]) -> None:
    """Allocate first choices for all students"""
    
    for student in students:
        # Safely get student ID
        student_id = getattr(student, 'student_id', 'Unknown')
        student_name = getattr(student, 'name', 'Unknown')
        
        student_allocations[student_id] = {
            "student_id": student_id,
            "name": student_name,
            "allocations": {},
            "issues": []
        }
        
        # Check if student has preferences
        if not hasattr(student, 'preferences') or not student.preferences:
            issue = f"Student {student_id}: No preferences found"
            issues.append(issue)
            student_allocations[student_id]["issues"].append(issue)
            continue
        
        # Process each category
        for category, choices in student.preferences.items():
            if not choices or not isinstance(choices, dict):
                continue
                
            first_choice = str(choices.get("choice1", "")).strip()
            
            # Skip empty choices
            if not first_choice:
                continue
            
            # Validate MDM selection is mandatory (double-check)
            if category == "MDM" and not first_choice:
                issue = f"Student {student_id}: MDM first choice is mandatory"
                issues.append(issue)
                student_allocations[student_id]["issues"].append(issue)
                continue
            
            # Try to allocate first choice
            if _can_allocate_course(first_choice, course_enrollments):
                _allocate_student_to_course(student_id, first_choice, 
                                          course_enrollments, category)
                student_allocations[student_id]["allocations"][category] = first_choice
                logger.debug(f"Allocated {student_id} to {first_choice} (first choice)")
            else:
                # Mark for second choice processing
                student_allocations[student_id]["allocations"][category] = None


def _allocate_second_choices(students: List[StudentPreference], 
                           course_enrollments: Dict, 
                           student_allocations: Dict, 
                           issues: List[str]) -> None:
    """Allocate second choices for students who didn't get first choice"""
    
    for student in students:
        student_id = getattr(student, 'student_id', 'Unknown')
        student_alloc = student_allocations.get(student_id)
        
        if not student_alloc:
            continue
        
        # Check if student has preferences
        if not hasattr(student, 'preferences') or not student.preferences:
            continue
        
        for category, choices in student.preferences.items():
            # Skip if already allocated or no choices
            if (student_alloc["allocations"].get(category) or 
                not choices or not isinstance(choices, dict)):
                continue
            
            second_choice = str(choices.get("choice2", "")).strip()
            if not second_choice:
                # No second choice, but first choice was full
                if student_alloc["allocations"].get(category) is None:
                    issue = f"Student {student_id}: Could not allocate {category} - first choice full, no second choice"
                    issues.append(issue)
                    student_alloc["issues"].append(issue)
                continue
            
            # Try to allocate second choice
            if _can_allocate_course(second_choice, course_enrollments):
                _allocate_student_to_course(student_id, second_choice, 
                                          course_enrollments, category)
                student_alloc["allocations"][category] = second_choice
                logger.debug(f"Allocated {student_id} to {second_choice} (second choice)")
            else:
                # Could not allocate either choice
                issue = f"Student {student_id}: Could not allocate {category} - both choices full"
                issues.append(issue)
                student_alloc["issues"].append(issue)


def _handle_minimum_enrollment(course_enrollments: Dict, issues: List[str]) -> Set[str]:
    """Check minimum enrollment and cancel courses if needed"""
    canceled_courses = set()
    
    for course_id, enrollment_data in course_enrollments.items():
        enrolled_count = len(enrollment_data["enrolled"])
        min_required = enrollment_data["min_enrollment"]
        
        if enrolled_count < min_required:
            canceled_courses.add(course_id)
            issue = f"Course {course_id} canceled - only {enrolled_count} students (minimum: {min_required})"
            issues.append(issue)
            logger.warning(issue)
    
    return canceled_courses


def _reallocate_canceled_courses(canceled_courses: Set[str], 
                                students: List[StudentPreference],
                                course_enrollments: Dict, 
                                student_allocations: Dict, 
                                issues: List[str]) -> None:
    """Reallocate students from canceled courses to their second choices"""
    
    for course_id in canceled_courses:
        affected_students = course_enrollments[course_id]["enrolled"].copy()
        
        for student_id in affected_students:
            # Remove from canceled course
            course_enrollments[course_id]["enrolled"].remove(student_id)
            
            # Find student's preferences
            student = next((s for s in students if getattr(s, 'student_id', None) == student_id), None)
            if not student or not hasattr(student, 'preferences'):
                continue
            
            # Find which category this course was for
            allocated_category = None
            if student_id in student_allocations:
                for category, allocation in student_allocations[student_id]["allocations"].items():
                    if allocation == course_id:
                        allocated_category = category
                        break
            
            if not allocated_category:
                continue
            
            # Try to reallocate to second choice
            choices = student.preferences.get(allocated_category, {})
            if isinstance(choices, dict):
                second_choice = str(choices.get("choice2", "")).strip()
                reallocated = False
                
                if second_choice and _can_allocate_course(second_choice, course_enrollments):
                    _allocate_student_to_course(student_id, second_choice, 
                                              course_enrollments, allocated_category)
                    student_allocations[student_id]["allocations"][allocated_category] = second_choice
                    reallocated = True
                    logger.info(f"Reallocated {student_id} from {course_id} to {second_choice}")
                
                if not reallocated:
                    # Could not reallocate
                    student_allocations[student_id]["allocations"][allocated_category] = None
                    issue = f"Student {student_id}: Could not reallocate from canceled course {course_id}"
                    issues.append(issue)
                    student_allocations[student_id]["issues"].append(issue)


def _can_allocate_course(course_id: str, course_enrollments: Dict) -> bool:
    """Check if a course has available capacity"""
    if not course_id:
        return False
    
    enrollment_data = course_enrollments[course_id]
    current_enrollment = len(enrollment_data["enrolled"])
    capacity = enrollment_data["capacity"]
    
    return current_enrollment < capacity


def _allocate_student_to_course(student_id: str, course_id: str, 
                               course_enrollments: Dict, category: str) -> None:
    """Allocate a student to a specific course"""
    course_enrollments[course_id]["enrolled"].append(student_id)


def _build_allocation_response(course_enrollments: Dict, 
                             student_allocations: Dict, 
                             issues: List[str]) -> AllocationResponse:
    """Build the final allocation response"""
    
    # Build student allocation list
    student_allocation_list = []
    for student_data in student_allocations.values():
        allocation = StudentAllocation(
            student_id=student_data["student_id"],
            name=student_data["name"],
            allocations=student_data["allocations"],
            issues=student_data["issues"]
        )
        student_allocation_list.append(allocation)
    
    # Build course summaries
    course_summaries = {}
    for course_id, enrollment_data in course_enrollments.items():
        if enrollment_data["enrolled"]:  # Only include courses with enrollments
            course_summaries[course_id] = CourseEnrollment(
                course_id=course_id,
                capacity=enrollment_data["capacity"],
                min_enrollment=enrollment_data["min_enrollment"],
                enrolled=len(enrollment_data["enrolled"]),
                students=enrollment_data["enrolled"]
            )
    
    return AllocationResponse(
        student_allocations=student_allocation_list,
        course_summaries=course_summaries,
        issues=issues
    )