# 05. RAG Pipeline

> Complete end-to-end flow from user query to generated answer

---

## Pipeline Overview

The RAG (Retrieval-Augmented Generation) pipeline consists of 7 stages:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RAG PIPELINE                                       │
│                                                                              │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│  │ 1.INPUT │───▶│2.RETRIEV│───▶│3.RERANK │───▶│4.CONTEXT│───▶│5.GENERAT│   │
│  │         │    │         │    │         │    │         │    │         │   │
│  │ Query   │    │ BM25 +  │    │ Neural  │    │ Top-K   │    │ LLM     │   │
│  │         │    │ Vector  │    │ Scoring │    │ Select  │    │ Answer  │   │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Stage 1: Query Input

**What happens:** User types a natural language question.

```
USER INPUT
    │
    │  "What is the subject key identifier in Matter DAC?"
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  Query Processing                                                │
│                                                                  │
│  1. Receive query string                                        │
│  2. Validate not empty                                          │
│  3. (Optional) Query expansion via LLM                          │
│                                                                  │
│  Input:  "What is the subject key identifier in Matter DAC?"    │
│  Output: "What is the subject key identifier in Matter DAC?"    │
│          (unchanged, or expanded if enabled)                    │
└─────────────────────────────────────────────────────────────────┘
```

### Code Path

```python
# streamlit_app.py
query = st.chat_input("Ask a question about your documents...")

if query:
    # Optional: Query expansion
    if config.get("use_query_expansion"):
        query = response_generator.expand_query(query)
```

---

## Stage 2: Hybrid Retrieval

**What happens:** Find candidate documents using BM25 + Vector search.

### Step 2a: BM25 Search

```
Query: "What is the subject key identifier in Matter DAC?"
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  BM25 RETRIEVAL                                                  │
│                                                                  │
│  1. TOKENIZE query                                               │
│     ["what", "is", "the", "subject", "key", "identifier",       │
│      "in", "matter", "dac"]                                      │
│                                                                  │
│  2. LOOKUP each token in inverted index                         │
│     "subject" → [chunk_23, chunk_45, chunk_102]                 │
│     "key"     → [chunk_23, chunk_45, chunk_67, chunk_102]       │
│     "dac"     → [chunk_23, chunk_45]                            │
│                                                                  │
│  3. SCORE each document using BM25 formula                      │
│     chunk_23: 0.89                                               │
│     chunk_45: 0.76                                               │
│     chunk_102: 0.54                                              │
│     ...                                                          │
│                                                                  │
│  4. RETURN top-100 by score                                     │
│     [(chunk_23, 0.89), (chunk_45, 0.76), ...]                   │
└─────────────────────────────────────────────────────────────────┘
```

### Step 2b: Vector Search

```
Query: "What is the subject key identifier in Matter DAC?"
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  VECTOR RETRIEVAL                                                │
│                                                                  │
│  1. EMBED query using nomic-embed-text-v1.5                     │
│     [0.023, -0.156, 0.892, ..., 0.445]  (768 dimensions)        │
│                                                                  │
│  2. SEARCH FAISS index for similar vectors                      │
│     ┌─────────────────────────────────────────────────────┐     │
│     │  Query Vector                                        │     │
│     │       ↓                                              │     │
│     │  Calculate cosine similarity with all 248 chunks     │     │
│     │       ↓                                              │     │
│     │  Return top-100 most similar                         │     │
│     └─────────────────────────────────────────────────────┘     │
│                                                                  │
│  3. RETURN top-100 by similarity                                │
│     [(chunk_23, 0.92), (chunk_12, 0.88), ...]                   │
└─────────────────────────────────────────────────────────────────┘
```

### Step 2c: Score Fusion

