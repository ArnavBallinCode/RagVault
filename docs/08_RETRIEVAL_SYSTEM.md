# 08. Retrieval System

> Deep dive into BM25, vector search, and hybrid retrieval

---

## Overview

The retrieval system finds relevant documents using two complementary approaches:

| Method | Type | Best For |
|--------|------|----------|
| **BM25** | Lexical (keyword) | Exact terms, IDs, names |
| **Vector** | Semantic | Concepts, paraphrases, synonyms |
| **Hybrid** | Combined | Best overall accuracy |

---

## BM25 Algorithm

### What is BM25?

BM25 (Best Matching 25) is a probabilistic ranking function based on term frequency.

### The Formula

```
For query Q with terms q₁, q₂, ..., qₙ
For document D:

                     n
score(D, Q) = Σ   IDF(qᵢ) × f(qᵢ,D) × (k₁ + 1)
                   i=1      ────────────────────────────
                            f(qᵢ,D) + k₁ × (1 - b + b × |D|/avgdl)

Where:
• IDF(qᵢ) = log((N - n(qᵢ) + 0.5) / (n(qᵢ) + 0.5) + 1)
• f(qᵢ,D) = frequency of term qᵢ in document D
• |D| = length of document D (in words)
• avgdl = average document length in corpus
• N = total number of documents
• n(qᵢ) = number of documents containing qᵢ
• k₁ = 1.5 (term frequency saturation parameter)
• b = 0.75 (length normalization parameter)
```

### Step-by-Step Example

```
Query: "Matter DAC certificate"
Corpus: 248 documents, avgdl = 300 words

Document D: "The Matter Device Attestation Certificate (DAC) is used for..."
|D| = 250 words

Term frequencies in D:
• "matter": 3
• "dac": 2  
• "certificate": 4

Calculate IDF for each term:
• IDF("matter") = log((248 - 45 + 0.5)/(45 + 0.5) + 1) = 1.82
• IDF("dac") = log((248 - 12 + 0.5)/(12 + 0.5) + 1) = 3.01
• IDF("certificate") = log((248 - 89 + 0.5)/(89 + 0.5) + 1) = 1.12

Calculate BM25 for each term:
• BM25("matter") = 1.82 × (3 × 2.5)/(3 + 1.5 × (1 - 0.75 + 0.75 × 250/300))
                 = 1.82 × 7.5/4.69 = 2.91

• BM25("dac") = 3.01 × (2 × 2.5)/(2 + 1.5 × 1.125) = 3.01 × 5/3.69 = 4.08

• BM25("certificate") = 1.12 × (4 × 2.5)/(4 + 1.69) = 1.12 × 10/5.69 = 1.97

Total score(D, Q) = 2.91 + 4.08 + 1.97 = 8.96
```

### BM25 Implementation

```python
class BM25Retriever:
    def __init__(self, config: dict):
        self.k1 = 1.5
        self.b = 0.75
        self.bm25 = None
        self.documents = None
        
    def create_index(self, chunks: List[Document]):
        """Build BM25 index from document chunks"""
        # Tokenize documents
        tokenized = [self._tokenize(doc.page_content) for doc in chunks]
        
        # Initialize BM25
        self.bm25 = BM25Okapi(tokenized, k1=self.k1, b=self.b)
        self.documents = chunks
        
    def retrieve(self, query: str, top_k: int) -> Tuple[List[Document], List[float]]:
        """Search using BM25"""
        # Tokenize query
        query_tokens = self._tokenize(query)
        
        # Get scores for all documents
        scores = self.bm25.get_scores(query_tokens)
        
        # Get top-k indices
        top_indices = np.argsort(scores)[::-1][:top_k]
        
        return (
            [self.documents[i] for i in top_indices],
            [scores[i] for i in top_indices]
        )
    
    def _tokenize(self, text: str) -> List[str]:
        """Simple tokenization"""
        return text.lower().split()
```

---

## Vector Search

### Embedding Model

| Property | Value |
|----------|-------|
| **Model** | nomic-ai/nomic-embed-text-v1.5 |
| **Dimensions** | 768 |
| **Max Tokens** | 8192 |
| **Type** | Sentence Transformer |

### How Embeddings Work

```
Text → Token IDs → Transformer → [CLS] Token → 768-dim Vector

┌─────────────────────────────────────────────────────────────────┐
│  Input: "What is the Matter protocol?"                          │
│                                                                  │
│  Tokenization:                                                   │
│  ["What", "is", "the", "Matter", "protocol", "?"]               │
│  [101, 2054, 2003, 1996, 3043, 8778, 102]                       │
│                                                                  │
│  Transformer Processing:                                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Token Embeddings + Position Embeddings                    │  │
│  │           ↓                                                │  │
│  │  12 Transformer Layers                                     │  │
│  │  (Self-Attention + Feed-Forward)                          │  │
│  │           ↓                                                │  │
│  │  Final Hidden States                                       │  │
│  │  [768-dim × 7 tokens]                                      │  │
│  │           ↓                                                │  │
│  │  Mean Pooling                                              │  │
│  │  [768-dim single vector]                                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Output: [0.023, -0.156, 0.892, ..., 0.445]                    │
│          (768 floating-point numbers)                           │
└─────────────────────────────────────────────────────────────────┘
```

### FAISS Index

FAISS (Facebook AI Similarity Search) provides efficient similarity search.

```python
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

class VectorRetriever:
    def __init__(self, config: dict):
        self.embedding_model = HuggingFaceEmbeddings(
            model_name="nomic-ai/nomic-embed-text-v1.5",
            model_kwargs={'trust_remote_code': True}
        )
        self.vectorstore = None
        
    def create_vectorstore(self, chunks: List[Document]):
        """Create FAISS index from chunks"""
        self.vectorstore = FAISS.from_documents(
            documents=chunks,
            embedding=self.embedding_model
        )
        
    def retrieve(self, query: str, top_k: int) -> Tuple[List[Document], List[float]]:
        """Search by vector similarity"""
        results = self.vectorstore.similarity_search_with_score(query, k=top_k)
        
        documents = [doc for doc, score in results]
        # Convert distance to similarity (FAISS uses L2 distance)
        scores = [1 / (1 + score) for doc, score in results]
        
        return documents, scores
```

### Similarity Metrics

```
Cosine Similarity:
                    A · B
similarity(A,B) = ─────────
                  ||A|| ||B||

• Range: -1 to 1
• 1 = identical direction
• 0 = orthogonal (unrelated)
• -1 = opposite direction

Example:
Query:  [0.5, 0.5, 0.0]
Doc 1:  [0.4, 0.6, 0.0]  → similarity = 0.98 (very similar)
Doc 2:  [0.0, 0.0, 1.0]  → similarity = 0.00 (unrelated)
Doc 3:  [-0.5, -0.5, 0.0] → similarity = -1.0 (opposite)
```

---

## Hybrid Retrieval

### Why Hybrid?

| Query | BM25 Result | Vector Result | Best |
|-------|-------------|---------------|------|
| "DAC certificate" | ✅ Exact match | ❌ Might miss | BM25 |
| "device authentication proof" | ❌ No keyword match | ✅ Semantic match | Vector |
| "Matter DAC validation" | ✅ Partial match | ✅ Semantic match | Both |

### Score Fusion

```python
class HybridRetriever:
    def __init__(self, config: dict):
        self.bm25_weight = 0.2   # 20%
        self.vector_weight = 0.8  # 80%
        
    def retrieve(self, query: str, top_k: int) -> List[RetrievalResult]:
        # Get results from both methods
        bm25_docs, bm25_scores = self.bm25_retriever.retrieve(query, top_k * 10)
        vector_docs, vector_scores = self.vector_retriever.retrieve(query, top_k * 10)
        
        # Normalize scores to [0, 1]
        bm25_scores = self._normalize(bm25_scores)
        vector_scores = self._normalize(vector_scores)
        
        # Combine with weights
        combined = {}
        for doc, score in zip(bm25_docs, bm25_scores):
            key = doc.page_content
            combined[key] = RetrievalResult(
                document=doc,
                score=score * self.bm25_weight,
                source='bm25'
            )
        
        for doc, score in zip(vector_docs, vector_scores):
            key = doc.page_content
            if key in combined:
                # Found by both - add vector score
                combined[key].score += score * self.vector_weight
                combined[key].source = 'hybrid'
            else:
                combined[key] = RetrievalResult(
                    document=doc,
                    score=score * self.vector_weight,
                    source='vector'
                )
        
        # Sort by combined score
        results = sorted(combined.values(), key=lambda x: x.score, reverse=True)
        return results[:top_k]
```

