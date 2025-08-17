# 📌 This file defines the User model and related request/response schemas.
#
# - UserRole → Enum with "student" and "admin".
#
# - User (Beanie Document) → Represents a system user:
#   • email, hashed_password, role
#   • roll_number (only for students)
#   • is_active, created_at, updated_at
#   • Validators enforce:
#       - Students must have a roll_number
#       - Admins must not have a roll_number
#       - Password must be securely hashed
#       - Email must be valid
#   • Stored in MongoDB collection: "users"
#
# - Pydantic models for API:
#   • UserSignup → Input for user registration (validates role & roll_number rules).
#   • UserLogin → Input for login (email + password).
#   • UserResponse → Output representation of user (safe, no password).
#   • Token → Returned after login/signup (JWT access_token + user info).
#
# 👉 Summary:
# This file handles all user-related database structure and API validation.


from beanie import Document
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime, timezone
from enum import Enum

class UserRole(str, Enum):
    STUDENT = "student"
    ADMIN = "admin"

class User(Document):
    email: EmailStr
    hashed_password: str
    role: UserRole
    roll_number: Optional[str] = Field(None, description="Student roll number (only for students)")
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        collection = "users"
        validate_assignment = True

    @validator('roll_number')
    def validate_roll_number_for_students(cls, v, values):
        role = values.get('role')
        if role == UserRole.STUDENT and not v:
            raise ValueError('Roll number is required for students')
        if role == UserRole.ADMIN and v:
            raise ValueError('Roll number should not be provided for admin users')
        return v

    @validator('hashed_password')
    def validate_hashed_password(cls, v):
        if not v or len(v) < 10:
            raise ValueError('Invalid hashed password')
        return v

    @validator('email')
    def validate_email(cls, v):
        if not v or '@' not in v:
            raise ValueError('Invalid email address')
        return v

# Pydantic models for requests/responses
class UserSignup(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: UserRole
    roll_number: Optional[str] = Field(None, description="Required for students")

    @validator('roll_number')
    def validate_roll_number_required(cls, v, values):
        role = values.get('role')
        if role == UserRole.STUDENT and not v:
            raise ValueError('Roll number is required for student signup')
        if role == UserRole.ADMIN and v:
            raise ValueError('Roll number should not be provided for admin signup')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    role: UserRole
    roll_number: Optional[str] = None
    is_active: bool
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse