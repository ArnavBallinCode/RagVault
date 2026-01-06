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
  "total_chunks": 46,
  "documents": ["data.txt", "BeyondGames_ppt.pdf", "Computer_Network.pdf"],
  "count": 3
}
```

### 5. **Health Check**
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
```

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
```

---

## Interactive API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
