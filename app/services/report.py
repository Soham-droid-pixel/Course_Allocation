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
    try:
        # Convert string format to enum if needed
        if isinstance(format, str):
            format = DownloadFormat(format.lower())
        
        allocation_id = getattr(allocation, 'allocation_id', 'unknown')
        logger.info(f"Generating {format} report for allocation {allocation_id} at {output_path}")
        
        # Validate allocation data
        if not allocation.student_allocations:
            logger.warning("No student allocations found in allocation data")
            # Still generate report with empty data
        
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
                row[category] = course_id if course_id else 'Not Allocated'
            
            # Add any issues
            if student.issues:
                row['Issues'] = '; '.join(student.issues)
                row['Status'] = 'Partial/Waitlisted'
            else:
                row['Issues'] = 'None'
                
            student_data.append(row)

        # If no student data, create a placeholder
        if not student_data:
            student_data = [{
                'Student ID': 'No students',
                'Name': 'No data available',
                'Status': 'No allocations found',
                'Issues': 'No allocation data to report'
            }]

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

        # If no course data, create a placeholder
        if not course_data:
            course_data = [{
                'Course ID': 'No courses',
                'Enrolled': 0,
                'Capacity': 0,
                'Min Required': 0,
                'Status': 'No courses found',
                'Students': 'None',
                'Waitlist': 'None'
            }]

        # Prepare issues data
        issues_data = []
        if allocation.issues:
            issues_data = [
                {'Issue #': i+1, 'Description': issue}
                for i, issue in enumerate(allocation.issues)
            ]
        else:
            issues_data = [{'Issue #': 1, 'Description': 'No issues reported'}]

        # Create output directory if needed
        output_dir = os.path.dirname(output_path)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)
            logger.info(f"Created output directory: {output_dir}")

        if format == DownloadFormat.EXCEL:
            return _generate_excel_report(
                output_path, student_data, course_data, issues_data, allocation_id
            )
        else:
            return _generate_csv_report(
                output_path, student_data, course_data, issues_data, allocation_id
            )
            
    except Exception as e:
        error_msg = f"Error generating report: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise Exception(error_msg)

def _generate_excel_report(
    output_path: str,
    student_data: List[Dict],
    course_data: List[Dict],
    issues_data: List[Dict],
    allocation_id: str = "unknown"
) -> str:
    """Generate detailed Excel report with formatting"""
    try:
        # Ensure we have xlsxwriter available
        import xlsxwriter
        
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
            
            success_format = workbook.add_format({
                'bg_color': '#C6EFCE',
                'font_color': '#006100'
            })
            
            # Write student allocations
            df_students = pd.DataFrame(student_data)
            df_students.to_excel(writer, sheet_name='Student Allocations', index=False)
            worksheet = writer.sheets['Student Allocations']
            
            # Format headers and columns
            for col_num, value in enumerate(df_students.columns.values):
                worksheet.write(0, col_num, value, header_format)
                # Set column width based on content
                max_width = max(len(str(value)), 15)
                if col_num < len(df_students.columns):
                    # Check data width
                    for row in student_data:
                        cell_data = str(row.get(value, ''))
                        max_width = max(max_width, len(cell_data))
                worksheet.set_column(col_num, col_num, min(max_width + 2, 50))
            
            # Highlight students with issues
            for row_num in range(1, len(df_students) + 1):
                student_row = df_students.iloc[row_num - 1]
                if 'Issues' in student_row and student_row['Issues'] and student_row['Issues'] != 'None':
                    for col_num in range(len(df_students.columns)):
                        worksheet.write(row_num, col_num, student_row.iloc[col_num], issue_format)
                elif student_row.get('Status') == 'Allocated':
                    for col_num in range(len(df_students.columns)):
                        worksheet.write(row_num, col_num, student_row.iloc[col_num], success_format)
            
            # Write course enrollments
            df_courses = pd.DataFrame(course_data)
            df_courses.to_excel(writer, sheet_name='Course Enrollments', index=False)
            worksheet = writer.sheets['Course Enrollments']
            
            # Format headers and columns
            for col_num, value in enumerate(df_courses.columns.values):
                worksheet.write(0, col_num, value, header_format)
                max_width = max(len(str(value)), 15)
                if col_num < len(df_courses.columns):
                    for row in course_data:
                        cell_data = str(row.get(value, ''))
                        max_width = max(max_width, len(cell_data))
                worksheet.set_column(col_num, col_num, min(max_width + 2, 50))
            
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
                ['Allocation ID:', allocation_id],
                ['Report Generated:', datetime.now().strftime('%Y-%m-%d %H:%M:%S')],
                ['Total Students:', len(student_data)],
                ['Total Courses:', len(course_data)],
                ['Total Issues:', len(issues_data)]
            ]
            for row_num, (label, value) in enumerate(metadata):
                metadata_sheet.write(row_num, 0, label, header_format)
                metadata_sheet.write(row_num, 1, str(value))
                
            metadata_sheet.set_column(0, 0, 20)
            metadata_sheet.set_column(1, 1, 30)

        logger.info(f"Excel report generated successfully: {output_path}")
        return output_path
        
    except ImportError:
        error_msg = "xlsxwriter not available, cannot generate Excel report"
        logger.error(error_msg)
        raise Exception(error_msg)
    except Exception as e:
        error_msg = f"Error generating Excel report: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise Exception(error_msg)

def _generate_csv_report(
    output_path: str,
    student_data: List[Dict],
    course_data: List[Dict],
    issues_data: List[Dict],
    allocation_id: str = "unknown"
) -> str:
    """Generate CSV report with all data in separate files"""
    try:
        base_path = os.path.splitext(output_path)[0]
        
        # Generate separate CSV files for each section
        students_file = f"{base_path}_students.csv"
        courses_file = f"{base_path}_courses.csv"
        issues_file = f"{base_path}_issues.csv"
        
        pd.DataFrame(student_data).to_csv(students_file, index=False)
        pd.DataFrame(course_data).to_csv(courses_file, index=False)
        pd.DataFrame(issues_data).to_csv(issues_file, index=False)
        
        # Generate summary file
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(f"Course Allocation Report - Generated: {datetime.now()}\n")
            f.write(f"Allocation ID: {allocation_id}\n\n")
            
            f.write("=== SUMMARY ===\n")
            f.write(f"Total Students: {len(student_data)}\n")
            f.write(f"Total Courses: {len(course_data)}\n")
            f.write(f"Total Issues: {len(issues_data)}\n\n")
            
            f.write("See accompanying files for detailed data:\n")
            f.write(f"- Student Allocations: {os.path.basename(students_file)}\n")
            f.write(f"- Course Enrollments: {os.path.basename(courses_file)}\n")
            f.write(f"- Issues: {os.path.basename(issues_file)}\n")

        logger.info(f"CSV reports generated successfully in directory: {os.path.dirname(output_path)}")
        return output_path
        
    except Exception as e:
        error_msg = f"Error generating CSV report: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise Exception(error_msg)