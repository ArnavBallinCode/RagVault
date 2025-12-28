# 02. Backend Architecture

> Complete backend internals, class structures, and data flow

---

## Backend Overview

The backend is organized into modular Python packages under `src/`:

```
src/
├── __init__.py              # Package init with version/author
├── data/                    # Data ingestion & preprocessing
│   ├── data_ingestion.py    # Document loading
│   ├── data_preprocessing.py # Chunking & text splitting
│   ├── jupyter_and_code_spliter.py
│   └── loaders/             # File type handlers
│       ├── base.py          # Base loader interface
│       ├── file_loader.py   # Multi-format file loader
│       ├── file_converter.py # Office document conversion
│       └── web_scraper.py   # URL scraping
├── models/
│   └── reranker.py          # Neural reranking model
├── retrieval/
│   ├── bm25_retriever.py    # BM25 keyword search
│   ├── vector_retriever.py  # FAISS vector search
│   └── hybrid_retriever.py  # Combined retrieval
├── response/
│   └── response_generator.py # LLM integration
├── cache/
│   └── cache.py             # Embedding cache management
└── utils/
    └── helpers.py           # Logging, config, utilities
```

---

## Core Entry Point: RAGInitializer

**File:** `initialize_rag.py`

This is the main orchestrator that initializes all components.

### Code Walkthrough

```python
@dataclass
class RAGComponents:
    """Container for all initialized RAG components"""
    retriever: HybridRetriever       # Search engine
    reranker: Reranker               # Neural scorer
    response_generator: ResponseGenerator  # LLM interface
    train_df: pd.DataFrame           # Training data
    test_df: pd.DataFrame            # Test data
    original_chunks: List            # Document chunks
    init_config: Dict                # Init config
    process_config: Dict             # Process config
```

### Initialization Sequence

```
RAGInitializer.initialize()
         │
         ├── 1. Load configs (init_config.yaml, process_config.yaml)
         │
         ├── 2. Initialize DataIngestion
         │       └── Sets up file loaders for PDF, DOCX, TXT, etc.
         │
         ├── 3. Initialize DataPreprocessor
         │       └── Configures text splitter with chunk_size=2000
         │
         ├── 4. Initialize HybridRetriever
         │       ├── Creates BM25Retriever
         │       └── Creates VectorRetriever (loads embedding model)
         │
         ├── 5. Initialize Reranker
         │       └── Loads bge-reranker-v2-m3 model
         │
         ├── 6. Initialize ResponseGenerator
         │       └── Connects to llamafile server
         │
         ├── 7. Load documents from data/raw/
         │       └── Uses DataIngestion.load_documents()
         │
         ├── 8. Process documents into chunks
         │       └── Uses DataPreprocessor.process_documents()
         │
         └── 9. Return RAGComponents dataclass
```

---

## Data Ingestion Layer

**File:** `src/data/data_ingestion.py`

### Class: DataIngestion

```python
class DataIngestion:
    def __init__(self, config: dict):
        self.config = config
        self.data_dir = config['paths']['data_dir']
        
    def load_documents(self) -> List[Document]:
        """Load all documents from data/raw/ directory"""
        # Walks through data/raw/ and data/raw/scraped/
        # Uses appropriate loader for each file type
        
    def load_data(self) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """Load train/test CSV data if available"""
```

### Document Loading Flow

```
data/raw/
    ├── document.pdf    ──────┐
    ├── notes.txt       ──────┤
    ├── report.docx     ──────┼──► FileLoader.load()
    └── scraped/        ──────┤         │
        └── page.md     ──────┘         ▼
                                  List[Document]
                                        │
                              Each Document has:
                              ├── page_content: str
                              └── metadata: dict
                                    ├── source: "path/to/file"
                                    └── page: 1 (for PDFs)
```

### Supported File Types

| Extension | Loader Class | Library |
|-----------|--------------|---------|
| `.pdf` | PyMuPDFLoader | pymupdf |
| `.docx` | Docx2txtLoader | docx2txt |
| `.txt` | TextLoader | langchain |
| `.md` | UnstructuredMarkdownLoader | unstructured |
| `.csv` | CSVLoader | langchain |

