# 10. Troubleshooting

> Common issues and solutions

---

## Quick Diagnosis

```bash
# Check system status
docker-compose ps                    # Docker container status
curl http://localhost:8081/health    # LLM server health
curl http://localhost:8501/_stcore/health  # Streamlit health
```

---

## LLM Server Issues

### ❌ "LLM Server: Offline" in UI

**Symptoms:**
- Red status indicator in sidebar
- Queries fail with connection error

**Causes & Solutions:**

1. **LLM server not running**
   ```bash
   # Check if running
   lsof -i :8081
   
   # Start manually
   ./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile \
     --server --nobrowser -ngl 999 --port 8081
   ```

2. **Wrong port**
   ```bash
   # Check what's on 8081
   lsof -i :8081
   
   # Verify config
   cat config/process_config.yaml | grep llamafile
   ```

3. **Docker networking issue**
   ```bash
   # Test from app container
   docker exec ragvault-app curl http://llm-server:8081/health
   
   # Check if LLM container is healthy
   docker-compose ps
   ```

---

### ❌ LLM Container Won't Start

**Symptoms:**
- `docker-compose up` fails for llm-server
- Container exits immediately

**Causes & Solutions:**

1. **Model file missing**
   ```bash
   # Check if model exists
   ls -la models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile
   
   # Download if missing
   ./docker-start.sh --download
   ```

2. **Model not executable**
   ```bash
   chmod +x models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile
   ```

3. **Insufficient memory**
   ```bash
   # Check available memory
   free -h   # Linux
   vm_stat   # macOS
   
   # Model needs ~10GB RAM
   ```

4. **exec format error (Docker)**
   ```bash
   # This happens when trying to run x86 binary on ARM
   # Solution: Run llamafile with sh
   # In Dockerfile.llm, use:
   ENTRYPOINT ["sh", "-c", "/app/models/*.llamafile --server -ngl 0"]
   ```

---

### ❌ Slow LLM Responses

**Symptoms:**
- Queries take 30+ seconds
- High CPU usage

**Causes & Solutions:**

1. **No GPU acceleration**
   ```bash
   # Enable Metal (Apple Silicon)
   ./models/*.llamafile --server -ngl 999 --port 8081
   
   # Check GPU is being used
   # Should see "using Metal" in output
   ```

2. **Too many concurrent requests**
   ```bash
   # Default is 1 slot, add more
   ./models/*.llamafile --server -ngl 999 --parallel 2 --port 8081
   ```

3. **Large context window**
   ```bash
   # Reduce context size
   ./models/*.llamafile --server --ctx-size 4096 --port 8081
   ```

---

## Streamlit Issues

### ❌ Port 8501 Already in Use

**Symptoms:**
- "Address already in use" error
- Streamlit won't start

**Solution:**
```bash
# Find and kill process
lsof -ti:8501 | xargs kill -9

# Or specify different port
streamlit run streamlit_app.py --server.port 8502
```

---

### ❌ Initialization Loop

**Symptoms:**
- "Initializing RAG system..." never completes
- App restarts repeatedly

**Causes & Solutions:**

1. **Missing dependencies**
   ```bash
   pip install -r requirements_macos.txt  # or requirements_rag.txt
   ```

2. **Missing cache/data directories**
   ```bash
   mkdir -p data/raw data/uploads cache logs
   ```

3. **Invalid config file**
   ```bash
   # Validate YAML syntax
   python -c "import yaml; yaml.safe_load(open('config/init_config.yaml'))"
   ```

---

### ❌ Login Fails

**Symptoms:**
- "Invalid credentials" with correct password

**Solution:**
```python
# Default credentials:
# admin / admin123
# user / user123

# Check streamlit_app.py for USERS dict
```

---

## Retrieval Issues

### ❌ No Results Found

**Symptoms:**
- "I don't have information about that" for known content

**Causes & Solutions:**

1. **Documents not indexed**
   ```bash
   # Check chunk count in sidebar
   # Should show "248 chunks" or similar
   
   # Rebuild index
   python init_cache_data.py
   ```

2. **Cache stale**
   ```bash
   # Clear cache and rebuild
   rm -rf cache/*
   python init_cache_data.py
   ```

3. **Wrong data directory**
   ```bash
   # Check documents exist
   ls -la data/raw/
   
   # Check config
   cat config/init_config.yaml | grep data_dir
   ```

---

### ❌ Irrelevant Results

**Symptoms:**
- Retrieved documents don't match query

**Causes & Solutions:**

1. **Adjust BM25 weight**
   ```yaml
   # config/process_config.yaml
   retrieval:
     bm25_weight: 0.3  # Increase for keyword matching
   ```

2. **Increase top_k**
   ```yaml
   retrieval:
     top_k: 150  # More candidates for reranking
   ```

