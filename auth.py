"""
RagVault Authentication Module
JWT-based authentication with role and department support
"""

from datetime import datetime, timedelta
from typing import Optional, List
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from enum import Enum
import json
import os

# Security configuration
SECRET_KEY = "ragvault-secret-key-change-in-production-2024"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Data file paths
USERS_FILE = os.path.join(os.path.dirname(__file__), "data", "users.json")


class Role(str, Enum):
    ADMIN = "admin"
    USER = "user"


class Department(str, Enum):
    """
    Fixed set of departments (V1).
    'general' is a shared department accessible to ALL users.
    """
    FINANCE = "finance"
    HR = "hr"
    ENGINEERING = "engineering"
    PRODUCT = "product"
    LEGAL = "legal"
    OPERATIONS = "operations"
    SALES = "sales"
    GENERAL = "general"  # Shared - everyone can access


# Shared department constant
SHARED_DEPARTMENT = Department.GENERAL.value


class UserInDB(BaseModel):
    username: str
    hashed_password: str
    role: Role
    name: str
    departments: List[str] = ["general"]  # Default to general only


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str
    name: str
    departments: List[str]  # NEW: Include departments in token response


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
    departments: List[str] = []  # NEW: Departments from JWT


class LoginRequest(BaseModel):
    username: str
    password: str


def _load_users_db() -> dict:
    """Load users from JSON file, create default if not exists"""
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, 'r') as f:
                data = json.load(f)
                # Convert to UserInDB objects
                return {
                    username: UserInDB(**user_data)
                    for username, user_data in data.items()
                }
        except Exception:
            pass
    
    # Default users if file doesn't exist
    default_users = {
        "admin": UserInDB(
            username="admin",
            hashed_password=pwd_context.hash("admin123"),
            role=Role.ADMIN,
            name="Administrator",
            departments=["*"]  # Admin gets access to all departments
        ),
        "user": UserInDB(
            username="user",
            hashed_password=pwd_context.hash("user123"),
            role=Role.USER,
            name="Standard User",
            departments=["general"]  # Default user only gets general
        ),
    }
    
    # Save default users to file
    _save_users_db(default_users)
    return default_users


def _save_users_db(users_db: dict) -> None:
    """Save users to JSON file"""
    os.makedirs(os.path.dirname(USERS_FILE), exist_ok=True)
    data = {
        username: user.model_dump()
        for username, user in users_db.items()
    }
    with open(USERS_FILE, 'w') as f:
        json.dump(data, f, indent=2)


# Load users on module import
USERS_DB = _load_users_db()


def reload_users() -> None:
    """Reload users from file (useful after updates)"""
    global USERS_DB
    USERS_DB = _load_users_db()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_user(username: str) -> Optional[UserInDB]:
    """Get user from database"""
    return USERS_DB.get(username)


def get_all_users() -> List[UserInDB]:
    """Get all users (for admin management)"""
    return list(USERS_DB.values())


def update_user_departments(username: str, departments: List[str]) -> Optional[UserInDB]:
    """Update a user's department assignments"""
    if username not in USERS_DB:
        return None
    
    user = USERS_DB[username]
    # Validate departments
    valid_depts = [d.value for d in Department]
    for dept in departments:
        if dept != "*" and dept not in valid_depts:
            raise ValueError(f"Invalid department: {dept}")
    
    # Update user
    updated_user = UserInDB(
        username=user.username,
        hashed_password=user.hashed_password,
        role=user.role,
        name=user.name,
        departments=departments
    )
    USERS_DB[username] = updated_user
    _save_users_db(USERS_DB)
    return updated_user


def get_user_accessible_departments(user: UserInDB) -> List[str]:
    """
    Get all departments a user can access.
    - Admins: All departments
    - Users: Their assigned departments + 'general' (shared)
    """
    if user.role == Role.ADMIN or "*" in user.departments:
        return [d.value for d in Department]
    
    # User gets their departments + general (if not already included)
    accessible = set(user.departments)
    accessible.add(SHARED_DEPARTMENT)  # Everyone can access general
    return list(accessible)


def authenticate_user(username: str, password: str) -> Optional[UserInDB]:
    """Authenticate user with username and password"""
    user = get_user(username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[TokenData]:
    """Decode and validate JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        departments: List[str] = payload.get("departments", [])
        if username is None:
            return None
        return TokenData(username=username, role=role, departments=departments)
    except JWTError:
        return None
