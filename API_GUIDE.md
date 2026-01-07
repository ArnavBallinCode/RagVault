# RagVault REST API - Complete Guide

## Quick Start

### 1. Start the API Server
```bash
# Start LLM server first
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081 &

# Start API server
source $(conda info --base)/etc/profile.d/conda.sh
conda activate rag_project
python api_server.py
```

The API will be available at: **http://localhost:8000**

---

## API Endpoints

### 1. **Upload Document**
```bash
curl -X POST "http://localhost:8000/upload" \
  -F "file=@/path/to/your/document.pdf"
```

**Response:**
```json
{
  "status": "success",
  "message": "File 'document.pdf' uploaded successfully",
  "filename": "document.pdf",
  "next_step": "Call POST /refresh to index the new document"
}
```

### 2. **Refresh Indices** (after uploading)
```bash
curl -X POST "http://localhost:8000/refresh"
```

**Response:**
```json
{
  "status": "success",
  "message": "Indices refreshed successfully",
  "documents_indexed": 46
}
```

### 3. **Ask a Question**
```bash
curl -X POST "http://localhost:8000/query" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the Stop-and-Wait protocol?",
    "top_k": 2
  }'
```

**Response:**
```json
{
  "query": "What is the Stop-and-Wait protocol?",
  "answer": "The Stop-and-Wait protocol is a simple method...",
  "sources": ["Computer_Network_Assignment.pdf"],
  "timestamp": "2024-01-06T12:00:00"
}
```

### 4. **List Documents**
```bash
curl "http://localhost:8000/documents"
```

**Response:**
```json
{
  "documents": ["data/uploads/file1.pdf", "data/uploads/file2.txt"],
  "documents_info": [
    {"filename": "file1.pdf", "size_mb": 1.5, "path": "..."},
    {"filename": "file2.txt", "size_mb": 0.1, "path": "..."}
  ],
  "count": 2,
  "total_chunks": 46,
  "max_file_size_mb": 10
}
```

### 5. **Delete Document**
```bash
curl -X DELETE "http://localhost:8000/documents/filename.pdf"
```

**Response:**
```json
{
  "status": "success",
  "message": "Document 'filename.pdf' deleted. Run /refresh to update indices."
}
```

### 6. **Clear All Data**
```bash
curl -X POST "http://localhost:8000/clear"
```

**Response:**
```json
{
  "status": "success",
  "message": "All data cleared. Upload new documents and call /refresh to reinitialize."
}
```

### 7. **Get System Limits**
```bash
curl "http://localhost:8000/limits"
```

**Response:**
```json
{
  "max_file_size_mb": 10,
  "max_total_documents": 20,
  "supported_formats": [".pdf", ".docx", ".txt", ".md", ".doc"],
  "recommendations": {
    "pdf_pages": "Up to 100 pages recommended",
    "total_memory": "Keep total documents under 50MB to avoid memory issues",
    "clear_cache": "Use /clear if you encounter memory errors"
  }
}
```

### 8. **Health Check**
```bash
curl "http://localhost:8000/health"
```

---

## Complete Workflow Example

```bash
# 1. Upload a document
curl -X POST "http://localhost:8000/upload" \
  -F "file=@mydocument.pdf"

# 2. Refresh to index it
curl -X POST "http://localhost:8000/refresh"

# 3. Ask questions
curl -X POST "http://localhost:8000/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is this document about?", "top_k": 2}'

# 4. Check what's indexed
curl "http://localhost:8000/documents"

# 5. Delete a document
curl -X DELETE "http://localhost:8000/documents/mydocument.pdf"

# 6. Clear everything if memory issues
curl -X POST "http://localhost:8000/clear"
```

---

## React Frontend

A modern React frontend is available:

```bash
cd frontend
npm install
npm run dev
```

**Frontend URL**: http://localhost:5173

**Features:**
- Multi-page app with sidebar navigation
- Interactive React Flow pipeline visualization
- Documents page with delete/clear functionality
- LLM Settings page
- Configuration page

---

## Python Client Example

```python
import requests

BASE_URL = "http://localhost:8000"

# Upload
with open("document.pdf", "rb") as f:
    response = requests.post(f"{BASE_URL}/upload", files={"file": f})
    print(response.json())

# Refresh
response = requests.post(f"{BASE_URL}/refresh")
print(response.json())

# Query
response = requests.post(
    f"{BASE_URL}/query",
    json={"query": "What is machine learning?", "top_k": 2}
)
print(response.json()["answer"])

# Delete document
response = requests.delete(f"{BASE_URL}/documents/document.pdf")
print(response.json())

# Clear all
response = requests.post(f"{BASE_URL}/clear")
print(response.json())
```

---

## Interactive API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
