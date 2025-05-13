from typing import Dict, Any, List
import pandas as pd
import logging
import os
from io import BytesIO

from app.api.models import AllocationResponse, DownloadFormat, CourseCategory

logger = logging.getLogger("course_allocation_service")

def generate_allocation_report(
    allocation: AllocationResponse,
    output_path: str,
    format: DownloadFormat = DownloadFormat.EXCEL
):
    """
    Generate an Excel or CSV report with student allocations and course summaries.
    
    Args:
        allocation: The allocation results
        output_path: Path where to save the report
        format: Output format (excel or csv)
    """
    logger.info(f"Generating {format.value} report at {output_path}")
    
    # Create DataFrames for each sheet
    student_df = create_student_allocation_dataframe(allocation)
    course_df = create_course_summary_dataframe(allocation)
    issues_df = create_issues_dataframe(allocation)
    
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
        generate_excel_report(student_df, course_df, issues_df, output_path)
    else:
        generate_csv_report(student_df, course_df, issues_df, output_path)
    
    logger.info(f"Report generation completed: {output_path}")

def create_student_allocation_dataframe(allocation: AllocationResponse) -> pd.DataFrame:
    """Create a DataFrame for student allocations."""
    records = []
    
    for student in allocation.student_allocations:
        record = {
            "Student ID": student.student_id,
            "Name": student.name
        }
        
        # Add allocations by category
        for category in CourseCategory:
            record[str(category)] = student.allocations.get(category, "Not Allocated")
        
        # Add issues
        record["Issues"] = "; ".join(student.issues) if student.issues else "None"
        
        records.append(record)
    
    return pd.DataFrame(records)

def create_course_summary_dataframe(allocation: AllocationResponse) -> pd.DataFrame:
    """Create a DataFrame for course enrollment summaries."""
    records = []
    
    for course_id, enrollment in allocation.course_summaries.items():
        records.append({
            "Course ID": course_id,
            "Enrolled Students": enrollment.enrolled,
            "Student IDs": ", ".join(enrollment.students)
        })
    
    return pd.DataFrame(records)

def create_issues_dataframe(allocation: AllocationResponse) -> pd.DataFrame:
    """Create a DataFrame for all issues."""
    return pd.DataFrame({
        "Issue": allocation.issues
    })

def generate_excel_report(
    student_df: pd.DataFrame,
    course_df: pd.DataFrame,
    issues_df: pd.DataFrame,
    output_path: str
):
    """Generate an Excel report with multiple sheets."""
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        student_df.to_excel(writer, sheet_name='Student Allocations', index=False)
        course_df.to_excel(writer, sheet_name='Course Summaries', index=False)
        issues_df.to_excel(writer, sheet_name='Issues', index=False)

def generate_csv_report(
    student_df: pd.DataFrame,
    course_df: pd.DataFrame,
    issues_df: pd.DataFrame,
    output_path: str
):
    """Generate a single CSV report."""
    # For CSV, we'll combine all tables with headers
    with open(output_path, 'w') as f:
        f.write("STUDENT ALLOCATIONS\n")
        student_df.to_csv(f, index=False)
        
        f.write("\n\nCOURSE SUMMARIES\n")
        course_df.to_csv(f, index=False)
        
        f.write("\n\nISSUES\n")
        issues_df.to_csv(f, index=False)