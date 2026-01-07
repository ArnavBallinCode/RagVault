# RagVault Configuration Reference

> Complete reference for all configuration files and parameters in the RagVault system.

---

## Table of Contents

1. [Configuration Files](#configuration-files)
2. [init_config.yaml](#init_configyaml)
3. [process_config.yaml](#process_configyaml)
4. [users.json](#usersjson)
5. [Environment Variables](#environment-variables)
6. [Frontend Configuration](#frontend-configuration)
7. [Common Configurations](#common-configurations)

---

## Configuration Files

RagVault uses three main configuration files:

```
config/
├── init_config.yaml      # Main system configuration
├── process_config.yaml   # Retrieval and LLM settings
└── users.json            # User database (gitignored)
```

---

## init_config.yaml

### Complete Reference

```yaml
# =============================================================================
# INIT CONFIGURATION - Main system configuration
# File: config/init_config.yaml
# =============================================================================

# -----------------------------------------------------------------------------
# LOGGING
# Configure logging behavior for debugging and monitoring
# -----------------------------------------------------------------------------
logging:
  level: "INFO"              # Options: DEBUG, INFO, WARNING, ERROR, CRITICAL
  show_progress: true        # Show progress bars during processing
  hide_http_requests: true   # Hide HTTP request logs (cleaner output)
  file_logging: true         # Write logs to logs/ directory
  console_logging: true      # Print logs to console

# -----------------------------------------------------------------------------
# MODELS
# Configure AI models for embedding, reranking, and device selection
# -----------------------------------------------------------------------------
model:
  # Embedding model for vector search
  # Recommended: nomic-ai/nomic-embed-text-v1.5 (768 dimensions)
  embedding_model_hf: "nomic-ai/nomic-embed-text-v1.5"
  
  # Reranker model for result refinement
  # Recommended: BAAI/bge-reranker-v2-m3 (multilingual)
  rerank_model: "BAAI/bge-reranker-v2-m3"
  
  # Device for reranking inference
  # Options: "mps" (Apple Silicon), "cuda" (NVIDIA), "cpu"
  device_rerank: "mps"

# -----------------------------------------------------------------------------
# INGESTION
# Configure data loading behavior
# -----------------------------------------------------------------------------
ingestion:
  # Columns to ignore when loading CSV files
  # Set to None or leave empty to include all columns
  ignore_columns: None  # Example: ["Query", "Unused_Column"]

# -----------------------------------------------------------------------------
# PROCESSING
# Configure document chunking and preprocessing
# -----------------------------------------------------------------------------
processing:
  # Text used to identify table of contents sections
  TOC_text: "Table of Contents"
  
  # Markdown headers for document splitting
  # Format: [header_marker, header_name]
  headers_to_split_on:
    - ["##", "Header 2"]
    - ["###", "Header 3"]
    - ["####", "Header 4"]
    - ["Table of Contents", "Table of Contents"]
  
  # Headers for URL-scraped content (includes H1)
  headers_to_split_on_for_urls:
    - ["#", "Header 1"]
    - ["##", "Header 2"]
    - ["###", "Header 3"]
    - ["####", "Header 4"]
    - ["Table of Contents", "Table of Contents"]
  
  # Header key mappings for reconstruction
  headers_keys:
    "Header 1": "# "
    "Header 2": "## "
    "Header 3": "### "
    "Header 4": "#### "
    "Table of Contents": "# "
  
  # Parallel processing threads (adjust based on CPU cores)
  OMP_NUM_THREADS: 15
  
  # Chunk size in characters (not tokens!)
  # Recommended: 2000 for general use, 500-1000 for technical docs
  chunk_size: 2000
  
  # Overlap between chunks for context continuity
  # Recommended: 10-20% of chunk_size
  chunk_overlap: 200
  
  # Batch sizes for model inference
  batch_size_embeddings: 32   # Increase for GPU, decrease for memory issues
  batch_size_reranking: 8     # Smaller due to cross-encoder memory usage
  
  # Enable document splitting (set to false for small documents)
  split_documents: true

# -----------------------------------------------------------------------------
# PATHS
# Configure directory locations
# -----------------------------------------------------------------------------
paths:
  cache_dir: "./cache"       # Cached embeddings and indices
  data_dir: "./data"         # Document storage
  log_dir: "./logs"          # Log files

# -----------------------------------------------------------------------------
# FILES
# Configure specific file paths and document sources
# -----------------------------------------------------------------------------
files:
  # Training and test data (for evaluation benchmarks)
  train_data: "data/raw/train.csv"
  test_data: "data/raw/test.csv"
  train_output: "data/processed/submission_train_final.csv"
  test_output: "data/processed/submission_test_final.csv"
  
  # Document paths to index
  # Note: data/uploads/ is automatically scanned
  document_paths:
    - "data/raw/data.txt"
    # Add more paths as needed:
    # - "data/raw/company_wiki.pdf"
    # - "data/raw/product_docs.md"
```

### Key Parameters Explained

#### chunk_size

| Value | Best For | Memory Impact |
|-------|----------|---------------|
| 500 | Technical docs, code | Lower |
| 1000 | Balanced | Medium |
| 2000 | Long-form content (default) | Higher |
| 4000 | Legal/research documents | Highest |

#### device_rerank

| Value | Platform | Performance |
|-------|----------|-------------|
| `mps` | macOS Apple Silicon | Excellent |
| `cuda` | Linux/Windows NVIDIA | Excellent |
| `cpu` | Any | Slow (fallback) |

---

## process_config.yaml

### Complete Reference

```yaml
# =============================================================================
# PROCESS CONFIGURATION - Retrieval and LLM settings
# File: config/process_config.yaml
# =============================================================================

retrieval:
  # -----------------------------------------------------------------------------
  # LLM Server
  # -----------------------------------------------------------------------------
  
  # URL of the Llamafile server
  # Default: http://localhost:8081
  llamafile_server_base_url: "http://localhost:8081"
  
  # Number of chunks to send to LLM for response generation
  # Higher = more context but slower and may exceed context window
  # Recommended: 2-5 depending on chunk_size
  send_nb_chunks_to_llm: 2
  
  # -----------------------------------------------------------------------------
  # Retrieval Settings
  # -----------------------------------------------------------------------------
  
  # Enable BM25 keyword search (hybrid mode)
  # Set to false for pure vector search
  use_bm25: true
  
  # Weight of BM25 in hybrid scoring (0.0 to 1.0)
  # 0.0 = pure vector search
  # 1.0 = pure BM25 search
  # Recommended: 0.2-0.3 for semantic-heavy, 0.5 for balanced
  bm25_weight: 0.2
  
  # Number of documents to retrieve initially
  # Reranker will then select top k from these
  top_k: 100
  
  # Enable neural reranking for improved precision
  # Recommended: true (adds ~1s latency but improves quality)
  use_reranking: true
  
  # Enable LLM-based query expansion
  # Expands incomplete queries before retrieval
  # Recommended: false (adds latency, marginal benefit)
  use_query_expansion: false
```

### Parameter Tuning Guide

#### bm25_weight

```
Query Type                 → Recommended bm25_weight

"What is authentication?"  → 0.2 (semantic understanding)
"JWT token"                → 0.5 (keyword matching important)
"error code E-5021"        → 0.8 (exact match critical)
```

#### send_nb_chunks_to_llm

```
Chunk Size  │  Recommended Chunks  │  Approx Tokens
────────────┼──────────────────────┼────────────────
500         │  4-6                 │  2000-3000
1000        │  3-4                 │  3000-4000
2000        │  2-3                 │  4000-6000
4000        │  1-2                 │  4000-8000

Note: Stay within model's context window (128K for Mistral Nemo)
```

---

## users.json

### Structure

```json
{
  "username": {
    "password": "sha256_hash_of_password",
    "role": "admin|user",
    "name": "Display Name"
  }
}
```

### Default Users

```json
{
  "admin": {
    "password": "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
    "role": "admin",
    "name": "Administrator"
  },
  "user": {
    "password": "04f8996da763b7a969b1028ee3007569eaf3a635486ddab211d512c85b9df8fb",
    "role": "user",
    "name": "Standard User"
  }
}
```

### Creating Password Hashes

```python
import hashlib

password = "my_secure_password"
hash_value = hashlib.sha256(password.encode()).hexdigest()
print(hash_value)
```

### Adding Users via UI

1. Login as admin
2. Navigate to Users page
3. Fill in the form:
   - Username
   - Password
   - Display Name
   - Role (admin/user)
4. Click "Add User"

---

## Environment Variables

While RagVault primarily uses YAML configuration, some settings can be overridden via environment variables:

```bash
# LLM Server
export LLAMAFILE_URL="http://localhost:8081"

# Device selection
export RAGVAULT_DEVICE="mps"  # or "cuda", "cpu"

# Logging
export RAGVAULT_LOG_LEVEL="DEBUG"

# Cache directory
export RAGVAULT_CACHE_DIR="./custom_cache"
```

### Using in Code

```python
import os

llm_url = os.environ.get(
    "LLAMAFILE_URL",
    config['retrieval']['llamafile_server_base_url']
)
```

---

## Frontend Configuration

### vite.config.ts

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
```

### Environment Variables (.env.local)

```bash
# API Configuration
VITE_API_URL=http://localhost:8000
VITE_LLM_URL=http://localhost:8081

# Features
VITE_ENABLE_DEVTOOLS=true
```

### Using Environment Variables

```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

---

## Common Configurations

### Development Setup

```yaml
# init_config.yaml (development)
logging:
  level: "DEBUG"
  show_progress: true

processing:
  chunk_size: 1000        # Smaller for faster testing
  batch_size_embeddings: 16

model:
  device_rerank: "cpu"    # Works without GPU
```

```yaml
# process_config.yaml (development)
retrieval:
  llamafile_server_base_url: "http://localhost:8081"
  top_k: 50               # Faster retrieval
  use_reranking: false    # Skip for speed
```

### Production Setup

```yaml
# init_config.yaml (production)
logging:
  level: "WARNING"
  show_progress: false
  file_logging: true

processing:
  chunk_size: 2000
  batch_size_embeddings: 64

model:
  device_rerank: "mps"    # or "cuda"
```

```yaml
# process_config.yaml (production)
retrieval:
  top_k: 100
  use_reranking: true
  bm25_weight: 0.2
```

### High-Performance Setup

```yaml
# For maximum quality on powerful hardware
processing:
  chunk_size: 1500
  chunk_overlap: 300
  batch_size_embeddings: 128
  batch_size_reranking: 32

retrieval:
  top_k: 200
  send_nb_chunks_to_llm: 5
  use_reranking: true
  use_query_expansion: true
```

### Low-Memory Setup

```yaml
# For constrained environments
processing:
  chunk_size: 500
  batch_size_embeddings: 8
  batch_size_reranking: 2

model:
  device_rerank: "cpu"

retrieval:
  top_k: 30
  send_nb_chunks_to_llm: 1
  use_reranking: false
```

---

## Configuration Validation

### Validate Script

```python
#!/usr/bin/env python3
"""Validate RagVault configuration files."""

import yaml
from pathlib import Path

def validate_init_config(config):
    """Validate init_config.yaml"""
    errors = []
    
    # Check required sections
    required = ['logging', 'model', 'processing', 'paths', 'files']
    for section in required:
        if section not in config:
            errors.append(f"Missing section: {section}")
    
    # Validate model settings
    if 'model' in config:
        valid_devices = ['mps', 'cuda', 'cpu']
        device = config['model'].get('device_rerank', 'cpu')
        if device not in valid_devices:
            errors.append(f"Invalid device_rerank: {device}")
    
    # Validate processing settings
    if 'processing' in config:
        chunk_size = config['processing'].get('chunk_size', 0)
        if chunk_size < 100 or chunk_size > 10000:
            errors.append(f"chunk_size should be 100-10000, got: {chunk_size}")
        
        overlap = config['processing'].get('chunk_overlap', 0)
        if overlap >= chunk_size:
            errors.append("chunk_overlap must be less than chunk_size")
    
    return errors

def validate_process_config(config):
    """Validate process_config.yaml"""
    errors = []
    
    if 'retrieval' not in config:
        errors.append("Missing 'retrieval' section")
        return errors
    
    retrieval = config['retrieval']
    
    # Validate weights
    bm25_weight = retrieval.get('bm25_weight', 0)
    if not 0 <= bm25_weight <= 1:
        errors.append(f"bm25_weight must be 0-1, got: {bm25_weight}")
    
    # Validate top_k
    top_k = retrieval.get('top_k', 0)
    if top_k < 1 or top_k > 1000:
        errors.append(f"top_k should be 1-1000, got: {top_k}")
    
    return errors

if __name__ == "__main__":
    # Load and validate init_config
    with open("config/init_config.yaml") as f:
        init_config = yaml.safe_load(f)
    
    errors = validate_init_config(init_config)
    
    # Load and validate process_config
    with open("config/process_config.yaml") as f:
        process_config = yaml.safe_load(f)
    
    errors.extend(validate_process_config(process_config))
    
    if errors:
        print("❌ Configuration errors found:")
        for error in errors:
            print(f"  - {error}")
    else:
        print("✅ All configuration files are valid!")
```

---

## Next Steps

- **[Overview](./01_OVERVIEW.md)** - System architecture
- **[RAG Pipeline](./05_RAG_PIPELINE.md)** - How config affects processing
- **[LLM Integration](./04_LLM_INTEGRATION.md)** - Model configuration

---

*Last updated: January 2026*