---

## Data Preprocessing Layer

**File:** `src/data/data_preprocessing.py`

### Class: DataPreprocessor

```python
class DataPreprocessor:
    def __init__(self, config: dict):
        self.chunk_size = config['processing']['chunk_size']      # 2000
        self.chunk_overlap = config['processing']['chunk_overlap'] # 200
        
    def process_documents(self, docs: List[Document]) -> List[Document]:
        """Split documents into chunks"""
```

### Chunking Process Step-by-Step

```
STEP 1: Receive raw document
┌──────────────────────────────────────────────────────────────────┐
│  Document: "Lorem ipsum dolor sit amet... [5000 characters]"     │
└──────────────────────────────────────────────────────────────────┘

STEP 2: Apply RecursiveCharacterTextSplitter
┌──────────────────────────────────────────────────────────────────┐
│  Parameters:                                                      │
│    chunk_size = 2000                                             │
│    chunk_overlap = 200                                           │
│    separators = ["\n\n", "\n", " ", ""]                         │
└──────────────────────────────────────────────────────────────────┘

STEP 3: Generate overlapping chunks
┌────────────────────┐
│     CHUNK 1        │
│  chars 0-2000      │
│         ┌──────────┼────────────────────┐
│         │ OVERLAP  │     CHUNK 2        │
└─────────┼──────────┘  chars 1800-3800   │
          │ 200 chars │          ┌────────┼────────────────────┐
          └───────────┼──────────┼────────┘     CHUNK 3        │
                      │          │ OVERLAP │  chars 3600-5000   │
                      └──────────┼─────────┼───────────────────┘
                                 └─────────┘

STEP 4: Output list of chunk documents
[Document(chunk1), Document(chunk2), Document(chunk3)]
```

### Why Overlapping Chunks?

| Without Overlap | With Overlap |
|-----------------|--------------|
| Information at boundaries lost | Context preserved |
| Queries spanning chunks fail | Better retrieval accuracy |
| Faster indexing | Slightly more storage |

---

## Retrieval Layer

### BM25 Retriever

**File:** `src/retrieval/bm25_retriever.py`

BM25 (Best Matching 25) is a statistical ranking function.

```python
class BM25Retriever:
    def __init__(self, config: dict):
        self.cache_manager = CacheManager(config['paths']['cache_dir'])
        
    def create_index(self, chunks: List[Document]) -> None:
        """Create BM25 index from document chunks"""
        # Tokenize each chunk
        # Build inverted index
        # Cache to disk for fast reload
        
    def retrieve(self, query: str, top_k: int) -> Tuple[List[Document], List[float]]:
        """Search using BM25 algorithm"""
```

#### BM25 Algorithm Explained

```
For query Q with terms q1, q2, ..., qn
For document D:

score(D, Q) = Σ IDF(qi) × (f(qi,D) × (k1 + 1))
              ─────────────────────────────────
              f(qi,D) + k1 × (1 - b + b × |D|/avgdl)

Where:
  • IDF(qi) = log((N - n(qi) + 0.5) / (n(qi) + 0.5))
  • f(qi,D) = frequency of term qi in document D
  • |D| = length of document D
  • avgdl = average document length
  • k1 = 1.5 (term frequency saturation)
  • b = 0.75 (length normalization)
```

### Vector Retriever

**File:** `src/retrieval/vector_retriever.py`

```python
class VectorRetriever:
    def __init__(self, config: dict):
        self.embedding_model = HuggingFaceEmbeddings(
            model_name="nomic-ai/nomic-embed-text-v1.5"
        )
        self.vectorstore = None  # FAISS index
        
    def create_vectorstore(self, chunks: List[Document]) -> None:
        """Create FAISS index from document chunks"""
        # Embed all chunks (768-dim vectors)
        # Build FAISS index
        # Cache embeddings to disk
        
    def retrieve(self, query: str, top_k: int) -> Tuple[List[Document], List[float]]:
        """Search using vector similarity"""
```

