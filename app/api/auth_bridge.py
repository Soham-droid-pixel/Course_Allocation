"""
Bridge file to connect existing API endpoints with new authentication system.
This file provides auth dependencies that can be used in your existing endpoints.
"""
"""Purpose → Connects existing API endpoints with new JWT authentication.

HTTPBearer → Extracts Authorization: Bearer <token> from requests.

get_current_user → Validates token, fetches user from DB, checks if active. Returns user object.

Errors → Returns 401 if token invalid/user not found/disabled.

get_current_admin / get_current_student → Extra role checks (admin or student), else 403.

require_auth / require_admin / require_student → Simple decorators for endpoints to enforce authentication/roles quickly."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models.user import User
from utils.auth_utils import verify_token
import logging

logger = logging.getLogger(__name__)
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current user from JWT token - for use in existing endpoints."""
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

async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require admin role - for use in existing admin endpoints."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

async def get_current_student(current_user: User = Depends(get_current_user)) -> User:
    """Require student role - for use in existing student endpoints."""
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student access required"
        )
    return current_user

# Optional: For backward compatibility, you can also create a simple auth check
def require_auth():
    """Simple auth decorator for existing endpoints that don't need user object."""
    return Depends(get_current_user)

def require_admin():
    """Simple admin decorator for existing endpoints."""
    return Depends(get_current_admin)

def require_student():
    """Simple student decorator for existing endpoints."""
    return Depends(get_current_student)

