# RagVault Scalability Guide

> Comprehensive documentation on scaling strategies, performance optimization, and enterprise deployment patterns for the RagVault offline RAG system.

---

## Table of Contents

1. [Current Architecture Constraints](#current-architecture-constraints)
2. [Horizontal Scaling Strategies](#horizontal-scaling-strategies)
3. [Vertical Scaling Optimizations](#vertical-scaling-optimizations)
4. [Database and Index Scaling](#database-and-index-scaling)
5. [Model Scaling](#model-scaling)
6. [Distributed Deployment Patterns](#distributed-deployment-patterns)
7. [Performance Benchmarks](#performance-benchmarks)
8. [Enterprise Deployment Recommendations](#enterprise-deployment-recommendations)

---

## Current Architecture Constraints

### Single-Machine Design

RagVault is designed as a fully offline, single-machine deployment. The current architecture has these constraints:

| Component | Current Limit | Constraint Reason |
|-----------|---------------|-------------------|
| **Documents** | ~500 documents | Memory for FAISS index |
| **Total Chunks** | ~5,000 chunks | Embedding memory footprint |
| **Concurrent Users** | 5-10 | Single LLM server instance |
| **Index Size** | ~2GB | RAM-based FAISS index |
| **Query Latency** | 5-15 seconds | Sequential LLM inference |

### Memory Footprint Analysis

```
┌─────────────────────────────────────────────────────────────┐
│                    MEMORY BREAKDOWN                         │
├───────────────────────────────────────────────────┬─────────┤
│ LLM Model (Mistral Nemo 12B Q5_K_M)               │ ~8.5 GB │
│ Embedding Model (Nomic Embed v1.5)                │ ~1.5 GB │
│ Reranker Model (BGE Reranker v2)                  │ ~1.2 GB │
│ FAISS Index (5000 chunks × 768-dim)               │ ~200 MB │
│ BM25 Index                                        │ ~100 MB │
│ Python Runtime + Overhead                         │ ~500 MB │
├───────────────────────────────────────────────────┼─────────┤
│ TOTAL ESTIMATED                                   │ ~12 GB  │
└───────────────────────────────────────────────────┴─────────┘
```

---

## Horizontal Scaling Strategies

### 1. Multi-Instance LLM Deployment

Deploy multiple LLM instances behind a load balancer for increased query throughput.

```yaml
# docker-compose.scale.yml
version: '3.8'
services:
  llm-1:
    image: ragvault-llm:latest
    ports:
      - "8081:8081"
    deploy:
      resources:
        reservations:
          memory: 16G

  llm-2:
    image: ragvault-llm:latest
    ports:
      - "8082:8081"
    deploy:
      resources:
        reservations:
          memory: 16G

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
```

**Load Balancer Configuration:**

```nginx
# nginx.conf
upstream llm_servers {
    least_conn;
    server llm-1:8081;
    server llm-2:8081;
    # Add more instances as needed
}

server {
    listen 80;
    location /v1/ {
        proxy_pass http://llm_servers;
        proxy_connect_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

### 2. Sharded Document Index

Partition documents across multiple FAISS indices for larger collections.

```python
# src/retrieval/sharded_retriever.py
class ShardedVectorRetriever:
    """
    Distribute documents across multiple FAISS shards.
    Each shard handles a subset of the document collection.
    """
    
    def __init__(self, num_shards: int = 4, max_docs_per_shard: int = 10000):
        self.num_shards = num_shards
        self.max_docs_per_shard = max_docs_per_shard
        self.shards = []
        
    def add_documents(self, documents: List[Document]):
        """Distribute documents across shards using consistent hashing."""
        for doc in documents:
            shard_idx = self._get_shard_index(doc)
            self.shards[shard_idx].add(doc)
    
    def retrieve(self, query: str, top_k: int = 5) -> List[Document]:
        """Query all shards in parallel and merge results."""
        from concurrent.futures import ThreadPoolExecutor
        
        with ThreadPoolExecutor(max_workers=self.num_shards) as executor:
            futures = [
                executor.submit(shard.retrieve, query, top_k * 2)
                for shard in self.shards
            ]
            
        results = []
        for future in futures:
            results.extend(future.result())
        
        # Re-rank and return top k
        return sorted(results, key=lambda x: x.score, reverse=True)[:top_k]
```

### 3. API Server Clustering

Run multiple FastAPI instances with shared state.

```python
# api_server_cluster.py
from fastapi import FastAPI
from redis import Redis
import uvicorn

app = FastAPI()

# Shared state via Redis (even in offline mode, Redis runs locally)
redis_client = Redis(host='localhost', port=6379, decode_responses=True)

@app.get("/health")
async def health():
    instance_id = os.environ.get('INSTANCE_ID', 'unknown')
    return {
        "status": "healthy",
        "instance": instance_id,
        "active_queries": redis_client.get(f"queries:{instance_id}")
    }
```

---

## Vertical Scaling Optimizations

### 1. GPU Memory Optimization

Maximize GPU utilization for embedding and reranking operations.

```python
# config/init_config.yaml - Optimized for GPU
processing:
  batch_size_embeddings: 64    # Increase for GPU (default: 32)
  batch_size_reranking: 16     # Increase for GPU (default: 8)
  
model:
  device_rerank: "cuda"        # Use CUDA for NVIDIA GPUs
  # device_rerank: "mps"       # Use Metal for Apple Silicon
```

**Memory-Efficient Embedding:**

```python
# Enable gradient checkpointing for large batches
import torch

def embed_with_checkpointing(model, texts, batch_size=64):
    """Embed texts with gradient checkpointing for memory efficiency."""
    embeddings = []
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        
        with torch.cuda.amp.autocast():  # Half precision
            emb = model.encode(batch)
        
        embeddings.extend(emb)
        
        # Clear CUDA cache periodically
        if i % (batch_size * 10) == 0:
            torch.cuda.empty_cache()
    
    return embeddings
```

### 2. Chunk Size Optimization

Balance between context quality and memory usage.

| Chunk Size | Pros | Cons | Recommended For |
|------------|------|------|-----------------|
| 500 tokens | More precise retrieval | More chunks, higher memory | Technical docs |
| 1000 tokens | Balanced | Moderate memory | General use |
| 2000 tokens | Better context | Larger embeddings | Legal/research docs |
| 4000 tokens | Maximum context | High memory | Long-form content |

```yaml
# config/init_config.yaml
processing:
  # For large document collections (10k+ docs)
  chunk_size: 500
  chunk_overlap: 50
  
  # For smaller collections with rich context needs
  # chunk_size: 2000
  # chunk_overlap: 200
```

### 3. Index Quantization

Reduce FAISS index size with quantization.

```python
# src/retrieval/quantized_retriever.py
import faiss

def create_quantized_index(embeddings, nlist=100):
    """
    Create a quantized FAISS index for memory efficiency.
    Reduces memory by ~4x with minimal accuracy loss.
    """
    dim = embeddings.shape[1]
    
    # Product Quantization: 768-dim → 96 sub-vectors
    quantizer = faiss.IndexFlatL2(dim)
    index = faiss.IndexIVFPQ(quantizer, dim, nlist, 96, 8)
    
    # Train the quantizer
    index.train(embeddings)
    index.add(embeddings)
    
    return index

# Memory comparison:
# Flat index (768-dim, 100k docs):    ~300 MB
# Quantized index (same):             ~75 MB
```

---

## Database and Index Scaling

### 1. Persistent FAISS Index

Save and load indices to avoid rebuilding on restart.

```python
# src/cache/persistent_index.py
import faiss
import pickle
from pathlib import Path

class PersistentFAISSIndex:
    """Persist FAISS index to disk for fast restarts."""
    
    def __init__(self, cache_dir: str = "./cache"):
        self.cache_dir = Path(cache_dir)
        self.index_path = self.cache_dir / "faiss_index.bin"
        self.metadata_path = self.cache_dir / "index_metadata.pkl"
    
    def save(self, index, texts: List[str], sources: List[str]):
        """Save index and metadata to disk."""
        faiss.write_index(index, str(self.index_path))
        
        with open(self.metadata_path, 'wb') as f:
            pickle.dump({'texts': texts, 'sources': sources}, f)
    
    def load(self):
        """Load index and metadata from disk."""
        if not self.index_path.exists():
            return None, None, None
            
        index = faiss.read_index(str(self.index_path))
        
        with open(self.metadata_path, 'rb') as f:
            metadata = pickle.load(f)
        
        return index, metadata['texts'], metadata['sources']
```

### 2. BM25 Index Persistence

```python
# src/cache/bm25_persistence.py
import pickle
from rank_bm25 import BM25Okapi

class PersistentBM25Index:
    """Persist BM25 index for fast loading."""
    
    def save(self, bm25_index: BM25Okapi, path: str):
        with open(path, 'wb') as f:
            pickle.dump(bm25_index, f)
    
    def load(self, path: str) -> BM25Okapi:
        with open(path, 'rb') as f:
            return pickle.load(f)
```

### 3. Incremental Index Updates

Add new documents without full rebuild.

```python
# See: docs/INCREMENTAL_LEARNING.md for full implementation
class IncrementalIndexManager:
    """Add documents incrementally without full index rebuild."""
    
    def add_documents(self, new_docs: List[Document]):
        # FAISS supports live addition
        self.vectorstore.add_texts([d.page_content for d in new_docs])
        
        # BM25 requires rebuild (optimized)
        self._incremental_bm25_update(new_docs)
```

---

## Model Scaling

### 1. Model Swapping Strategies

Different models for different use cases:

| Model | Size | Speed | Quality | Use Case |
|-------|------|-------|---------|----------|
| Mistral-7B-Instruct | 4GB | Fast | Good | Development |
| Mistral-Nemo-12B | 8.5GB | Medium | Better | Production |
| Mixtral-8x7B | 25GB | Slow | Best | Enterprise |

### 2. Speculative Decoding

Speed up inference with draft models.

```bash
# Run with speculative decoding (2x faster)
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile \
    --server \
    --draft-model models/smaller-draft-model.gguf \
    --draft-k 4 \
    -ngl 999 \
    --port 8081
```

### 3. Model Quantization Levels

Trade quality for speed/memory:

```bash
# Q8_0: Best quality, largest size (~16GB)
# Q5_K_M: Good quality/size balance (~8.5GB) [RECOMMENDED]
# Q4_K_M: Smaller, slightly lower quality (~5GB)
# Q2_K: Smallest, lowest quality (~3GB)
```

---

## Distributed Deployment Patterns

### Pattern 1: Microservices Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   API GW    │────▶│ Query Queue │
│  (React)    │     │  (Nginx)    │     │  (Redis)    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
              ┌─────▼─────┐            ┌───────▼────────┐          ┌──────▼─────┐
              │ Retrieval │            │  LLM Worker 1  │          │ LLM Worker │
              │  Service  │            │   (GPU Node)   │          │    2...N   │
              └─────┬─────┘            └────────────────┘          └────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
  ┌─────▼────┐ ┌────▼────┐ ┌────▼────┐
  │  FAISS   │ │  BM25   │ │Reranker │
  │  Shard 1 │ │  Index  │ │ Service │
  └──────────┘ └─────────┘ └─────────┘
```

### Pattern 2: Edge Deployment

Deploy on edge devices for truly offline operation:

```yaml
# Raspberry Pi 5 / Apple M-series deployment
resources:
  minimum_ram: 16GB
  recommended_ram: 32GB
  storage: 50GB SSD
  
models:
  llm: "Mistral-7B-Instruct-v0.2.Q4_K_M.gguf"  # 4GB
  embeddings: "nomic-embed-text-v1.5"
  reranker: "disabled"  # Skip for edge devices
```

---

## Performance Benchmarks

### Query Latency by Configuration

| Configuration | Retrieval | Reranking | Generation | Total |
|---------------|-----------|-----------|------------|-------|
| **Baseline (M3 Mac)** | 0.5s | 1.2s | 8s | ~10s |
| **GPU Optimized** | 0.2s | 0.5s | 4s | ~5s |
| **No Reranking** | 0.5s | 0s | 8s | ~8.5s |
| **Quantized Index** | 0.8s | 1.2s | 8s | ~10s |

### Throughput Scaling

```
Queries/minute by instance count:

1 instance:  4-6 queries/min
2 instances: 8-12 queries/min
4 instances: 16-24 queries/min
8 instances: 30-45 queries/min (diminishing returns)
```

---

## Enterprise Deployment Recommendations

### Small Team (5-20 users)

```yaml
deployment:
  llm_instances: 1
  api_instances: 1
  max_documents: 500
  hardware:
    cpu: 8 cores
    ram: 32GB
    gpu: Optional (Apple M-series or RTX 3080+)
```

### Medium Team (20-100 users)

```yaml
deployment:
  llm_instances: 2-4
  api_instances: 2
  index_shards: 2
  max_documents: 2000
  hardware:
    cpu: 16+ cores
    ram: 64GB
    gpu: Required (A100 40GB or equivalent)
```

### Enterprise (100+ users)

```yaml
deployment:
  llm_instances: 8+
  api_instances: 4+
  index_shards: 4+
  max_documents: 10000+
  hardware:
    kubernetes_cluster: true
    gpu_nodes: 4+
    shared_storage: NFS/Ceph
```

---

## Monitoring and Observability

### Key Metrics to Track

```python
# Prometheus metrics example
from prometheus_client import Counter, Histogram, Gauge

QUERY_LATENCY = Histogram(
    'rag_query_latency_seconds',
    'Query processing time',
    ['stage']  # retrieval, reranking, generation
)

ACTIVE_QUERIES = Gauge(
    'rag_active_queries',
    'Number of queries being processed'
)

INDEX_SIZE = Gauge(
    'rag_index_size_documents',
    'Total documents in index'
)
```

---

## Next Steps

1. **Read** [INCREMENTAL_LEARNING.md](./INCREMENTAL_LEARNING.md) for dynamic document updates
2. **Read** [RBAC_IMPLEMENTATION.md](./RBAC_IMPLEMENTATION.md) for access control scaling
3. **Review** configuration files in `/config/` for tuning parameters

---

*Last updated: January 2026*