```
┌─────────────────────────────────────────────────────────────────┐
│  HYBRID SCORE FUSION                                             │
│                                                                  │
│  BM25 Results:            Vector Results:                        │
│  chunk_23: 0.89           chunk_23: 0.92                        │
│  chunk_45: 0.76           chunk_12: 0.88                        │
│  chunk_102: 0.54          chunk_45: 0.85                        │
│  chunk_78: 0.51           chunk_7: 0.82                         │
│                                                                  │
│  Fusion Formula:                                                 │
│  final_score = (bm25_score × 0.2) + (vector_score × 0.8)        │
│                                                                  │
│  Combined Results:                                               │
│  chunk_23: (0.89 × 0.2) + (0.92 × 0.8) = 0.914  [HYBRID]       │
│  chunk_12: (0.00 × 0.2) + (0.88 × 0.8) = 0.704  [VECTOR]       │
│  chunk_45: (0.76 × 0.2) + (0.85 × 0.8) = 0.832  [HYBRID]       │
│  chunk_7:  (0.00 × 0.2) + (0.82 × 0.8) = 0.656  [VECTOR]       │
│  chunk_102:(0.54 × 0.2) + (0.00 × 0.8) = 0.108  [BM25]         │
│                                                                  │
│  Sorted Output: [chunk_23, chunk_45, chunk_12, ...]             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stage 3: Neural Reranking

**What happens:** Score each candidate with cross-encoder for relevance.

```
Input: 100 candidate documents from hybrid retrieval
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  NEURAL RERANKING (bge-reranker-v2-m3)                          │
│                                                                  │
│  For each document:                                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                                                           │   │
│  │  Input Format:                                            │   │
│  │  "[CLS] What is subject key identifier? [SEP] The DAC    │   │
│  │   certificate contains the subject key identifier which  │   │
│  │   is derived from the public key... [SEP]"               │   │
│  │                                                           │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │          TRANSFORMER ENCODER                        │ │   │
│  │  │          (12 layers, 768 hidden)                    │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  │                          │                                │   │
│  │                          ▼                                │   │
│  │  Output: Relevance Score = 0.9523                        │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Processing:                                                     │
│  - Batch size: 8                                                 │
│  - Max length: 512 tokens (truncated if longer)                 │
│  - Device: MPS (Mac) / CUDA (NVIDIA) / CPU                      │
│                                                                  │
│  Results:                                                        │
│  chunk_23:  0.9523  ← Rank 1                                    │
│  chunk_45:  0.8912  ← Rank 2                                    │
│  chunk_12:  0.7234                                               │
│  chunk_7:   0.6891                                               │
│  ...                                                             │
│  chunk_102: 0.1234  ← Rank 100                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Why Reranking?

| Retrieval | Reranking |
|-----------|-----------|
| **Fast but approximate** | **Slow but accurate** |
| Encodes query/doc separately | Encodes query+doc together |
| No cross-attention | Full cross-attention |
| Good for candidate generation | Good for final selection |

---

## Stage 4: Context Selection

**What happens:** Select top-K documents for LLM context.

```
Input: Reranked documents with scores
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  CONTEXT SELECTION                                               │
│                                                                  │
│  Config: send_nb_chunks_to_llm = 2                              │
│                                                                  │
│  Select top-2 reranked documents:                               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  CHUNK 1 (score: 0.9523)                                  │   │
│  │  Source: data/raw/matter_spec.pdf                         │   │
│  │  Content:                                                 │   │
│  │  "The Device Attestation Certificate (DAC) contains       │   │
│  │   the Subject Key Identifier (SKI) field which is        │   │
│  │   derived from the device's public key using SHA-1..."   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  CHUNK 2 (score: 0.8912)                                  │   │
│  │  Source: data/raw/security_notes.txt                      │   │
│  │  Content:                                                 │   │
│  │  "The certificate chain validation process checks        │   │
│  │   the Subject Key Identifier against the Authority Key   │   │
│  │   Identifier of the issuing certificate..."              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Context Formatting

```python
def _prepare_context(chunks: List[Document]) -> str:
    parts = []
    for i, chunk in enumerate(chunks, 1):
        source = chunk.metadata.get('source', 'Unknown')
        parts.append(f"[{i}] Source: {source}\n{chunk.page_content}")
    return "\n\n".join(parts)
```

Output:
```
[1] Source: data/raw/matter_spec.pdf
The Device Attestation Certificate (DAC) contains the Subject Key
Identifier (SKI) field which is derived from the device's public key...

[2] Source: data/raw/security_notes.txt
The certificate chain validation process checks the Subject Key
Identifier against the Authority Key Identifier...
```

---

## Stage 5: Prompt Assembly

**What happens:** Combine query + context into LLM prompt.

```
┌─────────────────────────────────────────────────────────────────┐
│  PROMPT ASSEMBLY                                                 │
│                                                                  │
│  Template:                                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  You are an efficient Q&A assistant that responds to      │   │
│  │  user queries based on provided context.                  │   │
│  │                                                           │   │
│  │  Question: {query}                                        │   │
│  │                                                           │   │
│  │  Relevant Information:                                    │   │
│  │  {context}                                                │   │
│  │                                                           │   │
│  │  Please provide a response that:                          │   │
│  │  1. Directly addresses the question                       │   │
│  │  2. Is supported by the provided information              │   │
│  │  3. Is clear and well-organized                          │   │
│  │  ...                                                      │   │
│  │                                                           │   │
│  │  Response:                                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Filled Template:                                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  You are an efficient Q&A assistant...                    │   │
│  │                                                           │   │
│  │  Question: What is the subject key identifier in         │   │
│  │            Matter DAC?                                    │   │
│  │                                                           │   │
│  │  Relevant Information:                                    │   │
│  │  [1] Source: data/raw/matter_spec.pdf                     │   │
│  │  The Device Attestation Certificate (DAC) contains...    │   │
│  │                                                           │   │
│  │  [2] Source: data/raw/security_notes.txt                  │   │
│  │  The certificate chain validation process checks...       │   │
│  │                                                           │   │
│  │  Please provide a response that:                          │   │
│  │  1. Directly addresses the question                       │   │
│  │  ...                                                      │   │
│  │                                                           │   │
│  │  Response:                                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stage 6: LLM Generation

