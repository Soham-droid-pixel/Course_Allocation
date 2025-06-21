import sys
from pathlib import Path
app_dir = Path(__file__).parent.parent
if str(app_dir) not in sys.path:
    sys.path.insert(0, str(app_dir))

import pandas as pd
from datetime import datetime
import os
import logging  # Add this import
from typing import Dict, List
from enum import Enum
from db.models import AllocationResult
from api.models import AllocationResponse

# Configure logger - Add this
logger = logging.getLogger("course_allocation_service")

class DownloadFormat(str, Enum):
    """Download format options"""
    EXCEL = "excel"
    CSV = "csv"

def generate_allocation_report(allocation, format: str = "excel") -> str:
    """
    Generate allocation report in specified format.
    
    Args:
        allocation: Can be either AllocationResponse object or file path string
        format: Output format ('excel' or 'csv')
        
    Returns:
        Path to generated report file
    """
    try:
        # Handle case where allocation is passed as a file path (legacy compatibility)
        if isinstance(allocation, str):
            # If it's a string, treat it as a file path and return it
            return allocation
        
        # Create temp directory if it doesn't exist
        temp_dir = Path("temp_reports")
        temp_dir.mkdir(exist_ok=True)
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_extension = "xlsx" if format == "excel" else "csv"
        filename = f"allocation_report_{timestamp}.{file_extension}"
        output_path = temp_dir / filename
        
        return generate_simple_allocation_report(allocation, str(output_path), format)
        
    except Exception as e:
        logger.error(f"Error in generate_allocation_report: {e}")
        raise

def generate_simple_allocation_report(
    allocation: AllocationResponse,
    output_path: str,
    format: str = "excel"
) -> str:
    """Generate a simple, teacher-friendly allocation report"""
    
    try:
        # Validate input
        if not hasattr(allocation, 'student_allocations'):
            raise ValueError("Invalid allocation object: missing student_allocations attribute")
        
        # 1. STUDENT ALLOCATION SUMMARY
        student_data = []
        for student in allocation.student_allocations:
            if not hasattr(student, 'student_id'):
                logger.warning(f"Skipping student without student_id: {student}")
                continue
                
            row = {
                'Student ID': getattr(student, 'student_id', 'Unknown'),
                'Student Name': getattr(student, 'name', 'Unknown'),
                'PECL1 Course': student.allocations.get('PECL1', 'Not Allocated'),
                'PECL2 Course': student.allocations.get('PECL2', 'Not Allocated'), 
                'Program Elective Course': student.allocations.get('Program Elective', 'Not Allocated'),  # Fixed naming
                'Open Elective Course': student.allocations.get('Open Elective', 'Not Allocated'),      # Fixed naming
                'MDM Course': student.allocations.get('MDM', 'Not Allocated'),
                'Honors Course': student.allocations.get('Honors', 'None'),
                'Minor Course': student.allocations.get('Minor', 'None'),
                'Total Courses': len(getattr(student, 'allocations', {})),
                'Issues': '; '.join(getattr(student, 'issues', [])) if getattr(student, 'issues', []) else 'None'
            }
            student_data.append(row)
        
        if not student_data:
            raise ValueError("No valid student data found for report generation")
        
        # 2. COURSE ENROLLMENT SUMMARY  
        course_data = []
        course_summaries = getattr(allocation, 'course_summaries', {})
        
        for course_id, course in course_summaries.items():
            # Determine course category
            category = get_course_category(course_id)
            course_name = get_course_name(course_id)
            
            enrolled_count = getattr(course, 'enrolled', 0)
            min_enrollment = getattr(course, 'min_enrollment', 20)
            students_list = getattr(course, 'students', [])
            
            # Determine status based on category
            if category in ["Honors", "Minor"]:
                status = 'Active' if enrolled_count > 0 else 'No Students'
            else:
                status = 'Active' if enrolled_count >= min_enrollment else 'Canceled'
                
            row = {
                'Course ID': course_id,
                'Course Name': course_name,
                'Category': category,
                'Students Enrolled': enrolled_count,
                'Minimum Required': min_enrollment if min_enrollment > 0 else 'No Minimum',
                'Status': status,
                'Student List': ', '.join(students_list) if len(students_list) <= 10 else f"{', '.join(students_list[:10])}... (+{len(students_list)-10} more)"
            }
            course_data.append(row)
        
        # 3. SUMMARY STATISTICS - Use consistent column names
        total_students = len(student_data)
        complete_allocations = sum(1 for row in student_data if row['Total Courses'] >= 5)
        
        # Count allocations by category using the correct column names
        pecl1_allocated = sum(1 for row in student_data if row['PECL1 Course'] != 'Not Allocated')
        pecl2_allocated = sum(1 for row in student_data if row['PECL2 Course'] != 'Not Allocated')
        prog_elective_allocated = sum(1 for row in student_data if row['Program Elective Course'] != 'Not Allocated')
        open_elective_allocated = sum(1 for row in student_data if row['Open Elective Course'] != 'Not Allocated')
        mdm_allocated = sum(1 for row in student_data if row['MDM Course'] != 'Not Allocated')
        
        # Calculate percentages
        pecl1_pct = (pecl1_allocated/total_students*100) if total_students > 0 else 0
        pecl2_pct = (pecl2_allocated/total_students*100) if total_students > 0 else 0
        prog_pct = (prog_elective_allocated/total_students*100) if total_students > 0 else 0
        open_pct = (open_elective_allocated/total_students*100) if total_students > 0 else 0
        mdm_pct = (mdm_allocated/total_students*100) if total_students > 0 else 0
        
        # Optional courses
        honors_count = sum(1 for row in student_data if row['Honors Course'] != 'None')
        minor_count = sum(1 for row in student_data if row['Minor Course'] != 'None')
        
        # Count active vs canceled courses
        active_courses = sum(1 for row in course_data if row['Status'] == 'Active')
        canceled_courses = sum(1 for row in course_data if row['Status'] == 'Canceled')
        
        summary_data = [
            ['OVERALL STATISTICS:', ''],
            ['Total Students', total_students],
            ['Students with Complete Allocation (5+ courses)', f"{complete_allocations}/{total_students}"],
            ['Active Courses', active_courses],
            ['Canceled Courses (insufficient enrollment)', canceled_courses],
            ['', ''],
            ['MANDATORY COURSE ALLOCATION:', ''],
            ['PECL1 Allocated', f"{pecl1_allocated}/{total_students} ({pecl1_pct:.1f}%)"],
            ['PECL2 Allocated', f"{pecl2_allocated}/{total_students} ({pecl2_pct:.1f}%)"],
            ['Program Elective Allocated', f"{prog_elective_allocated}/{total_students} ({prog_pct:.1f}%)"],
            ['Open Elective Allocated', f"{open_elective_allocated}/{total_students} ({open_pct:.1f}%)"],
            ['MDM Allocated', f"{mdm_allocated}/{total_students} ({mdm_pct:.1f}%)"],
            ['', ''],
            ['OPTIONAL COURSE ENROLLMENT:', ''],
            ['Honors Students', f"{honors_count} students" if honors_count > 0 else "No students enrolled"],
            ['Minor Students', f"{minor_count} students" if minor_count > 0 else "No students enrolled"],
            ['', ''],
            ['NOTES:', ''],
            ['- Honors/Minor have no minimum enrollment', ''],
            ['- Students cannot choose both Honors and Minor', ''],
            ['- Mandatory courses need 20+ students to run', ''],
            ['', ''],
            ['REPORT GENERATED:', datetime.now().strftime('%Y-%m-%d %H:%M:%S')]
        ]
        
        logger.info(f"Generated summary for {total_students} students with {len(course_data)} courses")
        
        if format == "excel":
            return _generate_excel_report(student_data, course_data, summary_data, allocation, output_path)
        else:
            return _generate_csv_report(student_data, course_data, summary_data, output_path)
            
    except Exception as e:
        logger.error(f"Error in generate_simple_allocation_report: {e}")
        # Log the student_data structure for debugging
        if 'student_data' in locals() and student_data:
            logger.error(f"Available columns: {list(student_data[0].keys())}")
        raise

def get_course_category(course_id: str) -> str:
    """Determine course category from course ID"""
    if course_id.startswith("25PECL13CE1"):
        return "PECL1"
    elif course_id.startswith("25PECL13CE2"):
        return "PECL2"
    elif course_id.startswith("25PEC13CE"):
        return "Program Elective"
    elif course_id.startswith("OE"):
        return "Open Elective"
    elif course_id.startswith("MDM"):
        return "MDM"
    elif course_id.startswith("H"):
        return "Honors"
    elif course_id.startswith("M"):
        return "Minor"
    else:
        return "Unknown"

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

def _generate_excel_report(student_data, course_data, summary_data, allocation, output_path):
    """Generate Excel report with multiple sheets"""
    try:
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            # Sheet 1: Student Allocations
            student_df = pd.DataFrame(student_data)
            student_df.to_excel(writer, sheet_name='Student Allocations', index=False)
            
            # Sheet 2: Course Enrollments
            course_df = pd.DataFrame(course_data)
            course_df.to_excel(writer, sheet_name='Course Enrollments', index=False)
            
            # Sheet 3: Summary
            summary_df = pd.DataFrame(summary_data, columns=['Metric', 'Value'])
            summary_df.to_excel(writer, sheet_name='Summary Statistics', index=False)
            
            # Sheet 4: Issues (if any)
            issues_data = []
            if hasattr(allocation, 'student_allocations'):
                for student in allocation.student_allocations:
                    if hasattr(student, 'issues') and student.issues:
                        for issue in student.issues:
                            issues_data.append({
                                'Student ID': getattr(student, 'student_id', 'Unknown'),
                                'Student Name': getattr(student, 'name', 'Unknown'),
                                'Issue': issue
                            })
            
            if issues_data:
                issues_df = pd.DataFrame(issues_data)
                issues_df.to_excel(writer, sheet_name='Issues & Warnings', index=False)
        
        logger.info(f"Excel report generated successfully at {output_path}")
        return output_path
        
    except Exception as e:
        logger.error(f"Error generating Excel report: {e}")
        raise

def _generate_csv_report(student_data, course_data, summary_data, output_path):
    """Generate simple CSV report"""
    try:
        # Just export student allocations for CSV
        student_df = pd.DataFrame(student_data)
        student_df.to_csv(output_path, index=False)
        
        logger.info(f"CSV report generated successfully at {output_path}")
        return output_path
        
    except Exception as e:
        logger.error(f"Error generating CSV report: {e}")
        raise