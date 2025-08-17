
# This file defines a custom exception for the course allocation system.
#
# - CourseAllocationException → Raised when something goes wrong in allocation logic.
#   • detail → A message explaining the error.
#   • status_code → HTTP status code to return (default = 400 Bad Request).
#


from fastapi import status

class CourseAllocationException(Exception):
    def __init__(
        self, 
        detail: str, 
        status_code: int = status.HTTP_400_BAD_REQUEST
    ):
        self.detail = detail
        self.status_code = status_code
        super().__init__(self.detail)