#### Embedding Process

```
Input: "What is the Matter protocol?"
         │
         ▼
┌─────────────────────────────────────────────┐
│  nomic-embed-text-v1.5 Model                │
│  (Sentence Transformer, 768 dimensions)     │
└─────────────────────────────────────────────┘
         │
         ▼
Output: [0.023, -0.156, 0.892, ..., 0.445]  (768 floats)
```

#### FAISS Index

```
┌──────────────────────────────────────────────────────────────────┐
│                     FAISS INDEX                                   │
│                                                                   │
│  Chunk 1: [0.1, 0.2, ..., 0.3] ─────┐                           │
│  Chunk 2: [0.4, 0.5, ..., 0.6] ─────┤                           │
│  Chunk 3: [0.7, 0.8, ..., 0.9] ─────┼──► Optimized for          │
│  ...                           ─────┤    similarity search       │
│  Chunk N: [0.2, 0.3, ..., 0.4] ─────┘    (cosine/L2)            │
└──────────────────────────────────────────────────────────────────┘
                           │
          Query: [0.15, 0.25, ..., 0.35]
                           │
                           ▼
              Top-K most similar chunks
```

### Hybrid Retriever

**File:** `src/retrieval/hybrid_retriever.py`

Combines BM25 and vector search results.

```python
class HybridRetriever:
    def __init__(self, config: dict):
        self.bm25_weight = 0.2   # 20% BM25
        self.vector_weight = 0.8  # 80% Vector
        self.bm25_retriever = BM25Retriever(config)
        self.vector_retriever = VectorRetriever(config)
        
    def retrieve(self, query: str, top_k: int) -> List[RetrievalResult]:
        """Combine BM25 and vector retrieval"""
```

#### Score Fusion

```
For each document D retrieved by either method:

final_score(D) = (bm25_score(D) × 0.2) + (vector_score(D) × 0.8)

                    ┌──────────────────────────────────────┐
                    │           SCORE FUSION                │
                    │                                       │
BM25: [D1:0.9, D2:0.7, D3:0.6]                             │
         │      │      │                                   │
         ├──────┼──────┼───────►  Weighted Sum             │
         │      │      │               │                   │
Vector: [D1:0.8, D4:0.7, D2:0.6]       ▼                   │
                                 [D1:0.82, D2:0.62,        │
                                  D4:0.56, D3:0.12]        │
                    └──────────────────────────────────────┘
```

---

## Reranking Layer

**File:** `src/models/reranker.py`

### Class: Reranker

```python
class Reranker:
    def __init__(self, config: dict):
        self.model_name = "BAAI/bge-reranker-v2-m3"
        self.device = self._get_best_device()  # mps/cuda/cpu
        self.model = AutoModelForSequenceClassification.from_pretrained(...)
        
    def rerank(self, query: str, documents: List[Document], top_k: int) -> List[RerankResult]:
        """Rerank documents using neural scoring"""
```

#### Reranking Process

```
Input: 100 candidate documents from hybrid retrieval

STEP 1: Create query-document pairs
┌─────────────────────────────────────────────────────────────────┐
│ Pairs:                                                          │
│   [Query, Doc1]                                                 │
│   [Query, Doc2]                                                 │
│   ...                                                           │
│   [Query, Doc100]                                               │
└─────────────────────────────────────────────────────────────────┘

STEP 2: Tokenize and batch
┌─────────────────────────────────────────────────────────────────┐
│ Input: "[CLS] Query text [SEP] Document text [SEP]"             │
│ Max length: 512 tokens                                          │
│ Batch size: 8                                                   │
└─────────────────────────────────────────────────────────────────┘

STEP 3: Pass through transformer
┌─────────────────────────────────────────────────────────────────┐
│              bge-reranker-v2-m3 Model                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Embedding Layer                                          │  │
│  │       ↓                                                   │  │
│  │  12 Transformer Layers (768 hidden dim)                   │  │
│  │       ↓                                                   │  │
│  │  Classification Head                                      │  │
│  │       ↓                                                   │  │
│  │  Relevance Score (single float)                           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

STEP 4: Sort by score, return top-2
Output: [RerankResult(doc1, score=0.95), RerankResult(doc7, score=0.89)]
```

