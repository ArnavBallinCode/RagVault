"""
RagVault REST API Server
Production-grade API with RBAC and Prometheus metrics
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
import uvicorn
import os
import shutil
import logging
from typing import List, Optional
from datetime import datetime, timedelta

from initialize_rag import RAGInitializer

# Auth & RBAC imports
from auth import (
    authenticate_user, create_access_token, 
    LoginRequest, Token, Role, ACCESS_TOKEN_EXPIRE_MINUTES
)
from rbac import (
    RoleRequired, get_current_user, require_admin, require_any_authenticated
)
from auth import UserInDB

# Metrics imports
import metrics

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="RagVault API", version="2.0")

# Add CORS middleware for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global RAG components (initialized on startup)
rag_components = None

class QueryRequest(BaseModel):
    query: str
    top_k: int = 2

class QueryResponse(BaseModel):
    query: str
    answer: str
    sources: List[str]
    timestamp: str

@app.on_event("startup")
async def startup_event():
    """Initialize RAG system on startup"""
    global rag_components
    try:
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
    
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.value}
    )
    
    metrics.record_request("/login", "POST", "success")
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user.role.value,
        username=user.username,
        name=user.name
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
            
            # Retrieve documents
            with metrics.time_retrieval():
                retrieved_results = rag_components.retriever.retrieve_with_method(
                    request.query,
                    method="hybrid",
                    top_k=rag_components.process_config['retrieval']['top_k']
                )
            
            logger.info(f"Retrieved {len(retrieved_results)} documents")
            
            # Rerank if configured
            if rag_components.process_config['retrieval']['use_reranking']:
                with metrics.time_rerank():
                    reranked_results = rag_components.reranker.rerank(
                        request.query,
                        [r.document for r in retrieved_results],
                        top_k=request.top_k
                    )
                relevant_docs = [r.document for r in reranked_results]
            else:
                relevant_docs = [r.document for r in retrieved_results[:request.top_k]]
            
            # Generate response
            with metrics.time_llm():
                response_data = rag_components.response_generator.generate_answer(
                    request.query,
                    relevant_docs,
                    metadata={}
                )
            
            # Extract sources
            sources = [doc.metadata.get('source', 'unknown') for doc in relevant_docs]
            
            metrics.record_query(user.role.value, "success")
            
            return QueryResponse(
                query=request.query,
                answer=response_data['response'],
                sources=list(set(sources)),
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

@app.post("/upload", response_model=dict)
async def upload_document(
    file: UploadFile = File(...),
    user: UserInDB = Depends(require_admin)
):
    """
    Upload a document to the system
    Supported formats: PDF, DOCX, TXT, DOC, MD
    """
    try:
        with metrics.time_request("/upload", "POST"):
            # Validate file extension
            allowed_extensions = {'.pdf', '.docx', '.txt', '.doc', '.md'}
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
            
            logger.info(f"Uploaded file by {user.username}: {file.filename}")
            
            # Update document count metric
            doc_count = len([f for f in os.listdir("data/uploads") if os.path.isfile(os.path.join("data/uploads", f))])
            metrics.update_document_count(doc_count)
            metrics.record_request("/upload", "POST", "success")
            
            return {
                "status": "success",
                "message": f"File '{file.filename}' uploaded successfully",
                "filename": file.filename,
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
async def list_documents(user: UserInDB = Depends(require_admin)):
    """List all indexed documents with file info"""
    with metrics.time_request("/documents", "GET"):
        upload_dir = "data/uploads"
        documents = []
        
        if os.path.exists(upload_dir):
            for filename in os.listdir(upload_dir):
                file_path = os.path.join(upload_dir, filename)
                if os.path.isfile(file_path):
                    stat = os.stat(file_path)
                    documents.append({
                        "filename": filename,
                        "path": file_path,
                        "size_bytes": stat.st_size,
                        "size_mb": round(stat.st_size / (1024 * 1024), 2),
                        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
                    })
        
        total_chunks = len(rag_components.original_chunks) if rag_components else 0
        
        metrics.record_request("/documents", "GET", "success")
        
        return {
            "documents": [d["path"] for d in documents],
            "documents_info": documents,
            "count": len(documents),
            "total_chunks": total_chunks,
            "max_file_size_mb": 10
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