### Fusion Visualization

```
Query: "Matter device attestation certificate"

BM25 Results (weight=0.2):
┌────────────────────────────────────────────────────────────────┐
│  Rank  Document                              BM25 Score        │
│  1     "The DAC is a X.509 certificate..."   0.89 → 0.178     │
│  2     "Matter certification process..."     0.76 → 0.152     │
│  3     "Certificate chain validation..."     0.54 → 0.108     │
└────────────────────────────────────────────────────────────────┘

Vector Results (weight=0.8):
┌────────────────────────────────────────────────────────────────┐
│  Rank  Document                              Vector Score      │
│  1     "The DAC is a X.509 certificate..."   0.92 → 0.736     │
│  2     "Device authentication in Matter..."  0.88 → 0.704     │
│  3     "Matter certification process..."     0.85 → 0.680     │
└────────────────────────────────────────────────────────────────┘

Combined Results:
┌────────────────────────────────────────────────────────────────┐
│  Rank  Document                              Combined  Source  │
│  1     "The DAC is a X.509 certificate..."   0.914    hybrid  │ ← Both found
│  2     "Matter certification process..."     0.832    hybrid  │ ← Both found
│  3     "Device authentication in Matter..."  0.704    vector  │ ← Vector only
│  4     "Certificate chain validation..."     0.108    bm25    │ ← BM25 only
└────────────────────────────────────────────────────────────────┘
```

---

## Result Data Structure

```python
@dataclass
class RetrievalResult:
    document: Document      # The LangChain document
    score: float           # Combined relevance score [0-1]
    source: str            # 'bm25', 'vector', or 'hybrid'
```

### Usage

```python
results = hybrid_retriever.retrieve("What is DAC?", top_k=10)

for result in results:
    print(f"Score: {result.score:.3f}")
    print(f"Source: {result.source}")
    print(f"Content: {result.document.page_content[:100]}...")
    print(f"File: {result.document.metadata['source']}")
    print("---")
```

---

## Index Persistence

### Saving Indexes

```python
# Save FAISS index
vectorstore.save_local("cache/faiss_index")

# Save BM25 index
with open("cache/bm25_index.pkl", "wb") as f:
    pickle.dump({
        'bm25': self.bm25,
        'documents': self.documents
    }, f)
```

### Loading Indexes

```python
# Load FAISS
vectorstore = FAISS.load_local(
    "cache/faiss_index",
    embeddings=self.embedding_model,
    allow_dangerous_deserialization=True
)

# Load BM25
with open("cache/bm25_index.pkl", "rb") as f:
    data = pickle.load(f)
    self.bm25 = data['bm25']
    self.documents = data['documents']
```

---

## Performance Optimization

### Batch Embedding

```python
# Instead of embedding one at a time
for chunk in chunks:
    embedding = model.encode(chunk.page_content)

# Batch for efficiency
batch_size = 32
for i in range(0, len(chunks), batch_size):
    batch = chunks[i:i+batch_size]
    texts = [c.page_content for c in batch]
    embeddings = model.encode(texts)  # GPU accelerated
```

### FAISS Index Types

| Index Type | Speed | Memory | Use Case |
|------------|-------|--------|----------|
| `IndexFlatL2` | Slowest | Lowest | <10k docs |
| `IndexIVFFlat` | Fast | Medium | 10k-1M docs |
| `IndexIVFPQ` | Fastest | Highest | >1M docs |

```python
# For larger datasets, use IVF
import faiss

# Create IVF index with 100 clusters
quantizer = faiss.IndexFlatL2(768)
index = faiss.IndexIVFFlat(quantizer, 768, 100)
index.train(embeddings)  # Train on sample
index.add(embeddings)    # Add all vectors
```

---

## Configuration

### process_config.yaml

```yaml
retrieval:
  # Weights for hybrid fusion
  bm25_weight: 0.2          # 20% BM25, 80% vector
  
  # Retrieval depth
  top_k: 100                # Candidates before reranking
  
  # Enable/disable methods
  use_bm25: true
  use_vector: true
  use_reranking: true
  
  # After reranking, send this many to LLM
  send_nb_chunks_to_llm: 2
```

---

## Next: Configuration →

See [09_CONFIGURATION.md](./09_CONFIGURATION.md) for all config options.

---

*Author: Arnav Angarkar*
