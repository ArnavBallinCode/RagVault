"""
RagVault RBAC (Role-Based Access Control) Module
Centralized access control for API endpoints
"""

from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from auth import decode_token, get_user, Role, TokenData, UserInDB

# Security scheme
security = HTTPBearer(auto_error=False)


class RBACError(HTTPException):
    """Custom RBAC exception"""
    pass


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> UserInDB:
    """
    Extract and validate current user from JWT token.
    Returns UserInDB if valid, raises 401 if not.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    token_data = decode_token(token)
    
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = get_user(token_data.username)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[UserInDB]:
    """
    Extract user from token if present, return None if not.
    Used for public endpoints that may have optional auth.
    """
    if credentials is None:
        return None
    
    try:
        token = credentials.credentials
        token_data = decode_token(token)
        if token_data is None:
            return None
        return get_user(token_data.username)
    except Exception:
        return None


class RoleRequired:
    """
    Dependency that requires specific role(s) for access.
    
    Usage:
        @app.get("/admin-only", dependencies=[Depends(RoleRequired([Role.ADMIN]))])
        async def admin_endpoint():
            ...
    
    Or inject user:
        @app.get("/protected")
        async def protected_endpoint(user: UserInDB = Depends(RoleRequired([Role.ADMIN, Role.USER]))):
            ...
    """
    
    def __init__(self, allowed_roles: List[Role]):
        self.allowed_roles = allowed_roles
    
    async def __call__(
        self,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
    ) -> UserInDB:
        # Get current user (handles 401)
        if credentials is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        token = credentials.credentials
        token_data = decode_token(token)
        
        if token_data is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user = get_user(token_data.username)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check role
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {[r.value for r in self.allowed_roles]}",
            )
        
        return user


# Convenience dependency instances
require_admin = RoleRequired([Role.ADMIN])
require_user = RoleRequired([Role.USER])
require_any_authenticated = RoleRequired([Role.ADMIN, Role.USER])
