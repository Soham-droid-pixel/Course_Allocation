from typing import List, Dict, Optional
from collections import defaultdict
from datetime import datetime
import logging
import json
import uuid

from ..api.models import (
    StudentPreference, AllocationResponse, StudentAllocation, 
    CourseEnrollment, PreferenceStatus, CourseCategory
)
from ..core.exceptions import CourseAllocationException

# Configure logger
logger = logging.getLogger("course_allocation_service")

# Course capacity constants
COURSE_CAPACITY = 60
MIN_ENROLLMENT = 20

def validate_mdm_selections(preferences: List[StudentPreference]) -> List[str]:
    """Validates MDM course selections"""
    invalid_students = []
    valid_mdm_courses = ["MDM1", "MDM2"]  # Valid MDM courses
    
    logger.info(f"Starting MDM validation for {len(preferences)} students")
    
    for student in preferences:
        # Fix: Compare with string value instead of enum
        if student.status != "confirmed":
            continue
            
        logger.info(f"Validating MDM for student {student.student_id}")
        
        # Get MDM preferences
        mdm_prefs = student.preferences.get("MDM", {})
        if not isinstance(mdm_prefs, dict):
            logger.warning(f"Invalid MDM preference format for student {student.student_id}")
            invalid_students.append(student.student_id)
            continue

        # Extract and validate choice1
        mdm_choice1 = str(mdm_prefs.get("choice1", "")).strip()
        logger.info(f"Student {student.student_id} MDM choice1: {mdm_choice1}")

        if not mdm_choice1 or mdm_choice1 not in valid_mdm_courses:
            logger.warning(
                f"Student {student.student_id}: Invalid MDM choice "
                f"'{mdm_choice1}', valid options are: {valid_mdm_courses}"
            )
            invalid_students.append(student.student_id)
            continue
            
        logger.info(f"Student {student.student_id}: Valid MDM choice found")

    if invalid_students:
        logger.warning(f"Found {len(invalid_students)} invalid MDM selections")
        raise CourseAllocationException(
            f"Invalid MDM selections for students: {', '.join(invalid_students)} "
            "(invalid or missing selection)"
        )
    
    logger.info("All MDM selections are valid")
    return invalid_students

