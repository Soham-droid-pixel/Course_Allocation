# -----------------------------------------------------------------------------
# SECURITY UTILS MODULE
# -----------------------------------------------------------------------------
# - Provides password hashing, verification, and JWT-based authentication helpers.
# - Loads secret key from environment (.env) file for token signing.
# - Uses bcrypt for password security and HS256 for JWT.
# - Handles error cases gracefully with FastAPI's HTTPException.
# -----------------------------------------------------------------------------

# Imports
# from datetime import datetime, timedelta  -> For token expiry
# from typing import Optional, Dict, Any    -> Type hints
# import jwt                                -> JWT encoding/decoding
# from passlib.context import CryptContext  -> Secure password hashing
# from fastapi import HTTPException, status -> Standardized error responses
# import os                                 -> Environment variable access
# from dotenv import load_dotenv            -> Load .env file securely

# -----------------------------------------------------------------------------
# CONFIGURATION
# -----------------------------------------------------------------------------
# SECRET_KEY -> Taken from .env; fallback is insecure default (should be overridden).
# ALGORITHM  -> HS256 (symmetric encryption).
# ACCESS_TOKEN_EXPIRE_MINUTES -> Default expiry time for access tokens.
# -----------------------------------------------------------------------------

# -----------------------------------------------------------------------------
# PASSWORD MANAGEMENT
# -----------------------------------------------------------------------------
# verify_password(plain, hashed) -> Returns True if password matches hash.
# get_password_hash(password)    -> Validates and securely hashes a new password.
# -----------------------------------------------------------------------------

# -----------------------------------------------------------------------------
# TOKEN MANAGEMENT
# -----------------------------------------------------------------------------
# create_access_token(data, expires_delta) -> Encodes data into JWT with expiry.
# verify_token(token)                      -> Validates JWT, handles expiry/invalid.
# -----------------------------------------------------------------------------
# Errors:
#   - ExpiredSignatureError -> Returns 401 Unauthorized ("Token has expired").
#   - PyJWTError -> Returns 401 Unauthorized ("Could not validate credentials").
# -----------------------------------------------------------------------------


from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
import os
from dotenv import load_dotenv

load_dotenv()

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production-min-32-chars-long")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        print(f"Password verification error: {e}")
        return False

def get_password_hash(password: str) -> str:
    """Hash a password."""
    if not password or len(password) < 6:
        raise ValueError("Password must be at least 6 characters long")
    
    try:
        return pwd_context.hash(password)
    except Exception as e:
        print(f"Password hashing error: {e}")
        raise ValueError("Failed to hash password")

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    try:
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    except Exception as e:
        print(f"JWT encoding error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create access token"
        )

def verify_token(token: str) -> Dict[str, Any]:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError as e:
        print(f"JWT decoding error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )