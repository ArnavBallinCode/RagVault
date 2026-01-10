"""
RagVault REST API Server
Production-grade API with RBAC and Prometheus metrics
"""

# Force HuggingFace to use only locally cached models (100% offline mode)
import os
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, FileResponse, StreamingResponse
from pydantic import BaseModel
import uvicorn
import os
import shutil
import logging
from typing import List, Optional
from datetime import datetime, timedelta
import json

# Query history file
HISTORY_FILE = "data/query_history.json"

from initialize_rag import RAGInitializer
from src.utils.chunk_extractor import extract_query_focused_content

# Auth & RBAC imports
from auth import (
    authenticate_user, create_access_token, 
    LoginRequest, Token, Role, ACCESS_TOKEN_EXPIRE_MINUTES,
    Department, get_user_accessible_departments, get_all_users,
    update_user_departments, reload_users
)
from rbac import (
    RoleRequired, get_current_user, require_admin, require_any_authenticated,
    can_access_department, filter_by_department, require_department_access,
    validate_department
)
from auth import UserInDB
from document_metadata import document_metadata

# Metrics imports
import metrics

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="RagVault API", version="2.0")

# Add CORS middleware for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global RAG components (initialized on startup)
rag_components = None

# Helper to save query history
def save_query_history(entry: dict):
    """Append a query to the history file"""
    try:
        history = []
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, 'r') as f:
                history = json.load(f)
        history.append(entry)
        # Keep only last 1000 entries
        history = history[-1000:]
        os.makedirs(os.path.dirname(HISTORY_FILE), exist_ok=True)
        with open(HISTORY_FILE, 'w') as f:
            json.dump(history, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save query history: {e}")

class QueryRequest(BaseModel):
    query: str
    top_k: int = 2

class SourceDetail(BaseModel):
    """Detailed source information for evidence pop-ups with precision extraction"""
    filename: str
    pages: Optional[str] = None  # e.g., "1, 3, 5" or None if no page metadata
    focused_content: str  # Query-relevant content only (precision extracted)
    matched_entities: List[str] = []  # Entities matched for highlighting
    department: str

class QueryResponse(BaseModel):
    query: str
    answer: str
    sources: List[str]  # Backward compatibility
    source_details: Optional[List[SourceDetail]] = None  # Detailed source info for pop-ups
    timestamp: str

@app.on_event("startup")
async def startup_event():
    """Initialize RAG system on startup"""
    global rag_components
    try:
        # Reload users from file to ensure latest data
        reload_users()
        logger.info("Users loaded from file")
        
        logger.info("Initializing RAG system...")
        with metrics.time_index_build():
            initializer = RAGInitializer("config/init_config.yaml", "config/process_config.yaml")
            rag_components = initializer.initialize()
            rag_components.retriever.initialize(rag_components.original_chunks)
        
        # Update metrics
        metrics.update_chunk_count(len(rag_components.original_chunks) if rag_components else 0)
        upload_dir = "data/uploads"
        doc_count = len([f for f in os.listdir(upload_dir) if os.path.isfile(os.path.join(upload_dir, f))]) if os.path.exists(upload_dir) else 0
        metrics.update_document_count(doc_count)
        
        logger.info("RAG system initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize RAG system: {e}")
        raise

# ============================================================================
# PUBLIC ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    """Health check endpoint"""
    metrics.record_request("/", "GET", "success")
    return {"status": "ok", "message": "RagVault API is running"}

@app.get("/health")
@app.get("/health/")  # Handle trailing slash to prevent redirect loop
async def health():
    """Detailed health check"""
    metrics.record_request("/health", "GET", "success")
    return {
        "status": "healthy",
        "rag_initialized": rag_components is not None,
        "documents_indexed": len(rag_components.original_chunks) if rag_components else 0
    }

@app.post("/login", response_model=Token)
async def login(request: LoginRequest):
    """Authenticate user and return JWT token"""
    user = authenticate_user(request.username, request.password)
    if not user:
        metrics.record_request("/login", "POST", "error")
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )
    
    # Include departments in token
    accessible_depts = get_user_accessible_departments(user)
    
    access_token = create_access_token(
        data={
            "sub": user.username, 
            "role": user.role.value,
            "departments": accessible_depts
        }
    )
    
    metrics.record_request("/login", "POST", "success")
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user.role.value,
        username=user.username,
        name=user.name,
        departments=accessible_depts
    )

