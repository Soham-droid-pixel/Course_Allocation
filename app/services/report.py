import pandas as pd
import logging
from typing import Dict, List, Optional
from datetime import datetime
import os

from ..api.models import AllocationResponse, StudentAllocation, CourseEnrollment

logger = logging.getLogger("course_allocation_service")

class DownloadFormat:
    EXCEL = "excel"
    CSV = "csv"

def generate_allocation_report(allocation: AllocationResponse, 
                             output_path: str, 
                             format: str = DownloadFormat.EXCEL) -> str:
    """
    Generate allocation report in Excel or CSV format.
    
    Args:
        allocation: AllocationResponse object with allocation data
        output_path: Path where the report should be saved
        format: "excel" or "csv"
        
    Returns:
        str: Path to the generated file
    """
    logger.info(f"Generating {format} report at: {output_path}")
    
    try:
        # Prepare data for different sheets/files
        student_data = _prepare_student_allocation_data(allocation.student_allocations)
        course_data = _prepare_course_summary_data(allocation.course_summaries)
        issues_data = _prepare_issues_data(allocation.issues, allocation.student_allocations)
        
        if format == DownloadFormat.EXCEL:
            return _generate_excel_report(student_data, course_data, issues_data, output_path)
        else:
            return _generate_csv_report(student_data, course_data, issues_data, output_path)
            
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        raise


def _prepare_student_allocation_data(student_allocations: List[StudentAllocation]) -> pd.DataFrame:
    """Prepare student allocation data for report"""
    
    data = []
    for student in student_allocations:
        row = {
            'Student ID': student.student_id,
            'Student Name': student.name,
            'PECL1': student.allocations.get('PECL1', 'Not Allocated'),
            'PECL2': student.allocations.get('PECL2', 'Not Allocated'),
            'Program Elective': student.allocations.get('Program Elective', 'Not Allocated'),
            'Open Elective': student.allocations.get('Open Elective', 'Not Allocated'),
            'Honors': student.allocations.get('Honors', 'Not Allocated'),
            'Minor': student.allocations.get('Minor', 'Not Allocated'),
            'MDM': student.allocations.get('MDM', 'Not Allocated'),
            'Issues Count': len(student.issues),
            'Has Issues': 'Yes' if student.issues else 'No'
        }
        data.append(row)
    
    df = pd.DataFrame(data)
    
    # Sort by Student ID
    df = df.sort_values('Student ID')
    
    logger.info(f"Prepared student allocation data for {len(df)} students")
    return df


def _prepare_course_summary_data(course_summaries: Dict[str, CourseEnrollment]) -> pd.DataFrame:
    """Prepare course summary data for report"""
    
    data = []
    for course_id, course in course_summaries.items():
        row = {
            'Course ID': course_id,
            'Course Name': getattr(course, 'name', 'Unknown Course'),
            'Capacity': course.capacity,
            'Minimum Enrollment': course.min_enrollment,
            'Enrolled Students': course.enrolled,
            'Available Seats': course.capacity - course.enrolled,
            'Status': _get_course_status(course),
            'Enrolled Student IDs': ', '.join(course.students) if course.students else ''
        }
        data.append(row)
    
    df = pd.DataFrame(data)
    
    # Sort by enrolled students (descending) then by course ID
    df = df.sort_values(['Enrolled Students', 'Course ID'], ascending=[False, True])
    
    logger.info(f"Prepared course summary data for {len(df)} courses")
    return df


