from typing import Dict, Any, List, Union
import pandas as pd
import os
import logging
from datetime import datetime
import xlsxwriter
from ..api.models import AllocationResponse
from enum import Enum

class DownloadFormat(str, Enum):
    EXCEL = "excel"
    CSV = "csv"

logger = logging.getLogger("course_allocation_service")

def generate_allocation_report(
    allocation: AllocationResponse,
    output_path: str,
    format: Union[str, DownloadFormat] = DownloadFormat.EXCEL
):
    """
    Generate an Excel or CSV report with student allocations and course summaries.
    
    Args:
        allocation: The allocation results
        output_path: Path where to save the report
        format: Output format (excel or csv)
    """
    # Convert string format to enum if needed
    if isinstance(format, str):
        format = DownloadFormat(format.lower())
    
    logger.info(f"Generating {format} report at {output_path}")
    
    # Prepare data
    student_data = []
    for student_id, courses in allocation.student_allocations.items():
        row = {'Student ID': student_id}
        if isinstance(courses, dict):
            for category, course in courses.items():
                row[category] = course
        student_data.append(row)

    course_data = []
    for course_id, students in allocation.course_enrollments.items():
        student_list = students if isinstance(students, list) else []
        course_data.append({
            'Course ID': course_id,
            'Enrolled Students': len(student_list),
            'Student List': ', '.join(student_list) if student_list else 'No students'
        })

    # Create issues sheet
    issues_data = [
        {'Issue #': i+1, 'Description': issue}
        for i, issue in enumerate(allocation.issues or ['No issues reported'])
    ]

    # Ensure the directory exists
    directory = os.path.dirname(output_path)
    if directory and not os.path.exists(directory):
        try:
            os.makedirs(directory, exist_ok=True)
            logger.info(f"Created directory: {directory}")
        except Exception as e:
            logger.error(f"Failed to create directory {directory}: {str(e)}")
            raise
    
    # Generate the requested format
    if format == DownloadFormat.EXCEL:
        # Create Excel writer
        writer = pd.ExcelWriter(output_path, engine='xlsxwriter')
        workbook = writer.book

        # Add formats
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#D3D3D3',
            'border': 1
        })

        empty_course_format = workbook.add_format({
            'bg_color': '#FFC7CE',
            'font_color': '#9C0006'
        })

        # Write student allocations
        df_students = pd.DataFrame(student_data)
        df_students.to_excel(writer, sheet_name='Student Allocations', index=False)
        worksheet = writer.sheets['Student Allocations']
        
        # Format headers
        for col_num, value in enumerate(df_students.columns.values):
            worksheet.write(0, col_num, value, header_format)
            worksheet.set_column(col_num, col_num, 15)

        # Write course enrollments
        df_courses = pd.DataFrame(course_data)
        df_courses.to_excel(writer, sheet_name='Course Enrollments', index=False)
        worksheet = writer.sheets['Course Enrollments']
        
        # Format headers and highlight empty courses
        for col_num, value in enumerate(df_courses.columns.values):
            worksheet.write(0, col_num, value, header_format)
            worksheet.set_column(col_num, col_num, 20)

        # Highlight empty courses
        for row_num, (_, row) in enumerate(df_courses.iterrows(), start=1):
            if row['Enrolled Students'] == 0:
                worksheet.set_row(row_num, None, empty_course_format)

        # Write issues
        df_issues = pd.DataFrame(issues_data)
        df_issues.to_excel(writer, sheet_name='Issues', index=False)
        worksheet = writer.sheets['Issues']
        
        # Format headers
        for col_num, value in enumerate(df_issues.columns.values):
            worksheet.write(0, col_num, value, header_format)
            worksheet.set_column(col_num, col_num, 30)

        writer.close()
        
    else:
        # Generate CSV
        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            f.write(f"Course Allocation Report - Generated: {datetime.now()}\n\n")
            
            f.write("=== STUDENT ALLOCATIONS ===\n")
            pd.DataFrame(student_data).to_csv(f, index=False)
            
            f.write("\n=== COURSE ENROLLMENTS ===\n")
            pd.DataFrame(course_data).to_csv(f, index=False)
            
            f.write("\n=== ISSUES ===\n")
            pd.DataFrame(issues_data).to_csv(f, index=False)

    logger.info(f"Report generation completed: {output_path}")
