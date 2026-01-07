# RagVault System Overview

> A comprehensive guide to understanding the architecture, components, and design philosophy of the Secure Offline RAG System.

---

## Table of Contents

1. [Introduction](#introduction)
2. [System Architecture](#system-architecture)
3. [Core Components](#core-components)
4. [Data Flow](#data-flow)
5. [Key Features](#key-features)
6. [Technology Stack](#technology-stack)
7. [Design Philosophy](#design-philosophy)
8. [System Requirements](#system-requirements)

---

## Introduction

### What is RagVault?

RagVault is a **fully offline, privacy-focused Retrieval-Augmented Generation (RAG) system** designed for enterprise knowledge management. It enables organizations to:

- **Query documents** using natural language
- **Keep all data local** - no cloud services required
- **Maintain privacy** - sensitive information never leaves your machine
- **Scale knowledge** - add documents incrementally

### Why Offline RAG?

| Cloud-Based RAG | RagVault (Offline) |
|-----------------|-------------------|
| Data sent to third parties | Data stays on your machine |
| Internet required | Works completely offline |
| Subscription costs | One-time setup |
| Limited customization | Full control over models |
| Vendor lock-in | Open source & portable |

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RAGVAULT ARCHITECTURE                              │
└─────────────────────────────────────────────────────────────────────────────┘

                          ┌─────────────────────────┐
                          │      USER INTERFACE     │
                          │  ┌─────────────────────┐│
                          │  │     React + Vite    ││
                          │  │   (Port 5173)       ││
                          │  │  Visual RAG Pipeline ││
                          │  └──────────┬──────────┘│
                          └─────────────┼───────────┘
                                        │
                                        ▼
                          ┌─────────────────────────┐
                          │     FastAPI Backend     │
                          │      (Port 8000)        │
                          └───────────┬─────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
    ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
    │    RETRIEVAL    │     │   GENERATION    │     │     MODELS      │
    │  ┌───────────┐  │     │  ┌───────────┐  │     │  ┌───────────┐  │
    │  │   FAISS   │  │     │  │ Llamafile │  │     │  │   Nomic   │  │
    │  │  Vector   │  │     │  │   LLM     │  │     │  │  Embed    │  │
    │  │   Store   │  │     │  │ (8081)    │  │     │  │   v1.5    │  │
    │  └───────────┘  │     │  └───────────┘  │     │  └───────────┘  │
    │  ┌───────────┐  │     └─────────────────┘     │  ┌───────────┐  │
    │  │   BM25    │  │                             │  │    BGE    │  │
    │  │   Index   │  │                             │  │  Reranker │  │
    │  └───────────┘  │                             │  └───────────┘  │
    └─────────────────┘                             └─────────────────┘
              │
              ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                          DATA LAYER                                      │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
    │  │  Documents   │  │   Uploads    │  │    Cache     │  │    Logs      │ │
    │  │  (data/raw)  │  │(data/uploads)│  │   (cache/)   │  │   (logs/)    │ │
    │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
    └─────────────────────────────────────────────────────────────────────────┘
```

### Component Interactions

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        REQUEST FLOW                                         │
└────────────────────────────────────────────────────────────────────────────┘

  User Query: "What is the authentication process?"
       │
       ▼
  ┌─────────────────┐
  │ 1. API receives │ ──────────────────────────────────────────┐
  │    query        │                                           │
  └────────┬────────┘                                           │
           │                                                    │
           ▼                                                    │
  ┌─────────────────┐                                           │
  │ 2. Hybrid       │ Parallel execution:                       │
  │    Retrieval    │ • FAISS: semantic similarity              │
  │                 │ • BM25: keyword matching                  │
  └────────┬────────┘                                           │
           │                                                    │
           ▼                                                    │
  ┌─────────────────┐                                           │
  │ 3. Reranking    │ BGE model scores query-document pairs     │
  │    (Neural)     │                                           │
  └────────┬────────┘                                           │
           │                                                    │
           ▼                                                    │
  ┌─────────────────┐                                           │
  │ 4. Context      │ Format top-k documents for LLM            │
  │    Preparation  │                                           │
  └────────┬────────┘                                           │
           │                                                    │
           ▼                                                    │
  ┌─────────────────┐    ┌─────────────────┐                    │
  │ 5. LLM          │───▶│ Llamafile       │                    │
  │    Generation   │◀───│ (Mistral Nemo)  │                    │
  └────────┬────────┘    └─────────────────┘                    │
           │                                                    │
           ▼                                                    │
  ┌─────────────────┐                                           │
  │ 6. Response     │ ◀─────────────────────────────────────────┘
  │    Formatting   │   Include: answer, sources, confidence
  └────────┬────────┘
           │
           ▼
  Final Response to User
```

---

## Core Components

### 1. User Interface

#### React Frontend (Port 5173)

A modern, visual pipeline interface built with:
- **React 19** + TypeScript
- **ReactFlow** for interactive pipeline visualization
- **Vite** for fast development
- **Framer Motion** for smooth animations

**Key Features:**
- Drag-and-drop document upload
- Visual RAG pipeline representation
- Real-time query processing
- Document management (upload, delete, list)
- LLM settings and status monitoring
- Configuration viewer
- Responsive sidebar navigation

**Location:** `frontend/src/App.tsx`

**Pages:**
- **Pipeline** (`/`) - Visual flow with Upload → Process → Query → Result nodes
- **Documents** (`/documents`) - Manage indexed documents
- **LLM Settings** (`/models`) - Model status and configuration
- **Configuration** (`/settings`) - System settings viewer

### 2. FastAPI Backend (Port 8000)

RESTful API server providing:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | System health check |
| `/upload` | POST | Upload documents |
| `/refresh` | POST | Rebuild indices |
| `/query` | POST | Ask questions |
| `/documents` | GET | List documents |
| `/documents/{name}` | DELETE | Delete document |
| `/clear` | POST | Clear all data |
| `/limits` | GET | Get system limits |

**Location:** `api_server.py`

### 3. RAG Pipeline

The core document processing and retrieval system:

```python
# Pipeline components in initialize_rag.py

@dataclass
class RAGComponents:
    retriever: HybridRetriever      # Combined search
    reranker: Reranker              # Neural reranking
    response_generator: ResponseGenerator  # LLM wrapper
    original_chunks: List           # Indexed documents
    init_config: Dict               # Configuration
    process_config: Dict            # Retrieval settings
```

### 4. Retrieval System

#### FAISS Vector Store
- **Purpose:** Semantic similarity search
- **Model:** Nomic Embed v1.5 (768 dimensions)
- **Location:** `src/retrieval/vector_retriever.py`

#### BM25 Index
- **Purpose:** Keyword-based search
- **Algorithm:** BM25 Okapi
- **Location:** `src/retrieval/bm25_retriever.py`

#### Hybrid Retriever
- **Purpose:** Combine vector + keyword search
- **Weight:** Configurable (default: 20% BM25, 80% vector)
- **Location:** `src/retrieval/hybrid_retriever.py`

### 5. Reranker

Neural reranking using cross-encoder:
- **Model:** BAAI/bge-reranker-v2-m3
- **Purpose:** Refine retrieval results
- **Location:** `src/models/reranker.py`

### 6. Response Generator

LLM integration via Llamafile:
- **Model:** Mistral Nemo Instruct 12B
- **Purpose:** Generate natural language answers
- **Location:** `src/response/response_generator.py`

---

## Data Flow

### Document Ingestion Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    DOCUMENT INGESTION                          │
└────────────────────────────────────────────────────────────────┘

  Upload: document.pdf
       │
       ▼
  ┌─────────────────┐
  │ 1. FileLoader   │ Detect format (PDF, DOCX, TXT, MD, etc.)
  │                 │ Convert to text using Docling
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ 2. Preprocessor │ Split into chunks (2000 chars, 200 overlap)
  │    (Chunking)   │ Handle markdown headers, code blocks
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ 3. Embedding    │ Generate 768-dim vectors (Nomic v1.5)
  │    Generation   │ Batch processing for efficiency
  └────────┬────────┘
           │
           ├──────────────────────┐
           ▼                      ▼
  ┌─────────────────┐    ┌─────────────────┐
  │ 4a. FAISS       │    │ 4b. BM25        │
  │     Index       │    │     Index       │
  │   (vectors)     │    │   (tokens)      │
  └─────────────────┘    └─────────────────┘
           │                      │
           ▼                      ▼
  ┌─────────────────┐    ┌─────────────────┐
  │ 5a. Cache       │    │ 5b. Cache       │
  │    embeddings   │    │    bm25 index   │
  └─────────────────┘    └─────────────────┘
```

### Query Processing Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    QUERY PROCESSING                            │
└────────────────────────────────────────────────────────────────┘

  Query: "How does authentication work?"
       │
       ▼
  ┌─────────────────┐
  │ 1. Query        │ (Optional) Expand query using LLM
  │    Expansion    │ "How does authentication work?"
  └────────┬────────┘ → "What is the authentication process and mechanism?"
           │
           ├──────────────────────┐
           ▼                      ▼
  ┌─────────────────┐    ┌─────────────────┐
  │ 2a. Vector      │    │ 2b. BM25        │
  │     Search      │    │     Search      │
  │  (top_k × 10)   │    │  (top_k × 10)   │
  └────────┬────────┘    └────────┬────────┘
           │                      │
           └──────────┬───────────┘
                      ▼
  ┌─────────────────────────────────┐
  │ 3. Score Combination            │
  │    final = 0.2×bm25 + 0.8×vector│
  │    Deduplicate results          │
  └───────────────┬─────────────────┘
                  │
                  ▼
  ┌─────────────────┐
  │ 4. Reranking    │ Cross-encoder scoring
  │    (BGE v2)     │ Return top_k results
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ 5. Context      │ Format documents with source info:
  │    Preparation  │ [1] Source: doc.pdf
  └────────┬────────┘     Content: ...
           │
           ▼
  ┌─────────────────┐    ┌─────────────────┐
  │ 6. LLM Prompt   │───▶│ Llamafile       │
  │    Generation   │◀───│ Server          │
  └────────┬────────┘    └─────────────────┘
           │
           ▼
  ┌─────────────────┐
  │ 7. Response     │ Extract answer, format sources
  │    Formatting   │ Calculate confidence score
  └────────┬────────┘
           │
           ▼
  Response: { answer, sources, confidence }
```

---

## Key Features

### 1. 100% Offline Operation

```
┌─────────────────────────────────────────────────┐
│ All components run locally:                      │
│                                                  │
│ ✅ LLM (Llamafile)      - No API calls          │
│ ✅ Embeddings (Nomic)   - Local model           │
│ ✅ Reranker (BGE)       - Local model           │
│ ✅ Vector Store (FAISS) - In-memory/disk        │
│ ✅ Documents            - Local filesystem       │
│                                                  │
│ ❌ No internet required after initial setup      │
│ ❌ No data sent to cloud services               │
│ ❌ No API keys or subscriptions                 │
└─────────────────────────────────────────────────┘
```

### 2. Hybrid Search

Combines the best of both worlds:

| Method | Strength | Example |
|--------|----------|---------|
| **Vector** | Semantic understanding | "authentication" matches "login process" |
| **BM25** | Exact keyword matching | "JWT" matches documents containing "JWT" |
| **Hybrid** | Both! | Best overall results |

### 3. Neural Reranking

Two-stage retrieval for accuracy:
1. **First stage:** Fast approximate search (top 100)
2. **Second stage:** Precise neural scoring (top k)

### 4. Incremental Learning

Add documents without full rebuild:
- FAISS supports live document addition
- BM25 rebuilt efficiently
- Zero downtime updates

### 5. Role-Based Access Control

Two-tier permission system:
- **Admin:** Full access (upload, delete, manage users)
- **User:** Query access only

---

## Technology Stack

### Backend Technologies

| Component | Technology | Purpose |
|-----------|------------|---------|
| **API Framework** | FastAPI | High-performance REST API |
| **RAG Framework** | LangChain | Document processing pipeline |
| **Vector Store** | FAISS | Similarity search |
| **BM25** | rank-bm25 | Keyword search |
| **Embeddings** | HuggingFace/Nomic | Text vectorization |
| **Reranking** | Transformers/BGE | Cross-encoder scoring |
| **PDF Processing** | Docling | Document conversion |
| **Caching** | Pickle/Custom | Embedding cache |

### Frontend Technologies

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Framework** | React 19 | Component-based UI |
| **Build Tool** | Vite | Fast HMR development |
| **Visualization** | ReactFlow | Pipeline diagrams |
| **Icons** | Lucide React | Modern iconography |
| **Animations** | Framer Motion | Smooth transitions |
| **Routing** | React Router | Page navigation |

### LLM Infrastructure

| Component | Technology | Purpose |
|-----------|------------|---------|
| **LLM Server** | Llamafile | Model serving |
| **Model** | Mistral Nemo 12B | Response generation |
| **Quantization** | Q5_K_M (GGUF) | Size/quality balance |
| **GPU Accel** | Metal/CUDA | Fast inference |

---

## Design Philosophy

### Principles

1. **Privacy First**
   - All processing happens locally
   - No telemetry or external calls
   - User owns their data completely

2. **Simplicity**
   - Single command to start
   - Minimal configuration required
   - Works out of the box

3. **Performance**
   - GPU acceleration where available
   - Efficient caching system
   - Batch processing for embeddings

4. **Extensibility**
   - Modular component design
   - Easy to swap models
   - Plugin-friendly architecture

---

## System Requirements

### Minimum Requirements

| Resource | Minimum | Notes |
|----------|---------|-------|
| **RAM** | 16 GB | For models + index |
| **Storage** | 20 GB | Models (~10GB) + documents |
| **CPU** | 4 cores | For parallel processing |
| **Python** | 3.10+ | Required |
| **Node.js** | 18+ | For React frontend |

### Recommended Requirements

| Resource | Recommended | Notes |
|----------|-------------|-------|
| **RAM** | 32 GB | Comfortable margin |
| **Storage** | 50 GB SSD | Fast access |
| **CPU** | 8+ cores | Better preprocessing |
| **GPU** | Apple M1+/RTX 3060+ | 10x faster inference |

### Supported Platforms

| Platform | Status | GPU Support |
|----------|--------|-------------|
| **macOS (Apple Silicon)** | ✅ Fully supported | Metal |
| **macOS (Intel)** | ✅ Supported | CPU only |
| **Linux** | ✅ Supported | CUDA |
| **Windows** | ⚠️ Experimental | CUDA |

---

## Next Steps

- **[Backend Documentation](./02_BACKEND.md)** - Deep dive into FastAPI server
- **[Frontend Documentation](./03_FRONTEND.md)** - React UI components
- **[RAG Pipeline](./05_RAG_PIPELINE.md)** - Retrieval system details
- **[Configuration Guide](./09_CONFIGURATION.md)** - YAML reference

---

*Last updated: January 2026*