---

## Response Generation Layer

**File:** `src/response/response_generator.py`

### Class: ResponseGenerator

```python
class ResponseGenerator:
    def __init__(self, config: dict):
        # Get LLM URL (env var for Docker, config for local)
        llm_url = os.environ.get("LLAMAFILE_SERVER_URL", 
                                  config["retrieval"]["llamafile_server_base_url"])
        self.llm = Llamafile(base_url=llm_url, seed=2024)
        
    def generate_answer(self, query: str, chunks: List[Document]) -> Dict:
        """Generate answer using LLM with retrieved context"""
```

#### Response Generation Flow

```
STEP 1: Prepare context from reranked chunks
┌─────────────────────────────────────────────────────────────────┐
│ Context:                                                         │
│ [1] Source: data/raw/document.pdf                               │
│ The Matter protocol enables secure communication...              │
│                                                                  │
│ [2] Source: data/raw/notes.txt                                  │
│ DAC certificates contain subject key identifiers...             │
└─────────────────────────────────────────────────────────────────┘

STEP 2: Format prompt
┌─────────────────────────────────────────────────────────────────┐
│ You are an efficient Q&A assistant...                           │
│                                                                  │
│ Question: {user_query}                                          │
│                                                                  │
│ Relevant Information:                                            │
│ {context}                                                        │
│                                                                  │
│ Please provide a response that:                                  │
│ 1. Directly addresses the question                              │
│ 2. Is supported by the provided information                     │
│ ...                                                              │
└─────────────────────────────────────────────────────────────────┘

STEP 3: Send to llamafile server
┌─────────────────────────────────────────────────────────────────┐
│ POST http://localhost:8081/completion                           │
│ {                                                                │
│   "prompt": "<formatted prompt>",                               │
│   "n_predict": 512,                                             │
│   "temperature": 0.7                                            │
│ }                                                                │
└─────────────────────────────────────────────────────────────────┘

STEP 4: Return structured response
{
    "response": "The Subject Key Identifier in Matter DAC...",
    "source_documents": [{"source": "document.pdf"}, ...],
    "metadata": {}
}
```

---

## Caching System

**File:** `src/cache/cache.py`

### Class: CacheManager

```python
class CacheManager:
    def __init__(self, cache_dir: str):
        self.cache_dir = cache_dir
        
    def get(self, key: str) -> Optional[Any]:
        """Retrieve cached item by key"""
        
    def set(self, key: str, value: Any) -> None:
        """Store item in cache"""
```

### What Gets Cached

| Item | Key Format | Purpose |
|------|------------|---------|
| BM25 Index | `bm25_{hash}.pkl` | Avoid recomputing tokenization |
| Embeddings | `embeddings_{hash}.pkl` | Avoid re-embedding documents |
| Chunks | `chunks_{hash}.pkl` | Avoid re-chunking documents |

### Cache Key Generation

```python
def generate_cache_key(content: str) -> str:
    """Generate deterministic cache key from content"""
    # Uses first 100 chars of concatenated text
    # MD5 hash for unique identifier
    return hashlib.md5(content[:100].encode()).hexdigest()
```

---

## Error Handling

All components implement try-catch with logging:

```python
try:
    result = self.some_operation()
except Exception as e:
    self.logger.error(f"Error in operation: {str(e)}")
    raise  # Or return graceful fallback
```

### Logging Levels

| Level | Usage |
|-------|-------|
| `INFO` | Normal operations (initialization, retrieval counts) |
| `WARNING` | Non-critical issues (fallback to CPU, missing optional files) |
| `ERROR` | Critical failures (model load failure, LLM connection error) |

---

## Next: Frontend →

See [03_FRONTEND.md](./03_FRONTEND.md) for Streamlit UI details.

---

*Author: Arnav Angarkar*
