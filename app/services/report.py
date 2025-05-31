from typing import Dict, Any, List, Union
import pandas as pd
import os
import logging
from datetime import datetime
from ..api.models import AllocationResponse, StudentAllocation, CourseEnrollment
from enum import Enum

class DownloadFormat(str, Enum):
    EXCEL = "excel"
    CSV = "csv"

logger = logging.getLogger("course_allocation_service")

def generate_allocation_report(
    allocation: AllocationResponse,
    output_path: str,
    format: Union[str, DownloadFormat] = DownloadFormat.EXCEL
) -> str:
    """
    Generate an Excel or CSV report with student allocations and course summaries.
    
    Args:
        allocation: The allocation results
        output_path: Path where to save the report
        format: Output format (excel or csv)
        
    Returns:
        str: Path to the generated file
    """
    # Convert string format to enum if needed
    if isinstance(format, str):
        format = DownloadFormat(format.lower())
    
    logger.info(f"Generating {format} report at {output_path}")
    
    # Prepare student allocation data
    student_data = []
    for student in allocation.student_allocations:
        row = {
            'Student ID': student.student_id,
            'Name': student.name,
            'Status': 'Allocated'
        }
        # Add course allocations by category
        for category, course_id in student.allocations.items():
            row[category] = course_id
        
        # Add any issues
        if student.issues:
            row['Issues'] = '; '.join(student.issues)
            row['Status'] = 'Partial/Waitlisted'
            
        student_data.append(row)

    # Prepare course enrollment data
    course_data = []
    for course_id, course in allocation.course_summaries.items():
        course_data.append({
            'Course ID': course_id,
            'Enrolled': course.enrolled,
            'Capacity': course.capacity,
            'Min Required': course.min_enrollment,
            'Status': 'Running' if course.enrolled >= course.min_enrollment else 'Low Enrollment',
            'Students': ', '.join(course.students) if course.students else 'None',
            'Waitlist': ', '.join(course.waitlist) if course.waitlist else 'None'
        })

    # Prepare issues data
    issues_data = [
        {'Issue #': i+1, 'Description': issue}
        for i, issue in enumerate(allocation.issues)
    ] if allocation.issues else [{'Issue #': 1, 'Description': 'No issues reported'}]

    # Create output directory if needed
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    if format == DownloadFormat.EXCEL:
        return _generate_excel_report(
            output_path, student_data, course_data, issues_data
        )
    else:
        return _generate_csv_report(
            output_path, student_data, course_data, issues_data
        )

def _generate_excel_report(
    output_path: str,
    student_data: List[Dict],
    course_data: List[Dict],
    issues_data: List[Dict]
) -> str:
    """Generate detailed Excel report with formatting"""
    with pd.ExcelWriter(output_path, engine='xlsxwriter') as writer:
        workbook = writer.book
        
        # Add formats
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#D3D3D3',
            'border': 1
        })
        
        issue_format = workbook.add_format({
            'bg_color': '#FFC7CE',
            'font_color': '#9C0006'
        })
        
        # Write student allocations
        df_students = pd.DataFrame(student_data)
        df_students.to_excel(writer, sheet_name='Student Allocations', index=False)
        worksheet = writer.sheets['Student Allocations']
        
        # Format headers and columns
        for col_num, value in enumerate(df_students.columns.values):
            worksheet.write(0, col_num, value, header_format)
            worksheet.set_column(col_num, col_num, max(15, len(value) + 2))
        
        # Highlight students with issues
        for row_num, row in enumerate(df_students.iterrows(), start=1):
            if 'Issues' in row[1] and row[1]['Issues']:
                worksheet.set_row(row_num, None, issue_format)
        
        # Write course enrollments
        df_courses = pd.DataFrame(course_data)
        df_courses.to_excel(writer, sheet_name='Course Enrollments', index=False)
        worksheet = writer.sheets['Course Enrollments']
        
        # Format headers and columns
        for col_num, value in enumerate(df_courses.columns.values):
            worksheet.write(0, col_num, value, header_format)
            worksheet.set_column(col_num, col_num, max(15, len(value) + 2))
        
        # Write issues
        df_issues = pd.DataFrame(issues_data)
        df_issues.to_excel(writer, sheet_name='Issues', index=False)
        worksheet = writer.sheets['Issues']
        
        # Format headers and columns
        for col_num, value in enumerate(df_issues.columns.values):
            worksheet.write(0, col_num, value, header_format)
            worksheet.set_column(col_num, col_num, max(30, len(value) + 2))
            
        # Add metadata
        metadata_sheet = workbook.add_worksheet('Metadata')
        metadata = [
            ['Report Generated:', datetime.now().strftime('%Y-%m-%d %H:%M:%S')],
            ['Total Students:', len(student_data)],
            ['Total Courses:', len(course_data)],
            ['Total Issues:', len(issues_data)]
        ]
        for row_num, (label, value) in enumerate(metadata):
            metadata_sheet.write(row_num, 0, label, header_format)
            metadata_sheet.write(row_num, 1, value)
            
        metadata_sheet.set_column(0, 0, 20)
        metadata_sheet.set_column(1, 1, 30)

    logger.info(f"Excel report generated: {output_path}")
    return output_path

def _generate_csv_report(
    output_path: str,
    student_data: List[Dict],
    course_data: List[Dict],
    issues_data: List[Dict]
) -> str:
    """Generate CSV report with all data in a single file"""
    base_path = os.path.splitext(output_path)[0]
    
    # Generate separate CSV files for each section
    pd.DataFrame(student_data).to_csv(f"{base_path}_students.csv", index=False)
    pd.DataFrame(course_data).to_csv(f"{base_path}_courses.csv", index=False)
    pd.DataFrame(issues_data).to_csv(f"{base_path}_issues.csv", index=False)
    
    # Generate summary file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(f"Course Allocation Report - Generated: {datetime.now()}\n\n")
        
        f.write("=== SUMMARY ===\n")
        f.write(f"Total Students: {len(student_data)}\n")
        f.write(f"Total Courses: {len(course_data)}\n")
        f.write(f"Total Issues: {len(issues_data)}\n\n")
        
        f.write("See accompanying files for detailed data:\n")
        f.write(f"- Student Allocations: {os.path.basename(base_path)}_students.csv\n")
        f.write(f"- Course Enrollments: {os.path.basename(base_path)}_courses.csv\n")
        f.write(f"- Issues: {os.path.basename(base_path)}_issues.csv\n")

    logger.info(f"CSV reports generated in directory: {os.path.dirname(output_path)}")
    return output_path