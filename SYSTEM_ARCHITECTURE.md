# 🔒 Secure Offline RAG System - Technical Architecture Handbook

> **A comprehensive guide to understanding every component and process flow in the RAG system**

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Component Deep Dive](#component-deep-dive)
   - [Data Ingestion](#1-data-ingestion)
   - [Document Preprocessing](#2-document-preprocessing)
   - [Embedding & Vector Store](#3-embedding--vector-store)
   - [BM25 Lexical Search](#4-bm25-lexical-search)
   - [Hybrid Retrieval](#5-hybrid-retrieval)
   - [Reranking](#6-reranking)
   - [LLM Response Generation](#7-llm-response-generation)
4. [Complete Query Flow](#complete-query-flow)
5. [Configuration Reference](#configuration-reference)
6. [Docker Architecture](#docker-architecture)

---

## System Overview

The Secure Offline RAG (Retrieval-Augmented Generation) System is a **fully offline, privacy-focused document QA system** that combines:

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Embeddings** | nomic-ai/nomic-embed-text-v1.5 | Convert text to semantic vectors |
| **Vector Store** | FAISS | Fast similarity search |
| **Lexical Search** | BM25 | Keyword-based document retrieval |
| **Reranking** | BAAI/bge-reranker-v2-m3 | Neural relevance scoring |
| **LLM** | Mistral-Nemo-12B (llamafile) | Answer generation |
| **UI** | Streamlit | Web interface |

### Key Design Principles

1. **100% Offline** - No API calls to external services
2. **Hybrid Retrieval** - BM25 + Vector search for best results
3. **Neural Reranking** - Transformer-based relevance scoring
4. **Caching** - Embeddings and indexes cached for performance

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER QUERY                                         │
│                              ▼                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      STREAMLIT WEB UI                                   │ │
│  │   • Login/Authentication  • Document Upload  • Chat Interface          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                              ▼                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    RAG INITIALIZER                                      │ │
│  │   Orchestrates all components and maintains state                       │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                              ▼                                               │
│  ┌──────────────────┐    ┌───────────────────┐    ┌─────────────────────┐  │
│  │  HYBRID RETRIEVER│    │                   │    │                     │  │
│  │                  │◄───│   QUERY           │───►│  RERANKER           │  │
│  │  ┌────────────┐  │    │                   │    │  (bge-reranker-v2)  │  │
│  │  │ BM25       │  │    │  "What is X?"     │    │                     │  │
│  │  │ (keywords) │  │    │                   │    │  Scores each        │  │
│  │  └────────────┘  │    └───────────────────┘    │  document pair      │  │
│  │  ┌────────────┐  │              ▼              │                     │  │
│  │  │ FAISS      │  │    ┌───────────────────┐    └─────────────────────┘  │
│  │  │ (semantic) │  │    │  Top-K Candidates │              ▼              │
│  │  └────────────┘  │    │  (100 docs)       │    ┌─────────────────────┐  │
│  └──────────────────┘    └───────────────────┘    │  RESPONSE GENERATOR │  │
│                                    ▼              │  (Mistral-Nemo LLM) │  │
│                          ┌───────────────────┐    │                     │  │
│                          │  Reranked Top-2   │───►│  Generates answer   │  │
│                          │  Documents        │    │  with context       │  │
│                          └───────────────────┘    └─────────────────────┘  │
│                                                            ▼                │
│                                                   ┌───────────────────┐     │
│                                                   │  FINAL RESPONSE   │     │
│                                                   │  + Source Docs    │     │
│                                                   └───────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Deep Dive

### 1. Data Ingestion

**Location:** `src/data/data_ingestion.py`

Handles loading documents and data from various sources.

#### Supported File Types

| Extension | Handler | Notes |
|-----------|---------|-------|
| `.txt` | TextLoader | Plain text files |
| `.pdf` | PyMuPDFLoader | PDF documents |
| `.csv` | CSVLoader | Tabular data |
| `.docx` | Docx2txtLoader | Word documents |
| `.md` | UnstructuredMarkdownLoader | Markdown files |

#### Process Flow

```
📁 data/raw/
    ├── document.pdf      ──┐
    ├── notes.txt         ──┼──► DataIngestion.load_documents()
    ├── scraped/          ──┤         │
    │   └── page.md       ──┘         ▼
    │                          List[Document]
    └── train.csv ────────────► DataIngestion.load_data()
                                     │
                                     ▼
                              (train_df, test_df)
```

#### Code Example

```python
from src.data.data_ingestion import DataIngestion

ingestion = DataIngestion(config)
docs = ingestion.load_documents()  # Returns List[Document]
# Each Document has:
#   - page_content: str (the text)
#   - metadata: dict (source, page number, etc.)
```

---

### 2. Document Preprocessing

**Location:** `src/data/data_preprocessing.py`

Splits documents into smaller, overlapping chunks for efficient retrieval.

#### Chunking Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORIGINAL DOCUMENT                             │
│  Lorem ipsum dolor sit amet, consectetur adipiscing elit...     │
│  [2000+ characters of continuous text]                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                    RecursiveCharacterTextSplitter
                    chunk_size=2000, overlap=200
                              │
                              ▼
┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐
│     CHUNK 1        │ │     CHUNK 2        │ │     CHUNK 3        │
│  [2000 chars]      │ │  [2000 chars]      │ │  [remaining]       │
│                    │ │  ◄── 200 char      │ │  ◄── 200 char      │
│                ────┼─┼──► overlap         │ │  overlap           │
└────────────────────┘ └────────────────────┘ └────────────────────┘
```

#### Configuration

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `chunk_size` | 2000 | Maximum characters per chunk |
| `chunk_overlap` | 200 | Overlap between consecutive chunks |
| `split_documents` | true | Enable automatic splitting |

#### Why Overlapping Chunks?

- Prevents context loss at chunk boundaries
- Ensures relevant information isn't split mid-sentence
- Improves retrieval accuracy for queries spanning chunk boundaries

---

### 3. Embedding & Vector Store

**Location:** `src/retrieval/vector_retriever.py`

Converts text chunks into dense vector representations for semantic search.

#### Embedding Model

| Property | Value |
|----------|-------|
| **Model** | `nomic-ai/nomic-embed-text-v1.5` |
| **Dimensions** | 768 |
| **Type** | Sentence-BERT based |
| **Context Window** | 8192 tokens |

#### How Embeddings Work

```
┌─────────────────────────────────────────────────────────────────┐
│  TEXT: "Matter protocol enables smart home interoperability"    │
└─────────────────────────────────────────────────────────────────┘
                              │
                    HuggingFaceEmbeddings
                    (nomic-embed-text-v1.5)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  VECTOR: [0.023, -0.156, 0.892, ..., 0.445]  (768 dimensions)   │
└─────────────────────────────────────────────────────────────────┘
```

#### FAISS Vector Store

FAISS (Facebook AI Similarity Search) stores embeddings for fast similarity lookup.

```python
# Vector similarity calculation
from langchain_community.vectorstores import FAISS

# Create store
vectorstore = FAISS.from_documents(chunks, embeddings)

# Search (returns most similar documents)
docs = vectorstore.similarity_search_with_score(query, k=10)
```

#### Similarity Metric

Uses **cosine similarity** between query and document vectors:

```
similarity(A, B) = (A · B) / (||A|| × ||B||)
```

- Score of 1.0 = Identical meaning
- Score of 0.0 = Completely unrelated
- Normalized to [0, 1] range

---

### 4. BM25 Lexical Search

**Location:** `src/retrieval/bm25_retriever.py`

BM25 (Best Matching 25) is a keyword-based ranking algorithm.

#### How BM25 Works

```
Query: "smart home Matter protocol"

                    ┌─────────────────────────────────┐
                    │         TOKENIZATION            │
                    │  ["smart", "home", "matter",    │
                    │   "protocol"]                   │
                    └─────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                     BM25 SCORING                                  │
│                                                                   │
│  For each document, calculate:                                    │
│                                                                   │
│  score(D, Q) = Σ IDF(qi) × (f(qi,D) × (k1 + 1))                  │
│                           ─────────────────────────               │
│                           f(qi,D) + k1×(1-b+b×|D|/avgdl)         │
│                                                                   │
│  Where:                                                           │
│    • IDF = Inverse Document Frequency (rare terms score higher)  │
│    • f(qi,D) = Term frequency in document                        │
│    • k1, b = Tuning parameters                                   │
│    • |D| = Document length                                       │
│    • avgdl = Average document length                             │
└──────────────────────────────────────────────────────────────────┘
```

#### BM25 vs Vector Search

| Aspect | BM25 | Vector Search |
|--------|------|---------------|
| **Matching** | Exact keywords | Semantic meaning |
| **"bank" query** | Only "bank" matches | "financial institution", "river bank" |
| **Acronyms** | Exact match only | May miss if not in training |
| **Speed** | Very fast | Requires embedding computation |
| **Best for** | Technical terms, IDs | Conceptual queries |

---

### 5. Hybrid Retrieval

**Location:** `src/retrieval/hybrid_retriever.py`

Combines BM25 and vector search for best of both worlds.

#### Score Combination

```python
bm25_weight = 0.2  # From config
vector_weight = 0.8  # 1 - bm25_weight

final_score = (bm25_score × bm25_weight) + (vector_score × vector_weight)
```

#### Retrieval Flow

```
                        USER QUERY
                            │
           ┌────────────────┴────────────────┐
           │                                 │
           ▼                                 ▼
    ┌─────────────┐                   ┌─────────────┐
    │   BM25      │                   │   VECTOR    │
    │  Retriever  │                   │  Retriever  │
    │             │                   │             │
    │ Top-100     │                   │ Top-100     │
    │ by keywords │                   │ by semantic │
    └─────────────┘                   └─────────────┘
           │                                 │
           └────────────────┬────────────────┘
                            │
                            ▼
                   ┌───────────────────┐
                   │  COMBINE & DEDUP  │
                   │                   │
                   │  • Merge results  │
                   │  • Remove duplicates│
                   │  • Weight scores  │
                   │  • Sort by final  │
                   └───────────────────┘
                            │
                            ▼
                   Top-K Hybrid Results
```

#### Result Sources

Each result is tagged with its source:

| Source | Meaning |
|--------|---------|
| `bm25` | Found only by BM25 |
| `vector` | Found only by vector search |
| `hybrid` | Found by both methods (highest confidence) |

---

### 6. Reranking

**Location:** `src/models/reranker.py`

Neural reranking uses a transformer model to score query-document relevance.

#### Model Details

| Property | Value |
|----------|-------|
| **Model** | `BAAI/bge-reranker-v2-m3` |
| **Type** | Cross-encoder |
| **Input** | [Query, Document] pair |
| **Output** | Relevance score (float) |

#### How Reranking Works

```
┌──────────────────────────────────────────────────────────────────┐
│                    CROSS-ENCODER ARCHITECTURE                     │
│                                                                   │
│   Query: "What is Matter protocol?"                              │
│   Document: "Matter is a connectivity standard for smart home..."│
│                                                                   │
│   Input: [CLS] What is Matter protocol? [SEP] Matter is a...    │
│                                                                   │
│          ┌─────────────────────────────────────┐                 │
│          │   TRANSFORMER ENCODER               │                 │
│          │   (12 layers, 768 hidden)           │                 │
│          └─────────────────────────────────────┘                 │
│                           │                                       │
│                           ▼                                       │
│                    Classification Head                            │
│                           │                                       │
│                           ▼                                       │
│                  Relevance Score: 0.9523                         │
└──────────────────────────────────────────────────────────────────┘
```

#### Why Reranking?

| Initial Retrieval | After Reranking |
|-------------------|-----------------|
| Fast but approximate | Slow but accurate |
| 100 candidates | 2-5 final results |
| Based on embeddings | Based on full attention |

#### Device Selection

The reranker auto-detects the best device:

```python
Priority Order:
1. FORCE_CPU env var (for Docker)
2. CUDA GPU (NVIDIA)
3. MPS (Apple Silicon)
4. CPU (fallback)
```

---

### 7. LLM Response Generation

**Location:** `src/response/response_generator.py`

Generates natural language answers using the LLM.

#### LLM Configuration

| Property | Value |
|----------|-------|
| **Model** | Mistral-Nemo-Instruct-2407 (12B params) |
| **Format** | llamafile (self-contained binary) |
| **Quantization** | Q5_K_M (5-bit) |
| **Size** | 8.5 GB |
| **Context Window** | 128K tokens |

#### Prompt Template

```
You are an efficient Q&A assistant that responds to user queries 
based on provided context.

Based on the following information, please provide a clear, accurate, 
and comprehensive answer to the question.

Question: {query}

Relevant Information:
[1] Source: document.pdf
{chunk_1_content}

[2] Source: notes.txt
{chunk_2_content}

Please provide a response that:
1. Directly addresses the question
2. Is supported by the provided information
3. Is clear and well-organized
4. Is as short as possible with relevant information
5. Don't mention the source of the information
6. Do not repeat the question
7. Clearly state the lack of information if applicable
8. Respond only in the language of the query

Response:
```

#### Context Preparation

```python
def _prepare_context(chunks: List[Document]) -> str:
    """Format chunks with source attribution"""
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        source = chunk.metadata.get('source', 'Unknown')
        context_parts.append(f"[{i}] Source: {source}\n{chunk.page_content}")
    return "\n\n".join(context_parts)
```

---

## Complete Query Flow

Here's the end-to-end flow when a user asks a question:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: USER INPUT                                                          │
│  ───────────────────                                                         │
│  User types: "What is the subject key identifier in Matter DAC?"            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 2: HYBRID RETRIEVAL                                                    │
│  ────────────────────────                                                    │
│                                                                              │
│  BM25 Search:                          Vector Search:                        │
│  • Tokenize: ["subject", "key",        • Embed query → 768-dim vector       │
│    "identifier", "Matter", "DAC"]      • FAISS similarity search            │
│  • Match exact terms                   • Find semantically similar chunks   │
│  • Top 100 by term frequency           • Top 100 by cosine similarity       │
│                                                                              │
│  Combined: ~150 unique candidates (after deduplication)                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 3: RERANKING                                                           │
│  ─────────────────                                                           │
│                                                                              │
│  For each candidate document:                                                │
│  • Create [Query, Document] pair                                            │
│  • Pass through bge-reranker-v2-m3 transformer                              │
│  • Get relevance score (0.0 to 1.0)                                         │
│                                                                              │
│  Sort by score, take top 2:                                                  │
│  • Doc1: score=0.9523 (Matter DAC specification section)                    │
│  • Doc2: score=0.8912 (Certificate structure overview)                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 4: CONTEXT PREPARATION                                                 │
│  ───────────────────────────                                                 │
│                                                                              │
│  Format reranked documents:                                                  │
│                                                                              │
│  "[1] Source: matter_specification.pdf                                       │
│   The Subject Key Identifier in a Device Attestation Certificate (DAC)      │
│   is a unique identifier derived from the public key..."                     │
│                                                                              │
│   [2] Source: data.txt                                                       │
│   Certificate structure includes subject key identifier field..."            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 5: LLM GENERATION                                                      │
│  ──────────────────────                                                      │
│                                                                              │
│  Mistral-Nemo processes:                                                     │
│  • System prompt with instructions                                           │
│  • User query                                                                │
│  • Retrieved context                                                         │
│                                                                              │
│  Generates natural language response                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 6: RESPONSE DISPLAY                                                    │
│  ────────────────────────                                                    │
│                                                                              │
│  "The Subject Key Identifier (SKI) in a Matter Device Attestation           │
│   Certificate (DAC) is a cryptographic identifier derived from the          │
│   device's public key. It enables certificate chain validation..."           │
│                                                                              │
│  Sources: matter_specification.pdf, data.txt                                 │
│  Confidence: 0.95                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Configuration Reference

### init_config.yaml

```yaml
# Embedding & Reranking Models
model:
  embedding_model_hf: "nomic-ai/nomic-embed-text-v1.5"  # HuggingFace embedding model
  rerank_model: "BAAI/bge-reranker-v2-m3"               # Reranker model
  device_rerank: "mps"                                   # Device: mps/cuda/cpu/auto

# Document Processing
processing:
  chunk_size: 2000        # Characters per chunk
  chunk_overlap: 200      # Overlap between chunks
  batch_size_embeddings: 32
  batch_size_reranking: 8

# Paths
paths:
  cache_dir: "./cache"    # Embedding cache
  data_dir: "./data"      # Document storage
  log_dir: "./logs"       # Logging
```

### process_config.yaml

```yaml
retrieval:
  llamafile_server_base_url: "http://localhost:8081"  # LLM server URL
  send_nb_chunks_to_llm: 2        # Number of chunks to include in context
  use_bm25: true                   # Enable BM25 search
  bm25_weight: 0.2                 # BM25 contribution (0.0-1.0)
  top_k: 100                       # Candidates before reranking
  use_reranking: true              # Enable neural reranking
  use_query_expansion: false       # LLM query expansion
```

---

## Docker Architecture

### Container Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOST MACHINE                                  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                 ragvault-network                            │ │
│  │                                                             │ │
│  │  ┌─────────────────────┐    ┌─────────────────────────────┐│ │
│  │  │   ragvault-llm      │    │      ragvault-app           ││ │
│  │  │   ────────────      │    │      ───────────            ││ │
│  │  │                     │    │                              ││ │
│  │  │  Mistral-Nemo LLM   │◄───│  Streamlit + RAG Pipeline   ││ │
│  │  │  (llamafile)        │    │  (Python 3.10)              ││ │
│  │  │                     │    │                              ││ │
│  │  │  Port: 8081         │    │  Port: 8501                 ││ │
│  │  └─────────────────────┘    └─────────────────────────────┘│ │
│  │           ▲                            ▲                    │ │
│  └───────────┼────────────────────────────┼────────────────────┘ │
│              │                            │                      │
│  ┌───────────┴────────┐    ┌──────────────┴──────────────────┐  │
│  │  Volume: ./models  │    │  Volumes:                        │  │
│  │  (LLM binary, RO)  │    │    ./data   (documents)          │  │
│  │                    │    │    ./cache  (embeddings)         │  │
│  └────────────────────┘    │    ./config (settings)           │  │
│                            │    ./logs   (logs)               │  │
│                            └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Environment Variables

| Variable | Container | Purpose |
|----------|-----------|---------|
| `LLAMAFILE_SERVER_URL` | app | Override LLM URL for Docker networking |
| `FORCE_CPU` | app | Force CPU-only mode for reranker |

### Docker Commands

```bash
# Start system
./docker-start.sh

# Download LLM model (first time)
./docker-start.sh --download

# View logs
./docker-start.sh --logs

# Stop containers
./docker-start.sh --stop

# Remove everything
./docker-start.sh --cleanup
```

---

## Summary

The RAG system processes queries through this pipeline:

1. **Ingest** - Load documents from various formats
2. **Chunk** - Split into overlapping 2000-char segments
3. **Embed** - Convert to 768-dim vectors using nomic-embed
4. **Index** - Store in FAISS (vector) and BM25 (lexical)
5. **Retrieve** - Hybrid search combining both methods (80/20 weight)
6. **Rerank** - Neural scoring with bge-reranker (100→2 documents)
7. **Generate** - Mistral-Nemo produces contextual answer

**Total latency:** ~3-10 seconds depending on hardware

---

*Last updated: December 2025*
