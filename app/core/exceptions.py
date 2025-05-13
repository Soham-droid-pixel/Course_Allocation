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
