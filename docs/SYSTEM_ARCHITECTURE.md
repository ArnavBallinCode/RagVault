# 🔒 RagVault System Architecture

> **Technical documentation explaining how every component works, the exact models used, and how they connect together**
> 
> **Last Updated**: January 2026 | **Based on**: Actual codebase analysis

---

## Table of Contents

1. [What is RagVault?](#what-is-ragvault)
2. [Core Concepts Explained](#core-concepts-explained)
3. [Complete System Architecture](#complete-system-architecture)
4. [The Two User Interfaces](#the-two-user-interfaces)
5. [How Documents Become Searchable](#how-documents-become-searchable)
6. [How Your Questions Get Answered](#how-your-questions-get-answered)
7. [Exact Models and Their Roles](#exact-models-and-their-roles)
8. [Configuration Parameters Explained](#configuration-parameters-explained)
9. [Authentication & Authorization](#authentication--authorization)
10. [Observability & Monitoring](#observability--monitoring)
11. [Technology Choices and Why](#technology-choices-and-why)

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
│   EXACT MODEL: nomic-ai/nomic-embed-text-v1.5 (HuggingFace)         │
│   DIMENSIONS: 768 numbers per text chunk                            │
│   DEVICE: Auto-detect (MPS/CUDA/CPU)                                │
│   BATCH SIZE: 32 documents processed simultaneously                 │
│   NORMALIZATION: Enabled for consistent similarity scores           │
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
- 80% Vector (semantic understanding) - Weight: 0.8
- 20% BM25 (exact keyword matching) - Weight: 0.2

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
│   │   (0.8 weight)      │       │   (0.2 weight)      │             │
│   │                     │       │                     │             │
│   │ nomic-ai/nomic-     │       │ BM25Okapi algorithm │             │
│   │ embed-text-v1.5     │       │ rank_bm25 library   │             │
│   │                     │       │                     │             │
│   │ FAISS vector store  │       │ Tokenized search    │             │
│   │ similarity_search   │       │ TF-IDF scoring      │             │
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
│                   │ Retrieves top 100   │                           │
│                   │ candidate documents │                           │
│                   │ for reranking stage │                           │
│                   └─────────────────────┘                           │
│                                                                      │
│   CONFIGURATION:                                                     │
│   • bm25_weight: 0.2 (from process_config.yaml)                    │
│   • top_k: 100 (initial retrieval count)                           │
│   • Deduplication: Automatic (HybridRetriever)                     │
│   • Score normalization: [0,1] range for both methods              │
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
│   From all indexed chunks, find the 100 most relevant               │
│   Uses HybridRetriever with both vector and BM25                    │
│                                                                      │
│   ┌──────────────────────────────────────────────────┐              │
│   │  All chunks ──► Hybrid Search ──► 100 chunks     │              │
│   │  (thousands)    (FAISS + BM25)     (candidates)  │              │
│   └──────────────────────────────────────────────────┘              │
│                              │                                       │
│                              ▼                                       │
│   STAGE 2: RERANKING (send_nb_chunks_to_llm = 2)                    │
│   ──────────────────────────────────────────────                     │
│   From 100 candidates, neural model picks the best 2                │
│   Uses BAAI/bge-reranker-v2-m3 transformer model                    │
│   This is slower but extremely accurate                             │
│                                                                      │
│   ┌──────────────────────────────────────────────────┐              │
│   │  100 chunks ──► Neural Reranker ──► 2 chunks     │              │
│   │  (candidates)   (Cross-encoder)     (best)       │              │
│   │                 Batch size: 8                     │              │
│   │                 Max length: 512 tokens            │              │
│   └──────────────────────────────────────────────────┘              │
│                              │                                       │
│                              ▼                                       │
│   STAGE 3: LLM GENERATION                                           │
│   ───────────────────────────                                        │
│   Only the best 2 chunks go to Mistral for answer generation        │
│   This saves context window space and improves accuracy             │
│                                                                      │
│   ┌──────────────────────────────────────────────────┐              │
│   │  2 chunks ──► Mistral-Nemo-Instruct ──► Answer   │              │
│   │  (context)    (12B parameters)         (text)    │              │
│   │               via Llamafile server                │              │
│   └──────────────────────────────────────────────────┘              │
│                                                                      │
│   WHY THIS FUNNEL?                                                   │
│   • Fast hybrid search first (handles volume efficiently)           │
│   • Accurate reranking second (ensures highest quality)             │
│   • Minimal context to LLM (saves tokens and time)                  │
│                                                                      │
│   ACTUAL CONFIGURATION:                                              │
│   • retrieval.top_k: 100 (from process_config.yaml)                │
│   • retrieval.send_nb_chunks_to_llm: 2                              │
│   • retrieval.use_reranking: true                                   │
│   • processing.batch_size_reranking: 8                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Reranking

**What it is:** A neural network that scores how relevant each document is to your query.

**Why it's better than initial search:**
- Initial search compares query and document separately
- Reranker looks at query AND document together using attention mechanisms
- Much more accurate but computationally expensive

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RERANKING EXPLAINED                           │
│                                                                      │
│   INITIAL RETRIEVAL (Fast but Approximate)                          │
│   ────────────────────────────────────────                           │
│   Query: [embedding] ──compare distance──► Doc: [embedding]          │
│   Looks at each separately, measures cosine similarity               │
│   FAISS IndexFlatIP for exact similarity search                     │
│                                                                      │
│   ─────────────────────────────────────────────────────────────     │
│                                                                      │
│   RERANKING (Slow but Highly Accurate)                               │
│   ─────────────────────────────────                                  │
│   Input: "Query: What is DAC? [SEP] Document: The DAC cert..."      │
│                              │                                       │
│                              ▼                                       │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │        BAAI/bge-reranker-v2-m3 TRANSFORMER MODEL             │   │
│   │                                                              │   │
│   │   • Cross-encoder architecture (not bi-encoder)              │   │
│   │   • AutoModelForSequenceClassification from HuggingFace     │   │
│   │   • Processes query+document pairs together                 │   │
│   │   • Uses self-attention to understand relationships         │   │
│   │   • Multilingual support (89 languages)                     │   │
│   │   • Max sequence length: 512 tokens                         │   │
│   │   • Batch processing: 8 pairs at a time                     │   │
│   │   • Device: MPS (Apple Silicon) / CUDA / CPU                │   │
│   │   • Returns: Relevance score (logits)                       │   │
│   │                                                              │   │
│   │   Processing pipeline:                                       │   │
│   │   1. Tokenize query+document pair                           │   │
│   │   2. Pass through transformer layers                         │   │
│   │   3. Classification head outputs relevance score            │   │
│   │   4. Higher score = more relevant                           │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│                     Relevance Score: 0.95                            │
│                     (Normalized logit output)                        │
│                                                                      │
│   EXACT IMPLEMENTATION:                                              │
│   • Class: src/models/reranker.py → Reranker                       │
│   • Method: rerank(query, documents, top_k)                         │
│   • Batching: Processes in groups of 8 for GPU efficiency          │
│   • Progress tracking: tqdm progress bar during reranking          │
│   • Model loading: AutoTokenizer + AutoModelForSequenceClassification│
│                                                                      │
│   WHY IT'S BETTER:                                                   │
│   • Understands semantic relationships, not just similarity         │
│   • Considers word order and context                                │
│   • Trained specifically for ranking tasks                          │
│   • Higher precision than distance-based retrieval                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

### LLM (Large Language Model)

**What it is:** An AI that generates human-like text responses.

**The exact model:** Mistral-Nemo-Instruct-2407 (12 billion parameters)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          LLM EXPLAINED                               │
│                                                                      │
│   WHAT IS AN LLM?                                                    │
│   ───────────────                                                    │
│   • Trained on trillions of tokens from diverse text sources        │
│   • Learned statistical patterns of human language                  │
│   • Can generate coherent, contextual responses                     │
│   • Operates via next-token prediction                              │
│                                                                      │
│   THE MISTRAL-NEMO-INSTRUCT-2407 MODEL:                              │
│   ────────────────────────────────────────                           │
│   • 12 Billion parameters (learned weights)                         │
│   • Quantization: Q5_K_M (5-bit, high quality)                      │
│   • File size: ~8.5 GB (compressed)                                 │
│   • Context window: 128,000 tokens (~400 pages)                     │
│   • Architecture: Transformer decoder                                │
│   • Instruction-tuned for following user prompts                    │
│   • Runs via Llamafile (self-contained executable)                  │
│   • Server: OpenAI-compatible API on port 8081                      │
│   • No internet required - 100% offline                             │
│                                                                      │
│   ─────────────────────────────────────────────────────────────     │
│                                                                      │
│   HOW IT GENERATES ANSWERS IN RAGVAULT:                              │
│                                                                      │
│   INPUT (via Llamafile class from langchain_community.llms):        │
│   ┌───────────────────────────────────────────────────────────┐     │
│   │ System: You are an efficient Q&A assistant...             │     │
│   │                                                            │     │
│   │ Question: {query}                                          │     │
│   │                                                            │     │
│   │ Relevant Information:                                      │     │
│   │ [1] Source: matter_spec.pdf                               │     │
│   │ DAC certificates use X.509 format with...                 │     │
│   │                                                            │     │
│   │ [2] Source: auth_guide.pdf                                │     │
│   │ Authentication requires three certificate layers...       │     │
│   │                                                            │     │
│   │ Instructions:                                              │     │
│   │ 1. Directly address the question                          │     │
│   │ 2. Supported by provided information                      │     │
│   │ 3. Clear and well-organized                               │     │
│   │ 4. Short as possible with relevant info                   │     │
│   │ 5. Don't mention source names                             │     │
│   │ 6. Don't repeat the question                              │     │
│   │ 7. Respond in query language                              │     │
│   │ 8. State if info is insufficient                          │     │
│   └───────────────────────────────────────────────────────────┘     │
│                              │                                       │
│                              ▼                                       │
│        POST http://localhost:8081/v1/completions                     │
│        (Llamafile server endpoint)                                   │
│                              │                                       │
│                              ▼                                       │
│   OUTPUT (streamed back to ResponseGenerator):                      │
│   ┌───────────────────────────────────────────────────────────┐     │
│   │ "A DAC (Device Attestation Certificate) is an X.509       │     │
│   │  certificate that proves a device's authenticity. It's    │     │
│   │  part of a three-tier certificate chain used in Matter    │     │
│   │  protocol for device authentication."                     │     │
│   └───────────────────────────────────────────────────────────┘     │
│                                                                      │
│   TEMPERATURE SETTING: 0.7 (default in Llamafile)                   │
│   • Balances creativity and consistency                             │
│   • Not too random, not too deterministic                           │
│                                                                      │
│   EXACT IMPLEMENTATION:                                              │
│   • Class: src/response/response_generator.py → ResponseGenerator   │
│   • LLM Instance: Llamafile(base_url=localhost:8081, seed=2024)    │
│   • Prompt Template: ChatPromptTemplate.from_template()            │
│   • Method: generate_answer(query, relevant_chunks, metadata)       │
│   • Returns: Dict with response, sources, metadata                  │
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
│   RAGVAULT DEFAULT: 0.7 (Llamafile default, not explicitly set)     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Exact Models and Their Roles

This section provides the precise technical specifications of every model used in RagVault, based on actual code analysis.

### Model 1: Embedding Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EMBEDDING MODEL SPECIFICATION                     │
│                                                                      │
│   MODEL NAME:                                                        │
│   nomic-ai/nomic-embed-text-v1.5                                    │
│                                                                      │
│   SOURCE:                                                            │
│   HuggingFace Model Hub                                             │
│   Class: HuggingFaceEmbeddings from langchain_huggingface          │
│                                                                      │
│   PURPOSE:                                                           │
│   Convert text chunks and queries into 768-dimensional vectors      │
│   for semantic similarity search via FAISS                          │
│                                                                      │
│   SPECIFICATIONS:                                                    │
│   • Embedding dimensions: 768                                       │
│   • Max sequence length: 8,192 tokens                               │
│   • Model type: Sentence transformer (bi-encoder)                   │
│   • Architecture: BERT-based                                        │
│   • Normalization: L2 normalization enabled                         │
│   • Pooling strategy: Mean pooling                                  │
│                                                                      │
│   DEVICE CONFIGURATION (Auto-detection):                             │
│   Located in: src/retrieval/vector_retriever.py                     │
│   Logic:                                                             │
│     if torch.backends.mps.is_available():                           │
│         device = "mps"  # Apple Silicon M-series                    │
│     elif torch.cuda.is_available():                                 │
│         device = "cuda"  # NVIDIA GPU                               │
│     else:                                                            │
│         device = "cpu"   # CPU fallback                             │
│                                                                      │
│   BATCH PROCESSING:                                                  │
│   • Batch size: 32 documents                                        │
│   • Config: init_config.yaml → processing.batch_size_embeddings    │
│   • encode_kwargs:                                                   │
│     {'normalize_embeddings': True, 'batch_size': 32}               │
│   • show_progress: True (progress bar during embedding)            │
│                                                                      │
│   CACHING SYSTEM:                                                    │
│   • Location: cache/embeddings_direct/                              │
│   • Cache key: First 100 chars of concatenated chunk texts         │
│   • Manager: CacheManager class (src/cache/cache.py)               │
│   • Saves: {'texts': [...], 'sources': [...], 'embeddings': [...]} │
│                                                                      │
│   CODE LOCATION:                                                     │
│   File: src/retrieval/vector_retriever.py                           │
│   Class: VectorRetriever                                             │
│   Lines:                                                             │
│     model_kwargs = {'device': device, 'trust_remote_code': True}   │
│     encode_kwargs = {'normalize_embeddings': True, ...}            │
│     self.model_embeddings_hf = HuggingFaceEmbeddings(              │
│         model_name=self.embedding_model_name_hf,                    │
│         model_kwargs=model_kwargs,                                   │
│         encode_kwargs=encode_kwargs,                                 │
│         show_progress=True                                           │
│     )                                                                │
│                                                                      │
│   WHEN IT RUNS:                                                      │
│   1. Initialization: Embeds all document chunks                     │
│      Method: _create_direct_vectorstore(chunks)                     │
│   2. Query time: Embeds user query                                  │
│      Method: similarity_search_with_score(query, k)                 │
│                                                                      │
│   OUTPUT FORMAT:                                                     │
│   • Type: List[List[float]]                                         │
│   • Shape: [num_texts, 768]                                         │
│   • Normalized: Yes (L2 normalization)                              │
│                                                                      │
│   INTEGRATION WITH FAISS:                                            │
│   Method: FAISS.from_embeddings(text_embedding_pairs, model)       │
│   Index type: IndexFlatIP (inner product for cosine similarity)    │
│                                                                      │
│   PERFORMANCE:                                                       │
│   • CPU: ~100-200 chunks/second                                     │
│   • MPS (Apple M1/M2): ~500-1000 chunks/second                      │
│   • CUDA (GPU): ~800-1500 chunks/second                             │
│   • Memory usage: ~500MB model + embeddings cache                   │
│                                                                      │
│   MEMORY CLEANUP:                                                    │
│   After embedding (to free GPU memory):                             │
│     if torch.cuda.is_available():                                   │
│         torch.cuda.empty_cache()                                    │
│     elif torch.backends.mps.is_available():                         │
│         torch.mps.empty_cache()                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Model 2: Reranking Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RERANKING MODEL SPECIFICATION                     │
│                                                                      │
│   MODEL NAME:                                                        │
│   BAAI/bge-reranker-v2-m3                                           │
│                                                                      │
│   SOURCE:                                                            │
│   HuggingFace Model Hub                                             │
│   Organization: Beijing Academy of Artificial Intelligence (BAAI)  │
│                                                                      │
│   PURPOSE:                                                           │
│   Precisely rank retrieved documents by relevance to query          │
│   Second-stage ranking after hybrid retrieval                       │
│   Filters 100 candidates down to 2 best chunks                     │
│                                                                      │
│   SPECIFICATIONS:                                                    │
│   • Model type: Cross-encoder (sequence classification)            │
│   • Class: AutoModelForSequenceClassification                       │
│   • Tokenizer: AutoTokenizer                                        │
│   • Multilingual: Supports 89 languages                            │
│   • Max sequence length: 512 tokens                                 │
│   • Input format: [query, document] concatenated pairs             │
│   • Output: Single relevance score (logit)                         │
│   • Parameters: ~560M                                               │
│   • trust_remote_code: True                                         │
│                                                                      │
│   DEVICE CONFIGURATION:                                              │
│   • Config key: init_config.yaml → model.device_rerank             │
│   • Default: "mps" (Apple Silicon)                                 │
│   • Set in: self.device = config['model']['device_rerank']         │
│   • Model moved to device: self.model.to(self.device)              │
│   • Eval mode: self.model.eval()                                    │
│                                                                      │
│   BATCH PROCESSING:                                                  │
│   • Batch size: 8 query-document pairs                             │
│   • Config: init_config.yaml → processing.batch_size_reranking     │
│   • Progress tracking: tqdm progress bar                            │
│   • Method: _process_batch(batch_pairs)                             │
│                                                                      │
│   TOKENIZATION PARAMETERS:                                           │
│   inputs = self.tokenizer(                                          │
│       batch_pairs,            # [[query, doc], [query, doc], ...]  │
│       padding=True,           # Pad to same length                  │
│       truncation=True,        # Truncate to max_length             │
│       return_tensors='pt',    # Return PyTorch tensors             │
│       max_length=512          # Maximum sequence length             │
│   ).to(self.device)                                                 │
│                                                                      │
│   INFERENCE:                                                         │
│   with torch.no_grad():                                             │
│       outputs = self.model(**inputs, return_dict=True)             │
│       scores = outputs.logits.view(-1,).float()                    │
│   return scores.cpu().tolist()                                      │
│                                                                      │
│   CODE LOCATION:                                                     │
│   File: src/models/reranker.py                                      │
│   Class: Reranker                                                    │
│   Methods:                                                           │
│     • _initialize_model(): Load model and tokenizer                 │
│     • rerank(query, documents, top_k): Main reranking method       │
│     • _process_batch(batch_pairs): Process batches                 │
│     • rerank_with_explanations(): Extended with metadata           │
│                                                                      │
│   WHEN IT RUNS:                                                      │
│   Conditional execution based on config:                            │
│   if process_config['retrieval']['use_reranking'] == True:         │
│       reranked_results = reranker.rerank(                           │
│           query,                                                     │
│           [r.document for r in retrieved_results],                  │
│           top_k=send_nb_chunks_to_llm                               │
│       )                                                              │
│                                                                      │
│   INPUT:                                                             │
│   • query: str (user question)                                      │
│   • documents: List[Document] (100 from hybrid retriever)          │
│   • top_k: int (2, from send_nb_chunks_to_llm config)              │
│                                                                      │
│   OUTPUT:                                                            │
│   List[RerankResult] containing:                                    │
│     • document: LangChain Document object                           │
│     • score: float (relevance score from logits)                   │
│     • original_rank: int (position before reranking)               │
│   Sorted by score (highest first)                                   │
│                                                                      │
│   PERFORMANCE MONITORING:                                            │
│   • Prometheus metric: ragvault_rerank_latency_seconds             │
│   • Context manager: metrics.time_rerank()                          │
│   • Typical latency: 100-500ms for 100 documents                    │
│   • Batching: 8 pairs/batch reduces latency vs sequential          │
│                                                                      │
│   MEMORY USAGE:                                                      │
│   • Model size: ~600MB                                              │
│   • Batch overhead: ~200MB per batch                                │
│   • Total peak: ~800MB during reranking                             │
│                                                                      │
│   WHY THIS MODEL:                                                    │
│   • State-of-the-art on BEIR benchmark                              │
│   • Multilingual support (89 languages)                            │
│   • Efficient inference on consumer hardware                        │
│   • Cross-encoder provides higher accuracy than bi-encoders        │
│   • Proven performance in RAG systems                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Model 3: LLM (Large Language Model)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LLM SPECIFICATION                             │
│                                                                      │
│   MODEL NAME:                                                        │
│   Mistral-Nemo-Instruct-2407                                        │
│                                                                      │
│   QUANTIZATION:                                                      │
│   Q5_K_M (5-bit quantization, medium quality)                       │
│                                                                      │
│   FULL FILENAME:                                                     │
│   Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile                       │
│                                                                      │
│   SOURCE:                                                            │
│   HuggingFace: Mozilla/Mistral-Nemo-Instruct-2407-llamafile        │
│   URL: https://huggingface.co/Mozilla/                              │
│        Mistral-Nemo-Instruct-2407-llamafile/resolve/main/           │
│        Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile                  │
│                                                                      │
│   FILE LOCATION:                                                     │
│   models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile                │
│                                                                      │
│   PURPOSE:                                                           │
│   Generate natural language answers from retrieved document context │
│   Final stage of RAG pipeline                                       │
│                                                                      │
│   MODEL SPECIFICATIONS:                                              │
│   • Parameters: 12 billion                                          │
│   • File size: ~8.5 GB                                              │
│   • Context window: 128,000 tokens (~400 pages of text)             │
│   • Architecture: Transformer decoder                                │
│   • Training: Instruction-tuned for chat/QA tasks                  │
│   • Base model: Mistral AI's Nemo                                   │
│   • Released: July 2024                                             │
│   • License: Apache 2.0                                             │
│                                                                      │
│   DEPLOYMENT METHOD:                                                 │
│   • Technology: Llamafile (cosmopolitan libc + llama.cpp)          │
│   • Self-contained: Includes model weights + server + runtime      │
│   • No dependencies: No Python, no libraries needed                 │
│   • Cross-platform: macOS (M1/M2/Intel), Linux, Windows            │
│   • Executable: chmod +x and run directly                           │
│                                                                      │
│   SERVER CONFIGURATION:                                              │
│   • Port: 8081                                                      │
│   • Config: process_config.yaml → retrieval.llamafile_server_base_url│
│   • Base URL: http://localhost:8081                                 │
│   • API compatibility: OpenAI v1 API format                         │
│   • Endpoint used: /v1/completions                                  │
│                                                                      │
│   LAUNCH COMMAND:                                                    │
│   nohup ./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile \     │
│     --server \              # Run as HTTP server                    │
│     --nobrowser \           # Don't open browser UI                 │
│     -ngl 999 \             # GPU layers (all if available)         │
│     --port 8081 \          # Server port                            │
│     > logs/llamafile.log 2>&1 &  # Background with logs            │
│                                                                      │
│   PARAMETERS EXPLAINED:                                              │
│   • --server: Enable HTTP API server mode                           │
│   • --nobrowser: Suppress automatic browser launch                  │
│   • -ngl 999: Number of GPU layers (999 = all available)           │
│   • --port 8081: HTTP server port (configured in config)           │
│                                                                      │
│   GPU ACCELERATION:                                                  │
│   • -ngl 999 enables full GPU offloading if available              │
│   • Works with: Apple Metal (M-series), CUDA (NVIDIA), Vulkan      │
│   • Falls back to CPU if no GPU available                           │
│   • Dramatically faster inference with GPU                          │
│                                                                      │
│   LANGCHAIN INTEGRATION:                                             │
│   File: src/response/response_generator.py                          │
│   Class: ResponseGenerator                                           │
│   Code:                                                              │
│     from langchain_community.llms import Llamafile                  │
│     self.llm = Llamafile(                                           │
│         base_url=self.config["retrieval"]["llamafile_server_base_url"],│
│         seed=2024        # For reproducibility                      │
│     )                                                                │
│                                                                      │
│   PROMPT ENGINEERING:                                                │
│   Template class: ChatPromptTemplate from langchain_core.prompts   │
│   Structure:                                                         │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ You are an efficient Q&A assistant that responds to user   │   │
│   │ queries based on provided context.                         │   │
│   │                                                             │   │
│   │ Question: {query}                                           │   │
│   │                                                             │   │
│   │ Relevant Information:                                       │   │
│   │ {context}                                                   │   │
│   │                                                             │   │
│   │ Requirements:                                               │   │
│   │ 1. Directly address the question                           │   │
│   │ 2. Supported by provided information                       │   │
│   │ 3. Clear and well-organized                                │   │
│   │ 4. Short as possible with relevant info                    │   │
│   │ 5. Don't mention the source of information                 │   │
│   │ 6. Do not repeat the question                              │   │
│   │ 7. State lack of info if context insufficient              │   │
│   │ 8. Respond only in the language of the query               │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   CONTEXT PREPARATION:                                               │
│   Method: _prepare_context(chunks)                                  │
│   Format for each chunk:                                            │
│     [1] Source: filename.pdf                                        │
│     <chunk.page_content>                                            │
│                                                                      │
│     [2] Source: other.pdf                                           │
│     <chunk.page_content>                                            │
│                                                                      │
│   GENERATION FLOW:                                                   │
│   1. Prepare context from 2 reranked chunks                         │
│   2. Format prompt with query + context                             │
│   3. messages = prompt.format_messages(query, context)              │
│   4. response = self.llm.invoke(messages)                           │
│   5. Return formatted response dict                                 │
│                                                                      │
│   GENERATION SETTINGS:                                               │
│   • Temperature: 0.7 (Llamafile default, not overridden)           │
│   • Max tokens: Not limited (uses available context)               │
│   • Top-p: Default                                                  │
│   • Stop sequences: Default                                         │
│   • Seed: 2024 (for reproducible outputs)                          │
│                                                                      │
│   PERFORMANCE MONITORING:                                            │
│   • Metric: ragvault_llm_latency_seconds (Prometheus Histogram)    │
│   • Context manager: metrics.time_llm()                             │
│   • Token counter: ragvault_tokens_generated_total                  │
│   • Typical latency: 3-8 seconds per query                          │
│   • Latency varies with: response length, GPU availability         │
│                                                                      │
│   CALL FLOW IN API:                                                  │
│   api_server.py → /query endpoint:                                  │
│     1. User POST to /query with QueryRequest                        │
│     2. Hybrid retrieval (100 candidates)                            │
│     3. Reranking (2 best chunks)                                    │
│     4. with metrics.time_llm():                                     │
│          response_data = response_generator.generate_answer(        │
│              query, relevant_docs, metadata                         │
│          )                                                           │
│     5. Return QueryResponse with answer + sources                   │
│                                                                      │
│   OUTPUT STRUCTURE:                                                  │
│   Dict returned by generate_answer():                               │
│   {                                                                  │
│       'response': str,              # Generated answer text         │
│       'source_documents': List[Dict],  # Chunk metadata            │
│       'metadata': Dict              # Additional context            │
│   }                                                                  │
│                                                                      │
│   ERROR HANDLING:                                                    │
│   try-except block in generate_answer():                            │
│   • Catches all exceptions during generation                        │
│   • Returns fallback message: "I apologize, but I encountered      │
│     an error generating a response. Please try again."             │
│   • Includes error details in response dict                         │
│   • Logs error: logger.error(f"Error generating response: {e}")    │
│                                                                      │
│   QUERY EXPANSION (Optional):                                        │
│   Method: expand_query(query)                                       │
│   • Configured: retrieval.use_query_expansion (default: false)     │
│   • Purpose: Expand query with synonyms/related terms              │
│   • Uses same LLM with different prompt                             │
│   • Returns: Expanded query string                                  │
│   • Note: Currently disabled in default config                      │
│                                                                      │
│   OFFLINE CAPABILITY:                                                │
│   • 100% offline operation - no internet required                   │
│   • No API keys needed                                               │
│   • No external API calls                                            │
│   • All processing local                                             │
│   • Model weights bundled in executable                             │
│                                                                      │
│   WHY THIS MODEL:                                                    │
│   • Excellent quality/size tradeoff at 12B parameters              │
│   • Massive 128K context window (can fit many chunks)               │
│   • Instruction-tuned specifically for QA tasks                     │
│   • Self-contained via Llamafile (no dependencies)                 │
│   • Runs on consumer hardware (8GB+ RAM recommended)                │
│   • Q5_K_M quantization balances quality and speed                  │
│   • Apache 2.0 license for commercial use                           │
│   • Active community support                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---


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


## Complete System Architecture

Now that you understand the concepts and exact models, here's how everything connects:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COMPLETE RAGVAULT ARCHITECTURE                    │
│                    (Based on Actual Implementation)                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACES                              │
│  ┌────────────────────────────┐  ┌────────────────────────────┐     │
│  │     REACT + VITE UI        │  │      STREAMLIT UI          │     │
│  │     (Port 5173)            │  │      (Port 8501)           │     │
│  │                            │  │                            │     │
│  │  • Visual pipeline flow    │  │  • Memory-efficient        │     │
│  │  • Modern dark theme       │  │  • Built-in RBAC login     │     │
│  │  • ReactFlow diagrams      │  │  • No Node.js needed       │     │
│  │  • TypeScript + Vite       │  │  • Web scraping feature    │     │
│  │  • Metrics dashboard       │  │  • Query expansion UI      │     │
│  │                            │  │                            │     │
│  │  BEST FOR:                 │  │  BEST FOR:                 │     │
│  │  Full visual experience    │  │  Low-resource machines     │     │
│  │  Technical users           │  │  Simple deployment         │     │
│  └────────────────────────────┘  └────────────────────────────┘     │
│              │                               │                       │
│              └───────────────┬───────────────┘                      │
│                              ▼                                       │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     FASTAPI BACKEND (Port 8000)                      │
│                         api_server.py                                │
│                                                                      │
│  AUTHENTICATION (auth.py + rbac.py):                                │
│  • JWT-based authentication (jose library)                          │
│  • Two roles: admin, user                                           │
│  • Token expiry: 8 hours (480 minutes)                              │
│  • Bcrypt password hashing                                           │
│                                                                      │
│  PUBLIC ENDPOINTS:                                                   │
│  • POST /login    → Authenticate and get JWT token                  │
│  • GET  /health   → System health check                             │
│  • GET  /         → Root endpoint                                   │
│                                                                      │
│  PROTECTED ENDPOINTS (Admin + User):                                │
│  • POST /query    → Ask questions (requires valid JWT)              │
│                                                                      │
│  ADMIN-ONLY ENDPOINTS:                                               │
│  • POST   /upload      → Add documents                              │
│  • GET    /documents   → List uploaded files                        │
│  • DELETE /documents/{filename} → Remove document                   │
│  • POST   /refresh     → Rebuild indices (clears cache)             │
│  • POST   /clear       → Delete all data                            │
│  • GET    /limits      → System recommendations                     │
│  • GET    /stats       → Operational metrics (JSON)                 │
│  • GET    /metrics     → Prometheus metrics (text)                  │
│  • GET    /history     → Query audit log                            │
│                                                                      │
│  MIDDLEWARE:                                                         │
│  • CORSMiddleware (allows http://localhost:5173)                    │
│  • Prometheus metrics instrumentation (metrics.py)                  │
│                                                                      │
│  STARTUP PROCESS (startup_event):                                   │
│  1. Initialize RAGInitializer with configs                          │
│  2. Load documents from data/raw/ and data/uploads/                 │
│  3. Process into chunks (DataPreprocessor)                          │
│  4. Create embeddings + FAISS index (VectorRetriever)              │
│  5. Create BM25 index (BM25Retriever)                               │
│  6. Initialize HybridRetriever, Reranker, ResponseGenerator        │
│  7. Update Prometheus metrics (document_count, chunk_count)        │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      RAG PIPELINE CORE                               │
│                  (initialize_rag.py → RAGComponents)                │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    HYBRID RETRIEVER                           │   │
│  │              (src/retrieval/hybrid_retriever.py)              │   │
│  │                                                               │   │
│  │  ┌─────────────────────────┐   ┌───────────────────────────┐ │   │
│  │  │  VECTOR RETRIEVER       │   │     BM25 RETRIEVER        │ │   │
│  │  │  (vector_retriever.py)  │   │  (bm25_retriever.py)      │ │   │
│  │  │                         │   │                           │ │   │
│  │  │ FAISS IndexFlatIP       │   │ BM25Okapi algorithm       │ │   │
│  │  │ nomic-ai/nomic-embed-   │   │ rank_bm25 library         │ │   │
│  │  │ text-v1.5 (768-dim)     │   │ Tokenization: split()     │ │   │
│  │  │                         │   │                           │ │   │
│  │  │ Device: Auto (MPS/CUDA) │   │ Cache: cache/bm25/        │ │   │
│  │  │ Batch: 32 documents     │   │ Scoring: TF-IDF based     │ │   │
│  │  │ Cache: cache/embeddings_│   │ Normalization: [0,1]      │ │   │
│  │  │        direct/          │   │                           │ │   │
│  │  │ Normalization: L2       │   │                           │ │   │
│  │  │ Score: Cosine similarity│   │                           │ │   │
│  │  │                         │   │                           │ │   │
│  │  │ Weight: 0.8 (80%)       │   │ Weight: 0.2 (20%)         │ │   │
│  │  └─────────────────────────┘   └───────────────────────────┘ │   │
│  │           │                             │                     │   │
│  │           └──────────┬──────────────────┘                     │   │
│  │                      ▼                                        │   │
│  │    Combined & Deduplicated Results                            │   │
│  │    • Retrieves: top_k × 10 from each (100 total)             │   │
│  │    • Deduplication: By document content hash                 │   │
│  │    • Score combination: (vec_score × 0.8) + (bm25_score × 0.2)│  │
│  │    • Returns: Top 100 candidates                              │   │
│  │    • Method: retrieve_with_method(query, "hybrid", 100)      │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                         │                                            │
│                         ▼                                            │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                      RERANKER                                 │   │
│  │                (src/models/reranker.py)                       │   │
│  │                                                               │   │
│  │  Model: BAAI/bge-reranker-v2-m3                              │   │
│  │  Type: Cross-encoder (AutoModelForSequenceClassification)    │   │
│  │  Device: MPS (Apple Silicon) / CUDA / CPU                    │   │
│  │  Batch size: 8 pairs                                          │   │
│  │  Max length: 512 tokens                                       │   │
│  │  Multilingual: 89 languages                                   │   │
│  │                                                               │   │
│  │  Input: 100 candidates from hybrid retriever                 │   │
│  │  Processing:                                                  │   │
│  │    for each batch of 8:                                       │   │
│  │      pairs = [[query, doc.page_content], ...]                │   │
│  │      tokens = tokenizer(pairs, padding, truncation)          │   │
│  │      scores = model(**tokens).logits                         │   │
│  │  Output: Top 2 documents (send_nb_chunks_to_llm=2)           │   │
│  │  Returns: List[RerankResult(document, score, rank)]          │   │
│  │                                                               │   │
│  │  Enabled: use_reranking=true (process_config.yaml)           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                         │                                            │
│                         ▼                                            │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                 RESPONSE GENERATOR                            │   │
│  │           (src/response/response_generator.py)                │   │
│  │                                                               │   │
│  │  Input: Query + 2 best reranked chunks                        │   │
│  │                                                               │   │
│  │  Context Preparation (_prepare_context):                     │   │
│  │    [1] Source: filename.pdf                                   │   │
│  │    <chunk.page_content>                                       │   │
│  │    [2] Source: other.pdf                                      │   │
│  │    <chunk.page_content>                                       │   │
│  │                                                               │   │
│  │  Prompt: ChatPromptTemplate with 8 instructions               │   │
│  │  LLM: Llamafile instance (localhost:8081, seed=2024)         │   │
│  │                                                               │   │
│  │  Invocation:                                                  │   │
│  │    messages = prompt.format_messages(query, context)         │   │
│  │    response = self.llm.invoke(messages)                       │   │
│  │                                                               │   │
│  │  Output: Dict{'response', 'source_documents', 'metadata'}    │   │
│  │  Error handling: Graceful fallback message                    │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    LLM SERVER (Port 8081)                            │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     LLAMAFILE                                 │   │
│  │         Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile          │   │
│  │                                                               │   │
│  │  Model: Mistral-Nemo-Instruct-2407 (12B parameters)          │   │
│  │  Quantization: Q5_K_M (5-bit, medium quality)                │   │
│  │  File size: ~8.5 GB                                           │   │
│  │  Context window: 128,000 tokens (~400 pages)                 │   │
│  │  Architecture: Transformer decoder                            │   │
│  │  Instruction-tuned: Yes (chat/QA optimized)                  │   │
│  │                                                               │   │
│  │  Launch command:                                              │   │
│  │  ./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile \      │   │
│  │    --server --nobrowser -ngl 999 --port 8081                 │   │
│  │                                                               │   │
│  │  API: OpenAI-compatible v1 API                                │   │
│  │  Endpoint: /v1/completions                                    │   │
│  │  Temperature: 0.7 (default)                                   │   │
│  │  Seed: 2024 (for reproducibility)                            │   │
│  │                                                               │   │
│  │  GPU Acceleration: -ngl 999 (all layers if available)        │   │
│  │  Supports: Apple Metal (MPS), CUDA, Vulkan, CPU              │   │
│  │                                                               │   │
│  │  Self-contained: Model weights + server + runtime            │   │
│  │  No dependencies: No Python, no libraries required           │   │
│  │  100% offline: No internet, no API keys needed               │   │
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

## Authentication & Authorization

RagVault implements a production-grade security system with JWT-based authentication and role-based access control (RBAC).

### Security Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION & RBAC SYSTEM                      │
│                                                                      │
│   FILES:                                                             │
│   • auth.py: Authentication logic, JWT handling, password hashing   │
│   • rbac.py: Role-based access control, permission enforcement      │
│                                                                      │
│   ─────────────────────────────────────────────────────────────     │
│                                                                      │
│   JWT (JSON Web Tokens):                                             │
│   • Library: python-jose[cryptography]                              │
│   • Algorithm: HS256                                                 │
│   • Secret key: Configurable (change in production!)                │
│   • Token expiry: 480 minutes (8 hours)                             │
│   • Payload: {'sub': username, 'role': role, 'exp': timestamp}     │
│                                                                      │
│   PASSWORD HASHING:                                                  │
│   • Library: passlib with bcrypt                                    │
│   • Scheme: bcrypt (adaptive hashing with salt)                     │
│   • Verification: Constant-time comparison                          │
│                                                                      │
│   ─────────────────────────────────────────────────────────────     │
│                                                                      │
│   ROLES:                                                             │
│   1. admin: Full access to all endpoints                            │
│      • Can upload/delete documents                                  │
│      • Can refresh indices, clear data                               │
│      • Can view metrics, stats, query history                       │
│      • Can query documents                                           │
│                                                                      │
│   2. user: Limited to querying documents                            │
│      • Can query documents                                           │
│      • Cannot modify system or view admin data                      │
│                                                                      │
│   DEFAULT USERS (for demo - change in production!):                │
│   • admin / admin123 (ADMIN role)                                   │
│   • user / user123 (USER role)                                      │
│                                                                      │
│   ─────────────────────────────────────────────────────────────     │
│                                                                      │
│   AUTHENTICATION FLOW:                                               │
│                                                                      │
│   1. LOGIN:                                                          │
│      POST /login                                                     │
│      Body: {"username": "admin", "password": "admin123"}            │
│             │                                                        │
│             ▼                                                        │
│      authenticate_user() → Verify password hash                     │
│             │                                                        │
│             ▼                                                        │
│      create_access_token() → Generate JWT                           │
│             │                                                        │
│             ▼                                                        │
│      Return: {                                                       │
│        "access_token": "eyJhbGc...",                                │
│        "token_type": "bearer",                                       │
│        "role": "admin",                                              │
│        "username": "admin",                                          │
│        "name": "Administrator"                                       │
│      }                                                               │
│                                                                      │
│   2. PROTECTED ENDPOINT ACCESS:                                      │
│      Request: GET /stats                                             │
│      Headers: Authorization: Bearer eyJhbGc...                       │
│             │                                                        │
│             ▼                                                        │
│      HTTPBearer extracts token from header                          │
│             │                                                        │
│             ▼                                                        │
│      decode_token() → Validate signature & expiry                   │
│             │                                                        │
│             ▼                                                        │
│      get_user() → Retrieve user from database                       │
│             │                                                        │
│             ▼                                                        │
│      RoleRequired checks if user.role in allowed_roles              │
│             │                                                        │
│             ├─► PASS → Execute endpoint                             │
│             └─► FAIL → 403 Forbidden                                │
│                                                                      │
│   ─────────────────────────────────────────────────────────────     │
│                                                                      │
│   ENDPOINT PROTECTION PATTERNS:                                      │
│                                                                      │
│   PUBLIC (no authentication):                                        │
│   @app.post("/login")                                                │
│   @app.get("/health")                                                │
│                                                                      │
│   AUTHENTICATED (admin + user):                                      │
│   @app.post("/query")                                                │
│   async def query(                                                   │
│       request: QueryRequest,                                         │
│       user: UserInDB = Depends(require_any_authenticated)           │
│   ):                                                                 │
│       # Both admin and user can query                               │
│                                                                      │
│   ADMIN ONLY:                                                        │
│   @app.post("/upload")                                               │
│   async def upload_document(                                         │
│       file: UploadFile = File(...),                                 │
│       user: UserInDB = Depends(require_admin)                       │
│   ):                                                                 │
│       # Only admin can upload documents                             │
│                                                                      │
│   ─────────────────────────────────────────────────────────────     │
│                                                                      │
│   ERROR RESPONSES:                                                   │
│   • 401 Unauthorized: Missing, invalid, or expired token            │
│     {"detail": "Not authenticated"}                                 │
│                                                                      │
│   • 403 Forbidden: Valid token but insufficient permissions         │
│     {"detail": "Access denied. Required role: ['admin']"}           │
│                                                                      │
│   ─────────────────────────────────────────────────────────────     │
│                                                                      │
│   CODE IMPLEMENTATION:                                               │
│                                                                      │
│   auth.py:                                                           │
│   • UserInDB: Pydantic model with username, hashed_password, role   │
│   • Token: Response model with access_token, token_type, etc.       │
│   • authenticate_user(username, password): Verify credentials       │
│   • create_access_token(data, expires_delta): Generate JWT          │
│   • decode_token(token): Validate and extract TokenData            │
│                                                                      │
│   rbac.py:                                                           │
│   • RoleRequired: Dependency class for role checking                │
│   • get_current_user(): Extract user from token                     │
│   • require_admin: Pre-configured for admin-only endpoints          │
│   • require_user: Pre-configured for user role                      │
│   • require_any_authenticated: For admin OR user endpoints          │
│                                                                      │
│   SECURITY BEST PRACTICES IMPLEMENTED:                               │
│   ✓ Bcrypt password hashing (adaptive, salted)                     │
│   ✓ JWT with expiry (prevents indefinite access)                   │
│   ✓ HTTPS recommended for production (tokens in headers)            │
│   ✓ Constant-time password comparison (timing attack resistant)    │
│   ✓ Role-based authorization (principle of least privilege)        │
│   ✓ Token validation on every protected request                     │
│                                                                      │
│   PRODUCTION RECOMMENDATIONS:                                         │
│   ⚠ Change SECRET_KEY in auth.py                                    │
│   ⚠ Change default user passwords                                   │
│   ⚠ Use environment variables for secrets                           │
│   ⚠ Enable HTTPS in production                                      │
│   ⚠ Implement token refresh mechanism for long sessions            │
│   ⚠ Add rate limiting to /login endpoint                            │
│   ⚠ Store users in database instead of in-memory dict              │
│   ⚠ Implement password complexity requirements                      │
│   ⚠ Add audit logging for all authentication events                 │
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

Every setting in RagVault and what it does (based on init_config.yaml and process_config.yaml):

### Initialization Configuration (init_config.yaml)

#### Model Settings

| Parameter | Value | What It Does | Location |
|-----------|-------|--------------|----------|
| **embedding_model_hf** | `nomic-ai/nomic-embed-text-v1.5` | HuggingFace embedding model | model.embedding_model_hf |
| **rerank_model** | `BAAI/bge-reranker-v2-m3` | Reranking transformer model | model.rerank_model |
| **device_rerank** | `mps` | Device for reranking (mps/cuda/cpu) | model.device_rerank |

#### Processing Settings

| Parameter | Value | What It Does | When to Change |
|-----------|-------|--------------|----------------|
| **chunk_size** | `2000` | Characters per chunk | Lower (1000-1500) for precise search, higher (3000-4000) for more context |
| **chunk_overlap** | `200` | Overlap between chunks | Higher (300-400) if sentences being cut off |
| **batch_size_embeddings** | `32` | Documents embedded simultaneously | Lower (16) if out of memory, higher (64) if GPU has room |
| **batch_size_reranking** | `8` | Query-doc pairs reranked per batch | Adjust based on GPU memory |
| **split_documents** | `true` | Whether to chunk documents | Keep true for long documents |

#### Chunk Headers Configuration

| Parameter | Value | What It Does |
|-----------|-------|--------------|
| **TOC_text** | `"Table of Contents"` | Identifier for TOC sections |
| **headers_to_split_on** | `[["##", "Header 2"], ...]` | Markdown headers for document splitting |
| **headers_to_split_on_for_urls** | `[["#", "Header 1"], ...]` | Headers for web content |
| **headers_keys** | `{"Header 1":"# ", ...}` | Formatting for reconstructed headers |

#### Path Configuration

| Parameter | Value | Purpose |
|-----------|-------|---------|
| **cache_dir** | `./cache` | Stores embeddings, BM25 index, chunks |
| **data_dir** | `./data` | Raw and processed data storage |
| **log_dir** | `./logs` | Application and error logs |

#### Logging Settings

| Parameter | Value | Purpose |
|-----------|-------|---------|
| **level** | `INFO` | Logging verbosity (DEBUG/INFO/WARNING/ERROR) |
| **show_progress** | `true` | Display progress bars during processing |
| **hide_http_requests** | `true` | Suppress HTTP request logs |
| **file_logging** | `true` | Write logs to files |
| **console_logging** | `true` | Print logs to console |

### Process Configuration (process_config.yaml)

#### Retrieval Settings

| Parameter | Value | What It Does | When to Change |
|-----------|-------|--------------|----------------|
| **llamafile_server_base_url** | `http://localhost:8081` | LLM server endpoint | If running Llamafile on different port |
| **top_k** | `100` | Initial retrieval count | Higher (150-200) for better recall, lower (50-75) for speed |
| **send_nb_chunks_to_llm** | `2` | Final chunks sent to LLM | Higher (3-5) for more context, lower (1) for speed |
| **bm25_weight** | `0.2` | BM25 vs vector balance (0-1) | Higher (0.3-0.4) if exact keywords critical, lower (0.1) for pure semantic |
| **use_reranking** | `true` | Enable BAAI reranker | Disable for faster (less accurate) results |
| **use_bm25** | `true` | Enable keyword search | Disable for pure semantic search |
| **use_query_expansion** | `false` | Expand queries with LLM | Enable for better retrieval of complex queries |

### Configuration Decision Flowchart

```
┌─────────────────────────────────────────────────────────────────────┐
│                  CONFIGURATION TUNING GUIDE                          │
│                                                                      │
│  SYMPTOM: Answers missing relevant information                      │
│  ────────────────────────────────────────                            │
│  Solutions:                                                          │
│  • Increase top_k from 100 to 150-200                               │
│  • Increase send_nb_chunks_to_llm from 2 to 3-5                     │
│  • Enable use_query_expansion: true                                 │
│  • Check chunk_size: smaller chunks (1500) = more precise           │
│                                                                      │
│  ─────────────────────────────────────────────────────────────      │
│                                                                      │
│  SYMPTOM: Queries too slow (>10 seconds)                            │
│  ────────────────────────────────────                                │
│  Solutions:                                                          │
│  • Decrease top_k from 100 to 50-75                                 │
│  • Set use_reranking: false (saves ~500ms)                          │
│  • Decrease send_nb_chunks_to_llm from 2 to 1                       │
│  • Decrease batch_size_embeddings if CPU-bound                      │
│  • Ensure Llamafile using GPU (-ngl 999)                            │
│                                                                      │
│  ─────────────────────────────────────────────────────────────      │
│                                                                      │
│  SYMPTOM: Missing exact keywords/acronyms                           │
│  ───────────────────────────────────────────                         │
│  Solutions:                                                          │
│  • Increase bm25_weight from 0.2 to 0.3-0.4                         │
│  • Verify use_bm25: true                                             │
│  • Check document chunking isn't splitting important terms          │
│                                                                      │
│  ─────────────────────────────────────────────────────────────      │
│                                                                      │
│  SYMPTOM: Out of memory errors                                      │
│  ──────────────────────────                                          │
│  Solutions:                                                          │
│  • Decrease batch_size_embeddings from 32 to 16                     │
│  • Decrease batch_size_reranking from 8 to 4                        │
│  • Reduce top_k from 100 to 50                                      │
│  • Clear cache: POST /refresh endpoint                              │
│  • Restart Llamafile with lower -ngl value                          │
│                                                                      │
│  ─────────────────────────────────────────────────────────────      │
│                                                                      │
│  SYMPTOM: Answers too short/lack detail                             │
│  ───────────────────────────────────────────                         │
│  Solutions:                                                          │
│  • Increase send_nb_chunks_to_llm from 2 to 3-4                     │
│  • Increase chunk_size from 2000 to 3000                            │
│  • Modify LLM prompt to request detailed answers                    │
│  • (Temperature is fixed at 0.7 in Llamafile default)              │
│                                                                      │
│  ─────────────────────────────────────────────────────────────      │
│                                                                      │
│  SYMPTOM: Chunks cutting off important context                      │
│  ──────────────────────────────────────────────                      │
│  Solutions:                                                          │
│  • Increase chunk_overlap from 200 to 300-400                       │
│  • Increase chunk_size from 2000 to 2500-3000                       │
│  • Adjust headers_to_split_on for better document structure         │
│                                                                      │
│  ─────────────────────────────────────────────────────────────      │
│                                                                      │
│  OPTIMAL DEFAULT SETTINGS (current config):                         │
│  ✓ chunk_size: 2000 (good balance)                                 │
│  ✓ chunk_overlap: 200 (sufficient for most cases)                  │
│  ✓ top_k: 100 (comprehensive retrieval)                            │
│  ✓ send_nb_chunks_to_llm: 2 (focused context)                      │
│  ✓ bm25_weight: 0.2 (semantic-focused with keyword backup)         │
│  ✓ use_reranking: true (high accuracy)                             │
│  ✓ batch_size_embeddings: 32 (GPU-optimized)                       │
│                                                                      │
│  These defaults work well for most use cases. Adjust based on:      │
│  • Document types (technical docs vs narrative)                     │
│  • Hardware capabilities (GPU memory, RAM)                          │
│  • Query complexity (simple lookups vs research questions)          │
│  • Speed vs accuracy tradeoff requirements                          │
└─────────────────────────────────────────────────────────────────────┘
```

### How to Modify Configuration

1. **Edit config files:**
   - `config/init_config.yaml` for model and processing settings
   - `config/process_config.yaml` for retrieval settings

2. **Restart the system:**
   ```bash
   # Method 1: Restart API server (picks up new config)
   pkill -f "python api_server.py"
   python api_server.py
   
   # Method 2: Call /refresh endpoint (admin only)
   curl -X POST http://localhost:8000/refresh \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

3. **Verify changes:**
   - Check `/stats` endpoint for updated parameters
   - Monitor query latency and accuracy
   - Review logs for any configuration errors

---

## Observability & Monitoring

### Performance Metrics Dashboard

RagVault includes a real-time metrics page at `/metrics` showing exactly where time is spent:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    QUERY PERFORMANCE BREAKDOWN                       │
│                                                                      │
│   TOTAL QUERY TIME: ~110 seconds (typical for your setup)          │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │ 1. Retrieval (FAISS + BM25)           389ms      0.4%     │    │
│   │    ▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    │    │
│   └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │ 2. Reranking (BGE model)            6,762ms      6.1%     │    │
│   │    ▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    │    │
│   └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │ 3. LLM Generation (Mistral)      102,826ms     93.5%      │    │
│   │    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓    │    │
│   └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│   ⚠️  LLM IS THE BOTTLENECK! (93.5% of total time)                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Why Is LLM Generation So Slow?

**Current Performance: ~100 seconds per query**

The Mistral-Nemo-12B model is running on CPU/MPS with limited GPU acceleration:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     LLM PERFORMANCE FACTORS                          │
│                                                                      │
│   WHAT'S HAPPENING:                                                  │
│   ────────────────                                                   │
│                                                                      │
│   1. Model Size: 12 billion parameters (~8.5GB file)                │
│      • Each token generation requires matrix multiplications        │
│      • Across billions of weights                                   │
│                                                                      │
│   2. Quantization: Q5_K_M (5-bit)                                   │
│      • Already compressed from full 32-bit                          │
│      • Trade-off: smaller size, slower than GPU-optimized          │
│                                                                      │
│   3. Hardware Limitation:                                            │
│      • Apple M3 (8-core CPU + 8-core GPU)                          │
│      • Llamafile uses -ngl 999 (offload to Metal/MPS)              │
│      • But M3's 8GB unified memory limits parallel processing       │
│      • No dedicated VRAM like NVIDIA GPUs                           │
│                                                                      │
│   4. Token Generation Process:                                      │
│      • Generates one token at a time (autoregressive)               │
│      • Each token depends on previous tokens                        │
│      • Cannot parallelize token generation                          │
│      • ~100 tokens = ~100 sequential forward passes                │
│                                                                      │
│   5. Context Size:                                                   │
│      • You're sending 2 document chunks + prompt                    │
│      • Larger context = more computation per token                  │
│      • 128K token window means overhead even with small prompts     │
│                                                                      │
│   ROUGH CALCULATION:                                                 │
│   • Generation: ~1 second per token (on your M3)                    │
│   • Typical response: 100-150 tokens                                │
│   • Total: 100-150 seconds per query                                │
│                                                                      │
│   This is NORMAL for local LLM inference on laptop hardware!        │
└─────────────────────────────────────────────────────────────────────┘
```

### Network vs Local Performance

**You asked: "Are we even using ngrok?"**

**Current Status: NO - You're using local network access**

```
┌─────────────────────────────────────────────────────────────────────┐
│                  CURRENT SETUP (LOCAL NETWORK)                       │
│                                                                      │
│   Your Phone                Your Computer                            │
│   ──────────                ──────────────                           │
│                                                                      │
│   http://10.0.15.40:5173 ────► Frontend (React) Port 5173          │
│              │                        │                              │
│              │                        ▼                              │
│              │                 API Server Port 8000                 │
│              │                        │                              │
│              │                        ▼                              │
│              │                 LLM Server Port 8081                 │
│              │                        │                              │
│              └────── Response ◄───────┘                              │
│                                                                      │
│   Network Path: Phone → WiFi Router → Computer                      │
│   Latency: ~1-5ms (negligible)                                      │
│   NOT using ngrok at all!                                            │
│                                                                      │
│   ─────────────────────────────────────────────────────────────     │
│                                                                      │
│   IF YOU WERE USING NGROK:                                           │
│                                                                      │
│   Your Phone (Anywhere)     Internet       Your Computer            │
│   ───────────────────       ────────       ──────────────           │
│                                                                      │
│   better-dashing-rattler... ──► ngrok.io ──► localhost:5173        │
│                                    │                                 │
│                                    ▼                                 │
│                            Adds ~50-200ms latency                    │
│                            (Still negligible vs 100s LLM time)       │
│                                                                      │
│   NGROK DOES NOT SLOW DOWN YOUR LLM!                                │
│   • It only adds network latency (~100ms typical)                   │
│   • Your 100s delay is from LLM computation, not network            │
│   • Even with ngrok: 100,100ms vs 100,000ms (0.1% difference)       │
└─────────────────────────────────────────────────────────────────────┘
```

### How to Speed Up LLM Generation

**TARGET: Reduce 100s to 10-30s**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    OPTIMIZATION STRATEGIES                           │
│                                                                      │
│   OPTION 1: Use Smaller Model (RECOMMENDED)                          │
│   ───────────────────────────────────────────────────                │
│   Switch from Mistral-Nemo-12B to a smaller model:                  │
│                                                                      │
│   • Mistral-7B-Instruct (7B params, ~4.4GB)                         │
│     Expected: 30-50s per query on M3                                │
│     Quality: Still excellent for most tasks                          │
│                                                                      │
│   • TinyLlama-1.1B (1.1B params, ~0.6GB)                            │
│     Expected: 5-10s per query on M3                                 │
│     Quality: Good for simple Q&A, may struggle with complex tasks   │
│                                                                      │
│   • Phi-3-Mini-4K (3.8B params, ~2.3GB)                             │
│     Expected: 15-25s per query on M3                                │
│     Quality: Excellent for reasoning, comparable to larger models   │
│                                                                      │
│   How to switch:                                                     │
│   1. Download new .llamafile from Mozilla HuggingFace               │
│   2. Update start command to use new file                           │
│   3. Restart LLM server                                             │
│                                                                      │
│   ─────────────────────────────────────────────────────────────     │
│                                                                      │
│   OPTION 2: Reduce Response Length                                  │
│   ────────────────────────────────────                               │
│   Add max_tokens parameter to limit output:                         │
│                                                                      │
│   In src/response/response_generator.py:                            │
│   ```python                                                          │
│   self.llm = Llamafile(                                             │
│       base_url="http://localhost:8081",                             │
│       seed=seed,                                                    │
│       max_tokens=150,  # ← Add this (default: unlimited)            │
│       temperature=0.7                                                │
│   )                                                                  │
│   ```                                                                │
│                                                                      │
│   Effect: 150 tokens ≈ 50-60s instead of 100s                       │
│   Trade-off: Shorter answers (usually fine for RAG)                 │
│                                                                      │
│   ─────────────────────────────────────────────────────────────     │
│                                                                      │
│   OPTION 3: Better GPU Utilization                                  │
│   ────────────────────────────────────                               │
│   Ensure Llamafile is using Metal properly:                         │
│                                                                      │
│   Check current usage:                                               │
│   ```bash                                                            │
│   # While query is running, check GPU usage                         │
│   sudo powermetrics --samplers gpu_power -i 1000 -n 1              │
│   ```                                                                │
│                                                                      │
│   If GPU usage is low:                                              │
│   • Llamafile might not be using Metal efficiently                  │
│   • Try different -ngl values: -ngl 32, -ngl 64                     │
│   • Check Activity Monitor > GPU History during queries             │
│                                                                      │
│   ─────────────────────────────────────────────────────────────     │
│                                                                      │
│   OPTION 4: Reduce Context Sent to LLM                              │
│   ───────────────────────────────────────────                        │
│   Currently sending 2 chunks (send_nb_chunks_to_llm: 2)             │
│                                                                      │
│   Try sending just 1 chunk:                                          │
│   Edit process_config.yaml:                                         │
│   ```yaml                                                            │
│   retrieval:                                                         │
│     send_nb_chunks_to_llm: 1  # ← Change from 2 to 1               │
│   ```                                                                │
│                                                                      │
│   Effect: Slightly faster, but may reduce answer quality            │
│                                                                      │
│   ─────────────────────────────────────────────────────────────     │
│                                                                      │
│   OPTION 5: Use Cloud GPU (NOT OFFLINE)                             │
│   ───────────────────────────────────────────────                    │
│   If you don't need offline:                                         │
│   • Groq API: ~1-2s per query (extremely fast)                      │
│   • OpenAI GPT-3.5: ~3-5s per query                                 │
│   • Together.ai: ~2-4s per query                                    │
│                                                                      │
│   Trade-off: Loses privacy and offline capability                   │
│                                                                      │
│   ─────────────────────────────────────────────────────────────     │
│                                                                      │
│   RECOMMENDED QUICK FIX:                                             │
│   ═══════════════════════                                            │
│   1. Add max_tokens=150 to ResponseGenerator                        │
│   2. Consider switching to Mistral-7B or Phi-3-Mini                 │
│   3. Keep send_nb_chunks_to_llm at 2 (quality > speed)              │
│                                                                      │
│   Expected improvement: 100s → 30-40s                                │
└─────────────────────────────────────────────────────────────────────┘
```

### Performance Comparison Table

| Setup | Hardware | Retrieval | Rerank | LLM Gen | Total | Notes |
|-------|----------|-----------|--------|---------|-------|-------|
| **Current (Mistral-12B)** | M3 MacBook Air | 389ms | 6.7s | 103s | **110s** | What you have now |
| Mistral-12B + max_tokens | M3 MacBook Air | 389ms | 6.7s | 50s | 57s | Quick fix |
| Mistral-7B | M3 MacBook Air | 389ms | 6.7s | 35s | 42s | Smaller model |
| Phi-3-Mini-4K | M3 MacBook Air | 389ms | 6.7s | 20s | 27s | Best balance |
| TinyLlama-1.1B | M3 MacBook Air | 389ms | 6.7s | 8s | 15s | Fastest, lower quality |
| Mistral-12B | M3 Pro (12-core GPU) | 389ms | 6.7s | 40s | 47s | Better Mac |
| Mistral-12B | RTX 4090 | 389ms | 6.7s | 3s | 10s | Desktop GPU |
| Cloud API (Groq) | Any | 389ms | 6.7s | 2s | 9s | Not offline |

### Real-World Performance Expectations

```
┌─────────────────────────────────────────────────────────────────────┐
│           WHAT'S REALISTIC ON LAPTOP HARDWARE?                       │
│                                                                      │
│   Apple M3 MacBook Air (Your Hardware):                             │
│   ───────────────────────────────────────────                        │
│   • 8-core CPU, 8-core GPU, 16GB unified memory                     │
│   • No dedicated VRAM (shares with system RAM)                      │
│   • Good for: Daily use, light ML workloads                         │
│   • Not optimized for: Heavy LLM inference                          │
│                                                                      │
│   Expected Performance:                                              │
│   • Mistral-7B: 30-50s per query (acceptable)                       │
│   • Mistral-12B: 60-120s per query (slow but works)                 │
│   • Larger models (13B+): 2-5 minutes (impractical)                 │
│                                                                      │
│   ─────────────────────────────────────────────────────────────     │
│                                                                      │
│   For Faster Inference, You'd Need:                                 │
│   ────────────────────────────────────                               │
│   • Apple M3 Pro/Max (14-16 core GPU): 2-3x faster                  │
│   • Desktop NVIDIA GPU (RTX 3080+): 10-20x faster                   │
│   • Server GPUs (A100/H100): 50-100x faster                         │
│   • Cloud APIs: Instant (but not offline/private)                   │
│                                                                      │
│   ─────────────────────────────────────────────────────────────     │
│                                                                      │
│   THE PRIVACY/SPEED TRADE-OFF:                                       │
│   ────────────────────────────────                                   │
│                                                                      │
│   Offline (Current):        Cloud APIs:                             │
│   • 100% private           • Data leaves your computer              │
│   • 100% offline           • Requires internet                      │
│   • Slow (60-120s)         • Fast (2-5s)                           │
│   • Free after setup       • Pay per query                          │
│   • Limited by hardware    • Unlimited scale                        │
│                                                                      │
│   You chose privacy → slower is expected and normal!                │
└─────────────────────────────────────────────────────────────────────┘
```

### Monitoring Tools

**Check real-time performance:**

1. **Metrics Dashboard**: `http://localhost:5173/metrics`
   - Query lifecycle breakdown
   - Retrieval, rerank, LLM times
   - Updated after each query

2. **System Monitor**:
   ```bash
   # CPU/GPU usage while query runs
   top
   
   # GPU usage (macOS)
   sudo powermetrics --samplers gpu_power
   ```

3. **Llamafile Logs**:
   - Terminal 1 shows token generation in real-time
   - Look for "generated X tokens in Y seconds"

4. **API Logs**:
   - Terminal 2 shows request/response times
   - Look for "Query processing took X seconds"

---

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