# ============================================================================
# PROTECTED ENDPOINTS - Admin + User
# ============================================================================

@app.post("/query", response_model=QueryResponse)
async def query(
    request: QueryRequest,
    user: UserInDB = Depends(require_any_authenticated)
):
    """Ask a question and get an answer from your documents"""
    if rag_components is None:
        metrics.record_query(user.role.value, "error")
        raise HTTPException(status_code=503, detail="RAG system not initialized")
    
    try:
        with metrics.time_request("/query", "POST"):
            logger.info(f"Processing query from {user.username}: {request.query}")
            
            # Get user's accessible departments
            accessible_depts = get_user_accessible_departments(user)
            logger.info(f"User {user.username} has access to departments: {accessible_depts}")
            
            # Retrieve documents
            with metrics.time_retrieval():
                retrieved_results = rag_components.retriever.retrieve_with_method(
                    request.query,
                    method="hybrid",
                    top_k=rag_components.process_config['retrieval']['top_k'] * 3  # Get more results to filter
                )
            
            logger.info(f"Retrieved {len(retrieved_results)} documents before filtering")
            
            # Filter documents by user's department access
            filtered_results = []
            for result in retrieved_results:
                source = result.document.metadata.get('source', '')
                # Extract filename from path
                filename = os.path.basename(source)
                doc_department = document_metadata.get_department(filename)
                
                if doc_department in accessible_depts:
                    filtered_results.append(result)
                else:
                    logger.debug(f"Filtered out document {filename} (dept: {doc_department}) - user has no access")
            
            logger.info(f"After department filtering: {len(filtered_results)} documents for user {user.username}")
            
            # If no documents accessible, return appropriate message
            if not filtered_results:
                logger.warning(f"No accessible documents for user {user.username}")
                return QueryResponse(
                    query=request.query,
                    answer="No documents found in your accessible departments. Please contact admin to get access to relevant documents.",
                    sources=[],
                    timestamp=datetime.now().isoformat()
                )
            
            # Rerank if configured
            if rag_components.process_config['retrieval']['use_reranking']:
                with metrics.time_rerank():
                    reranked_results = rag_components.reranker.rerank(
                        request.query,
                        [r.document for r in filtered_results],
                        top_k=request.top_k
                    )
                relevant_docs = [r.document for r in reranked_results]
            else:
                relevant_docs = [r.document for r in filtered_results[:request.top_k]]
            
            # Generate response
            with metrics.time_llm():
                response_data = rag_components.response_generator.generate_answer(
                    request.query,
                    relevant_docs,
                    metadata={}
                )
            
            # Extract sources (backward compatibility)
            sources = [doc.metadata.get('source', 'unknown') for doc in relevant_docs]
            
            # Build detailed source info for pop-ups (deduplicated by filename)
            source_map = {}  # filename -> {pages: set, chunks: list, dept: str}
            for doc in relevant_docs:
                source_path = doc.metadata.get('source', 'unknown')
                filename = os.path.basename(source_path)
                page = doc.metadata.get('page') or doc.metadata.get('page_number')
                # Store full chunk for precision extraction
                chunk_content = doc.page_content
                dept = document_metadata.get_department(filename)
                
                if filename not in source_map:
                    source_map[filename] = {
                        'pages': set(),
                        'chunks': [],
                        'department': dept
                    }
                
                if page is not None:
                    source_map[filename]['pages'].add(int(page))
                source_map[filename]['chunks'].append(chunk_content)
            
            # Convert to SourceDetail list with precision extraction (one per document)
            source_details = []
            for filename, data in source_map.items():
                # Format pages like "1, 3, 5" or None
                pages_str = None
                if data['pages']:
                    sorted_pages = sorted(data['pages'])
                    pages_str = ', '.join(str(p) for p in sorted_pages)
                
                # Combine all chunks from this document for extraction
                combined_raw = '\n\n'.join(data['chunks'][:3])  # Max 3 chunks per doc
                
                # Apply precision extraction - get only query-relevant content
                focused_content, matched_entities = extract_query_focused_content(
                    query=request.query,
                    chunk=combined_raw,
                    max_sentences=3,
                    min_score_threshold=0.12
                )
                
                source_details.append(SourceDetail(
                    filename=filename,
                    pages=pages_str,
                    focused_content=focused_content,
                    matched_entities=matched_entities,
                    department=data['department']
                ))
            
            metrics.record_query(user.role.value, "success")
            
            # Save to history
            save_query_history({
                "timestamp": datetime.now().isoformat(),
                "user": user.username,
                "role": user.role.value,
                "query": request.query,
                "sources": list(set(sources)),
                "answer_preview": response_data['response'][:200] + "..." if len(response_data['response']) > 200 else response_data['response']
            })
            
            return QueryResponse(
                query=request.query,
                answer=response_data['response'],
                sources=list(set(sources)),
                source_details=source_details,
                timestamp=datetime.now().isoformat()
            )
    
    except Exception as e:
        logger.error(f"Query error: {e}")
        metrics.record_query(user.role.value, "error")
        metrics.record_error("/query", type(e).__name__)
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# PROTECTED ENDPOINTS - Admin Only
# ============================================================================