**What happens:** LLM generates answer based on prompt.

```
Assembled Prompt
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  LLM GENERATION (Mistral-Nemo-12B)                              │
│                                                                  │
│  1. TOKENIZE prompt                                              │
│     ~1500 tokens (query + context + template)                   │
│                                                                  │
│  2. GENERATE tokens autoregressively                            │
│     ┌────────────────────────────────────────────────────────┐  │
│     │  Token 1: "The"                                         │  │
│     │  Token 2: "Subject"                                     │  │
│     │  Token 3: "Key"                                         │  │
│     │  Token 4: "Identifier"                                  │  │
│     │  ...                                                    │  │
│     │  Token N: [EOS]                                         │  │
│     └────────────────────────────────────────────────────────┘  │
│                                                                  │
│  3. DECODE tokens to text                                        │
│                                                                  │
│  Output:                                                         │
│  "The Subject Key Identifier (SKI) in a Matter Device           │
│   Attestation Certificate (DAC) is a cryptographic identifier   │
│   derived from the device's public key using SHA-1 hashing.     │
│   It enables certificate chain validation by matching the SKI   │
│   with the Authority Key Identifier in issuing certificates."   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Generation Parameters

```python
# Implicit in llamafile
temperature = 0.7      # Creativity level
n_predict = 512        # Max tokens to generate
top_p = 0.9           # Nucleus sampling
repeat_penalty = 1.1   # Avoid repetition
```

---

## Stage 7: Response Formatting

**What happens:** Package response with metadata for display.

```
LLM Output + Metadata
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  RESPONSE FORMATTING                                             │
│                                                                  │
│  {                                                               │
│    "response": "The Subject Key Identifier (SKI) in a Matter   │
│                 Device Attestation Certificate (DAC) is a       │
│                 cryptographic identifier derived from the       │
│                 device's public key using SHA-1 hashing...",    │
│                                                                  │
│    "source_documents": [                                         │
│      {"source": "data/raw/matter_spec.pdf", "score": 0.9523},   │
│      {"source": "data/raw/security_notes.txt", "score": 0.8912} │
│    ],                                                            │
│                                                                  │
│    "metadata": {                                                 │
│      "retrieval_method": "hybrid",                              │
│      "chunks_retrieved": 100,                                    │
│      "chunks_reranked": 2,                                       │
│      "generation_time": 2.34                                     │
│    }                                                             │
│  }                                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Complete Pipeline Timing

Typical timing breakdown for a single query:

| Stage | Time | Details |
|-------|------|---------|
| 1. Query Input | <1ms | String validation |
| 2a. BM25 Search | ~50ms | Token matching |
| 2b. Vector Search | ~100ms | Embedding + FAISS |
| 2c. Score Fusion | ~10ms | Merge + sort |
| 3. Reranking | ~2-5s | 100 docs × transformer |
| 4. Context Selection | <1ms | Slice top-K |
| 5. Prompt Assembly | <1ms | String formatting |
| 6. LLM Generation | ~3-8s | Token generation |
| 7. Response Formatting | <1ms | JSON packaging |
| **Total** | **~5-15s** | Depends on hardware |

### Performance Bottlenecks

```
Reranking (50% of time)
    └── Mitigation: Reduce candidates (top_k: 50 instead of 100)
    └── Mitigation: Use faster model
    └── Mitigation: GPU acceleration

LLM Generation (40% of time)
    └── Mitigation: GPU acceleration (-ngl 999)
    └── Mitigation: Shorter responses
    └── Mitigation: Smaller/faster model

Vector Search (5% of time)
    └── Mitigation: FAISS IVF index for large datasets
    └── Mitigation: Reduce embedding dimension
```

---

## Pipeline Configuration

### process_config.yaml

```yaml
retrieval:
  # LLM connection
  llamafile_server_base_url: "http://localhost:8081"
  
  # Retrieval settings
  top_k: 100                    # Candidates for reranking
  use_bm25: true
  use_vector: true
  bm25_weight: 0.2              # 20% BM25, 80% vector
  
  # Reranking
  use_reranking: true
  
  # Context selection
  send_nb_chunks_to_llm: 2      # Chunks to include in prompt
  
  # Query expansion
  use_query_expansion: false
```

---

## Error Handling in Pipeline

### Graceful Degradation

```python
# If reranking fails, fall back to hybrid scores
try:
    reranked = reranker.rerank(query, documents)
except Exception as e:
    logger.warning(f"Reranking failed: {e}, using hybrid scores")
    reranked = sorted(documents, key=lambda x: x.score, reverse=True)

# If LLM fails, return error message
try:
    response = llm.generate(prompt)
except Exception as e:
    return {
        "response": "I apologize, but I encountered an error generating a response.",
        "error": str(e)
    }
```

---

## Next: DevOps →

See [06_DEVOPS.md](./06_DEVOPS.md) for Docker deployment and infrastructure.

---

*Author: Arnav Angarkar*
