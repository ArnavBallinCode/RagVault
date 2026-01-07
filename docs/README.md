# RagVault Documentation Index

> Complete technical documentation for the Secure Offline RAG System

---

## Quick Links

| Document | Description |
|----------|-------------|
| [Overview](./01_OVERVIEW.md) | System architecture and key concepts |
| [Backend](./02_BACKEND.md) | FastAPI server and RAG pipeline |
| [Frontend](./03_FRONTEND.md) | React + Vite UI application |
| [LLM Integration](./04_LLM_INTEGRATION.md) | Llamafile and model configuration |
| [RAG Pipeline](./05_RAG_PIPELINE.md) | Document processing and retrieval |
| [DevOps](./06_DEVOPS.md) | Deployment and operations |
| [Data Processing](./07_DATA_PROCESSING.md) | Document loaders and preprocessing |
| [Retrieval System](./08_RETRIEVAL_SYSTEM.md) | FAISS, BM25, and hybrid search |
| [Configuration](./09_CONFIGURATION.md) | YAML configuration reference |
| [Troubleshooting](./10_TROUBLESHOOTING.md) | Common issues and solutions |

---

## Specialized Guides

| Document | Description |
|----------|-------------|
| [Scalability Guide](./SCALABILITY.md) | Horizontal/vertical scaling strategies |
| [Incremental Learning](./INCREMENTAL_LEARNING.md) | Adding documents without full rebuild |
| [RBAC Implementation](./RBAC_IMPLEMENTATION.md) | Role-based access control |
| [System Architecture](./SYSTEM_ARCHITECTURE.md) | Deep technical architecture |
| [Quickstart](./QUICKSTART.md) | Getting started in 5 minutes |

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RAGVAULT SYSTEM ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────────┘

                     ┌─────────────────────────────────┐
                     │       USER INTERFACES           │
                     │  ┌─────────────┐ ┌───────────┐  │
                     │  │  React UI   │ │ Streamlit │  │
                     │  │ (Port 5173) │ │ (Port 8501)│  │
                     │  │  [Primary]  │ │[Mem-Eff.] │  │
                     │  └──────┬──────┘ └─────┬─────┘  │
                     └─────────┼──────────────┼────────┘
                               │              │
                               ▼              ▼
                     ┌─────────────────────────────────┐
                     │        API LAYER                │
                     │  ┌─────────────────────────┐   │
                     │  │   FastAPI Server        │   │
                     │  │   (Port 8000)           │   │
                     │  └───────────┬─────────────┘   │
                     └──────────────┼─────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌─────────────────┐         ┌───────────────┐
│   RETRIEVAL   │         │   GENERATION    │         │    MODELS     │
│  ┌─────────┐  │         │  ┌───────────┐  │         │  ┌─────────┐  │
│  │  FAISS  │  │         │  │ Llamafile │  │         │  │ Nomic   │  │
│  │ Vector  │  │         │  │ Server    │  │         │  │ Embed   │  │
│  └─────────┘  │         │  │(Port 8081)│  │         │  └─────────┘  │
│  ┌─────────┐  │         │  └───────────┘  │         │  ┌─────────┐  │
│  │  BM25   │  │         └─────────────────┘         │  │ BGE     │  │
│  │ Index   │  │                                     │  │ Reranker│  │
│  └─────────┘  │                                     │  └─────────┘  │
└───────────────┘                                     └───────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                       │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐               │
│  │  data/raw/     │  │  data/uploads/ │  │   cache/       │               │
│  │  Documents     │  │  User Files    │  │   Embeddings   │               │
│  └────────────────┘  └────────────────┘  └────────────────┘               │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Backend

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| API Server | FastAPI | 0.128+ | REST API |
| RAG Framework | LangChain | 0.2+ | Document processing |
| Vector Store | FAISS | Latest | Similarity search |
| Keyword Search | rank-bm25 | Latest | BM25 retrieval |
| Embeddings | HuggingFace | Latest | Nomic Embed v1.5 |
| Reranking | Transformers | 4.x | BGE Reranker v2 |

### Frontend

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Framework | React | 19.x | UI components |
| Build Tool | Vite | 7.x | Development & bundling |
| Flow Diagram | ReactFlow | 11.x | Visual pipeline |
| Icons | Lucide React | 0.56+ | Icon library |
| Animations | Framer Motion | 12.x | Smooth transitions |

### LLM

| Component | Technology | Size | Purpose |
|-----------|------------|------|---------|
| LLM Server | Llamafile | N/A | Model serving |
| Default Model | Mistral Nemo 12B | 8.5GB | Response generation |
| Quantization | Q5_K_M | N/A | Quality/size balance |

