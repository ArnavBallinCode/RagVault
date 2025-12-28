# 09. Configuration Reference

> Complete guide to all configuration options

---

## Configuration Files

| File | Purpose |
|------|---------|
| `config/init_config.yaml` | Model settings, paths, processing |
| `config/process_config.yaml` | Retrieval, LLM, runtime settings |
| `config/process_config.docker.yaml` | Docker-specific overrides |

---

## init_config.yaml

### Complete Reference

```yaml
# =============================================================================
# MODEL CONFIGURATION
# =============================================================================
model:
  # Embedding model for vector search
  embedding_model_hf: "nomic-ai/nomic-embed-text-v1.5"
  #   Options:
  #   - nomic-ai/nomic-embed-text-v1.5 (768 dim, recommended)
  #   - sentence-transformers/all-MiniLM-L6-v2 (384 dim, faster)
  #   - BAAI/bge-base-en-v1.5 (768 dim, alternative)
  
  # Reranker model for neural scoring
  rerank_model: "BAAI/bge-reranker-v2-m3"
  #   Options:
  #   - BAAI/bge-reranker-v2-m3 (multilingual, recommended)
  #   - BAAI/bge-reranker-base (English only, faster)
  #   - cross-encoder/ms-marco-MiniLM-L-6-v2 (smaller)
  
  # Device for reranker (embedding always uses CPU)
  device_rerank: "mps"
  #   Options:
  #   - auto (auto-detect best device)
  #   - mps (Apple Silicon GPU)
  #   - cuda (NVIDIA GPU)
  #   - cpu (fallback)

# =============================================================================
# PROCESSING CONFIGURATION
# =============================================================================
processing:
  # Text chunking settings
  chunk_size: 2000              # Characters per chunk (500-4000)
  chunk_overlap: 200            # Overlap between chunks (10-20% of chunk_size)
  
  # Headers for markdown splitting
  headers_to_split_on_for_urls:
    - ["#", "Header 1"]
    - ["##", "Header 2"]
    - ["###", "Header 3"]

# =============================================================================
# PATH CONFIGURATION
# =============================================================================
paths:
  # Base directories
  data_dir: "./data"            # Root data directory
  cache_dir: "./cache"          # Embedding cache
  log_dir: "./logs"             # Application logs
  models_dir: "./models"        # LLM binaries
  
  # Specific paths
  raw_data_dir: "./data/raw"    # Input documents
  processed_dir: "./data/processed"  # Output files
  upload_dir: "./data/uploads"  # UI uploads

# =============================================================================
# FILE CONFIGURATION
# =============================================================================
files:
  # Explicit document paths (in addition to data/raw/)
  document_paths:
    - "./data/raw/data.txt"
    - "./data/raw/document.pdf"
  
  # Train/test data (optional, for evaluation)
  train_file: "./data/train_dataset.csv"
  test_file: "./data/test_dataset.csv"
  
  # Output files
  train_results_file: "./data/processed/train_results.csv"
  test_results_file: "./data/processed/test_results.csv"

# =============================================================================
# LOGGING CONFIGURATION
# =============================================================================
logging:
  level: "INFO"                 # DEBUG, INFO, WARNING, ERROR
  format: "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
  file: "./logs/rag_system.log"
```

---

## process_config.yaml

### Complete Reference

```yaml
# =============================================================================
# RETRIEVAL CONFIGURATION
# =============================================================================
retrieval:
  # LLM Server Connection
  llamafile_server_base_url: "http://localhost:8081"
  #   Local: http://localhost:8081
  #   Docker: http://llm-server:8081 (overridden by env var)
  
  # Hybrid retrieval weights
  bm25_weight: 0.2              # 0.0 = pure vector, 1.0 = pure BM25
  #   Recommended: 0.1-0.3 for most use cases
  #   Higher BM25 for: technical docs, code, exact terms
  #   Lower BM25 for: conversational, conceptual queries
  
  # Retrieval depth
  top_k: 100                    # Candidates for reranking (50-200)
  
  # Method toggles
  use_bm25: true                # Enable BM25 keyword search
  use_vector: true              # Enable vector semantic search
  use_reranking: true           # Enable neural reranking
  
  # Query expansion
  use_query_expansion: false    # LLM-based query enhancement
  
  # Context for LLM
  send_nb_chunks_to_llm: 2      # Chunks after reranking (1-5)
  #   More chunks = more context but slower/more expensive
  #   Fewer chunks = faster but might miss info

# =============================================================================
# LLM GENERATION CONFIGURATION  
# =============================================================================
llm:
  # Temperature (creativity)
  temperature: 0.7              # 0.0-1.0, lower = more deterministic
  
  # Max output tokens
  max_tokens: 512               # Response length limit
  
  # Sampling parameters
  top_p: 0.9                    # Nucleus sampling
  top_k: 40                     # Top-k sampling
  repeat_penalty: 1.1           # Penalize repetition
```

