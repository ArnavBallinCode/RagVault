# RagVault - Complete Setup Guide

## Prerequisites
- macOS with Apple Silicon (M1/M2/M3/M4)
- Conda installed
- ~10GB free disk space

---

## Step 1: Initial Setup (First Time Only)

```bash
# Create conda environment
conda create -n rag_project python=3.10 -y
conda activate rag_project

# Install dependencies
pip install -r requirements_macos.txt
pip install fastapi uvicorn python-multipart

# Install LibreOffice (for document processing)
brew install --cask libreoffice

# Download LLM model (~8.5GB)
mkdir -p models
curl -L -o models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile \
  "https://huggingface.co/Mozilla/Mistral-Nemo-Instruct-2407-llamafile/resolve/main/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile"
chmod +x models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile
```

---

## Step 2: Start the System

```bash
# Run the startup script
./start1.sh
```

Or manually:
```bash
# Terminal 1: Start LLM server
nohup ./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile \
  --server --nobrowser -ngl 999 --port 8081 > llm_server.log 2>&1 &

# Wait 20 seconds for LLM to load

# Terminal 2: Start API server
conda activate rag_project
nohup python api_server.py > api_server.log 2>&1 &
```

---

## Step 3: Verify It's Running

```bash
# Check LLM server
curl http://localhost:8081/health
# Should return: {"status":"ok"...}

# Check API server
curl http://localhost:8000/health
# Should return: {"status":"healthy"...}
```

---

## Step 4: Using the API

### Upload a Document
```bash
curl -X POST "http://localhost:8000/upload" -F "file=@your_document.pdf"
```

### Refresh Indices (after uploading)
```bash
curl -X POST "http://localhost:8000/refresh"
```

### Ask a Question
```bash
curl -X POST "http://localhost:8000/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "Your question here?", "top_k": 2}'
```

### List Documents
```bash
curl http://localhost:8000/documents
```

---

## Interactive API Documentation

Once running, visit: **http://localhost:8000/docs**

---

## Stop the System

```bash
lsof -ti:8000 | xargs kill -9
lsof -ti:8081 | xargs kill -9
```

---

## Troubleshooting

**API not responding?**
```bash
tail -50 api_server.log
```

**LLM not responding?**
```bash
tail -50 llm_server.log
```

**Clear cache and restart:**
```bash
find cache -type f -delete
./start1.sh
```
