"""
RagVault REST API Server
Simple API for document upload and querying
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
import os
import shutil
import logging
from typing import List
from datetime import datetime

from initialize_rag import RAGInitializer

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="RagVault API", version="1.0")

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
        initializer = RAGInitializer("config/init_config.yaml", "config/process_config.yaml")
        rag_components = initializer.initialize()
        rag_components.retriever.initialize(rag_components.original_chunks)
        logger.info("RAG system initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize RAG system: {e}")
        raise

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "RagVault API is running"}

@app.get("/health")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "rag_initialized": rag_components is not None,
        "documents_indexed": len(rag_components.original_chunks) if rag_components else 0
    }

@app.post("/upload", response_model=dict)
async def upload_document(file: UploadFile = File(...)):
    """
    Upload a document to the system
    Supported formats: PDF, DOCX, TXT, DOC, MD
    """
    try:
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
        
        logger.info(f"Uploaded file: {file.filename}")
        
        return {
            "status": "success",
            "message": f"File '{file.filename}' uploaded successfully",
            "filename": file.filename,
            "path": upload_path,
            "next_step": "Call POST /refresh to index the new document"
        }
    
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/refresh")
async def refresh_indices():
    """
    Refresh RAG indices to include newly uploaded documents
    This clears cache and rebuilds all indices
    """
    global rag_components
    try:
        logger.info("Refreshing RAG indices...")
        
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
        
        logger.info("RAG system refreshed successfully")
        
        return {
            "status": "success",
            "message": "Indices refreshed successfully",
            "documents_indexed": len(rag_components.original_chunks)
        }
    
    except Exception as e:
        logger.error(f"Refresh error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    """Ask a question and get an answer from your documents"""
    if rag_components is None:
        raise HTTPException(status_code=503, detail="RAG system not initialized")
    
    try:
        logger.info(f"Processing query: {request.query}")
        
        # Retrieve documents
        retrieved_results = rag_components.retriever.retrieve_with_method(
            request.query,
            method="hybrid",
            top_k=rag_components.process_config['retrieval']['top_k']
        )
        
        logger.info(f"Retrieved {len(retrieved_results)} documents")
        
        # Rerank if configured
        if rag_components.process_config['retrieval']['use_reranking']:
            reranked_results = rag_components.reranker.rerank(
                request.query,
                [r.document for r in retrieved_results],
                top_k=request.top_k
            )
            relevant_docs = [r.document for r in reranked_results]
        else:
            relevant_docs = [r.document for r in retrieved_results[:request.top_k]]
        
        # Generate response
        response_data = rag_components.response_generator.generate_answer(
            request.query,
            relevant_docs,
            metadata={}
        )
        
        # Extract sources
        sources = [doc.metadata.get('source', 'unknown') for doc in relevant_docs]
        
        return QueryResponse(
            query=request.query,
            answer=response_data['response'],
            sources=list(set(sources)),
            timestamp=datetime.now().isoformat()
        )
    
    except Exception as e:
        logger.error(f"Query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/documents")
async def list_documents():
    """List all indexed documents"""
    if rag_components is None:
        raise HTTPException(status_code=503, detail="RAG system not initialized")
    
    try:
        # Get unique sources from chunks
        sources = set()
        for chunk in rag_components.original_chunks:
            source = chunk.metadata.get('source', 'unknown')
            sources.add(source)
        
        return {
            "total_chunks": len(rag_components.original_chunks),
            "documents": list(sources),
            "count": len(sources)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
