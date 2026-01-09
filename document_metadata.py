"""
RagVault Document Metadata Manager
Handles document-to-department mapping and metadata storage
"""

import json
import os
from typing import Dict, List, Optional
from datetime import datetime

from auth import Department, SHARED_DEPARTMENT


METADATA_FILE = os.path.join(os.path.dirname(__file__), "data", "documents_metadata.json")


class DocumentMetadata:
    """Manages document metadata including department assignments"""
    
    def __init__(self):
        self._metadata: Dict[str, dict] = {}
        self._load()
    
    def _load(self) -> None:
        """Load metadata from file"""
        if os.path.exists(METADATA_FILE):
            try:
                with open(METADATA_FILE, 'r') as f:
                    data = json.load(f)
                    # Filter out meta keys starting with _
                    self._metadata = {
                        k: v for k, v in data.items() 
                        if not k.startswith("_")
                    }
            except Exception:
                self._metadata = {}
        else:
            self._metadata = {}
    
    def _save(self) -> None:
        """Save metadata to file"""
        os.makedirs(os.path.dirname(METADATA_FILE), exist_ok=True)
        # Add meta description
        data = {
            "_description": "Document to department mapping",
            **self._metadata
        }
        with open(METADATA_FILE, 'w') as f:
            json.dump(data, f, indent=2)
    
    def get(self, filename: str) -> Optional[dict]:
        """Get metadata for a document"""
        return self._metadata.get(filename)
    
    def get_department(self, filename: str) -> str:
        """Get department for a document, default to 'general'"""
        meta = self.get(filename)
        if meta:
            return meta.get("department", SHARED_DEPARTMENT)
        return SHARED_DEPARTMENT
    
    def set(self, filename: str, department: str, uploaded_by: str = None) -> None:
        """Set metadata for a document"""
        # Validate department
        valid_depts = [d.value for d in Department]
        if department not in valid_depts:
            raise ValueError(f"Invalid department: {department}")
        
        self._metadata[filename] = {
            "department": department,
            "uploaded_at": datetime.utcnow().isoformat(),
            "uploaded_by": uploaded_by
        }
        self._save()
    
    def update_department(self, filename: str, department: str) -> bool:
        """Update department for an existing document"""
        if filename not in self._metadata:
            return False
        
        # Validate department
        valid_depts = [d.value for d in Department]
        if department not in valid_depts:
            raise ValueError(f"Invalid department: {department}")
        
        self._metadata[filename]["department"] = department
        self._metadata[filename]["updated_at"] = datetime.utcnow().isoformat()
        self._save()
        return True
    
    def delete(self, filename: str) -> bool:
        """Remove metadata for a document"""
        if filename in self._metadata:
            del self._metadata[filename]
            self._save()
            return True
        return False
    
    def list_all(self) -> Dict[str, dict]:
        """Get all document metadata"""
        return self._metadata.copy()
    
    def list_by_department(self, department: str) -> List[str]:
        """Get all documents in a specific department"""
        return [
            filename for filename, meta in self._metadata.items()
            if meta.get("department") == department
        ]
    
    def list_by_departments(self, departments: List[str]) -> List[str]:
        """Get all documents in any of the specified departments"""
        return [
            filename for filename, meta in self._metadata.items()
            if meta.get("department") in departments
        ]
    
    def ensure_all_documents_have_metadata(self, filenames: List[str]) -> None:
        """Ensure all documents have metadata, assign 'general' if missing"""
        for filename in filenames:
            if filename not in self._metadata:
                self._metadata[filename] = {
                    "department": SHARED_DEPARTMENT,
                    "uploaded_at": datetime.utcnow().isoformat(),
                    "uploaded_by": "system",
                    "auto_assigned": True
                }
        self._save()
    
    def refresh(self) -> None:
        """Reload metadata from file"""
        self._load()


# Singleton instance
document_metadata = DocumentMetadata()