---

## Key Concepts

### Hybrid Retrieval

RagVault combines two retrieval methods:

1. **Vector Search (FAISS)**: Semantic similarity using embeddings
2. **Keyword Search (BM25)**: Lexical matching using term frequency

```python
# Weighted combination
final_score = (bm25_weight × bm25_score) + ((1 - bm25_weight) × vector_score)
# Default: bm25_weight = 0.2
```

### RAG Pipeline Flow

```
Query → Expand → Retrieve (Hybrid) → Rerank → Generate → Response
```

1. **Query Expansion**: LLM improves query clarity (optional)
2. **Hybrid Retrieval**: Combine vector + keyword search
3. **Neural Reranking**: BGE reranker refines results
4. **Response Generation**: LLM generates answer with context

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+ (for React frontend)
- 16GB+ RAM
- Conda (recommended)

### Quick Start

```bash
# 1. Clone and setup
git clone https://github.com/ArnavBallinCode/RagVault.git
cd RagVault
conda create -n ragvault python=3.10 -y
conda activate ragvault
pip install -r requirements_macos.txt

# 2. Download LLM model (8.5GB)
mkdir -p models
curl -L -o models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile \
  "https://huggingface.co/Mozilla/Mistral-Nemo-Instruct-2407-llamafile/resolve/main/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile"
chmod +x models/*.llamafile

# 3. Initialize document cache
python init_cache_data.py

# 4. Start all services
./start.sh
```

### Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| React Frontend | http://localhost:5173 | Modern visual pipeline UI (primary) |
| Streamlit UI | http://localhost:8501 | Memory-efficient UI with RBAC |
| FastAPI Backend | http://localhost:8000 | REST API |
| API Documentation | http://localhost:8000/docs | Swagger UI |
| LLM Server | http://localhost:8081 | Model inference |

---

## Project Structure

```
RagVault/
├── api_server.py              # FastAPI REST server
├── streamlit_app.py           # Streamlit web interface
├── initialize_rag.py          # RAG system initialization
├── init_cache_data.py         # Cache builder script
├── process_single_query.py    # CLI query tool
│
├── config/
│   ├── init_config.yaml       # Main configuration
│   ├── process_config.yaml    # Retrieval settings
│   └── users.json             # User database (gitignored)
│
├── src/
│   ├── cache/
│   │   └── cache.py           # Cache management
│   ├── data/
│   │   ├── data_ingestion.py  # Document loading
│   │   ├── data_preprocessing.py  # Chunking
│   │   └── loaders/
│   │       ├── file_loader.py     # Multi-format loader
│   │       ├── web_scraper.py     # URL content scraper
│   │       └── file_converter.py  # Office → PDF
│   ├── models/
│   │   └── reranker.py        # BGE neural reranker
│   ├── retrieval/
│   │   ├── hybrid_retriever.py    # Hybrid search
│   │   ├── vector_retriever.py    # FAISS search
│   │   └── bm25_retriever.py      # BM25 search
│   └── response/
│       └── response_generator.py  # LLM response
│
├── frontend/                  # React + Vite application
│   ├── src/
│   │   ├── App.tsx            # Main component
│   │   ├── api/client.ts      # API client
│   │   └── types/index.ts     # TypeScript types
│   ├── package.json
│   └── vite.config.ts
│
├── models/                    # LLM model files
│   └── Mistral-Nemo-*.llamafile
│
├── data/
│   ├── raw/                   # Source documents
│   ├── uploads/               # User uploads
│   └── processed/             # Output files
│
├── cache/                     # Embeddings & index cache
├── logs/                      # Application logs
│
└── docs/                      # This documentation
    ├── README.md              # This file
    ├── SCALABILITY.md         # Scaling guide
    ├── INCREMENTAL_LEARNING.md # Live updates
    └── RBAC_IMPLEMENTATION.md # Access control
```

---

## Configuration Reference

### init_config.yaml

```yaml
# Model settings
model:
  embedding_model_hf: "nomic-ai/nomic-embed-text-v1.5"
  rerank_model: "BAAI/bge-reranker-v2-m3"
  device_rerank: "mps"  # or "cuda", "cpu"

# Processing settings
processing:
  chunk_size: 2000
  chunk_overlap: 200
  batch_size_embeddings: 32
  batch_size_reranking: 8
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
```

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

See the main [README.md](../README.md) for more details.

---

## License

MIT License - See [LICENSE](../LICENSE) for details.

---

*Last updated: January 2026*
