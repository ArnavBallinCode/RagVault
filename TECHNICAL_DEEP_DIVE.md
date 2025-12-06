# How RagVault Works: A Complete Technical Deep-Dive

This document explains every component of the RagVault RAG (Retrieval-Augmented Generation) system in complete detail. We will cover what happens at each step, why it happens, and how all the pieces fit together.

---

## Table of Contents

1. [The Big Picture: What is RAG?](#1-the-big-picture-what-is-rag)
2. [Phase 1: Document Ingestion](#2-phase-1-document-ingestion)
3. [Phase 2: Text Chunking](#3-phase-2-text-chunking)
4. [Phase 3: Creating Embeddings](#4-phase-3-creating-embeddings)
5. [Phase 4: Building the Vector Store](#5-phase-4-building-the-vector-store)
6. [Phase 5: Building the BM25 Index](#6-phase-5-building-the-bm25-index)
7. [Phase 6: Query Processing](#7-phase-6-query-processing)
8. [Phase 7: Hybrid Retrieval](#8-phase-7-hybrid-retrieval)
9. [Phase 8: Reranking](#9-phase-8-reranking)
10. [Phase 9: Response Generation](#10-phase-9-response-generation)
11. [The Complete Flow: Start to Finish](#11-the-complete-flow-start-to-finish)
12. [Configuration Parameters Explained](#12-configuration-parameters-explained)

---

## 1. The Big Picture: What is RAG?

### The Problem RAG Solves

Large Language Models (LLMs) like GPT or Mistral are trained on massive amounts of text from the internet. But they have two critical limitations:

1. **Knowledge Cutoff**: They only know things up to their training date
2. **No Private Knowledge**: They have never seen your company's internal documents

If you ask an LLM "What is our company's refund policy?", it cannot answer because it has never seen your policy documents.

### The RAG Solution

RAG adds a "retrieval" step before the LLM generates its answer:

```
Traditional LLM:
  Question --> LLM --> Answer (based only on training data)

RAG System:
  Question --> SEARCH YOUR DOCUMENTS --> Find Relevant Passages --> LLM + Context --> Answer
```

Think of it like this: Instead of asking someone to answer from memory, you first give them the relevant pages from a textbook, then ask them to answer based on those pages.

### The Two Phases of RAG

**Phase A: Indexing (Done Once)**
- Load all your documents
- Break them into small pieces (chunks)
- Convert each piece into a mathematical representation (embedding)
- Store everything in a searchable database

**Phase B: Querying (Done Every Time You Ask)**
- Take the user's question
- Search for the most relevant chunks
- Give those chunks + the question to the LLM
- LLM generates an answer based on the provided context

---

## 2. Phase 1: Document Ingestion

### What is Document Ingestion?

Document ingestion is the process of reading files from your computer and extracting their text content. Different file types require different extraction methods.

### How It Works in RagVault

The system uses `DataIngestion` class in `src/data/data_ingestion.py`:

```
Your Files                     Extracted Text
    |                               |
    v                               v
[report.pdf]  ---> PDF Parser ---> "The quarterly results show..."
[manual.docx] ---> DOCX Parser --> "Chapter 1: Getting Started..."  
[notes.txt]   ---> Direct Read --> "Meeting notes from Monday..."
```

### File Type Handlers

| File Type | Handler | What It Does |
|-----------|---------|--------------|
| PDF | Docling | Uses AI-powered extraction to read text, tables, and structure |
| DOCX/DOC | LibreOffice + Docling | Converts to PDF first, then extracts |
| TXT/MD | Direct Read | Reads the file directly as plain text |
| CSV | CSVLoader | Parses rows and columns into text |
| HTML | BeautifulSoup | Strips HTML tags, keeps text content |
| Code (.py, .js) | LanguageParser | Preserves code structure and syntax |

### The Document Object

After extraction, each document becomes a `Document` object with two parts:

```python
Document(
    page_content = "The actual text extracted from the file...",
    metadata = {
        "source": "/path/to/file.pdf",
        "page": 1,
        "file_type": "pdf",
        "created_date": "2024-01-15"
    }
)
```

The `metadata` is crucial because it lets us cite sources later ("This answer came from page 5 of report.pdf").

### Where This Happens in Code

```
init_cache_data.py
    |
    v
RAGInitializer.initialize()
    |
    v
DataIngestion(config)
    |
    +--> FileLoader.load(path)     # For local files
    +--> EnhancedWebLoader.load()  # For web pages
    |
    v
List[Document]  # All your documents as Document objects
```

---

## 3. Phase 2: Text Chunking

### What is Chunking?

Chunking is the process of breaking a large document into smaller pieces. This is essential because:

1. **LLMs have context limits**: Most LLMs can only process 4,000-32,000 tokens at once
2. **Precision**: Smaller chunks mean more precise retrieval (we find the exact paragraph, not the whole book)
3. **Efficiency**: Searching through small chunks is faster

### The Chunking Problem

Imagine you have a 100-page document. If you keep it as one piece:
- You cannot fit it in the LLM's context window
- If someone asks about page 50, you would retrieve all 100 pages (wasteful)

If you split it into single sentences:
- You lose context (a sentence might not make sense alone)
- You might split important information across chunks

### The Solution: Overlapping Chunks

RagVault uses "overlapping chunks" with configurable size:

```
Original Text:
"The company was founded in 1990. Initially, it focused on hardware. 
By 2000, the focus shifted to software. The software division grew rapidly.
Today, the company has 5000 employees. Most work in software development."

With chunk_size=100 and chunk_overlap=20:

Chunk 1: "The company was founded in 1990. Initially, it focused on hardware. By 2000, the..."
Chunk 2: "By 2000, the focus shifted to software. The software division grew rapidly. Today..."
Chunk 3: "Today, the company has 5000 employees. Most work in software development."
                ^^^^^^^^^^^^^^^^^^^^^^^
                This part appears in BOTH Chunk 2 and Chunk 3 (overlap)
```

The overlap ensures we do not cut off important context. If a sentence is split, it still appears complete in one of the chunks.

### Configuration Parameters

```yaml
processing:
  chunk_size: 2000      # Maximum characters per chunk
  chunk_overlap: 200    # Characters of overlap between chunks
```

**chunk_size = 2000** means each chunk will be at most 2000 characters (roughly 400-500 words).

**chunk_overlap = 200** means the last 200 characters of Chunk N will also be the first 200 characters of Chunk N+1.

### Smart Chunking: Markdown Headers

RagVault also uses "Markdown Header Splitting". When it encounters headers like:

```markdown
## Chapter 1: Introduction

This is the intro text...

## Chapter 2: Main Content

This is the main content...
```

It will:
1. First split at the `##` headers (keeping chapters together)
2. Then apply size-based splitting within each section

This preserves document structure better than blind character splitting.

### Where This Happens in Code

```
DataPreprocessor (src/data/data_preprocessing.py)
    |
    v
ModifiedMarkdownHeaderTextSplitter
    - Splits on headers: ##, ###, ####
    |
    v
RecursiveCharacterTextSplitter
    - chunk_size=2000
    - chunk_overlap=200
    |
    v
List[Document]  # Now you have many small chunks instead of few large documents
```

### Real Example

Original document: 1 PDF file with 50 pages and 25,000 words

After chunking: 248 chunks, each containing 1500-2000 characters

Each chunk is now:
- Small enough to fit in LLM context
- Large enough to contain meaningful information
- Overlapping to prevent context loss

---

## 4. Phase 3: Creating Embeddings

### What is an Embedding?

An embedding is a way to represent text as a list of numbers (a "vector"). These numbers capture the "meaning" of the text in a way that computers can compare.

Think of it like GPS coordinates:
- "Paris" might become [48.8566, 2.3522]
- "London" might become [51.5074, -0.1278]
- Similar locations have similar coordinates

For text embeddings:
- "The cat sat on the mat" might become [0.12, -0.45, 0.78, ...]
- "A feline rested on the rug" might become [0.11, -0.43, 0.80, ...]
- These are similar because the MEANING is similar

### Why We Need Embeddings

Without embeddings, searching is limited to exact keyword matching:
- Query: "How do I reset my password?"
- Document: "To change your login credentials, go to Settings..."
- Keyword search: NO MATCH (no shared words!)

With embeddings:
- Query embedding: [0.24, 0.56, -0.12, ...]
- Document embedding: [0.22, 0.58, -0.10, ...]
- Similarity: 0.95 (HIGH MATCH because meanings are similar)

### The Embedding Model

RagVault uses **Nomic Embed v1.5** (`nomic-ai/nomic-embed-text-v1.5`).

Properties:
- Input: Any text up to 2048 tokens
- Output: 768-dimensional vector (a list of 768 numbers)
- Size: ~550 MB model
- Speed: Fast on CPU, faster on GPU

### How Embedding Works

```
Input Text                          Embedding Model                      Output Vector
     |                                    |                                    |
     v                                    v                                    v
"Reset password"  -->  [Neural Network with 110M parameters]  -->  [0.24, 0.56, -0.12, ..., 0.33]
                                                                        (768 numbers)
```

The neural network has been trained on billions of text pairs to learn that:
- Similar meanings = similar vectors
- Different meanings = different vectors

### Batch Processing

Creating embeddings is computationally expensive. To speed it up, we process chunks in batches:

```yaml
processing:
  batch_size_embeddings: 32  # Process 32 chunks at once
```

With 248 chunks and batch_size=32:
- Batch 1: Chunks 1-32 --> 32 embeddings
- Batch 2: Chunks 33-64 --> 32 embeddings
- ...
- Batch 8: Chunks 225-248 --> 24 embeddings

This is faster than processing one at a time because the GPU can parallelize the work.

### GPU Acceleration

Embedding generation is done on:
- **macOS (Apple Silicon)**: MPS (Metal Performance Shaders) - Apple's GPU framework
- **Linux/Windows (NVIDIA)**: CUDA - NVIDIA's GPU framework
- **CPU fallback**: Slower but works everywhere

The code automatically detects the best available option:

```python
if torch.backends.mps.is_available():
    device = "mps"
elif torch.cuda.is_available():
    device = "cuda"
else:
    device = "cpu"
```

### Where This Happens in Code

```
VectorRetriever (src/retrieval/vector_retriever.py)
    |
    v
HuggingFaceEmbeddings(
    model_name="nomic-ai/nomic-embed-text-v1.5",
    model_kwargs={'device': 'mps'}  # or 'cuda' or 'cpu'
)
    |
    v
model.encode(["chunk1 text", "chunk2 text", ...])
    |
    v
[[0.1, 0.2, ...], [0.3, 0.4, ...], ...]  # List of 768-dim vectors
```

---

## 5. Phase 4: Building the Vector Store

### What is a Vector Store?

A vector store is a specialized database for storing and searching embeddings. Given a query embedding, it quickly finds the most similar stored embeddings.

### Why Not Use a Regular Database?

Regular databases are designed for exact matching:
- SQL: `SELECT * FROM docs WHERE content = 'password reset'`
- This only finds exact matches

Vector stores are designed for similarity matching:
- Vector query: [0.24, 0.56, ...]
- Find the 10 closest vectors (even if not exact match)

### FAISS: Our Vector Store

RagVault uses FAISS (Facebook AI Similarity Search), an industry-standard library for efficient similarity search.

Properties:
- Can handle millions of vectors
- Searches in milliseconds
- Supports GPU acceleration
- Open source and well-maintained

### How FAISS Search Works

When you search:

```
Query Vector: [0.24, 0.56, -0.12, ...]

Stored Vectors:
  Chunk 1: [0.22, 0.58, -0.10, ...]  --> Distance: 0.05 (CLOSE!)
  Chunk 2: [0.90, -0.20, 0.30, ...]  --> Distance: 0.89 (far)
  Chunk 3: [0.25, 0.54, -0.14, ...]  --> Distance: 0.04 (CLOSEST!)
  ...

Result: Return Chunk 3, Chunk 1, ... (sorted by similarity)
```

The "distance" is calculated using cosine similarity or L2 distance.

### Cosine Similarity Explained

Cosine similarity measures the angle between two vectors:
- Identical vectors: similarity = 1.0 (perfect match)
- Orthogonal vectors: similarity = 0.0 (unrelated)
- Opposite vectors: similarity = -1.0 (opposite meaning)

```
Vector A: [1, 0]     (points right)
Vector B: [1, 0]     (points right)
Similarity: 1.0      (same direction)

Vector A: [1, 0]     (points right)
Vector C: [0, 1]     (points up)  
Similarity: 0.0      (perpendicular)
```

### Building the FAISS Index

```
Step 1: Collect all chunk embeddings
  [[0.1, 0.2, ...], [0.3, 0.4, ...], ...]  # 248 vectors of 768 dimensions

Step 2: Create FAISS index
  index = faiss.IndexFlatIP(768)  # 768 = dimension size, IP = Inner Product

Step 3: Add vectors to index
  index.add(all_embeddings)

Step 4: Save to disk (cache/)
  faiss.write_index(index, "cache/faiss_index")
```

### Where This Happens in Code

```
VectorRetriever._create_direct_vectorstore()
    |
    v
FAISS.from_documents(
    documents=chunks,
    embedding=self.model_embeddings_hf
)
    |
    v
Saved to: cache/faiss_index/
```

---

## 6. Phase 5: Building the BM25 Index

### What is BM25?

BM25 (Best Matching 25) is a traditional keyword-based search algorithm. Unlike embeddings which capture "meaning", BM25 counts word occurrences.

### Why Use Both BM25 and Embeddings?

Each has strengths and weaknesses:

| Scenario | Embedding Search | BM25 Search |
|----------|-----------------|-------------|
| "password reset" vs "change credentials" | WINS (same meaning) | FAILS (different words) |
| "What is the ABC-123 error code?" | FAILS (no semantic meaning) | WINS (exact match) |
| "company policy on remote work" | GOOD | GOOD |

By combining both (hybrid search), we get the best of both worlds.

### How BM25 Works

BM25 scores documents based on:
1. **Term Frequency (TF)**: How often does the query word appear in the document?
2. **Inverse Document Frequency (IDF)**: How rare is this word across all documents?
3. **Document Length**: Normalize for document length (longer docs have more words)

```
Query: "password reset"

Document 1: "To reset your password, click the reset button."
  - "password": appears 1 time
  - "reset": appears 2 times
  - Score: HIGH

Document 2: "The company was founded in 1990."
  - "password": appears 0 times
  - "reset": appears 0 times
  - Score: ZERO
```

### IDF: Why Rare Words Matter More

| Word | Appears in X of 248 docs | IDF Score |
|------|-------------------------|-----------|
| "the" | 248 (all docs) | LOW (common, not useful) |
| "password" | 3 documents | HIGH (rare, very useful) |
| "XYZ-Error-Code" | 1 document | HIGHEST (unique identifier) |

If someone searches for "XYZ-Error-Code", that exact term is extremely valuable for finding the right document.

### Building the BM25 Index

```
Step 1: Tokenize all chunks
  Chunk 1: "Reset your password" --> ["reset", "your", "password"]
  Chunk 2: "Company history" --> ["company", "history"]

Step 2: Build vocabulary
  {"reset": [1], "your": [1], "password": [1], "company": [2], "history": [2]}

Step 3: Calculate IDF for each term
  "password" appears in 1/248 docs --> IDF = log(248/1) = 5.5

Step 4: Save index
  Stored in cache/bm25_index.pkl
```

### Where This Happens in Code

```
BM25Retriever (src/retrieval/bm25_retriever.py)
    |
    v
BM25Okapi(tokenized_corpus)
    |
    v
Saved to: cache/bm25_index.pkl
```

---

## 7. Phase 6: Query Processing

### What Happens When You Ask a Question?

When you type "How do I reset my password?" and press Enter, the following happens:

### Step 1: Query Preprocessing

The raw query text is cleaned:
```
Input:  "  How do I reset my PASSWORD?  "
Output: "How do I reset my password?"
```

### Step 2: Query Expansion (Optional)

If `use_query_expansion: true` in config, the LLM expands the query:
```
Original: "password reset"
Expanded: "How do I reset my password? How to change login credentials?"
```

This helps find documents that use different words for the same concept.

### Step 3: Query Embedding

The query is converted to an embedding using the same model as the documents:

```
Query: "How do I reset my password?"
    |
    v
Nomic Embed Model
    |
    v
Query Embedding: [0.24, 0.56, -0.12, ..., 0.33]  (768 dimensions)
```

**Critical**: We MUST use the same embedding model for queries and documents. Otherwise, the vectors would be in different "spaces" and similarity would be meaningless.

### Where This Happens in Code

```
streamlit_app.py: process_query()
    |
    v
response_generator.expand_query(query)  # Optional
    |
    v
retriever.retrieve_with_method(query, method="hybrid")
```

---

## 8. Phase 7: Hybrid Retrieval

### What is Hybrid Retrieval?

Hybrid retrieval combines the results from vector search (FAISS) and keyword search (BM25).

### Step 1: Vector Search

```
Query Embedding: [0.24, 0.56, ...]
    |
    v
FAISS.similarity_search(query_embedding, k=100)
    |
    v
Top 100 chunks by semantic similarity:
  1. Chunk 45: score=0.92
  2. Chunk 12: score=0.89
  3. Chunk 78: score=0.87
  ...
```

### Step 2: BM25 Search

```
Query: "How do I reset my password?"
    |
    v
BM25.get_scores(tokenize(query))
    |
    v
Top 100 chunks by keyword match:
  1. Chunk 23: score=8.5
  2. Chunk 45: score=7.2
  3. Chunk 91: score=6.8
  ...
```

### Step 3: Score Fusion

Now we have two ranked lists. We need to combine them:

```yaml
retrieval:
  bm25_weight: 0.2  # BM25 contributes 20%, Vector contributes 80%
```

For each chunk:
```
final_score = (vector_score * 0.8) + (normalized_bm25_score * 0.2)
```

Normalization is important because vector scores are 0-1, but BM25 scores can be any positive number.

### Step 4: Merge and Deduplicate

```
Vector Results:  [45, 12, 78, 23, ...]
BM25 Results:    [23, 45, 91, 12, ...]

Merged (by combined score): [45, 23, 12, 78, 91, ...]
```

### The top_k Parameter

```yaml
retrieval:
  top_k: 100  # Retrieve top 100 chunks from each method
```

This means:
- Vector search returns 100 chunks
- BM25 search returns 100 chunks
- After merging and deduplication: possibly 150-200 unique chunks
- These are sorted by combined score

### Where This Happens in Code

```
HybridRetriever.retrieve_with_method(query, method="hybrid")
    |
    +---> self.vector_retriever.retrieve(query, top_k=100)
    +---> self.bm25_retriever.retrieve(query, top_k=100)
    |
    v
Combine scores using bm25_weight
    |
    v
Return sorted list of RetrievalResult objects
```

---

## 9. Phase 8: Reranking

### What is Reranking?

Reranking is a second, more accurate pass over the retrieval results. The initial retrieval (FAISS + BM25) is fast but approximate. Reranking is slower but more precise.

### Why Rerank?

Initial retrieval trades accuracy for speed:
- FAISS uses approximate nearest neighbors (not guaranteed perfect)
- BM25 only looks at word overlap, not meaning

Reranking uses a powerful neural model to score query-document pairs more carefully.

### The Reranking Model

RagVault uses **BGE Reranker v2** (`BAAI/bge-reranker-v2-m3`).

This is a cross-encoder model:
- Input: [Query, Document] pair
- Output: Relevance score (0 to 1)
- Size: ~2.2 GB
- Much more accurate than embedding similarity

### Cross-Encoder vs Bi-Encoder

**Bi-Encoder (Embeddings)**:
```
Query --> Encoder --> Query Embedding
Document --> Encoder --> Doc Embedding
Compare embeddings --> Similarity score
```
- Fast: Encode once, compare many times
- Less accurate: Embeddings are computed independently

**Cross-Encoder (Reranking)**:
```
[Query + Document] --> Encoder --> Relevance Score
```
- Slow: Must encode query+document together for EACH document
- More accurate: Model sees both texts together, can capture interactions

### The Reranking Process

```
Input: 100 chunks from hybrid retrieval, sorted by initial score

Step 1: For each chunk, compute cross-encoder score
  Chunk 45: reranker.score("How reset password?", "To reset your password...") = 0.95
  Chunk 12: reranker.score("How reset password?", "Company history...") = 0.12
  ...

Step 2: Sort by reranker score (not initial score)
  New order: [45, 23, 78, ...]

Step 3: Take top N for LLM
  send_nb_chunks_to_llm: 3  --> Return top 3 chunks
```

### Batch Processing for Speed

```yaml
processing:
  batch_size_reranking: 8  # Score 8 query-document pairs at once
```

With 100 candidates and batch_size=8:
- Batch 1: Score chunks 1-8
- Batch 2: Score chunks 9-16
- ...
- Batch 13: Score chunks 97-100

### GPU Acceleration

Reranking benefits greatly from GPU:
- **CPU**: ~10 seconds for 100 chunks
- **GPU (MPS/CUDA)**: ~1-2 seconds for 100 chunks

```yaml
model:
  device_rerank: "mps"  # Options: "mps", "cuda", "cpu"
```

### Where This Happens in Code

```
Reranker (src/models/reranker.py)
    |
    v
reranker.rerank(query, documents, top_k=3)
    |
    v
For each (query, document) pair:
    score = model.predict([(query, document)])
    |
    v
Sort by score, return top_k
```

---

## 10. Phase 9: Response Generation

### What is Response Generation?

This is the final step where the LLM generates a human-readable answer based on the retrieved context.

### The LLM: Mistral Nemo 12B

RagVault uses **Mistral Nemo Instruct 12B** served via Llamafile:
- Parameters: 12 billion
- Context window: 8,192 tokens
- Quantization: Q5_K_M (5-bit, good quality/speed balance)
- Size: ~8.5 GB on disk

### GPU Offloading

The `-ngl 999` flag means "offload 999 layers to GPU". Since the model has fewer than 999 layers, this effectively means "offload everything to GPU".

```bash
# Full GPU (fastest)
./model.llamafile --server -ngl 999 --port 8081

# Partial GPU (if running out of VRAM)
./model.llamafile --server -ngl 20 --port 8081

# CPU only (slowest)
./model.llamafile --server --port 8081
```

### The Prompt Template

The system sends a carefully crafted prompt to the LLM:

```
You are an efficient Q&A assistant that responds to user queries based on provided context.
Based on the following information, please provide a clear, accurate, and comprehensive answer.
If the information is not sufficient to answer the question completely, acknowledge this.

Question: How do I reset my password?

Relevant Information:
[1] Source: user_manual.pdf
To reset your password, navigate to Settings > Account > Security. Click "Reset Password" 
and follow the email instructions.

[2] Source: faq.txt
Password resets can be done through the Settings menu or by contacting IT support at
extension 5555.

[3] Source: security_policy.pdf
All passwords must be at least 12 characters and include uppercase, lowercase, numbers,
and symbols.

Please provide a response that:
1. Directly addresses the question
2. Is supported by the provided information
3. Is clear and well-organized
4. Is as short as possible with relevant information
5. Does not mention the source of the information
6. Does not repeat the question
7. Clearly states if information is insufficient
8. Responds only in the language of the query

Response:
```

### The send_nb_chunks_to_llm Parameter

```yaml
retrieval:
  send_nb_chunks_to_llm: 3  # Send top 3 reranked chunks to LLM
```

Why only 3?
- **Context limit**: LLM can only handle ~8K tokens
- **Focus**: More chunks = more noise, potentially confusing the LLM
- **Speed**: More tokens = slower generation

With chunk_size=2000 and 3 chunks:
- ~6000 characters of context
- ~1500 tokens (roughly)
- Leaves plenty of room for the response

### Streaming Response

The LLM generates tokens one at a time. In the UI, you see the response appearing word by word:

```
To reset your password, | go to Settings | > Account | > Security...
      ^                        ^                ^
   Token 1                 Token 2          Token 3
```

### Where This Happens in Code

```
ResponseGenerator (src/response/response_generator.py)
    |
    v
generate_answer(query, relevant_docs, metadata)
    |
    v
1. _prepare_context(relevant_docs)
   --> "[1] Source: file.pdf\nContent..."
    |
    v
2. ChatPromptTemplate.from_template(prompt)
   --> "You are an efficient Q&A assistant..."
    |
    v
3. llm.invoke(messages)
   --> HTTP request to localhost:8081
    |
    v
4. Return response text
```

---

## 11. The Complete Flow: Start to Finish

### Indexing Flow (Run Once)

```
1. READ DOCUMENTS
   data/raw/*.pdf, *.docx, *.txt
         |
         v
2. EXTRACT TEXT
   Docling, LibreOffice, direct read
         |
         v
3. CHUNK TEXT
   RecursiveCharacterTextSplitter
   chunk_size=2000, overlap=200
         |
         v
   248 chunks
         |
   +-----+-----+
   |           |
   v           v
4. CREATE       5. CREATE
   EMBEDDINGS      BM25 INDEX
   Nomic Embed     Tokenize + IDF
         |           |
         v           v
6. STORE        7. STORE
   FAISS           Pickle
   cache/faiss     cache/bm25
```

### Query Flow (Every Question)

```
1. USER QUESTION
   "How do I reset my password?"
         |
         v
2. QUERY EMBEDDING
   Nomic Embed --> [0.24, 0.56, ...]
         |
   +-----+-----+
   |           |
   v           v
3. FAISS       4. BM25
   SEARCH         SEARCH
   top_k=100      top_k=100
         |           |
         +-----+-----+
               |
               v
5. HYBRID FUSION
   Combine scores (80% vector, 20% BM25)
   Merge, deduplicate, sort
               |
               v
6. RERANKING
   BGE Reranker scores each (query, chunk) pair
   Sort by reranker score
   Take top 3
               |
               v
7. CONTEXT ASSEMBLY
   "[1] Source: manual.pdf\nTo reset..."
   "[2] Source: faq.txt\nPassword resets..."
   "[3] Source: policy.pdf\nAll passwords..."
               |
               v
8. LLM GENERATION
   Prompt + Context --> Mistral Nemo 12B --> Response
               |
               v
9. DISPLAY RESULT
   "To reset your password, go to Settings > Account > Security..."
   [View Sources] [Confidence: 95%]
```

---

## 12. Configuration Parameters Explained

### config/init_config.yaml

| Parameter | Default | What It Does |
|-----------|---------|--------------|
| `embedding_model_hf` | nomic-ai/nomic-embed-text-v1.5 | The model used to convert text to vectors |
| `rerank_model` | BAAI/bge-reranker-v2-m3 | The model used for reranking results |
| `device_rerank` | mps | Device for reranking: mps (Mac), cuda (NVIDIA), cpu |
| `chunk_size` | 2000 | Maximum characters per chunk |
| `chunk_overlap` | 200 | Overlap between consecutive chunks |
| `batch_size_embeddings` | 32 | How many chunks to embed at once |
| `batch_size_reranking` | 8 | How many (query, doc) pairs to score at once |

### config/process_config.yaml

| Parameter | Default | What It Does |
|-----------|---------|--------------|
| `llamafile_server_base_url` | http://localhost:8081 | URL of the LLM server |
| `send_nb_chunks_to_llm` | 3 | Number of top chunks sent to LLM for generation |
| `use_bm25` | true | Enable keyword search in addition to vector search |
| `bm25_weight` | 0.2 | Weight of BM25 in hybrid score (0.0 to 1.0) |
| `top_k` | 100 | How many chunks to retrieve before reranking |
| `use_reranking` | true | Enable the reranking step |
| `use_query_expansion` | false | Let LLM expand queries before search |

### Tuning Recommendations

| Goal | Adjustment |
|------|------------|
| Faster responses | Reduce top_k, reduce send_nb_chunks_to_llm |
| More accurate answers | Increase top_k, enable reranking, increase send_nb_chunks_to_llm |
| Better recall for exact terms | Increase bm25_weight (try 0.5) |
| Better semantic understanding | Decrease bm25_weight (try 0.1) |
| Lower memory usage | Reduce batch_size_embeddings and batch_size_reranking |

---

## Summary

RagVault implements a complete RAG pipeline:

1. **Ingestion**: Read documents from various formats
2. **Chunking**: Break into 2000-character overlapping pieces
3. **Embedding**: Convert chunks to 768-dimensional vectors using Nomic Embed
4. **Indexing**: Store in FAISS (vectors) and BM25 (keywords)
5. **Retrieval**: Hybrid search combining semantic and keyword matching
6. **Reranking**: Neural model refines the top results
7. **Generation**: LLM produces answer grounded in retrieved context

Each step is configurable, allowing you to tune the system for your specific use case, whether you prioritize speed, accuracy, or memory efficiency.