def allocate_courses(preferences: List[StudentPreference]) -> AllocationResponse:
    """Allocate courses based on student preferences with improved error handling"""
    allocation_id = str(uuid.uuid4())
    logger.info(f"Starting allocation process with ID: {allocation_id}")
    
    try:
        # Convert preferences to proper format if needed
        validated_preferences = []
        for pref in preferences:
            if isinstance(pref, dict):
                pref = StudentPreference(**pref)
            validated_preferences.append(pref)
        
        # Validate MDM selections first
        invalid_students = validate_mdm_selections(validated_preferences)
        if invalid_students:
            logger.error(f"Invalid MDM selections found: {invalid_students}")
            raise CourseAllocationException(
                f"Invalid MDM selections for students: {', '.join(invalid_students)} "
                "(invalid or missing selection)"
            )

        # Only proceed with confirmed preferences that have valid MDM choices
        valid_preferences = []
        for pref in validated_preferences:
            # Fix: Compare with string value instead of enum
            if pref.status == "confirmed":
                mdm_prefs = pref.preferences.get("MDM", {})
                if isinstance(mdm_prefs, dict):
                    mdm_choice1 = mdm_prefs.get("choice1", "")
                    if mdm_choice1 and str(mdm_choice1).strip():
                        valid_preferences.append(pref)
                        logger.info(f"Added student {pref.student_id} to valid preferences")

        if not valid_preferences:
            logger.warning("No valid confirmed preferences found")
            return AllocationResponse(
                allocation_id=allocation_id,
                student_allocations=[],
                course_summaries={},
                issues=["No valid confirmed preferences found"]
            )

        # Initialize tracking structures
        course_enrollments: Dict[str, CourseEnrollment] = {}
        student_allocations: List[StudentAllocation] = []
        issues: List[str] = []

        logger.info(f"Processing {len(valid_preferences)} valid preferences")

        # First pass: Try to allocate first choices
        for student in valid_preferences:
            logger.info(f"Processing first choices for student {student.student_id}")
            allocation = StudentAllocation(
                student_id=student.student_id,
                name=student.name,
                allocations={},
                issues=[]
            )

            for category, choices in student.preferences.items():
                if not choices or not isinstance(choices, dict):
                    continue

                choice1 = choices.get("choice1", "")
                if not choice1 or not str(choice1).strip():
                    continue

                course_id = str(choice1).strip()
                logger.info(f"Attempting to allocate {course_id} for student {student.student_id} in category {category}")
                
                if course_id not in course_enrollments:
                    course_enrollments[course_id] = CourseEnrollment(
                        course_id=course_id,
                        capacity=COURSE_CAPACITY,
                        min_enrollment=MIN_ENROLLMENT,
                        enrolled=0,
                        students=[],
                        waitlist=[]
                    )

                course = course_enrollments[course_id]
                if course.enrolled < course.capacity:
                    course.students.append(student.student_id)
                    course.enrolled += 1
                    allocation.allocations[category] = course_id
                    logger.info(f"Allocated {course_id} to student {student.student_id}")
                else:
                    course.waitlist.append(student.student_id)
                    allocation.issues.append(f"Waitlisted for {course_id} in {category}")
                    logger.info(f"Waitlisted student {student.student_id} for {course_id}")

            student_allocations.append(allocation)

        # Second pass: Try to allocate second choices for unallocated students
        logger.info("Starting second pass for unallocated categories")
        for student in student_allocations:
            student_pref = next(
                (p for p in valid_preferences if p.student_id == student.student_id),
                None
            )
            
            if not student_pref:
                continue
            
            unallocated_categories = set(student_pref.preferences.keys()) - set(student.allocations.keys())
            logger.info(f"Student {student.student_id} has unallocated categories: {unallocated_categories}")
            
            for category in unallocated_categories:
                category_prefs = student_pref.preferences.get(category, {})
                if not isinstance(category_prefs, dict):
                    continue
                    
                choice2 = category_prefs.get("choice2", "")
                if not choice2 or not str(choice2).strip():
                    continue

                course_id = str(choice2).strip()
                logger.info(f"Attempting second choice {course_id} for student {student.student_id}")
                
                if course_id not in course_enrollments:
                    course_enrollments[course_id] = CourseEnrollment(
                        course_id=course_id,
                        capacity=COURSE_CAPACITY,
                        min_enrollment=MIN_ENROLLMENT,
                        enrolled=0,
                        students=[],
                        waitlist=[]
                    )

                course = course_enrollments[course_id]
                if course.enrolled < course.capacity:
                    course.students.append(student.student_id)
                    course.enrolled += 1
                    student.allocations[category] = course_id
                    logger.info(f"Allocated second choice {course_id} to student {student.student_id}")
                else:
                    course.waitlist.append(student.student_id)
                    student.issues.append(
                        f"Waitlisted for second choice {course_id} in {category}"
                    )
                    logger.info(f"Waitlisted student {student.student_id} for second choice {course_id}")

        # Check minimum enrollments
        for course_id, course in course_enrollments.items():
            if course.enrolled < course.min_enrollment:
                issue_msg = f"Course {course_id} has insufficient enrollment: {course.enrolled}"
                issues.append(issue_msg)
                logger.warning(issue_msg)

        logger.info(f"Allocation completed successfully for {len(student_allocations)} students with ID: {allocation_id}")
        
        return AllocationResponse(
            allocation_id=allocation_id,
            student_allocations=student_allocations,
            course_summaries=course_enrollments,
            issues=issues
        )

    except CourseAllocationException:
        # Re-raise CourseAllocationException as-is
        raise
    except Exception as e:
        error_msg = f"Unexpected error during allocation: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise CourseAllocationException(error_msg)