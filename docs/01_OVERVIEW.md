# 01. System Overview

> High-level introduction to RagVault and its core concepts

---

## What is RagVault?

RagVault is a **Retrieval-Augmented Generation (RAG)** system designed for **100% offline operation**. It allows you to:

1. **Ingest documents** (PDF, DOCX, TXT, MD, CSV)
2. **Index them** using embeddings and keyword matching
3. **Query them** using natural language
4. **Get AI-generated answers** grounded in your documents

### The Core Problem RAG Solves

```
Traditional LLM Problem:
┌─────────────────────────────────────────────────────────────────┐
│  User: "What is our Q3 revenue?"                                │
│  LLM:  "I don't have access to your company's financial data."  │
│                                                                 │
│  → LLMs don't know YOUR private data                           │
└─────────────────────────────────────────────────────────────────┘

RAG Solution:
┌─────────────────────────────────────────────────────────────────┐
│  1. User asks: "What is our Q3 revenue?"                        │
│  2. System RETRIEVES relevant docs from your knowledge base     │
│  3. System AUGMENTS the prompt with retrieved context           │
│  4. LLM GENERATES answer based on YOUR documents                │
│                                                                 │
│  → LLM answers using YOUR private data                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## System Goals

| Goal | Implementation |
|------|----------------|
| **100% Offline** | Local LLM (llamafile), local embeddings, no API calls |
| **Privacy First** | All data stays on your machine, no telemetry |
| **High Quality** | Hybrid retrieval + neural reranking for accuracy |
| **Easy Setup** | Docker one-command start, or manual installation |
| **Enterprise Ready** | Role-based access control, logging, caching |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              RAGVAULT SYSTEM                                 │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        STREAMLIT WEB UI                               │  │
│  │                     (http://localhost:8501)                           │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │  │
│  │  │    Login     │  │   Documents  │  │     Chat     │                │  │
│  │  │    Page      │  │    Upload    │  │   Interface  │                │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                     │                                       │
│                                     ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         RAG PIPELINE                                  │  │
│  │                                                                       │  │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐               │  │
│  │  │   HYBRID    │───▶│  RERANKER   │───▶│  RESPONSE   │               │  │
│  │  │  RETRIEVER  │    │   (Neural)  │    │  GENERATOR  │               │  │
│  │  └─────────────┘    └─────────────┘    └─────────────┘               │  │
│  │        │                                      │                       │  │
│  │        ▼                                      ▼                       │  │
│  │  ┌─────────────┐                        ┌─────────────┐              │  │
│  │  │ BM25 + FAISS│                        │ LLM SERVER  │              │  │
│  │  │   Indexes   │                        │ (port 8081) │              │  │
│  │  └─────────────┘                        └─────────────┘              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         DATA LAYER                                    │  │
│  │                                                                       │  │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐             │  │
│  │  │  data/raw/    │  │    cache/     │  │   config/     │             │  │
│  │  │  (documents)  │  │  (embeddings) │  │  (settings)   │             │  │
│  │  └───────────────┘  └───────────────┘  └───────────────┘             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Core Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Web UI** | Streamlit | User interface |
| **Embeddings** | nomic-embed-text-v1.5 | Convert text to vectors |
| **Vector Store** | FAISS | Semantic similarity search |
| **Lexical Search** | BM25 (rank_bm25) | Keyword-based search |
| **Reranker** | BAAI/bge-reranker-v2-m3 | Neural relevance scoring |
| **LLM** | Mistral-Nemo-12B (llamafile) | Answer generation |

### Python Dependencies

| Category | Libraries |
|----------|-----------|
| **RAG Framework** | LangChain, LangChain-Core, LangChain-Community |
| **ML/DL** | PyTorch, Transformers, Sentence-Transformers |
| **Vector Store** | FAISS-CPU |
| **Document Processing** | PyMuPDF, python-docx, UnstructuredMarkdown |
| **Web** | Streamlit, Requests |

---

## Data Flow Summary

```
1. INGESTION
   Documents (PDF/DOCX/TXT) → Text Extraction → Chunking → Embeddings → Index

2. QUERY
   User Question → Hybrid Retrieval → Reranking → Context Selection → LLM

3. RESPONSE
   LLM Generation → Source Attribution → Display to User
```

---

## Key Concepts

### 1. Document Chunks
Documents are split into smaller pieces (2000 characters with 200 overlap) for:
- Better retrieval precision
- Fitting within LLM context window
- Efficient embedding storage

### 2. Hybrid Search
Combines two retrieval methods:
- **BM25**: Finds exact keyword matches (good for names, IDs, technical terms)
- **Vector**: Finds semantic matches (good for concepts, paraphrases)

### 3. Neural Reranking
After retrieving ~100 candidates, a neural model scores each for relevance:
- Input: [Query, Document] pair
- Output: Relevance score (0-1)
- Result: Top 2 most relevant documents sent to LLM

### 4. Grounded Generation
The LLM only answers based on provided context:
- No hallucination (can't make up facts)
- Source citations included
- "I don't know" if information not found

---

## System Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 16 GB | 32 GB |
| **Storage** | 20 GB | 50 GB SSD |
| **GPU** | None (CPU works) | Apple M1/M2, NVIDIA |
| **OS** | macOS, Linux | macOS (Apple Silicon) |

---

## Next Steps

- **Backend Details**: See [02_BACKEND.md](./02_BACKEND.md)
- **Frontend Details**: See [03_FRONTEND.md](./03_FRONTEND.md)
- **LLM Integration**: See [04_LLM_INTEGRATION.md](./04_LLM_INTEGRATION.md)

---

*Author: Arnav Angarkar*