3. **Enable reranking**
   ```yaml
   retrieval:
     use_reranking: true
   ```

---

## Embedding/Reranker Issues

### ❌ CUDA/MPS Not Available

**Symptoms:**
- "MPS not available, falling back to CPU"
- Slow reranking

**Causes & Solutions:**

1. **Apple Silicon (MPS)**
   ```python
   # Check MPS availability
   import torch
   print(torch.backends.mps.is_available())  # Should be True
   print(torch.backends.mps.is_built())      # Should be True
   ```

2. **NVIDIA (CUDA)**
   ```python
   import torch
   print(torch.cuda.is_available())  # Should be True
   ```

3. **Force CPU (Docker)**
   ```bash
   # Set environment variable
   export FORCE_CPU=1
   
   # Or in docker-compose.yml
   environment:
     - FORCE_CPU=1
   ```

---

### ❌ Out of Memory (OOM)

**Symptoms:**
- "CUDA out of memory" or system freeze
- Process killed

**Causes & Solutions:**

1. **Reduce batch size**
   ```python
   # In reranker.py, lower batch_size
   self.batch_size = 4  # Default is 8
   ```

2. **Use smaller model**
   ```yaml
   # init_config.yaml
   model:
     rerank_model: "cross-encoder/ms-marco-MiniLM-L-6-v2"
   ```

3. **Force CPU**
   ```yaml
   model:
     device_rerank: "cpu"
   ```

---

## Docker Issues

### ❌ Volume Permission Errors

**Symptoms:**
- "Permission denied" when writing to data/cache
- Files created as root

**Solution:**
```bash
# Fix permissions on host
chmod -R 777 data cache logs

# Or run with user mapping
docker-compose run --user $(id -u):$(id -g) app
```

---

### ❌ Container Unhealthy

**Symptoms:**
- `docker-compose ps` shows "unhealthy"

**Solution:**
```bash
# Check container logs
docker logs ragvault-llm
docker logs ragvault-app

# Test health endpoint manually
docker exec ragvault-app curl http://localhost:8501/_stcore/health
```

---

### ❌ Network Connectivity

**Symptoms:**
- App can't connect to LLM server in Docker

**Solution:**
```bash
# Check network exists
docker network ls | grep ragvault

# Inspect network
docker network inspect <network-name>

# Test connectivity
docker exec ragvault-app ping llm-server
docker exec ragvault-app curl http://llm-server:8081/health
```

---

## Python/Import Issues

### ❌ ModuleNotFoundError

**Symptoms:**
- "No module named 'langchain'"

**Solution:**
```bash
# Reinstall all dependencies
pip install -r requirements_macos.txt

# Or specific packages
pip install langchain langchain-core langchain-community
pip install faiss-cpu sentence-transformers transformers
pip install torch torchvision einops
```

---

### ❌ Incompatible Package Versions

**Symptoms:**
- Import errors mentioning version conflicts

**Solution:**
```bash
# Create fresh environment
conda create -n ragvault python=3.10 -y
conda activate ragvault
pip install -r requirements_macos.txt
```

---

## Performance Tuning

### Slow Startup

```yaml
# Use cache
# init_cache_data.py pre-computes embeddings
python init_cache_data.py
```

### Slow Queries

| Issue | Solution |
|-------|----------|
| Embedding slow | Use smaller model |
| Reranking slow | Reduce top_k to 50 |
| LLM slow | Enable GPU (-ngl 999) |
| First query slow | Pre-warm cache |

---

## Logs & Debugging

### Log Locations

```
logs/rag_system.log      # Main application log
docker logs ragvault-app  # Docker app logs
docker logs ragvault-llm  # Docker LLM logs
```

### Enable Debug Logging

```yaml
# config/init_config.yaml
logging:
  level: "DEBUG"
```

### Useful Debug Commands

```bash
# Python REPL debugging
python -c "
from initialize_rag import RAGInitializer
init = RAGInitializer('config/init_config.yaml', 'config/process_config.yaml')
components = init.initialize()
print(f'Chunks: {len(components.original_chunks)}')
"

# Test LLM directly
curl -X POST http://localhost:8081/completion \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello!", "n_predict": 50}'

# Test embedding model
python -c "
from langchain_huggingface import HuggingFaceEmbeddings
model = HuggingFaceEmbeddings(model_name='nomic-ai/nomic-embed-text-v1.5')
print(len(model.embed_query('test')))  # Should print 768
"
```

---

## Getting Help

1. **Check logs**: `logs/rag_system.log`
2. **Check Docker**: `docker-compose logs`
3. **Validate config**: Run Python YAML parser
4. **Verify dependencies**: `pip list | grep langchain`
5. **Test components individually**: LLM, embeddings, retrieval

---

*Author: Arnav Angarkar*
