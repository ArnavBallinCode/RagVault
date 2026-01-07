# RagVault - System Status & Quick Reference

## 🟢 SYSTEM IS RUNNING

### Services
- **LLM Server**: http://localhost:8081 
- **REST API**: http://localhost:8000
- **API Docs** (Interactive): http://localhost:8000/docs

### Current Status
- Documents Indexed: 2
- Chunks Total: 2
- Ready for queries: ✅

---

## Quick Commands

### Upload & Index a Document
```bash
# 1. Upload
curl -X POST "http://localhost:8000/upload" -F "file=@your_document.pdf"

# 2. Refresh indices
curl -X POST "http://localhost:8000/refresh"
```

### Ask Questions
```bash
curl -X POST "http://localhost:8000/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "Your question here?", "top_k": 2}' | python3 -m json.tool
```

### List Documents
```bash
curl http://localhost:8000/documents | python3 -m json.tool
```

### Health Check
```bash
curl http://localhost:8000/health | python3 -m json.tool
```

---

## Files
- **API Server**: `api_server.py`
- **API Guide**: `API_GUIDE.md` (detailed docs)
- **Test Script**: `test_api.sh` (run full test suite)
- **How to Add Docs**: `HOW_TO_ADD_DOCUMENTS.md`

---

## Restart Services
```bash
# Kill all
lsof -ti:8000 | xargs kill -9
lsof -ti:8081 | xargs kill -9

# Start LLM
nohup ./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081 > llm_server.log 2>&1 &

# Start API (wait 15 seconds after LLM)
source $(conda info --base)/etc/profile.d/conda.sh
conda activate rag_project
nohup python api_server.py > api_server.log 2>&1 &
```

---

**Everything is ready to use!** 🚀