def _prepare_issues_data(global_issues: List[str], 
                        student_allocations: List[StudentAllocation]) -> pd.DataFrame:
    """Prepare issues data for report"""
    
    data = []
    
    # Add global issues
    for issue in global_issues:
        data.append({
            'Type': 'System',
            'Student ID': 'N/A',
            'Student Name': 'N/A',
            'Issue Description': issue,
            'Timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
    
    # Add student-specific issues
    for student in student_allocations:
        for issue in student.issues:
            data.append({
                'Type': 'Student',
                'Student ID': student.student_id,
                'Student Name': student.name,
                'Issue Description': issue,
                'Timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            })
    
    df = pd.DataFrame(data)
    
    # Sort by type then by student ID
    if not df.empty:
        df = df.sort_values(['Type', 'Student ID'])
    
    logger.info(f"Prepared issues data with {len(df)} issues")
    return df


def _get_course_status(course: CourseEnrollment) -> str:
    """Determine course status based on enrollment"""
    if course.enrolled < course.min_enrollment:
        return "Canceled (Below Minimum)"
    elif course.enrolled >= course.capacity:
        return "Full"
    else:
        return "Active"


def _generate_excel_report(student_data: pd.DataFrame, 
                          course_data: pd.DataFrame, 
                          issues_data: pd.DataFrame, 
                          output_path: str) -> str:
    """Generate Excel report with multiple sheets"""
    
    try:
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            # Student Allocations Sheet
            student_data.to_excel(writer, sheet_name='Student Allocations', index=False)
            
            # Course Summary Sheet
            course_data.to_excel(writer, sheet_name='Course Summary', index=False)
            
            # Issues Sheet
            if not issues_data.empty:
                issues_data.to_excel(writer, sheet_name='Issues', index=False)
            else:
                # Create empty issues sheet with headers
                pd.DataFrame(columns=['Type', 'Student ID', 'Student Name', 'Issue Description', 'Timestamp']).to_excel(
                    writer, sheet_name='Issues', index=False)
            
            # Summary Statistics Sheet
            _add_summary_sheet(writer, student_data, course_data, issues_data)
        
        logger.info(f"Excel report generated successfully: {output_path}")
        return output_path
        
    except Exception as e:
        logger.error(f"Error generating Excel report: {str(e)}")
        raise


def _generate_csv_report(student_data: pd.DataFrame, 
                        course_data: pd.DataFrame, 
                        issues_data: pd.DataFrame, 
                        output_path: str) -> str:
    """Generate CSV report (main student allocations file)"""
    
    try:
        # For CSV, we'll generate the main student allocations file
        student_data.to_csv(output_path, index=False)
        
        # Also generate separate files for course summary and issues
        base_path = output_path.rsplit('.', 1)[0]
        
        course_csv_path = f"{base_path}_courses.csv"
        course_data.to_csv(course_csv_path, index=False)
        
        if not issues_data.empty:
            issues_csv_path = f"{base_path}_issues.csv"
            issues_data.to_csv(issues_csv_path, index=False)
        
        logger.info(f"CSV reports generated successfully. Main file: {output_path}")
        return output_path
        
    except Exception as e:
        logger.error(f"Error generating CSV report: {str(e)}")
        raise


def _add_summary_sheet(writer, student_data: pd.DataFrame, 
                      course_data: pd.DataFrame, 
                      issues_data: pd.DataFrame) -> None:
    """Add summary statistics sheet to Excel report"""
    
    summary_data = []
    
    # Student Statistics
    total_students = len(student_data)
    students_with_issues = len(student_data[student_data['Has Issues'] == 'Yes'])
    students_without_issues = total_students - students_with_issues
    
    summary_data.extend([
        ['STUDENT STATISTICS', ''],
        ['Total Students', total_students],
        ['Students with Issues', students_with_issues],
        ['Students without Issues', students_without_issues],
        ['', ''],
    ])
    
    # Course Statistics
    total_courses = len(course_data)
    active_courses = len(course_data[course_data['Status'] == 'Active'])
    full_courses = len(course_data[course_data['Status'] == 'Full'])
    canceled_courses = len(course_data[course_data['Status'].str.contains('Canceled', na=False)])
    
    summary_data.extend([
        ['COURSE STATISTICS', ''],
        ['Total Courses Offered', total_courses],
        ['Active Courses', active_courses],
        ['Full Courses', full_courses],
        ['Canceled Courses', canceled_courses],
        ['', ''],
    ])
    
    # Allocation Statistics by Category
    categories = ['PECL1', 'PECL2', 'Program Elective', 'Open Elective', 'Honors', 'Minor', 'MDM']
    
    summary_data.append(['ALLOCATION STATISTICS', ''])
    for category in categories:
        allocated = len(student_data[student_data[category] != 'Not Allocated'])
        not_allocated = total_students - allocated
        allocation_rate = (allocated / total_students * 100) if total_students > 0 else 0
        
        summary_data.extend([
            [f'{category} - Allocated', allocated],
            [f'{category} - Not Allocated', not_allocated],
            [f'{category} - Allocation Rate (%)', f"{allocation_rate:.1f}%"],
        ])
    
    summary_data.extend([
        ['', ''],
        ['ISSUES SUMMARY', ''],
        ['Total Issues', len(issues_data)],
        ['System Issues', len(issues_data[issues_data['Type'] == 'System']) if not issues_data.empty else 0],
        ['Student Issues', len(issues_data[issues_data['Type'] == 'Student']) if not issues_data.empty else 0],
        ['', ''],
        ['Report Generated', datetime.now().strftime('%Y-%m-%d %H:%M:%S')]
    ])
    
    # Create DataFrame and save to Excel
    summary_df = pd.DataFrame(summary_data, columns=['Metric', 'Value'])
    summary_df.to_excel(writer, sheet_name='Summary', index=False)
    
    logger.info("Added summary statistics sheet to Excel report")