@app.get("/history")
async def get_query_history(
    user: UserInDB = Depends(require_admin)
):
    """Get all query history (admin only)"""
    try:
        if not os.path.exists(HISTORY_FILE):
            return {"history": [], "total": 0}
        
        with open(HISTORY_FILE, 'r') as f:
            history = json.load(f)
        
        # Return most recent first
        history.reverse()
        
        metrics.record_request("/history", "GET", "success")
        return {"history": history, "total": len(history)}
    except Exception as e:
        logger.error(f"Failed to read history: {e}")
        metrics.record_request("/history", "GET", "error")
        raise HTTPException(status_code=500, detail="Failed to read history")

@app.post("/upload", response_model=dict)
async def upload_document(
    file: UploadFile = File(...),
    department: str = Form(...),
    user: UserInDB = Depends(require_admin)
):
    """
    Upload a document to the system
    Supported formats: PDF, DOCX, TXT, DOC, MD, PNG, JPG, JPEG, TIFF, BMP
    Images are processed via OCR. Requires department assignment.
    """
    try:
        with metrics.time_request("/upload", "POST"):
            # Validate department
            validate_department(department)
            
            # Validate file extension (including images for OCR)
            allowed_extensions = {'.pdf', '.docx', '.txt', '.doc', '.md', '.png', '.jpg', '.jpeg', '.tiff', '.tif', '.bmp'}
            file_ext = os.path.splitext(file.filename)[1].lower()
            
            if file_ext not in allowed_extensions:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
                )
            
            # Save file to uploads directory
            upload_path = os.path.join("data/uploads", file.filename)
            os.makedirs("data/uploads", exist_ok=True)
            
            with open(upload_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Save document metadata with department
            document_metadata.set(file.filename, department, user.username)
            
            logger.info(f"Uploaded file by {user.username}: {file.filename} (dept: {department})")
            
            # Update document count metric
            doc_count = len([f for f in os.listdir("data/uploads") if os.path.isfile(os.path.join("data/uploads", f))])
            metrics.update_document_count(doc_count)
            metrics.record_request("/upload", "POST", "success")
            
            return {
                "status": "success",
                "message": f"File '{file.filename}' uploaded to {department} department",
                "filename": file.filename,
                "department": department,
                "path": upload_path,
                "next_step": "Call POST /refresh to index the new document"
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}")
        metrics.record_error("/upload", type(e).__name__)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/refresh")
async def refresh_indices(user: UserInDB = Depends(require_admin)):
    """
    Refresh RAG indices to include newly uploaded documents
    This clears cache and rebuilds all indices
    """
    global rag_components
    try:
        with metrics.time_index_build():
            logger.info(f"Refreshing RAG indices (triggered by {user.username})...")
            
            # Clear cache
            cache_dir = "cache"
            if os.path.exists(cache_dir):
                for filename in os.listdir(cache_dir):
                    file_path = os.path.join(cache_dir, filename)
                    try:
                        if os.path.isfile(file_path):
                            os.unlink(file_path)
                    except Exception as e:
                        logger.error(f"Error deleting {file_path}: {e}")
            
            # Reinitialize RAG system
            initializer = RAGInitializer("config/init_config.yaml", "config/process_config.yaml")
            rag_components = initializer.initialize()
            rag_components.retriever.initialize(rag_components.original_chunks)
        
        # Update metrics
        metrics.update_chunk_count(len(rag_components.original_chunks) if rag_components else 0)
        metrics.record_request("/refresh", "POST", "success")
        
        logger.info("RAG system refreshed successfully")
        
        return {
            "status": "success",
            "message": "Indices refreshed successfully",
            "documents_indexed": len(rag_components.original_chunks)
        }
    
    except Exception as e:
        logger.error(f"Refresh error: {e}")
        metrics.record_error("/refresh", type(e).__name__)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/documents")
async def list_documents(user: UserInDB = Depends(require_any_authenticated)):
    """List documents accessible to the current user (filtered by department)"""
    with metrics.time_request("/documents", "GET"):
        upload_dir = "data/uploads"
        documents = []
        
        # Get user's accessible departments
        accessible_depts = get_user_accessible_departments(user)
        
        if os.path.exists(upload_dir):
            # Ensure all documents have metadata
            all_files = [f for f in os.listdir(upload_dir) if os.path.isfile(os.path.join(upload_dir, f))]
            document_metadata.ensure_all_documents_have_metadata(all_files)
            
            for filename in all_files:
                file_path = os.path.join(upload_dir, filename)
                doc_dept = document_metadata.get_department(filename)
                
                # Filter by department - users only see their departments
                if doc_dept not in accessible_depts:
                    continue
                
                stat = os.stat(file_path)
                doc_meta = document_metadata.get(filename) or {}
                documents.append({
                    "filename": filename,
                    "path": file_path,
                    "department": doc_dept,
                    "size_bytes": stat.st_size,
                    "size_mb": round(stat.st_size / (1024 * 1024), 2),
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "uploaded_by": doc_meta.get("uploaded_by", "unknown")
                })
        
        total_chunks = len(rag_components.original_chunks) if rag_components else 0
        
        metrics.record_request("/documents", "GET", "success")
        
        return {
            "documents": [d["path"] for d in documents],
            "documents_info": documents,
            "count": len(documents),
            "total_chunks": total_chunks,
            "max_file_size_mb": 10,
            "user_departments": accessible_depts,
            "is_admin": user.role == Role.ADMIN
        }

@app.delete("/documents/{filename}")
async def delete_document(filename: str, user: UserInDB = Depends(require_admin)):
    """Delete a specific document from uploads"""
    try:
        file_path = os.path.join("data/uploads", filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Document '{filename}' not found")
        
        os.remove(file_path)
        logger.info(f"Deleted document by {user.username}: {filename}")
        
        # Update document count metric
        doc_count = len([f for f in os.listdir("data/uploads") if os.path.isfile(os.path.join("data/uploads", f))])
        metrics.update_document_count(doc_count)
        metrics.record_request("/documents", "DELETE", "success")
        
        return {
            "status": "success",
            "message": f"Document '{filename}' deleted. Run /refresh to update indices."
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete error: {e}")
        metrics.record_error("/documents", type(e).__name__)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/clear")
async def clear_all(user: UserInDB = Depends(require_admin)):
    """Clear all data: uploads, cache, and reset RAG system"""
    global rag_components
    try:
        logger.info(f"Clearing all data (triggered by {user.username})...")
        
        # Clear uploads
        upload_dir = "data/uploads"
        if os.path.exists(upload_dir):
            for filename in os.listdir(upload_dir):
                file_path = os.path.join(upload_dir, filename)
                try:
                    if os.path.isfile(file_path):
                        os.remove(file_path)
                        logger.info(f"Deleted: {file_path}")
                except Exception as e:
                    logger.error(f"Error deleting {file_path}: {e}")
        
        # Clear cache
        cache_dir = "cache"
        if os.path.exists(cache_dir):
            for filename in os.listdir(cache_dir):
                file_path = os.path.join(cache_dir, filename)
                try:
                    if os.path.isfile(file_path):
                        os.remove(file_path)
                except Exception as e:
                    logger.error(f"Error deleting cache {file_path}: {e}")
        
        # Reset RAG components to None (will re-init on next refresh)
        rag_components = None
        
        # Update metrics
        metrics.update_document_count(0)
        metrics.update_chunk_count(0)
        metrics.record_request("/clear", "POST", "success")
        
        # Force garbage collection to free memory
        import gc
        gc.collect()
        
        logger.info("All data cleared successfully")
        
        return {
            "status": "success",
            "message": "All data cleared. Upload new documents and call /refresh to reinitialize."
        }
    except Exception as e:
        logger.error(f"Clear error: {e}")
        metrics.record_error("/clear", type(e).__name__)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/limits")
async def get_limits(user: UserInDB = Depends(require_admin)):
    """Get system limits and recommendations"""
    metrics.record_request("/limits", "GET", "success")
    return {
        "max_file_size_mb": 10,
        "max_total_documents": 20,
        "supported_formats": [".pdf", ".docx", ".txt", ".md", ".doc"],
        "recommendations": {
            "pdf_pages": "Up to 100 pages recommended",
            "total_memory": "Keep total documents under 50MB to avoid memory issues",
            "clear_cache": "Use /clear if you encounter memory errors"
        }
    }

# ============================================================================
# STATS ENDPOINT - Admin Only (JSON format for frontend)
# ============================================================================

@app.get("/stats")
async def get_stats(user: UserInDB = Depends(require_admin)):
    """Get operational system stats for SRE-grade observability"""
    from prometheus_client import REGISTRY
    import time
    
    stats = {
        # PRIMARY: Query latency breakdown
        "latency_breakdown": {
            "retrieval_ms": 0,
            "rerank_ms": 0,
            "llm_ms": 0,
            "total_ms": 0,
            "retrieval_pct": 0,
            "rerank_pct": 0,
            "llm_pct": 0
        },
        # Error rates by stage (not counts)
        "errors": {
            "retrieval_rate": 0.0,
            "rerank_rate": 0.0,
            "llm_rate": 0.0,
            "total_rate": 0.0,
            "retrieval_count": 0,
            "rerank_count": 0,
            "llm_count": 0,
            "total_count": 0
        },
        # Index health
        "index_health": {
            "documents_total": 0,
            "chunks_total": 0,
            "avg_chunks_per_doc": 0,
            "last_index_time": None,
            "last_index_duration_ms": 0,
            "is_stale": False
        },
        # LLM cost proxies
        "llm_stats": {
            "tokens_total": 0,
            "tokens_per_query_avg": 0,
            "llm_latency_p95": 0
        },
        # Real usage patterns
        "usage": {
            "queries_total": 0,
            "queries_by_role": {"admin": 0, "user": 0},
            "queries_per_minute": 0.0,
            "requests_total": 0
        },
        "system": {
            "rag_initialized": rag_components is not None
        }
    }
    
    # Track internal counters for calculations
    _latency_sums = {}
    _latency_counts = {}
    _error_counts = {}
    
    try:
        # Parse Prometheus metrics
        for metric in REGISTRY.collect():
            for sample in metric.samples:
                name = sample.name
                labels = sample.labels
                value = sample.value
                
                # === LATENCY METRICS ===
                if name == "ragvault_retrieval_latency_seconds_sum":
                    _latency_sums["retrieval"] = value * 1000  # to ms
                elif name == "ragvault_retrieval_latency_seconds_count":
                    _latency_counts["retrieval"] = value
                    
                elif name == "ragvault_rerank_latency_seconds_sum":
                    _latency_sums["rerank"] = value * 1000
                elif name == "ragvault_rerank_latency_seconds_count":
                    _latency_counts["rerank"] = value
                    
                elif name == "ragvault_llm_latency_seconds_sum":
                    _latency_sums["llm"] = value * 1000
                elif name == "ragvault_llm_latency_seconds_count":
                    _latency_counts["llm"] = value
                
                # === ERROR COUNTS ===
                elif name == "ragvault_errors_total":
                    endpoint = labels.get("endpoint", "unknown")
                    error_type = labels.get("error_type", "unknown")
                    
                    if "retriev" in endpoint.lower():
                        _error_counts["retrieval"] = _error_counts.get("retrieval", 0) + int(value)
                    elif "rerank" in endpoint.lower():
                        _error_counts["rerank"] = _error_counts.get("rerank", 0) + int(value)
                    elif "llm" in endpoint.lower() or "query" in endpoint.lower():
                        _error_counts["llm"] = _error_counts.get("llm", 0) + int(value)
                    
                    _error_counts["total"] = _error_counts.get("total", 0) + int(value)
                
                # === QUERY COUNTS ===
                elif name == "ragvault_queries_total":
                    role = labels.get("role", "unknown")
                    status = labels.get("status", "unknown")
                    
                    stats["usage"]["queries_total"] += int(value)
                    if role in stats["usage"]["queries_by_role"]:
                        stats["usage"]["queries_by_role"][role] += int(value)
                
                # === DOCUMENT/CHUNK GAUGES ===
                elif name == "ragvault_documents_total":
                    stats["index_health"]["documents_total"] = int(value)
                elif name == "ragvault_chunks_total":
                    stats["index_health"]["chunks_total"] = int(value)
                
                # === TOKEN COUNTS ===
                elif name == "ragvault_tokens_generated_total":
                    stats["llm_stats"]["tokens_total"] = int(value)
                
                # === REQUEST COUNTS ===
                elif name == "ragvault_requests_total":
                    stats["usage"]["requests_total"] += int(value)
                
                # === INDEX BUILD DURATION ===
                elif name == "ragvault_index_build_duration_seconds_sum":
                    stats["index_health"]["last_index_duration_ms"] = round(value * 1000, 2)
        
        # === CALCULATE LATENCY BREAKDOWN ===
        if _latency_counts.get("retrieval", 0) > 0:
            stats["latency_breakdown"]["retrieval_ms"] = round(
                _latency_sums.get("retrieval", 0) / _latency_counts["retrieval"], 2
            )
        if _latency_counts.get("rerank", 0) > 0:
            stats["latency_breakdown"]["rerank_ms"] = round(
                _latency_sums.get("rerank", 0) / _latency_counts["rerank"], 2
            )
        if _latency_counts.get("llm", 0) > 0:
            stats["latency_breakdown"]["llm_ms"] = round(
                _latency_sums.get("llm", 0) / _latency_counts["llm"], 2
            )
        
        # Total latency
        stats["latency_breakdown"]["total_ms"] = round(
            stats["latency_breakdown"]["retrieval_ms"] +
            stats["latency_breakdown"]["rerank_ms"] +
            stats["latency_breakdown"]["llm_ms"], 2
        )
        
        # Percentages
        total = stats["latency_breakdown"]["total_ms"]
        if total > 0:
            stats["latency_breakdown"]["retrieval_pct"] = round(
                (stats["latency_breakdown"]["retrieval_ms"] / total) * 100, 1
            )
            stats["latency_breakdown"]["rerank_pct"] = round(
                (stats["latency_breakdown"]["rerank_ms"] / total) * 100, 1
            )
            stats["latency_breakdown"]["llm_pct"] = round(
                (stats["latency_breakdown"]["llm_ms"] / total) * 100, 1
            )
        
        # === CALCULATE ERROR RATES ===
        query_count = stats["usage"]["queries_total"]
        if query_count > 0:
            stats["errors"]["retrieval_count"] = _error_counts.get("retrieval", 0)
            stats["errors"]["rerank_count"] = _error_counts.get("rerank", 0)
            stats["errors"]["llm_count"] = _error_counts.get("llm", 0)
            stats["errors"]["total_count"] = _error_counts.get("total", 0)
            
            stats["errors"]["retrieval_rate"] = round(
                (stats["errors"]["retrieval_count"] / query_count) * 100, 2
            )
            stats["errors"]["rerank_rate"] = round(
                (stats["errors"]["rerank_count"] / query_count) * 100, 2
            )
            stats["errors"]["llm_rate"] = round(
                (stats["errors"]["llm_count"] / query_count) * 100, 2
            )
            stats["errors"]["total_rate"] = round(
                (stats["errors"]["total_count"] / query_count) * 100, 2
            )
        
        # === INDEX HEALTH ===
        if stats["index_health"]["documents_total"] > 0:
            stats["index_health"]["avg_chunks_per_doc"] = round(
                stats["index_health"]["chunks_total"] / stats["index_health"]["documents_total"], 1
            )
        
        # Check if index is stale (mock - in production, check actual timestamp)
        # For now, we'll check if we have a recent index build
        stats["index_health"]["last_index_time"] = datetime.now().isoformat()
        stats["index_health"]["is_stale"] = False  # Would check timestamp age in production
        
        # === LLM STATS ===
        if stats["usage"]["queries_total"] > 0 and stats["llm_stats"]["tokens_total"] > 0:
            stats["llm_stats"]["tokens_per_query_avg"] = round(
                stats["llm_stats"]["tokens_total"] / stats["usage"]["queries_total"], 1
            )
        
        # P95 latency (approximate from avg for now - would need histogram in production)
        stats["llm_stats"]["llm_latency_p95"] = round(
            stats["latency_breakdown"]["llm_ms"] * 1.5, 2  # Rough estimate
        )
        
        # === USAGE PATTERNS ===
        # Queries per minute (rough estimate based on uptime)
        # In production, would track actual timestamps
        if stats["usage"]["requests_total"] > 0:
            stats["usage"]["queries_per_minute"] = round(
                stats["usage"]["queries_total"] / max(1, stats["usage"]["requests_total"] / 60), 2
            )
        
    except Exception as e:
        logger.error(f"Error calculating operational stats: {e}")
    
    return stats

# ============================================================================
# USER MANAGEMENT - Admin Only
# ============================================================================

class UpdateDepartmentsRequest(BaseModel):
    departments: List[str]


@app.get("/users")
async def list_users(user: UserInDB = Depends(require_admin)):
    """List all users with their department assignments (admin only)"""
    users = get_all_users()
    return {
        "users": [
            {
                "username": u.username,
                "name": u.name,
                "role": u.role.value,
                "departments": u.departments
            }
            for u in users
        ],
        "total": len(users),
        "available_departments": [d.value for d in Department]
    }


@app.put("/users/{username}/departments")
async def update_user_deps(
    username: str,
    request: UpdateDepartmentsRequest,
    user: UserInDB = Depends(require_admin)
):
    """Update department assignments for a user (admin only)"""
    try:
        updated = update_user_departments(username, request.departments)
        if not updated:
            raise HTTPException(status_code=404, detail=f"User '{username}' not found")
        
        # Reload users to reflect changes
        reload_users()
        
        logger.info(f"Admin {user.username} updated departments for {username}: {request.departments}")
        return {
            "status": "success",
            "username": username,
            "departments": request.departments
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating user departments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# DOCUMENT DEPARTMENT MANAGEMENT - Admin Only
# ============================================================================

class UpdateDocumentDepartmentRequest(BaseModel):
    department: str


@app.put("/documents/{filename}/department")
async def update_document_department(
    filename: str,
    request: UpdateDocumentDepartmentRequest,
    user: UserInDB = Depends(require_admin)
):
    """Reassign a document to a different department (admin only)"""
    try:
        # Validate department
        validate_department(request.department)
        
        # Check document exists
        file_path = os.path.join("data/uploads", filename)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Document '{filename}' not found")
        
        # Update department
        if not document_metadata.update_department(filename, request.department):
            # Document not in metadata, add it
            document_metadata.set(filename, request.department, user.username)
        
        logger.info(f"Admin {user.username} moved '{filename}' to {request.department}")
        return {
            "status": "success",
            "filename": filename,
            "department": request.department
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document department: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/departments")
async def list_departments(user: UserInDB = Depends(require_any_authenticated)):
    """List all available departments"""
    accessible = get_user_accessible_departments(user)
    return {
        "departments": [d.value for d in Department],
        "user_departments": accessible,
        "shared_department": "general"
    }


# ============================================================================
# DOCUMENT VIEW/DOWNLOAD - Role-Based Access
# ============================================================================

def check_document_access(filename: str, user: UserInDB) -> bool:
    """Check if user can access document based on department."""
    # Admin has full access
    if user.role.value == "admin":
        return True
    
    # Get document department
    doc_dept = document_metadata.get_department(filename)
    
    # Get user's accessible departments
    accessible_depts = get_user_accessible_departments(user)
    
    # Check if wildcard access or department match
    if "*" in accessible_depts:
        return True
    
    # General department is accessible to all authenticated users
    if doc_dept == "general":
        return True
    
    return doc_dept in accessible_depts


@app.get("/documents/{filename}/view")
async def view_document(
    filename: str,
    user: UserInDB = Depends(require_any_authenticated)
):
    """Stream document for inline viewing (role-based access)"""
    try:
        file_path = os.path.join("data/uploads", filename)
        
        # Check file exists
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Document '{filename}' not found")
        
        # Check access permission
        if not check_document_access(filename, user):
            raise HTTPException(
                status_code=403, 
                detail="You don't have permission to view this document"
            )
        
        # Determine content type
        content_type = "application/octet-stream"
        if filename.lower().endswith('.pdf'):
            content_type = "application/pdf"
        elif filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            ext = filename.lower().split('.')[-1]
            content_type = f"image/{ext if ext != 'jpg' else 'jpeg'}"
        elif filename.lower().endswith('.txt'):
            content_type = "text/plain"
        elif filename.lower().endswith('.md'):
            content_type = "text/markdown"
        
        logger.info(f"User {user.username} viewing document: {filename}")
        
        return FileResponse(
            file_path,
            media_type=content_type,
            filename=filename,
            headers={"Content-Disposition": f"inline; filename=\"{filename}\""}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error viewing document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/documents/{filename}/download")
async def download_document(
    filename: str,
    user: UserInDB = Depends(require_any_authenticated)
):
    """Download document as attachment (role-based access)"""
    try:
        file_path = os.path.join("data/uploads", filename)
        
        # Check file exists
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Document '{filename}' not found")
        
        # Check access permission
        if not check_document_access(filename, user):
            raise HTTPException(
                status_code=403, 
                detail="You don't have permission to download this document"
            )
        
        logger.info(f"User {user.username} downloading document: {filename}")
        
        return FileResponse(
            file_path,
            filename=filename,
            headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# METRICS ENDPOINT - Admin Only
# ============================================================================

@app.get("/metrics")
async def get_metrics_endpoint(user: UserInDB = Depends(require_admin)):
    """Prometheus metrics endpoint"""
    return Response(
        content=metrics.get_metrics(),
        media_type=metrics.get_metrics_content_type()
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
