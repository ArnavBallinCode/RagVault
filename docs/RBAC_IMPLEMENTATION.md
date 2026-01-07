# Role-Based Access Control (RBAC) Implementation Guide

> Complete technical documentation for the authentication and authorization system in RagVault, covering user management, role definitions, and security best practices.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [User Management](#user-management)
4. [Role Definitions](#role-definitions)
5. [Authentication Flow](#authentication-flow)
6. [Authorization Checks](#authorization-checks)
7. [Implementation Details](#implementation-details)
8. [Security Considerations](#security-considerations)
9. [Extending the System](#extending-the-system)
10. [API Integration](#api-integration)

---

## Overview

### What is RBAC?

Role-Based Access Control (RBAC) is a method of regulating access to system resources based on the roles of individual users. In RagVault, RBAC ensures:

- **Confidentiality**: Users only see what they're authorized to see
- **Integrity**: Only admins can modify the knowledge base
- **Accountability**: Actions are tracked by user identity

### Current Implementation

RagVault implements a two-role RBAC system:

| Role | Description | Permissions |
|------|-------------|-------------|
| **Admin** | System administrator | Full access to all features |
| **User** | Standard user | Query access only |

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                      RBAC ARCHITECTURE                           │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌───────────────┐     ┌──────────────────────┐
│    LOGIN     │────▶│ AUTHENTICATE  │────▶│  SESSION MANAGER     │
│    FORM      │     │   SERVICE     │     │  (Streamlit State)   │
└──────────────┘     └───────┬───────┘     └───────────┬──────────┘
                             │                         │
                             ▼                         ▼
                    ┌─────────────────┐       ┌─────────────────┐
                    │   users.json    │       │ Authorization   │
                    │   (User Store)  │       │    Checks       │
                    └─────────────────┘       └────────┬────────┘
                                                       │
                    ┌──────────────────────────────────┼──────────┐
                    │                                  │          │
                    ▼                                  ▼          ▼
            ┌──────────────┐                  ┌────────────┐ ┌─────────┐
            │ Admin Pages  │                  │ User Pages │ │ Denied  │
            │ - Users      │                  │ - Chat     │ │  Page   │
            │ - Documents  │                  │ - Settings │ └─────────┘
            │ - Web Scrape │                  └────────────┘
            └──────────────┘
```

### File Structure

```
config/
├── users.json          # User database (gitignored)
└── init_config.yaml    # System configuration

streamlit_app.py        # Contains RBAC implementation (lines 21-79)
```

---

## User Management

### User Data Structure

Users are stored in `config/users.json`:

```json
{
  "admin": {
    "password": "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
    "role": "admin",
    "name": "Administrator"
  },
  "user": {
    "password": "04f8996da763b7a969b1028ee3007569eaf3a635486ddab211d512c85b9df8fb",
    "role": "user",
    "name": "Standard User"
  }
}
```

### Default Accounts

| Username | Password | Role | Purpose |
|----------|----------|------|---------|
| `admin` | `admin123` | admin | System administration |
| `user` | `user123` | user | Standard access |

> ⚠️ **Security Note**: Change default passwords immediately after deployment!

### Password Storage

Passwords are stored as SHA-256 hashes:

```python
import hashlib

def hash_password(password: str) -> str:
    """Hash a password using SHA-256."""
    return hashlib.sha256(password.encode()).hexdigest()

# Example:
hash_password("admin123")
# Returns: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918"
```

---

## Role Definitions

### Admin Role

**Full system access including:**

- ✅ Query the knowledge base
- ✅ View chat history
- ✅ Upload new documents
- ✅ Delete documents
- ✅ Scrape web content
- ✅ Manage users (CRUD)
- ✅ View system settings
- ✅ Access all configuration

### User Role

**Limited to query functionality:**

- ✅ Query the knowledge base
- ✅ View chat history
- ✅ View document list (read-only)
- ✅ View system settings (read-only)
- ❌ Upload documents
- ❌ Delete documents
- ❌ Scrape web content
- ❌ Manage users

### Permission Matrix

| Feature | Admin | User | Guest |
|---------|-------|------|-------|
| Login | ✅ | ✅ | ❌ |
| Chat Query | ✅ | ✅ | ❌ |
| View Documents | ✅ | ✅ | ❌ |
| Upload Documents | ✅ | ❌ | ❌ |
| Delete Documents | ✅ | ❌ | ❌ |
| Web Scraper | ✅ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ |
| Settings (Edit) | ✅ | ❌ | ❌ |
| Settings (View) | ✅ | ✅ | ❌ |

---

## Authentication Flow

### Login Process

```
┌────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                          │
└────────────────────────────────────────────────────────────────┘

User                    Frontend                      Backend
  │                        │                             │
  │   Enter credentials    │                             │
  │───────────────────────▶│                             │
  │                        │                             │
  │                        │   Validate (SHA-256)        │
  │                        │────────────────────────────▶│
  │                        │                             │
  │                        │   User data / None          │
  │                        │◀────────────────────────────│
  │                        │                             │
  │                        │   Store in session_state    │
  │                        │──────────┐                  │
  │                        │          │                  │
  │                        │◀─────────┘                  │
  │                        │                             │
  │   Redirect to App      │                             │
  │◀───────────────────────│                             │
  │                        │                             │
```

### Session Management

Using Streamlit's `session_state`:

```python
# Store user after successful login
st.session_state.user = {
    "username": "admin",
    "role": "admin",
    "name": "Administrator"
}

# Check if logged in
def is_logged_in() -> bool:
    return "user" in st.session_state and st.session_state.user is not None

# Check if admin
def is_admin() -> bool:
    return st.session_state.get("user", {}).get("role") == "admin"
```

---

## Authorization Checks

### Page-Level Authorization

```python
# streamlit_app.py - Sidebar navigation

def render_sidebar():
    pages = {
        "💬 Chat": "Chat",
        "📁 Documents": "Documents",
        "⚙️ Settings": "Settings"
    }
    
    # Admin-only page
    if is_admin():
        pages["👥 Users"] = "Users"
    
    for label, page in pages.items():
        if st.button(label):
            st.session_state.current_page = page
```

### Feature-Level Authorization

```python
# streamlit_app.py - Document upload section

def render_documents_page():
    if is_admin():
        # Admin can upload
        st.subheader("📤 Upload New Documents")
        uploaded_files = st.file_uploader(
            "Drag and drop files here",
            type=["pdf", "docx", "txt", "md"],
            accept_multiple_files=True
        )
        # ... upload logic
    else:
        # Users see read-only message
        st.info("📋 View-only mode. Contact an administrator to upload documents.")
```

### Action-Level Authorization

```python
# streamlit_app.py - User management page

def render_users_page():
    if not is_admin():
        st.error("⛔ Access Denied. Administrator privileges required.")
        return
    
    # Admin-only functionality
    # ... user management code
```

---

## Implementation Details

### Core Functions

Location: `streamlit_app.py` (lines 21-79)

```python
# =============================================================================
# USER & ROLE MANAGEMENT
# =============================================================================

USERS_FILE = "config/users.json"

# Default users (password is hashed)
DEFAULT_USERS = {
    "admin": {
        "password": hashlib.sha256("admin123".encode()).hexdigest(),
        "role": "admin",
        "name": "Administrator"
    },
    "user": {
        "password": hashlib.sha256("user123".encode()).hexdigest(),
        "role": "user", 
        "name": "Standard User"
    }
}

def load_users() -> dict:
    """Load users from JSON file or create default."""
    if Path(USERS_FILE).exists():
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    else:
        save_users(DEFAULT_USERS)
        return DEFAULT_USERS

def save_users(users: dict):
    """Save users to JSON file."""
    Path(USERS_FILE).parent.mkdir(parents=True, exist_ok=True)
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=2)

def hash_password(password: str) -> str:
    """Hash a password using SHA-256."""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_user(username: str, password: str) -> Optional[dict]:
    """Verify user credentials and return user data if valid."""
    users = load_users()
    if username in users:
        if users[username]["password"] == hash_password(password):
            return {
                "username": username,
                "role": users[username]["role"],
                "name": users[username]["name"]
            }
    return None

def is_admin() -> bool:
    """Check if current user is admin."""
    return st.session_state.get("user", {}).get("role") == "admin"

def is_logged_in() -> bool:
    """Check if user is logged in."""
    return "user" in st.session_state and st.session_state.user is not None
```

### Login Page

Location: `streamlit_app.py` (lines 211-245)

```python
def render_login_page():
    """Render the login page."""
    st.markdown('<h1>🔒 Secure RAG System</h1>', unsafe_allow_html=True)
    
    with st.form("login_form"):
        username = st.text_input("Username", placeholder="Enter username")
        password = st.text_input("Password", type="password")
        
        submitted = st.form_submit_button("🔑 Login")
        
        if submitted:
            if username and password:
                user = verify_user(username, password)
                if user:
                    st.session_state.user = user
                    st.success(f"Welcome, {user['name']}!")
                    st.rerun()
                else:
                    st.error("Invalid username or password")
            else:
                st.warning("Please enter both username and password")
```

### User Management Page

Location: `streamlit_app.py` (lines 703-762)

```python
def render_users_page():
    """Render the user management page (Admin only)."""
    if not is_admin():
        st.error("⛔ Access Denied. Administrator privileges required.")
        return
    
    users = load_users()
    
    # Display existing users
    for username, user_data in users.items():
        # Show user info with role badge
        # Delete button (except main admin)
        if username != "admin":
            if st.button("🗑️", key=f"del_{username}"):
                del users[username]
                save_users(users)
    
    # Add new user form
    with st.form("add_user_form"):
        new_username = st.text_input("Username")
        new_password = st.text_input("Password", type="password")
        new_name = st.text_input("Display Name")
        new_role = st.selectbox("Role", ["user", "admin"])
        
        if st.form_submit_button("➕ Add User"):
            if new_username not in users:
                users[new_username] = {
                    "password": hash_password(new_password),
                    "role": new_role,
                    "name": new_name
                }
                save_users(users)
```

---

## Security Considerations

### Current Security Measures

1. **Password Hashing**: SHA-256 hash (not plaintext)
2. **Role Validation**: Server-side checks on every action
3. **Session Management**: Streamlit's secure session state
4. **File Protection**: users.json is gitignored

### Recommended Improvements

#### 1. Use bcrypt for Password Hashing

```python
# More secure password hashing
import bcrypt

def hash_password_secure(password: str) -> str:
    """Hash password using bcrypt with salt."""
    return bcrypt.hashpw(
        password.encode(), 
        bcrypt.gensalt()
    ).decode()

def verify_password_secure(password: str, hashed: str) -> bool:
    """Verify password against bcrypt hash."""
    return bcrypt.checkpw(password.encode(), hashed.encode())
```

#### 2. Add Session Timeout

```python
from datetime import datetime, timedelta

SESSION_TIMEOUT = timedelta(hours=8)

def check_session_validity():
    """Check if session has expired."""
    if "login_time" not in st.session_state:
        return False
    
    login_time = st.session_state.login_time
    if datetime.now() - login_time > SESSION_TIMEOUT:
        st.session_state.user = None
        return False
    return True
```

#### 3. Add Login Attempt Limiting

```python
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION = timedelta(minutes=15)

login_attempts = {}

def check_login_allowed(username: str) -> bool:
    """Check if login is allowed (not locked out)."""
    if username not in login_attempts:
        return True
    
    attempts, last_attempt = login_attempts[username]
    
    if attempts >= MAX_LOGIN_ATTEMPTS:
        if datetime.now() - last_attempt < LOCKOUT_DURATION:
            return False
        else:
            # Reset after lockout period
            login_attempts[username] = (0, datetime.now())
    return True

def record_failed_login(username: str):
    """Record a failed login attempt."""
    if username in login_attempts:
        attempts, _ = login_attempts[username]
        login_attempts[username] = (attempts + 1, datetime.now())
    else:
        login_attempts[username] = (1, datetime.now())
```

#### 4. Add Audit Logging

```python
import logging

audit_logger = logging.getLogger("audit")
audit_logger.setLevel(logging.INFO)

def log_action(user: str, action: str, details: str = ""):
    """Log user actions for audit trail."""
    audit_logger.info(f"USER={user} ACTION={action} DETAILS={details}")

# Usage:
log_action("admin", "document_upload", "uploaded: report.pdf")
log_action("admin", "user_create", "created user: john.doe")
log_action("user", "query", "query: What is...")
```

---

## Extending the System

### Adding New Roles

```python
# Example: Adding "editor" role

ROLE_PERMISSIONS = {
    "admin": {
        "can_query": True,
        "can_upload": True,
        "can_delete": True,
        "can_manage_users": True,
        "can_scrape_web": True,
        "can_edit_config": True
    },
    "editor": {
        "can_query": True,
        "can_upload": True,
        "can_delete": False,
        "can_manage_users": False,
        "can_scrape_web": True,
        "can_edit_config": False
    },
    "user": {
        "can_query": True,
        "can_upload": False,
        "can_delete": False,
        "can_manage_users": False,
        "can_scrape_web": False,
        "can_edit_config": False
    }
}

def has_permission(permission: str) -> bool:
    """Check if current user has a specific permission."""
    role = st.session_state.get("user", {}).get("role")
    if not role:
        return False
    return ROLE_PERMISSIONS.get(role, {}).get(permission, False)

# Usage:
if has_permission("can_upload"):
    # Show upload UI
    pass
```

### Document-Level Permissions

```python
# Future enhancement: per-document permissions

DOCUMENT_PERMISSIONS = {
    "confidential_report.pdf": ["admin"],
    "public_docs/*": ["admin", "editor", "user"],
    "internal/*": ["admin", "editor"]
}

def can_access_document(doc_path: str, user_role: str) -> bool:
    """Check if user can access a specific document."""
    for pattern, allowed_roles in DOCUMENT_PERMISSIONS.items():
        if fnmatch.fnmatch(doc_path, pattern):
            return user_role in allowed_roles
    return user_role == "admin"  # Default: admin only
```

---

## API Integration

### Adding RBAC to FastAPI Backend

```python
# api_server.py - Add authentication

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import hashlib

security = HTTPBasic()

def verify_credentials(credentials: HTTPBasicCredentials = Depends(security)):
    """Verify API credentials."""
    users = load_users()
    username = credentials.username
    password_hash = hashlib.sha256(credentials.password.encode()).hexdigest()
    
    if username not in users:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if users[username]["password"] != password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    return {
        "username": username,
        "role": users[username]["role"]
    }

def require_admin(user: dict = Depends(verify_credentials)):
    """Require admin role for endpoint."""
    if user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return user

# Protected endpoints
@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    user: dict = Depends(require_admin)  # Admin only
):
    # ... upload logic
    pass

@app.post("/query")
async def query(
    request: QueryRequest,
    user: dict = Depends(verify_credentials)  # Any authenticated user
):
    # ... query logic
    pass
```

### React Frontend Integration

```typescript
// frontend/src/api/client.ts - Add auth headers

const API_BASE = 'http://localhost:8000';

// Store credentials (in real app, use proper token management)
let authCredentials: string | null = null;

export const setCredentials = (username: string, password: string) => {
    authCredentials = btoa(`${username}:${password}`);
};

export const api = {
    async query(query: string, topK: number): Promise<QueryResponse> {
        const res = await fetch(`${API_BASE}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${authCredentials}`
            },
            body: JSON.stringify({ query, top_k: topK }),
        });

        if (res.status === 401) {
            throw new Error('Authentication required');
        }
        if (res.status === 403) {
            throw new Error('Permission denied');
        }
        
        return res.json();
    },
    
    // ... other methods
};
```

---

## Summary

RagVault's RBAC implementation provides:

1. **Two-tier role system** (Admin/User)
2. **SHA-256 password hashing**
3. **Session-based authentication**
4. **Page, feature, and action-level authorization**
5. **Admin-only user management**

### Key Files

| File | Purpose |
|------|---------|
| `streamlit_app.py` | RBAC logic (lines 21-79, 703-762) |
| `config/users.json` | User database (gitignored) |

### Improvement Roadmap

- [ ] Migrate to bcrypt for password hashing
- [ ] Add session timeout
- [ ] Implement login attempt limiting
- [ ] Add audit logging
- [ ] JWT-based API authentication
- [ ] Document-level permissions
- [ ] Multi-role support (editor, viewer, etc.)

---

*Last updated: January 2026*
