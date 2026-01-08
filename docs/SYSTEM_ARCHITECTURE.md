# 🔒 RagVault System Architecture

> **A complete guide explaining how every component works, what each term means, and how they connect together**

---

## Table of Contents

1. [What is RagVault?](#what-is-ragvault)
2. [Core Concepts Explained](#core-concepts-explained)
3. [System Architecture](#system-architecture)
4. [The Two User Interfaces](#the-two-user-interfaces)
5. [How Documents Become Searchable](#how-documents-become-searchable)
6. [How Your Questions Get Answered](#how-your-questions-get-answered)
7. [Configuration Parameters Explained](#configuration-parameters-explained)
8. [Observability & Monitoring](#observability-monitoring)
9. [Technology Choices and Why](#technology-choices-and-why)

---

## What is RagVault?

RagVault is a **private, offline question-answering system** that lets you ask natural language questions about your documents and get intelligent answers.

### The Problem It Solves

Imagine you have hundreds of PDF documents, reports, and notes. You need to find information, but:
- **Traditional search** only finds exact keyword matches
- **Manual reading** takes hours
- **Cloud AI services** require sending your private data to external servers

### How RagVault Solves It

```
┌─────────────────────────────────────────────────────────────────────┐
│                    THE RAGVAULT SOLUTION                             │
│                                                                      │
│  YOUR QUESTION                         YOUR ANSWER                   │
│  ────────────                          ───────────                   │
│  "What is the authentication           "The authentication process   │
│   process for Matter devices?"          uses X.509 certificates      │
│                                         with three levels..."        │
│         │                                        ▲                   │
│         │                                        │                   │
│         ▼                                        │                   │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    RAGVAULT MAGIC                            │    │
│  │                                                              │    │
│  │  1. Understands what you're asking (not just keywords)      │    │
│  │  2. Searches through ALL your documents intelligently       │    │
│  │  3. Finds the most relevant passages                        │    │
│  │  4. Generates a human-readable answer                       │    │
│  │  5. Shows you exactly which documents the answer came from  │    │
│  │                                                              │    │
│  │  ✓ 100% Offline - Nothing leaves your computer             │    │
│  │  ✓ 100% Private - No external API calls                    │    │
│  │  ✓ Works on your laptop - No cloud required                │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Core Concepts Explained

Before diving into how things work, let's understand the key terms you'll encounter.

### RAG (Retrieval-Augmented Generation)

**What it is:** A technique that combines document search with AI text generation.

**Why it matters:** 
- Pure AI models "hallucinate" (make things up)
- RAG forces the AI to only answer based on YOUR documents
- Result: Accurate, source-backed answers

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RAG = RETRIEVAL + GENERATION                 │
│                                                                      │
│   RETRIEVAL                              GENERATION                  │
│   ─────────                              ──────────                  │
│   "Find relevant                         "Use AI to create          │
│    documents"                             a human answer"            │
│                                                                      │
│   ┌─────────────┐                        ┌─────────────┐            │
│   │  Search     │  ──── context ────►    │    AI       │            │
│   │  Engine     │                        │   Model     │            │
│   └─────────────┘                        └─────────────┘            │
│         ▲                                       │                    │
│         │                                       ▼                    │
│   Your Documents                          Your Answer                │
│                                                                      │
│   WITHOUT RAG: AI makes up answers (dangerous!)                      │
│   WITH RAG: AI can ONLY use your documents (safe!)                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Chunks

**What they are:** Small pieces of your documents, typically 2000 characters each.

**Why we need them:**
- AI models have limited memory (called "context window")
- We can't feed entire 100-page PDFs to the AI
- Smaller chunks = more precise search results

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CHUNKING EXPLAINED                           │
│                                                                      │
│   ORIGINAL DOCUMENT (50 pages)                                       │
│   ┌───────────────────────────────────────────────────────────┐     │
│   │ Page 1: Introduction to Matter protocol...                 │     │
│   │ Page 2: The authentication process involves certificates..│     │
│   │ Page 3: Security considerations for IoT devices...        │     │
│   │ ... (47 more pages)                                        │     │
│   └───────────────────────────────────────────────────────────┘     │
│                              │                                       │
│                    CHUNKING PROCESS                                  │
│                    (Split every ~2000 chars)                         │
│                              │                                       │
│                              ▼                                       │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│   │ Chunk 1  │ │ Chunk 2  │ │ Chunk 3  │ │ Chunk 4  │ ...          │
│   │ 2000     │ │ 2000     │ │ 2000     │ │ 2000     │              │
│   │ chars    │ │ chars    │ │ chars    │ │ chars    │              │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
│         │            │            │            │                     │
│         └──── 200 char overlap ────┘                                │
│                                                                      │
│   WHY OVERLAP?                                                       │
│   If a sentence is split between chunks, the overlap ensures        │
│   both chunks have the complete sentence.                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Embeddings

**What they are:** Numerical representations of text that capture meaning.

**How they work:**
- Every piece of text is converted to a list of 768 numbers
- Similar meanings = similar numbers
- Allows mathematical comparison of text similarity

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EMBEDDINGS EXPLAINED                          │
│                                                                      │
│   HUMAN TEXT                          MACHINE REPRESENTATION         │
│   ──────────                          ──────────────────────         │
│                                                                      │
│   "smart home"        ────────►       [0.23, -0.15, 0.89, ...]      │
│                                       (768 numbers)                  │
│                                                                      │
│   "IoT devices"       ────────►       [0.21, -0.18, 0.85, ...]      │
│                                       (similar numbers!)             │
│                                                                      │
│   "pizza recipe"      ────────►       [-0.45, 0.67, 0.12, ...]      │
│                                       (very different numbers)       │
│                                                                      │
│   ─────────────────────────────────────────────────────────────     │
│                                                                      │
│   WHY THIS IS POWERFUL:                                              │
│                                                                      │
│   • "smart home" and "IoT devices" have similar embeddings          │
│   • The system knows they're related, even without matching words   │
│   • Query: "home automation" → finds "smart home" docs!             │
│                                                                      │
│   MODEL USED: nomic-embed-text-v1.5                                 │
│   DIMENSIONS: 768 numbers per text chunk                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Vector Store (FAISS)

**What it is:** A database optimized for finding similar embeddings.

**Why it matters:**
- With 10,000 chunks, comparing each one would be slow
- FAISS uses smart algorithms to find similar vectors in milliseconds
- Developed by Facebook/Meta for large-scale similarity search

```
┌─────────────────────────────────────────────────────────────────────┐
│                    VECTOR STORE (FAISS) EXPLAINED                    │
│                                                                      │
│   YOUR DOCUMENT CHUNKS (each converted to 768 numbers)              │
│                                                                      │
│   Chunk 1: [0.2, 0.3, 0.7, ...]  ──┐                                │
│   Chunk 2: [0.1, 0.4, 0.8, ...]  ──┼──►  FAISS INDEX                │
│   Chunk 3: [0.5, 0.2, 0.3, ...]  ──┤     (Organized for fast        │
│   Chunk 4: [0.3, 0.3, 0.7, ...]  ──┤      similarity search)        │
│   ... (thousands more)           ──┘                                 │
│                                                                      │
│   ─────────────────────────────────────────────────────────────     │
│                                                                      │
│   WHEN YOU ASK A QUESTION:                                           │
│                                                                      │
│   Query: "How does authentication work?"                             │
│            │                                                         │
│            ▼                                                         │
│   Query Embedding: [0.2, 0.35, 0.69, ...]                           │
│            │                                                         │
│            ▼                                                         │
│   FAISS finds closest matches in milliseconds:                       │
│     • Chunk 1: 95% similar (about authentication!)                  │
│     • Chunk 4: 92% similar (related to auth)                        │
│     • Chunk 2: 88% similar (mentions certificates)                  │
│                                                                      │
│   Speed: ~10ms to search 100,000 chunks                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

### BM25 (Keyword Search)

**What it is:** A smart keyword matching algorithm.

**Why we need it alongside embeddings:**
- Embeddings understand meaning but can miss exact terms
- BM25 finds exact keyword matches
- Together they catch everything

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BM25 EXPLAINED                               │
│                                                                      │
│   Query: "DAC certificate X.509"                                     │
│                                                                      │
│   EMBEDDING SEARCH might find:        BM25 SEARCH finds:            │
│   • "digital certificates"            • "DAC certificate X.509"     │
│   • "authentication tokens"           • "X.509 format"              │
│   • "security credentials"            • "DAC specification"         │
│                                                                      │
│   (understands meaning but            (exact keyword matches)       │
│    might miss "DAC")                                                 │
│                                                                      │
│   ─────────────────────────────────────────────────────────────     │
│                                                                      │
│   BM25 SCORING FORMULA (simplified):                                 │
│                                                                      │
│   Score = (How rare is this word?) × (How often in this doc?)       │
│                                                                      │
│   Example:                                                           │
│   • "the" appears everywhere → low score                            │
│   • "X.509" is rare → high score when found                         │
│   • Document with 5 mentions of "DAC" → higher than 1 mention       │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Hybrid Search

**What it is:** Combining BM25 and vector search for best results.

**The formula:**
- 80% Vector (semantic understanding)
- 20% BM25 (exact keyword matching)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      HYBRID SEARCH EXPLAINED                         │
│                                                                      │
│                         YOUR QUERY                                   │
│                    "Matter DAC authentication"                       │
│                              │                                       │
│              ┌───────────────┴───────────────┐                      │
│              │                               │                       │
│              ▼                               ▼                       │
│   ┌─────────────────────┐       ┌─────────────────────┐             │
│   │    VECTOR SEARCH    │       │    BM25 SEARCH      │             │
│   │   (80% weight)      │       │   (20% weight)      │             │
│   │                     │       │                     │             │
│   │ Finds semantically  │       │ Finds exact keyword │             │
│   │ similar content     │       │ matches             │             │
│   │                     │       │                     │             │
│   │ Top results:        │       │ Top results:        │             │
│   │ • auth protocols    │       │ • "Matter DAC"      │             │
│   │ • security certs    │       │ • "DAC auth"        │             │
│   │ • credential flow   │       │ • "Matter protocol" │             │
│   └─────────────────────┘       └─────────────────────┘             │
│              │                               │                       │
│              └───────────────┬───────────────┘                      │
│                              │                                       │
│                              ▼                                       │
│                   ┌─────────────────────┐                           │
│                   │   COMBINED RESULTS  │                           │
│                   │                     │                           │
│                   │ Final = 0.8×Vector  │                           │
│                   │       + 0.2×BM25    │                           │
│                   │                     │                           │
│                   │ Best of both worlds!│                           │
│                   └─────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Top-K

**What it is:** The number of results to retrieve at each stage.

**How it works in RagVault:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TOP-K EXPLAINED                              │
│                                                                      │
│   STAGE 1: INITIAL RETRIEVAL (top_k = 100)                          │
│   ─────────────────────────────────────────                          │
│   From 10,000 total chunks, find the 100 most relevant              │
│   This is fast but approximate                                       │
│                                                                      │
│   ┌──────────────────────────────────────────────────┐              │
│   │  10,000 chunks ──► Hybrid Search ──► 100 chunks  │              │
│   └──────────────────────────────────────────────────┘              │
│                              │                                       │
│                              ▼                                       │
│   STAGE 2: RERANKING (send_nb_chunks_to_llm = 2-3)                  │
│   ─────────────────────────────────────────────────                  │
│   From 100 candidates, neural model picks the best 2-3              │
│   This is slow but very accurate                                     │
│                                                                      │
│   ┌──────────────────────────────────────────────────┐              │
│   │  100 chunks ──► Neural Reranker ──► 2-3 chunks   │              │
│   └──────────────────────────────────────────────────┘              │
│                              │                                       │
│                              ▼                                       │
│   STAGE 3: LLM GENERATION                                           │
│   ───────────────────────────                                        │
│   Only the best 2-3 chunks go to the AI for answer generation       │
│                                                                      │
│   WHY THIS FUNNEL?                                                   │
│   • Fast search first (handles volume)                              │
│   • Accurate reranking second (ensures quality)                     │
│   • Only best content to expensive LLM (saves memory/time)          │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Reranking

**What it is:** A neural network that scores how relevant each document is to your query.

**Why it's better than initial search:**
- Initial search compares query and document separately
- Reranker looks at query AND document together
- Much more accurate but slower

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RERANKING EXPLAINED                           │
│                                                                      │
│   INITIAL RETRIEVAL (Fast but Approximate)                          │
│   ────────────────────────────────────────                           │
│   Query: [embedding] ──compare──► Doc: [embedding]                   │
│   Looks at each separately, measures distance                        │
│                                                                      │
│   ─────────────────────────────────────────────────────────────     │
│                                                                      │
│   RERANKING (Slow but Accurate)                                      │
│   ─────────────────────────────                                      │
│   Input: "Query: What is DAC? [SEP] Document: The DAC cert..."      │
│                              │                                       │
│                              ▼                                       │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │              TRANSFORMER NEURAL NETWORK                      │   │
│   │                                                              │   │
│   │   • Reads query AND document together                        │   │
│   │   • Uses attention to understand relationships              │   │
│   │   • "Does this document actually answer this question?"      │   │
│   │                                                              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│                     Relevance Score: 0.95                            │
│                                                                      │
│   MODEL USED: BAAI/bge-reranker-v2-m3                               │
│   WHY IT'S BETTER: Understands context, not just similarity         │
└─────────────────────────────────────────────────────────────────────┘
```

---

### LLM (Large Language Model)

**What it is:** An AI that generates human-like text.

**The model used:** Mistral Nemo 12B (12 billion parameters)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          LLM EXPLAINED                               │
│                                                                      │
│   WHAT IS AN LLM?                                                    │
│   ───────────────                                                    │
│   • Trained on trillions of words from books, websites, etc.        │
│   • Learned patterns of human language                               │
│   • Can generate coherent, contextual responses                      │
│                                                                      │
│   THE MISTRAL NEMO 12B MODEL:                                        │
│   ──────────────────────────                                         │
│   • 12 Billion parameters (learned weights)                         │
│   • Size: 8.5 GB (compressed with Q5_K_M quantization)              │
│   • Context Window: 128,000 tokens (~100 pages of text)             │
│   • Runs locally via Llamafile (no internet needed)                 │
│                                                                      │
│   ─────────────────────────────────────────────────────────────     │
│                                                                      │
│   HOW IT GENERATES ANSWERS IN RAGVAULT:                              │
│                                                                      │
│   INPUT:                                                             │
│   ┌───────────────────────────────────────────────────────────┐     │
│   │ System: You are a helpful assistant. Only use provided    │     │
│   │         context. Don't make things up.                    │     │
│   │                                                            │     │
│   │ Context: [Chunk 1: DAC certificates use X.509...]         │     │
│   │          [Chunk 2: Authentication requires three certs...]│     │
│   │                                                            │     │
│   │ Question: What is a DAC certificate?                       │     │
│   └───────────────────────────────────────────────────────────┘     │
│                              │                                       │
│                              ▼                                       │
│   OUTPUT:                                                            │
│   ┌───────────────────────────────────────────────────────────┐     │
│   │ "A DAC (Device Attestation Certificate) is an X.509       │     │
│   │  certificate that proves a device's authenticity. It's    │     │
│   │  part of a three-tier certificate chain used in Matter    │     │
│   │  protocol for device authentication."                     │     │
│   └───────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Temperature

**What it is:** Controls how creative/random the AI's responses are.

```
┌─────────────────────────────────────────────────────────────────────┐
│                       TEMPERATURE EXPLAINED                          │
│                                                                      │
│   LOW TEMPERATURE (0.1 - 0.3)                     HIGH TEMPERATURE   │
│   ─────────────────────────                       (0.8 - 1.0)       │
│                                                   ─────────────      │
│   • Very predictable                              • Creative         │
│   • Always picks most likely word                 • More variety     │
│   • Same input = same output                      • Can be random    │
│   • Best for: factual Q&A ✓                       • Best for: stories│
│                                                                      │
│   ─────────────────────────────────────────────────────────────     │
│                                                                      │
│   VISUAL EXPLANATION:                                                │
│                                                                      │
│   Given: "The sky is ___"                                           │
│                                                                      │
│   Next word probabilities:                                           │
│   • blue: 60%                                                        │
│   • clear: 25%                                                       │
│   • beautiful: 10%                                                   │
│   • purple: 5%                                                       │
│                                                                      │
│   Temperature 0.1:  Always picks "blue"                              │
│   Temperature 0.5:  Usually "blue", sometimes "clear"                │
│   Temperature 1.0:  Picks randomly based on probabilities           │
│                                                                      │
│   RAGVAULT DEFAULT: 0.7 (slight creativity for natural answers)     │
└─────────────────────────────────────────────────────────────────────┘
```


### Prometheus Metrics

**What it is:** A standard system for measuring software performance in real-time.

**Why it matters:**
- Logging to files is slow and hard to analyze
- Prometheus counts things in memory (microseconds)
- Allows instant dashboards for "Error Rate" or "Average Speed"

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PROMETHEUS METRICS EXPLAINED                    │
│                                                                      │
│   TRADITIONAL LOGGING (Old Way)                                      │
│   ─────────────────────────────                                      │
│   Request 1: [20:00:01] /query took 0.5s → WRITE TO DISK (Slow)      │
│   Request 2: [20:00:02] /query took 0.4s → WRITE TO DISK (Slow)      │
│                                                                      │
│   VS                                                                 │
│                                                                      │
│   PROMETHEUS METRICS (RagVault Way)                                  │
│   ─────────────────────────────────                                  │
│   Variable: queries_total = 2                                        │
│   Variable: latency_sum = 0.9                                        │
│                                                                      │
│   (Just updates numbers in memory. No disk writing! ⚡)              │
│                                                                      │
│   RESULT:                                                            │
│   We can track performance without slowing down your answers.        │
└─────────────────────────────────────────────────────────────────────┘
```

---


## System Architecture

Now that you understand the concepts, here's how they all connect:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COMPLETE RAGVAULT ARCHITECTURE                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACES                              │
│  ┌────────────────────────────┐  ┌────────────────────────────┐     │
│  │     REACT + VITE UI        │  │      STREAMLIT UI          │     │
│  │     (Port 5173)            │  │      (Port 8501)           │     │
│  │                            │  │                            │     │
│  │  • Visual pipeline flow    │  │  • Memory-efficient        │     │
│  │  • Modern dark theme       │  │  • Built-in user login     │     │
│  │  • ReactFlow diagrams      │  │  • No Node.js needed       │     │
│  │  • TypeScript + Vite       │  │  • Web scraping feature    │     │
│  │                            │  │                            │     │
│  │  BEST FOR:                 │  │  BEST FOR:                 │     │
│  │  Full visual experience    │  │  Low-resource machines     │     │
│  └────────────────────────────┘  └────────────────────────────┘     │
│              │                               │                       │
│              └───────────────┬───────────────┘                      │
│                              ▼                                       │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     FASTAPI BACKEND (Port 8000)                      │
│                                                                      │
│  REST API Endpoints:                                                 │
│  • /upload    → Add new documents                                   │
│  • /query     → Ask questions                                       │
│  • /documents → List/delete documents                               │
│  • /refresh   → Rebuild search indexes                              │
│  • /health    → Check system status                                 │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      RAG PIPELINE CORE                               │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    HYBRID RETRIEVER                           │   │
│  │                                                               │   │
│  │  ┌─────────────────┐           ┌─────────────────┐           │   │
│  │  │  FAISS VECTOR   │           │     BM25        │           │   │
│  │  │    STORE        │           │    INDEX        │           │   │
│  │  │                 │           │                 │           │   │
│  │  │ Semantic search │           │ Keyword search  │           │   │
│  │  │ (80% weight)    │           │ (20% weight)    │           │   │
│  │  └─────────────────┘           └─────────────────┘           │   │
│  │           │                             │                     │   │
│  │           └──────────┬──────────────────┘                     │   │
│  │                      ▼                                        │   │
│  │              Combined Results (100 candidates)                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                         │                                            │
│                         ▼                                            │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                      RERANKER                                 │   │
│  │                                                               │   │
│  │  Model: BAAI/bge-reranker-v2-m3                              │   │
│  │  Input: 100 candidates                                        │   │
│  │  Output: Best 2-3 documents                                   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                         │                                            │
│                         ▼                                            │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                 RESPONSE GENERATOR                            │   │
│  │                                                               │   │
│  │  Takes: Query + Best documents                                │   │
│  │  Sends to: LLM Server                                         │   │
│  │  Returns: Human-readable answer + sources                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    LLM SERVER (Port 8081)                            │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     LLAMAFILE                                 │   │
│  │                                                               │   │
│  │  Model: Mistral-Nemo-Instruct-2407 (12B parameters)          │   │
│  │  Format: Q5_K_M quantization (8.5 GB)                        │   │
│  │  Context: 128K tokens                                         │   │
│  │                                                               │   │
│  │  Self-contained executable - includes model + server         │   │
│  │  No Python dependencies, no internet needed                   │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                   │
│                                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │
│  │   data/raw   │ │data/uploads  │ │    cache/    │ │   logs/    │  │
│  │              │ │              │ │              │ │            │  │
│  │ Your source  │ │ Files added  │ │ Embeddings   │ │ Error      │  │
│  │ documents    │ │ via UI       │ │ FAISS index  │ │ logs       │  │
│  │              │ │              │ │ BM25 index   │ │            │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## The Two User Interfaces

RagVault provides two ways to interact with the system:

### React + Vite UI (Primary Interface)

**Port:** 5173

```
┌─────────────────────────────────────────────────────────────────────┐
│                      REACT UI FEATURES                               │
│                                                                      │
│  VISUAL PIPELINE:                                                    │
│  ┌───────────┐     ┌───────────┐     ┌───────────┐     ┌─────────┐ │
│  │   DATA    │────►│ PROCESSING│────►│   QUERY   │────►│ RESULT  │ │
│  │  Upload   │     │  Indexing │     │  Search   │     │ Answer  │ │
│  │  📁       │     │    ⚙️     │     │    🔍     │     │   💬    │ │
│  └───────────┘     └───────────┘     └───────────┘     └─────────┘ │
│                                                                      │
│  PAGES:                                                              │
│  • Pipeline    - Interactive visual flow (above)                    │
│  • Documents   - Upload, delete, manage files                       │
│  • LLM Settings- Check model status, configure                      │
│  • Configuration- View system settings                              │
│                                                                      │
│  TECHNOLOGY: React 19, TypeScript, Vite, ReactFlow                  │
│  REQUIRES: Node.js 18+, npm                                         │
└─────────────────────────────────────────────────────────────────────┘
```

### Streamlit UI (Memory-Efficient Alternative)

**Port:** 8501

```
┌─────────────────────────────────────────────────────────────────────┐
│                    STREAMLIT UI FEATURES                             │
│                                                                      │
│  CHAT INTERFACE:                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  🧑 You: What is the Matter protocol?                         │   │
│  │                                                               │   │
│  │  🤖 Assistant: Matter is a connectivity standard for smart   │   │
│  │     home devices that ensures interoperability...             │   │
│  │                                                               │   │
│  │     📚 Sources: [matter_spec.pdf] [iot_guide.pdf]            │   │
│  │     Confidence: ████████░░ 85%                               │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  UNIQUE FEATURES:                                                    │
│  • Built-in Login System (admin/user roles)                         │
│  • Web Scraper (add content from URLs)                              │
│  • No Node.js dependencies (pure Python)                            │
│  • Lower memory footprint                                            │
│                                                                      │
│  BEST FOR:                                                           │
│  • Laptops with limited RAM                                          │
│  • Environments without Node.js                                      │
│  • When you need user authentication                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## How Documents Become Searchable

This is what happens when you add a document to RagVault:

```
┌─────────────────────────────────────────────────────────────────────┐
│               DOCUMENT INGESTION PIPELINE                            │
│                                                                      │
│  STEP 1: UPLOAD                                                      │
│  ─────────────                                                       │
│  You upload a file (PDF, DOCX, TXT, MD, etc.)                       │
│  File is saved to data/uploads/ or data/raw/                        │
│                                                                      │
│        📄 your_document.pdf                                         │
│                 │                                                    │
│                 ▼                                                    │
│  STEP 2: TEXT EXTRACTION                                             │
│  ───────────────────────                                             │
│  The system reads the file and extracts text:                        │
│  • PDF: Reads all pages, extracts text                              │
│  • DOCX: Converts to text, preserves structure                      │
│  • Markdown: Parses formatting                                       │
│                                                                      │
│        "Chapter 1: Introduction to Matter..."                       │
│                 │                                                    │
│                 ▼                                                    │
│  STEP 3: CHUNKING                                                    │
│  ────────────────                                                    │
│  Long text is split into ~2000 character chunks                      │
│  Each chunk has 200 character overlap with the next                  │
│                                                                      │
│     [Chunk 1] [Chunk 2] [Chunk 3] [Chunk 4] ...                     │
│                 │                                                    │
│                 ▼                                                    │
│  STEP 4: EMBEDDING                                                   │
│  ─────────────────                                                   │
│  Each chunk is converted to a 768-number vector                      │
│  Using the nomic-embed-text-v1.5 model                              │
│                                                                      │
│     [0.23, -0.15, 0.89, ...] × number of chunks                     │
│                 │                                                    │
│                 ▼                                                    │
│  STEP 5: INDEXING                                                    │
│  ────────────────                                                    │
│  Vectors go into FAISS (for semantic search)                         │
│  Text goes into BM25 (for keyword search)                            │
│  Both are saved to cache/ directory                                  │
│                                                                      │
│     ┌─────────────┐    ┌─────────────┐                              │
│     │   FAISS     │    │    BM25     │                              │
│     │   Index     │    │    Index    │                              │
│     └─────────────┘    └─────────────┘                              │
│                                                                      │
│  DONE! Document is now searchable.                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## How Your Questions Get Answered

This is the complete flow when you ask a question:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    QUERY PROCESSING PIPELINE                         │
│                                                                      │
│  YOU ASK: "What certificates are needed for Matter devices?"        │
│                                                                      │
│  ───────────────────────────────────────────────────────────────    │
│                                                                      │
│  STEP 1: QUERY EMBEDDING                          ⏱️ ~50ms          │
│  ─────────────────────                                               │
│  Your question is converted to a vector                              │
│                                                                      │
│  "What certificates are needed for Matter devices?"                  │
│                 │                                                    │
│                 ▼                                                    │
│  [0.34, -0.21, 0.78, ...] (768 numbers)                             │
│                                                                      │
│  ───────────────────────────────────────────────────────────────    │
│                                                                      │
│  STEP 2: HYBRID SEARCH                            ⏱️ ~100ms         │
│  ──────────────────────                                              │
│                                                                      │
│              ┌────────────────┬────────────────┐                    │
│              │                │                │                     │
│              ▼                ▼                │                     │
│   ┌─────────────────┐ ┌─────────────────┐     │                     │
│   │  FAISS Search   │ │  BM25 Search    │     │                     │
│   │  (semantic)     │ │  (keywords)     │     │                     │
│   │                 │ │                 │     │                     │
│   │ Find similar    │ │ Find exact      │     │                     │
│   │ meanings        │ │ word matches    │     │                     │
│   └────────┬────────┘ └────────┬────────┘     │                     │
│            │                   │               │                     │
│            └─────────┬─────────┘               │                     │
│                      ▼                         │                     │
│            ┌─────────────────┐                 │                     │
│            │  Combine & Rank │                 │                     │
│            │  (80% + 20%)    │                 │                     │
│            │                 │                 │                     │
│            │  100 candidates │                 │                     │
│            └────────┬────────┘                 │                     │
│                     │                          │                     │
│  ───────────────────┼──────────────────────────┼────────────────    │
│                     ▼                          │                     │
│  STEP 3: RERANKING                             │   ⏱️ ~500ms        │
│  ─────────────────                             │                     │
│                                                │                     │
│  Neural network scores each candidate:         │                     │
│  • "Is this document really about the query?" │                     │
│  • Looks at query AND document together       │                     │
│                                                │                     │
│  100 candidates → Best 2-3 documents          │                     │
│                     │                          │                     │
│                     ▼                          │                     │
│  ┌──────────────────────────────────────────┐ │                     │
│  │ Top Results:                              │ │                     │
│  │ 1. matter_spec.pdf (score: 0.94)         │ │                     │
│  │ 2. certificate_guide.pdf (score: 0.89)   │ │                     │
│  └──────────────────────────────────────────┘ │                     │
│                     │                          │                     │
│  ───────────────────┼──────────────────────────┼────────────────    │
│                     ▼                          │                     │
│  STEP 4: LLM GENERATION                        │   ⏱️ ~3-8 sec      │
│  ───────────────────────                       │                     │
│                                                │                     │
│  The AI receives:                              │                     │
│  • Your original question                      │                     │
│  • The 2-3 best document chunks                │                     │
│  • Instructions to only use provided info      │                     │
│                                                │                     │
│  The AI generates a natural language answer    │                     │
│                     │                          │                     │
│                     ▼                          │                     │
│  ┌──────────────────────────────────────────┐ │                     │
│  │ ANSWER:                                   │ │                     │
│  │ "Matter devices require three types of   │ │                     │
│  │  certificates: Product Attestation       │ │                     │
│  │  Authority (PAA), Product Attestation    │ │                     │
│  │  Intermediate (PAI), and Device          │ │                     │
│  │  Attestation Certificate (DAC)..."       │ │                     │
│  │                                          │ │                     │
│  │ Sources: matter_spec.pdf,                │ │                     │
│  │          certificate_guide.pdf           │ │                     │
│  └──────────────────────────────────────────┘ │                     │
│                                                │                     │
│  TOTAL TIME: ~4-10 seconds                     │                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Configuration Parameters Explained

Every setting in RagVault and what it does:

### Chunk Settings

| Parameter | Default | What It Does | When to Change |
|-----------|---------|--------------|----------------|
| **chunk_size** | 2000 | Characters per chunk | Lower for precise search, higher for more context |
| **chunk_overlap** | 200 | Overlap between chunks | Higher if sentences are being cut off |

### Retrieval Settings

| Parameter | Default | What It Does | When to Change |
|-----------|---------|--------------|----------------|
| **top_k** | 100 | Candidates from initial search | Higher for better recall, lower for speed |
| **send_nb_chunks_to_llm** | 2-3 | Final chunks sent to AI | Higher = more context but slower |
| **bm25_weight** | 0.2 | Keyword vs semantic balance | Higher if exact terms matter more |
| **use_reranking** | true | Enable neural reranking | Disable for speed (less accurate) |
| **use_bm25** | true | Enable keyword search | Disable for pure semantic search |

### LLM Settings

| Parameter | Default | What It Does | When to Change |
|-----------|---------|--------------|----------------|
| **temperature** | 0.7 | Response creativity | Lower for factual, higher for creative |
| **max_tokens** | 512 | Maximum response length | Increase for longer answers |

```
┌─────────────────────────────────────────────────────────────────────┐
│                  CONFIGURATION DECISION FLOWCHART                    │
│                                                                      │
│  ❓ Are answers missing relevant information?                        │
│     │                                                                │
│     ├─► YES → Increase top_k (more candidates)                      │
│     │       → Increase send_nb_chunks_to_llm (more context)         │
│     │                                                                │
│     └─► NO → ❓ Are answers too slow?                                │
│               │                                                      │
│               ├─► YES → Decrease top_k                              │
│               │       → Set use_reranking: false                    │
│               │       → Decrease send_nb_chunks_to_llm              │
│               │                                                      │
│               └─► NO → ❓ Are exact terms being missed?             │
│                         │                                            │
│                         ├─► YES → Increase bm25_weight (0.3-0.4)    │
│                         │                                            │
│                         └─► NO → Settings are fine! ✓               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Observability & Monitoring

RagVault isn't just a black box. It includes an "SRE-grade" observability stack based on **Prometheus** to track performance and a detailed history audit log.

### Operational Metrics Architecture

How we track latency, errors, and system health without slowing things down:

```
┌─────────────────────────────────────────────────────────────────────┐
│                   OBSERVABILITY ARCHITECTURE                         │
│                                                                      │
│    INSTRUMENTED BACKEND                                              │
│    ┌───────────────────────────────────────────────────────────┐    │
│    │  Metrics Collector (src/metrics.py)                        │    │
│    │                                                           │    │
│    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │    │
│    │  │  COUNTERS    │  │  HISTOGRAMS  │  │   GAUGES     │    │    │
│    │  │  (Counts)    │  │  (Latencies) │  │  (State)     │    │    │
│    │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │    │
│    └─────────┼─────────────────┼─────────────────┼─────────────┘    │
│              │                 │                 │                  │
│              ▼                 ▼                 ▼                  │
│    ┌───────────────────────────────────────────────────────────┐    │
│    │                 IN-MEMORY REGISTRY                         │    │
│    │             (prometheus-client library)                    │    │
│    └──────────────────────┬────────────────────────────┬───────┘    │
│                           │                            │            │
│                 JSON      │                  Prometheus│            │
│                 Aggregation                            Format    │            │
│                           ▼                            ▼            │
│                ┌─────────────────────┐      ┌────────────────────┐  │
│                │     /stats API      │      │    /metrics API    │  │
│                └──────────┬──────────┘      └──────────┬─────────┘  │
│                           │                            │            │
│                           ▼                            ▼            │
│                ┌─────────────────────┐      ┌────────────────────┐  │
│                │   ADMIN DASHBOARD   │      │ EXTERNAL MONITOR   │  │
│                │  (React UI /metrics)│      │ (Prometheus/Grafana)│ │
│                └─────────────────────┘      └────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Query History

We maintain a secure audit log of all interactions for review:

```
┌─────────────────────────────────────────────────────────────────────┐
│                       QUERY HISTORY AUDIT                            │
│                                                                      │
│   USER QUERY                               ADMIN REVIEW              │
│   ──────────                               ────────────              │
│                                            GET /history              │
│        │                                        ▲                    │
│        ▼                                        │                    │
│   ┌──────────────┐                         ┌──────────────┐         │
│   │ /query API   │                         │ /history API │         │
│   └──────┬───────┘                         └──────┬───────┘         │
│          │                                        │                   │
│          ▼                                        │                   │
│   ┌──────────────────────────────────────────────────────────┐      │
│   │                 QUERY HISTORY STORAGE                    │      │
│   │               (data/query_history.json)                  │      │
│   │                                                          │      │
│   │  [                                                       │      │
│   │    {                                                     │      │
│   │      "time": "2023-10-25T14:30:00",                      │      │
│   │      "user": "alice",                                    │      │
│   │      "query": "What is the refund policy?",              │      │
│   │      "answer": "Refunds are processed within...",        │      │
│   │      "sources": ["policy.pdf"]                           │      │
│   │    },                                                    │      │
│   │    ...                                                   │      │
│   │  ]                                                       │      │
│   └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Technology Choices and Why

### Why These Specific Technologies?

```
┌─────────────────────────────────────────────────────────────────────┐
│                   TECHNOLOGY DECISION RATIONALE                      │
│                                                                      │
│  EMBEDDING MODEL: nomic-embed-text-v1.5                             │
│  ──────────────────────────────────────                              │
│  ✓ Open source and free                                             │
│  ✓ 768 dimensions (good balance of quality/size)                    │
│  ✓ 8K token context (handles long chunks)                           │
│  ✓ Runs on CPU and GPU efficiently                                   │
│                                                                      │
│  ─────────────────────────────────────────────────────────────      │
│                                                                      │
│  VECTOR STORE: FAISS                                                 │
│  ───────────────────                                                 │
│  ✓ Extremely fast (developed by Meta)                               │
│  ✓ Works in memory (no database needed)                             │
│  ✓ Scales to millions of vectors                                    │
│  ✓ Simple to use with LangChain                                     │
│                                                                      │
│  ─────────────────────────────────────────────────────────────      │
│                                                                      │
│  RERANKER: BAAI/bge-reranker-v2-m3                                  │
│  ─────────────────────────────────                                   │
│  ✓ State-of-the-art accuracy                                        │
│  ✓ Multilingual support                                              │
│  ✓ Reasonable size (~500MB)                                         │
│  ✓ Works well on consumer hardware                                   │
│                                                                      │
│  ─────────────────────────────────────────────────────────────      │
│                                                                      │
│  LLM: Mistral Nemo 12B via Llamafile                                │
│  ───────────────────────────────────                                 │
│  ✓ Self-contained (no Python deps)                                  │
│  ✓ 128K context window (huge!)                                      │
│  ✓ Q5_K_M quantization (quality + size balance)                     │
│  ✓ OpenAI-compatible API                                             │
│  ✓ Runs offline completely                                          │
│                                                                      │
│  ─────────────────────────────────────────────────────────────      │
│                                                                      │
│  UI: React + Streamlit (DUAL OPTIONS)                               │
│  ────────────────────────────────────                                │
│  React: Modern visual experience, developer-friendly                │
│  Streamlit: Memory-efficient, no Node.js needed                     │
│  Having both = flexibility for different use cases                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Summary

RagVault is a complete offline RAG system that:

1. **Ingests** your documents (PDF, DOCX, TXT, MD)
2. **Chunks** them into 2000-character pieces
3. **Embeds** each chunk as a 768-number vector
4. **Indexes** in FAISS (semantic) and BM25 (keyword)
5. **Retrieves** using hybrid search (80% semantic + 20% keyword)
6. **Reranks** with a neural model for accuracy
7. **Generates** answers using a local LLM

All of this happens **100% offline** on your own hardware.



