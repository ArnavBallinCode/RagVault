# RagVault Backend Documentation

> Complete technical reference for the FastAPI backend server, RAG initialization, and Python core components.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Server](#api-server)
3. [RAG Initialization](#rag-initialization)
4. [API Endpoints](#api-endpoints)
5. [Data Models](#data-models)
6. [Error Handling](#error-handling)
7. [Configuration](#configuration)
8. [Development Guide](#development-guide)

---

## Architecture Overview

### Backend Components

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND ARCHITECTURE                              │
└────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────┐
                    │        api_server.py            │
                    │       (FastAPI Server)          │
                    │         Port 8000               │
                    └─────────────┬───────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────────┐
                    │      initialize_rag.py          │
                    │      (RAGInitializer)           │
                    └─────────────┬───────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐       ┌─────────────────┐       ┌───────────────┐
│ src/data/     │       │ src/retrieval/  │       │ src/response/ │
│               │       │                 │       │               │
│ DataIngestion │       │ HybridRetriever │       │ Response      │
│ DataPreproc.. │       │ VectorRetriever │       │ Generator     │
│ FileLoader    │       │ BM25Retriever   │       │               │
└───────────────┘       └─────────────────┘       └───────────────┘
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐       ┌─────────────────┐       ┌───────────────┐
│ src/models/   │       │ src/cache/      │       │ External:     │
│               │       │                 │       │ Llamafile     │
│ Reranker      │       │ CacheManager    │       │ (Port 8081)   │
└───────────────┘       └─────────────────┘       └───────────────┘
```

### File Structure

```
/
├── api_server.py              # FastAPI REST server (315 lines)
├── initialize_rag.py          # RAG system initializer (93 lines)
├── init_cache_data.py         # Offline cache builder
├── process_single_query.py    # CLI query tool
├── streamlit_app.py           # Streamlit UI (871 lines)
│
└── src/
    ├── __init__.py            # Package metadata
    ├── cache/
    │   └── cache.py           # CacheManager (189 lines)
    ├── data/
    │   ├── data_ingestion.py  # DataIngestion (317 lines)
    │   ├── data_preprocessing.py  # DataPreprocessor (491 lines)
    │   └── loaders/
    │       ├── base.py        # BaseLoader interface
    │       ├── file_loader.py # FileLoader (428 lines)
    │       ├── file_converter.py  # OfficeConverter
    │       └── web_scraper.py # EnhancedWebLoader (259 lines)
    ├── models/
    │   └── reranker.py        # Reranker (227 lines)
    ├── retrieval/
    │   ├── bm25_retriever.py  # BM25Retriever (146 lines)
    │   ├── hybrid_retriever.py # HybridRetriever (190 lines)
    │   └── vector_retriever.py # VectorRetriever (266 lines)
    ├── response/
    │   └── response_generator.py  # ResponseGenerator (226 lines)
    └── utils/
        └── helpers.py         # Utility functions
```

---

## API Server

### Starting the Backend

**⚠️ The backend requires 3 separate terminals:**

**Terminal 1: LLM Server**
```bash
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081
```

**Terminal 2: API Backend**
```bash
conda activate ragvault
python api_server.py
# Server starts on http://0.0.0.0:8000
```

**Terminal 3: Frontend**
```bash
# Option A: React UI
cd frontend && npm run dev

# Option B: Streamlit UI
streamlit run streamlit_app.py
```

### Overview

The API server (`api_server.py`) is the main entry point for the backend, providing a RESTful interface to the RAG system.

### Startup Sequence

```python
# api_server.py - Startup event (lines 92-106)

@app.on_event("startup")
async def startup_event():
    """Initialize RAG system on startup"""
    global rag_components
    try:
        logger.info("Initializing RAG system...")
        
        # 1. Load configuration files
        initializer = RAGInitializer(
            "config/init_config.yaml",
            "config/process_config.yaml"
        )
        
        # 2. Initialize all components
        rag_components = initializer.initialize()
        
        # 3. Build retrieval indices
        rag_components.retriever.initialize(rag_components.original_chunks)
        
        logger.info("RAG system initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize RAG system: {e}")
        raise
```

### CORS Configuration

```python
# api_server.py - CORS middleware (lines 79-89)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Running the Server

```bash
# Development mode
uvicorn api_server:app --reload --port 8000

# Production mode
python api_server.py  # Uses uvicorn internally

# With conda environment
source $(conda info --base)/etc/profile.d/conda.sh
conda activate rag_project
python api_server.py
```

---

## RAG Initialization

### RAGComponents Dataclass

```python
# initialize_rag.py (lines 13-24)

@dataclass
class RAGComponents:
    """Container for all RAG system components."""
    
    retriever: HybridRetriever          # Combined FAISS + BM25 search
    reranker: Reranker                  # Neural cross-encoder
    response_generator: ResponseGenerator  # LLM wrapper
    train_df: pd.DataFrame              # Training data (optional)
    test_df: pd.DataFrame               # Test data (optional)
    train_results: pd.DataFrame         # Saved results
    test_results: pd.DataFrame          # Saved results
    original_chunks: List               # All document chunks
    init_config: Dict                   # init_config.yaml
    process_config: Dict                # process_config.yaml
```

### Initialization Flow

```python
# initialize_rag.py - RAGInitializer.initialize() (lines 38-84)

def initialize(self) -> RAGComponents:
    """Initialize all components and prepare data."""
    
    # Step 1: Create data handlers
    data_ingestion = DataIngestion(self.init_config)
    data_preprocessor = DataPreprocessor(self.init_config)
    
    # Step 2: Merge configs for retrieval
    combined_config = {
        **self.init_config,
        'retrieval': self.process_config['retrieval']
    }
    
    # Step 3: Create core components
    retriever = HybridRetriever(combined_config)
    reranker = Reranker(combined_config)
    response_generator = ResponseGenerator(combined_config)
    
    # Step 4: Load and process documents
    docs = data_ingestion.load_documents()
    original_chunks = data_preprocessor.process_documents(docs)
    
    # Step 5: Return assembled components
    return RAGComponents(
        retriever=retriever,
        reranker=reranker,
        response_generator=response_generator,
        original_chunks=original_chunks,
        # ... other fields
    )
```

---

## API Endpoints

### Health Check

```
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "documents_indexed": 248,
  "timestamp": "2026-01-07T15:00:00"
}
```

**Implementation:**
```python
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check system health and document count."""
    return HealthResponse(
        status="healthy" if rag_components else "initializing",
        documents_indexed=len(rag_components.original_chunks) if rag_components else 0,
        timestamp=datetime.now().isoformat()
    )
```

---

### Upload Document

```
POST /upload
Content-Type: multipart/form-data
```

**Request:**
```
file: <binary file data>
```

**Response:**
```json
{
  "status": "success",
  "message": "File 'document.pdf' uploaded successfully",
  "filename": "document.pdf",
  "path": "data/uploads/document.pdf",
  "next_step": "Call POST /refresh to index the new document"
}
```

**Implementation:**
```python
@app.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """Upload a document for indexing."""
    
    # Validate file type
    allowed_extensions = {'.pdf', '.docx', '.txt', '.doc', '.md'}
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {allowed_extensions}"
        )
    
    # Validate file size (max 10MB)
    MAX_SIZE = 10 * 1024 * 1024
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 10MB"
        )
    
    # Save file
    upload_path = os.path.join("data/uploads", file.filename)
    os.makedirs("data/uploads", exist_ok=True)
    
    with open(upload_path, "wb") as buffer:
        buffer.write(content)
    
    return UploadResponse(
        status="success",
        message=f"File '{file.filename}' uploaded successfully",
        filename=file.filename,
        path=upload_path,
        next_step="Call POST /refresh to index the new document"
    )
```

---

### Refresh Indices

```
POST /refresh
```

**Response:**
```json
{
  "status": "success",
  "message": "Indices refreshed successfully",
  "documents_indexed": 312
}
```

**Implementation:**
```python
@app.post("/refresh", response_model=RefreshResponse)
async def refresh_indices():
    """Rebuild document indices with new/updated files."""
    global rag_components
    
    try:
        # Reinitialize with fresh data
        initializer = RAGInitializer(
            "config/init_config.yaml",
            "config/process_config.yaml"
        )
        rag_components = initializer.initialize()
        rag_components.retriever.initialize(rag_components.original_chunks)
        
        return RefreshResponse(
            status="success",
            message="Indices refreshed successfully",
            documents_indexed=len(rag_components.original_chunks)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

### Query Documents

```
POST /query
Content-Type: application/json
```

**Request:**
```json
{
  "query": "What is the authentication process?",
  "top_k": 3
}
```

**Response:**
```json
{
  "query": "What is the authentication process?",
  "answer": "The authentication process involves...",
  "sources": ["auth_guide.pdf", "security_doc.md"],
  "timestamp": "2026-01-07T15:05:00"
}
```

**Implementation:**
```python
@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    """Ask a question and get an answer from your documents."""
    
    if rag_components is None:
        raise HTTPException(status_code=503, detail="RAG system not initialized")
    
    try:
        # Step 1: Retrieve documents (hybrid search)
        retrieved_results = rag_components.retriever.retrieve_with_method(
            request.query,
            method="hybrid",
            top_k=rag_components.process_config['retrieval']['top_k']
        )
        
        # Step 2: Rerank if configured
        if rag_components.process_config['retrieval']['use_reranking']:
            reranked_results = rag_components.reranker.rerank(
                request.query,
                [r.document for r in retrieved_results],
                top_k=request.top_k
            )
            relevant_docs = [r.document for r in reranked_results]
        else:
            relevant_docs = [r.document for r in retrieved_results[:request.top_k]]
        
        # Step 3: Generate response
        response_data = rag_components.response_generator.generate_answer(
            request.query,
            relevant_docs,
            metadata={}
        )
        
        # Step 4: Extract sources
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
```

---

### List Documents

```
GET /documents
```

**Response:**
```json
{
  "documents": [
    "data/raw/document1.pdf",
    "data/uploads/document2.txt"
  ],
  "count": 2,
  "total_chunks": 248,
  "documents_info": [
    {
      "filename": "document1.pdf",
      "size_mb": 2.5,
      "chunks": 120
    }
  ]
}
```

---

### Delete Document

```
DELETE /documents/{filename}
```

**Response:**
```json
{
  "status": "success",
  "message": "Document 'document.pdf' deleted. Call POST /refresh to update indices."
}
```

---

### Clear All Data

```
POST /clear
```

**Response:**
```json
{
  "status": "success",
  "message": "All documents and cache cleared. System reset."
}
```

⚠️ **Warning:** This is a destructive operation that cannot be undone.

---

### Get System Limits

```
GET /limits
```

**Response:**
```json
{
  "max_file_size_mb": 10,
  "max_total_documents": 100,
  "supported_formats": [".pdf", ".docx", ".txt", ".doc", ".md"]
}
```

---

## Data Models

### Request Models

```python
# api_server.py - Pydantic models

class QueryRequest(BaseModel):
    """Request model for query endpoint."""
    query: str = Field(..., min_length=1, description="Question to ask")
    top_k: int = Field(default=3, ge=1, le=10, description="Number of results")

class UploadRequest(BaseModel):
    """Handled via UploadFile, not a Pydantic model."""
    pass
```

### Response Models

```python
class HealthResponse(BaseModel):
    """Response model for health check."""
    status: str
    documents_indexed: int
    timestamp: str

class UploadResponse(BaseModel):
    """Response model for file upload."""
    status: str
    message: str
    filename: str
    path: str
    next_step: str

class RefreshResponse(BaseModel):
    """Response model for index refresh."""
    status: str
    message: str
    documents_indexed: int

class QueryResponse(BaseModel):
    """Response model for queries."""
    query: str
    answer: str
    sources: List[str]
    timestamp: str

class DocumentsResponse(BaseModel):
    """Response model for document listing."""
    documents: List[str]
    count: int
    total_chunks: int
    documents_info: List[dict]
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | Success | Successful operation |
| 400 | Bad Request | Invalid input (file type, size) |
| 404 | Not Found | Document doesn't exist |
| 500 | Server Error | Internal processing error |
| 503 | Service Unavailable | RAG not initialized |

### Error Response Format

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Exception Handling Pattern

```python
@app.post("/endpoint")
async def endpoint():
    try:
        # Operation
        result = do_something()
        return {"status": "success", "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
```

---

## Configuration

### init_config.yaml

```yaml
# Logging
logging:
  level: "INFO"
  show_progress: true
  file_logging: true

# Models
model:
  embedding_model_hf: "nomic-ai/nomic-embed-text-v1.5"
  rerank_model: "BAAI/bge-reranker-v2-m3"
  device_rerank: "mps"  # or "cuda", "cpu"

# Processing
processing:
  chunk_size: 2000
  chunk_overlap: 200
  batch_size_embeddings: 32
  batch_size_reranking: 8

# Paths
paths:
  cache_dir: "./cache"
  data_dir: "./data"
  log_dir: "./logs"
```

### process_config.yaml

```yaml
retrieval:
  llamafile_server_base_url: "http://localhost:8081"
  send_nb_chunks_to_llm: 2
  use_bm25: true
  bm25_weight: 0.2
  top_k: 100
  use_reranking: true
  use_query_expansion: false
```

---

## Development Guide

### Adding a New Endpoint

```python
# 1. Define the response model
class NewResponse(BaseModel):
    field: str
    value: int

# 2. Create the endpoint
@app.get("/new-endpoint", response_model=NewResponse)
async def new_endpoint(param: str = Query(...)):
    """Description of what this endpoint does."""
    
    # Validate RAG is ready
    if rag_components is None:
        raise HTTPException(status_code=503, detail="RAG not initialized")
    
    # Perform operation
    result = do_operation(param)
    
    return NewResponse(field=result.field, value=result.value)
```

### Testing Endpoints

```bash
# Health check
curl http://localhost:8000/health

# Upload document
curl -X POST http://localhost:8000/upload \
  -F "file=@document.pdf"

# Query
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is authentication?", "top_k": 3}'

# List documents
curl http://localhost:8000/documents
```

### Swagger Documentation

Access interactive API docs at:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

---

## Next Steps

- **[Frontend Documentation](./03_FRONTEND.md)** - React UI
- **[RAG Pipeline](./05_RAG_PIPELINE.md)** - Retrieval details
- **[Incremental Learning](./INCREMENTAL_LEARNING.md)** - Live updates

---

*Last updated: January 2026*
