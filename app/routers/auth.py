from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import timedelta, datetime, timezone
import logging
from pydantic import ValidationError

from models.user import User, UserSignup, UserLogin, UserResponse, Token, UserRole
from utils.auth_utils import (
    verify_password,
    get_password_hash,
    create_access_token,
    verify_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserSignup):
    """Register a new user."""
    try:
        logger.info(f"Signup attempt for email: {user_data.email}, role: {user_data.role}")
        
        # Validate input
        if len(user_data.password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters long"
            )
        
        # Check if user already exists by email
        existing_user = await User.find_one(User.email == user_data.email)
        if existing_user:
            logger.warning(f"Signup failed: Email already exists: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # For students, check if roll_number already exists
        if user_data.role == UserRole.STUDENT and user_data.roll_number:
            existing_roll = await User.find_one(User.roll_number == user_data.roll_number)
            if existing_roll:
                logger.warning(f"Signup failed: Roll number already exists: {user_data.roll_number}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Roll number already registered"
                )

        # Hash password
        hashed_password = get_password_hash(user_data.password)
        logger.info(f"Password hashed successfully for: {user_data.email}")

        # Create user document
        user_dict = {
            "email": user_data.email,
            "hashed_password": hashed_password,
            "role": user_data.role,
            "roll_number": user_data.roll_number if user_data.role == UserRole.STUDENT else None,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        user = User(**user_dict)
        await user.insert()
        
        logger.info(f"User created successfully: {user.email} with ID: {user.id}")
        
        return UserResponse(
            id=str(user.id),
            email=user.email,
            role=user.role,
            roll_number=user.roll_number,
            is_active=user.is_active,
            created_at=user.created_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error during signup: {str(e)}"
        )

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """Authenticate user and return JWT token."""
    try:
        logger.info(f"Login attempt for email: {credentials.email}")
        
        user = await User.find_one(User.email == credentials.email)
        if not user:
            logger.warning(f"Login failed: User not found: {credentials.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        # Verify password
        if not verify_password(credentials.password, user.hashed_password):
            logger.warning(f"Login failed: Invalid password for: {credentials.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        # Check if user is active
        if not user.is_active:
            logger.warning(f"Login failed: Account disabled for: {credentials.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is disabled"
            )

        # Create access token with roll_number
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        token_data = {
            "sub": str(user.id), 
            "email": user.email, 
            "role": user.role,
        }
        
        # Add roll_number to token for students
        if user.role == UserRole.STUDENT and user.roll_number:
            token_data["roll_number"] = user.roll_number
            
        access_token = create_access_token(
            data=token_data,
            expires_delta=access_token_expires
        )

        logger.info(f"User logged in successfully: {user.email}")
        
        return Token(
            access_token=access_token,
            user=UserResponse(
                id=str(user.id),
                email=user.email,
                role=user.role,
                roll_number=user.roll_number,
                is_active=user.is_active,
                created_at=user.created_at
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during login"
        )

# Dependency to get current user
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current user from JWT token."""
    try:
        # Verify token
        payload = verify_token(credentials.credentials)
        user_id = payload.get("sub")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )

        # Get user from database
        user = await User.get(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is disabled"
            )

        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at
    )

@router.get("/test")
async def test_auth():
    """Test endpoint to verify auth routes are working."""
    return {"message": "Auth router is working", "timestamp": datetime.now(timezone.utc)}

# Role-based dependencies
async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require admin role."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

async def get_current_student(current_user: User = Depends(get_current_user)) -> User:
    """Require student role."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student access required"
        )
    return current_user