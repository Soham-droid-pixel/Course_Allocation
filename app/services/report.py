import pandas as pd
from datetime import datetime
import os
from typing import Dict, List
from enum import Enum
from ..api.models import AllocationResponse

class DownloadFormat(str, Enum):
    """Download format options"""
    EXCEL = "excel"
    CSV = "csv"

def generate_simple_allocation_report(
    allocation: AllocationResponse,
    output_path: str,
    format: str = "excel"
) -> str:
    """Generate a simple, teacher-friendly allocation report"""
    
    # 1. STUDENT ALLOCATION SUMMARY
    student_data = []
    for student in allocation.student_allocations:
        row = {
            'Student ID': student.student_id,
            'Student Name': student.name,
            'PECL1 Course': student.allocations.get('PECL1', 'Not Allocated'),
            'PECL2 Course': student.allocations.get('PECL2', 'Not Allocated'), 
            'Program Elective': student.allocations.get('Program Elective', 'Not Allocated'),
            'Open Elective': student.allocations.get('Open Elective', 'Not Allocated'),
            'MDM Course': student.allocations.get('MDM', 'Not Allocated'),
            'Honors Course': student.allocations.get('Honors', 'None'),
            'Minor Course': student.allocations.get('Minor', 'None'),
            'Total Courses': len(student.allocations),
            'Issues': '; '.join(student.issues) if student.issues else 'None'
        }
        student_data.append(row)
    
    # 2. COURSE ENROLLMENT SUMMARY  
    course_data = []
    for course_id, course in allocation.course_summaries.items():
        # Determine course category
        category = get_course_category(course_id)
        course_name = get_course_name(course_id)
        
        # Determine status based on category
        if category in ["Honors", "Minor"]:
            # Honors/Minor are ALWAYS active if students enrolled (no minimum)
            status = 'Active' if course.enrolled > 0 else 'No Students'
        else:
            # Mandatory courses need minimum enrollment
            status = 'Active' if course.enrolled >= course.min_enrollment else 'Canceled'
            
        row = {
            'Course ID': course_id,
            'Course Name': course_name,
            'Category': category,
            'Students Enrolled': course.enrolled,
            'Minimum Required': course.min_enrollment if course.min_enrollment > 0 else 'No Minimum',
            'Status': status,
            'Student List': ', '.join(course.students) if len(course.students) <= 10 else f"{', '.join(course.students[:10])}... (+{len(course.students)-10} more)"
        }
        course_data.append(row)
    
    # 3. SUMMARY STATISTICS
    total_students = len(allocation.student_allocations)
    complete_allocations = sum(1 for s in allocation.student_allocations 
                              if len(s.allocations) >= 5)
    
    category_stats = {}
    for category in ['PECL1', 'PECL2', 'Program Elective', 'Open Elective', 'MDM']:
        allocated = sum(1 for s in allocation.student_allocations 
                       if category in s.allocations)
        category_stats[category] = f"{allocated}/{total_students} ({allocated/total_students*100:.1f}%)"
    
    # Optional courses (show actual numbers, not percentages)
    honors_count = sum(1 for s in allocation.student_allocations if 'Honors' in s.allocations)
    minor_count = sum(1 for s in allocation.student_allocations if 'Minor' in s.allocations)
    
    # Count active vs canceled courses
    active_courses = sum(1 for course in allocation.course_summaries.values() 
                        if course.enrolled >= course.min_enrollment or course.min_enrollment == 0)
    canceled_courses = sum(1 for course in allocation.course_summaries.values() 
                          if course.enrolled < course.min_enrollment and course.min_enrollment > 0)
    
    summary_data = [
        ['OVERALL STATISTICS:', ''],
        ['Total Students', total_students],
        ['Students with Complete Allocation (5+ courses)', f"{complete_allocations}/{total_students}"],
        ['Active Courses', active_courses],
        ['Canceled Courses (insufficient enrollment)', canceled_courses],
        ['', ''],
        ['MANDATORY COURSE ALLOCATION:', ''],
        ['PECL1 Allocated', category_stats['PECL1']],
        ['PECL2 Allocated', category_stats['PECL2']],
        ['Program Elective Allocated', category_stats['Program Elective']],
        ['Open Elective Allocated', category_stats['Open Elective']],
        ['MDM Allocated', category_stats['MDM']],
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
    
    if format == "excel":
        return _generate_excel_report(student_data, course_data, summary_data, allocation, output_path)
    else:
        return _generate_csv_report(student_data, course_data, summary_data, output_path)

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
        for student in allocation.student_allocations:
            if student.issues:
                for issue in student.issues:
                    issues_data.append({
                        'Student ID': student.student_id,
                        'Student Name': student.name,
                        'Issue': issue
                    })
        
        if issues_data:
            issues_df = pd.DataFrame(issues_data)
            issues_df.to_excel(writer, sheet_name='Issues & Warnings', index=False)
    
    return output_path

def _generate_csv_report(student_data, course_data, summary_data, output_path):
    """Generate simple CSV report"""
    # Just export student allocations for CSV
    student_df = pd.DataFrame(student_data)
    student_df.to_csv(output_path, index=False)
    return output_path

# Legacy function name for backward compatibility
def generate_allocation_report(allocation: AllocationResponse, output_path: str, format: str = "excel") -> str:
    """Legacy function name - redirects to new function"""
    return generate_simple_allocation_report(allocation, output_path, format)