---

## Docker Configuration

### process_config.docker.yaml

```yaml
retrieval:
  # Docker uses internal network
  llamafile_server_base_url: "http://llm-server:8081"
```

### Environment Variable Overrides

| Variable | Purpose | Example |
|----------|---------|---------|
| `LLAMAFILE_SERVER_URL` | LLM server address | `http://llm-server:8081` |
| `FORCE_CPU` | Force CPU for reranker | `1`, `true`, `yes` |
| `LOG_LEVEL` | Override log level | `DEBUG` |

### How Overrides Work

```python
# Environment takes priority over config
llm_url = os.environ.get(
    "LLAMAFILE_SERVER_URL",
    config["retrieval"]["llamafile_server_base_url"]
)

# Force CPU for Docker compatibility
if os.environ.get('FORCE_CPU', '').lower() in ('1', 'true', 'yes'):
    device = 'cpu'
```

---

## Configuration Loading

### Code Path

```python
# src/utils/helpers.py
def load_config(config_path: str) -> dict:
    """Load YAML configuration file"""
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    return config

# initialize_rag.py
class RAGInitializer:
    def __init__(self, init_config_path: str, process_config_path: str):
        self.init_config = load_config(init_config_path)
        self.process_config = load_config(process_config_path)
```

### Configuration Merging

```python
# Combine configs for components that need both
combined_config = {
    **self.init_config,
    'retrieval': self.process_config['retrieval']
}

retriever = HybridRetriever(combined_config)
```

---

## Tuning Guide

### For Speed

```yaml
# init_config.yaml
model:
  embedding_model_hf: "sentence-transformers/all-MiniLM-L6-v2"  # 4x faster
  device_rerank: "mps"  # Use GPU

processing:
  chunk_size: 1000      # Smaller chunks, faster processing

# process_config.yaml
retrieval:
  top_k: 50             # Fewer candidates to rerank
  send_nb_chunks_to_llm: 1  # Less context
```

### For Quality

```yaml
# init_config.yaml
model:
  embedding_model_hf: "nomic-ai/nomic-embed-text-v1.5"  # Best quality
  rerank_model: "BAAI/bge-reranker-v2-m3"  # Best reranker

processing:
  chunk_size: 2000      # Larger context per chunk
  chunk_overlap: 400    # More overlap

# process_config.yaml
retrieval:
  top_k: 200            # More candidates
  send_nb_chunks_to_llm: 3  # More context
  bm25_weight: 0.3      # Slightly more keyword matching
```

### For Memory-Constrained Systems

```yaml
# init_config.yaml  
model:
  embedding_model_hf: "sentence-transformers/all-MiniLM-L6-v2"  # Smaller
  device_rerank: "cpu"  # No GPU memory

processing:
  chunk_size: 1500      # Smaller chunks

# process_config.yaml
retrieval:
  top_k: 30             # Very few candidates
  use_reranking: false  # Skip reranking (saves memory)
```

---

## Validation

### Common Mistakes

| Setting | Wrong | Right |
|---------|-------|-------|
| `chunk_overlap` | > chunk_size | < 25% of chunk_size |
| `bm25_weight` | > 1.0 | 0.0 to 1.0 |
| `top_k` | > 1000 | 50 to 200 |
| `send_nb_chunks_to_llm` | > 10 | 1 to 5 |

### Config Validation Code

```python
def validate_config(config: dict) -> List[str]:
    """Validate configuration and return list of warnings"""
    warnings = []
    
    # Check chunk settings
    chunk_size = config['processing']['chunk_size']
    chunk_overlap = config['processing']['chunk_overlap']
    
    if chunk_overlap >= chunk_size:
        warnings.append(f"chunk_overlap ({chunk_overlap}) >= chunk_size ({chunk_size})")
    
    if chunk_overlap > chunk_size * 0.25:
        warnings.append(f"chunk_overlap ({chunk_overlap}) > 25% of chunk_size")
    
    # Check weights
    bm25_weight = config['retrieval']['bm25_weight']
    if not 0 <= bm25_weight <= 1:
        warnings.append(f"bm25_weight ({bm25_weight}) must be 0-1")
    
    return warnings
```

---

## Next: Troubleshooting →

See [10_TROUBLESHOOTING.md](./10_TROUBLESHOOTING.md) for common issues.

---

*Author: Arnav Angarkar*
