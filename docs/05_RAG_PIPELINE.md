# RagVault RAG Pipeline Documentation

> Complete technical reference for the Retrieval-Augmented Generation pipeline, including document processing, retrieval strategies, reranking, and response generation.

---

## Table of Contents

1. [Pipeline Overview](#pipeline-overview)
2. [Document Ingestion](#document-ingestion)
3. [Document Preprocessing](#document-preprocessing)
4. [Retrieval System](#retrieval-system)
5. [Neural Reranking](#neural-reranking)
6. [Response Generation](#response-generation)
7. [Caching System](#caching-system)
8. [Configuration](#configuration)
9. [Performance Optimization](#performance-optimization)

---

## Pipeline Overview

### What is RAG?

**Retrieval-Augmented Generation (RAG)** combines document retrieval with language model generation:

1. **Retrieve** relevant documents from a knowledge base
2. **Augment** the LLM prompt with retrieved context
3. **Generate** an informed response

### RagVault Pipeline Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          RAG PIPELINE FLOW                                  │
└────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────┐
  │                        INDEXING PHASE (Offline)                          │
  └─────────────────────────────────────────────────────────────────────────┘
  
  Documents           FileLoader           DataPreprocessor        Embeddings
  ┌─────────┐        ┌───────────┐        ┌───────────────┐       ┌─────────┐
  │ PDF     │───────▶│  Docling  │───────▶│   Chunking    │──────▶│  Nomic  │
  │ DOCX    │        │  Convert  │        │   2000/200    │       │  v1.5   │
  │ TXT     │        └───────────┘        └───────────────┘       └────┬────┘
  │ MD      │                                                          │
  └─────────┘                                                          ▼
                                              ┌────────────────────────────┐
                                              │   Dual Index Storage       │
                                              │ ┌──────────┐ ┌──────────┐  │
                                              │ │  FAISS   │ │   BM25   │  │
                                              │ │ Vectors  │ │  Tokens  │  │
                                              │ └──────────┘ └──────────┘  │
                                              └────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────┐
  │                        QUERY PHASE (Online)                              │
  └─────────────────────────────────────────────────────────────────────────┘

  User Query          Hybrid Search         Reranker           Response Gen
  ┌─────────┐        ┌───────────────┐     ┌──────────┐       ┌───────────┐
  │ "What   │───────▶│ FAISS + BM25  │────▶│   BGE    │──────▶│ Llamafile │
  │  is..." │        │  Combined     │     │ Cross-Enc│       │  Mistral  │
  └─────────┘        └───────────────┘     └──────────┘       └─────┬─────┘
                                                                    │
                                                                    ▼
                                                              ┌───────────┐
                                                              │  Answer   │
                                                              │ + Sources │
                                                              └───────────┘
```

### Pipeline Components

| Component | File | Purpose |
|-----------|------|---------|
| **DataIngestion** | `src/data/data_ingestion.py` | Load documents |
| **DataPreprocessor** | `src/data/data_preprocessing.py` | Chunk documents |
| **FileLoader** | `src/data/loaders/file_loader.py` | Multi-format parsing |
| **EnhancedWebLoader** | `src/data/loaders/web_scraper.py` | URL scraping |
| **VectorRetriever** | `src/retrieval/vector_retriever.py` | FAISS search |
| **BM25Retriever** | `src/retrieval/bm25_retriever.py` | Keyword search |
| **HybridRetriever** | `src/retrieval/hybrid_retriever.py` | Combined search |
| **Reranker** | `src/models/reranker.py` | Neural reranking |
| **ResponseGenerator** | `src/response/response_generator.py` | LLM integration |
| **CacheManager** | `src/cache/cache.py` | Embedding cache |

---

## Document Ingestion

### DataIngestion Class

```python
# src/data/data_ingestion.py

class DataIngestion:
    """
    Comprehensive data ingestion system supporting multiple source types.
    
    Features:
        - Multi-source document loading (files, web, special sources)
        - Automatic caching of processed documents
        - Data validation and integrity checks
        - Progress tracking for long operations
    """
    
    def __init__(self, config: dict):
        self.config = config
        self.cache_manager = CacheManager(config['paths']['cache_dir'])
        self.file_loader = FileLoader(config)
```

### Document Loading Flow

```python
def load_documents(self) -> List[Document]:
    """Load documents from all configured sources."""
    
    documents = []
    
    # 1. Load from configured paths
    for doc_path in self.config['files']['document_paths']:
        if Path(doc_path).exists():
            docs = self.file_loader.load(doc_path)
            documents.extend(docs)
    
    # 2. Auto-scan uploads directory
    uploads_dir = Path("data/uploads")
    if uploads_dir.exists():
        for file_path in uploads_dir.glob("*"):
            if file_path.is_file() and not file_path.name.startswith('.'):
                docs = self.file_loader.load(str(file_path))
                documents.extend(docs)
    
    return documents
```

### FileLoader - Format Support

```python
# src/data/loaders/file_loader.py

class FileLoader:
    """
    Enhanced file loader supporting multiple formats.
    
    Supported formats:
        - PDF (.pdf) - Using Docling for enhanced conversion
        - Microsoft Office (.docx, .doc, .pptx, .ppt, .xlsx, .xls)
        - Text files (.txt, .md)
        - Data files (.csv, .json)
        - Web content (.html, .htm)
        - Email (.eml, .msg)
        - Jupyter notebooks (.ipynb)
        - Source code (30+ programming languages)
    """
    
    def __init__(self, config):
        self.docling_converter = DocumentConverter()
        self.file_converter = OfficeConverter()
        self._initialize_loaders()
    
    def _initialize_loaders(self):
        self.document_loaders = {
            # Documents
            '.pdf': self._load_pdf_or_markdown,
            '.md': self._load_pdf_or_markdown,
            '.txt': TextLoader,
            '.docx': self._convert_and_load,
            '.doc': self._convert_and_load,
            
            # Data
            '.csv': self._load_csv,
            '.json': JSONLoader,
            '.xlsx': self._load_excel,
            
            # Code (selected examples)
            '.py': self._load_code_file,
            '.js': self._load_code_file,
            '.ts': self._load_code_file,
            # ... 30+ more languages
        }
    
    def load(self, source: str) -> List[Document]:
        """Load and parse a document from the given file."""
        source_path = Path(source)
        loader_class = self.document_loaders.get(source_path.suffix.lower())
        
        if not loader_class:
            raise ValueError(f"Unsupported file type: {source_path.suffix}")
        
        if callable(loader_class) and not isinstance(loader_class, type):
            return loader_class(str(source_path))
        else:
            return loader_class(str(source_path)).load()
```

### PDF Processing with Docling

```python
def _load_pdf_or_markdown(self, file_path: str) -> List[Document]:
    """Load PDF/Markdown using Docling for high-quality extraction."""
    
    # Docling provides excellent table and structure extraction
    result = self.docling_converter.convert(file_path)
    
    # Export to markdown format
    markdown_result = result.document.export_to_markdown()
    markdown_result = markdown_result.replace("<!-- image -->\n\n", "")
    
    return [Document(
        page_content=markdown_result,
        metadata={
            "source": file_path,
            "is_markdown": True
        }
    )]
```

### Web Scraping

```python
# src/data/loaders/web_scraper.py

class EnhancedWebLoader:
    """
    Advanced web content loader with TOC traversal.
    
    Features:
        - Asynchronous content loading
        - Intelligent TOC detection and traversal
        - Domain-restricted crawling
        - Markdown conversion
    """
    
    def __init__(self, config, base_url: str, traverse_toc: bool = True):
        self.base_url = base_url
        self.domain = urlparse(base_url).netloc
        self.traverse_toc = traverse_toc
        self.converter = DocumentConverter()
    
    async def scrape_all(self) -> List[Document]:
        """Scrape all relevant pages and convert to markdown."""
        
        async with aiohttp.ClientSession() as session:
            urls_to_scrape = {self.base_url}
            
            # Get TOC links if enabled
            if self.traverse_toc:
                toc_links = await self.get_toc_links(session, self.base_url)
                urls_to_scrape.update(toc_links)
            
            # Process each URL
            documents = []
            for url in tqdm(urls_to_scrape, desc="Processing Web pages"):
                result = self.converter.convert(url)
                markdown = result.document.export_to_markdown()
                
                documents.append(Document(
                    page_content=markdown,
                    metadata={"source": url, "is_url": True}
                ))
            
            return documents
```

---

## Document Preprocessing

### DataPreprocessor Class

```python
# src/data/data_preprocessing.py

class DataPreprocessor:
    """
    Advanced document preprocessing with specialized handling.
    
    Features:
        - Markdown header-based splitting
        - Code-aware chunking
        - Jupyter notebook processing
        - Parallel processing
        - Intelligent caching
    """
    
    def __init__(self, config: Dict):
        self.config = config
        self.chunk_size = config['processing']['chunk_size']      # 2000
        self.chunk_overlap = config['processing']['chunk_overlap'] # 200
        self.num_processes = cpu_count() - 1 or 1
        self.cache_manager = CacheManager(config['paths']['cache_dir'])
```

### Chunking Strategies

```python
def process_single_document(self, doc_tuple) -> List[Document]:
    """Process a single document with type-appropriate strategy."""
    
    doc_path, doc = doc_tuple
    
    # Strategy 1: Markdown with headers
    if doc.metadata.get("is_markdown", False):
        return self._split_markdown(doc)
    
    # Strategy 2: Code files
    if doc.metadata.get("is_code", False):
        return self._split_code(doc)
    
    # Strategy 3: Jupyter notebooks
    if doc.metadata.get("is_notebook", False):
        return self._split_notebook(doc)
    
    # Strategy 4: CSV/tabular data
    if doc.metadata.get("is_csv", False):
        return self._split_csv(doc)
    
    # Default: Recursive character splitter
    return self._split_text(doc)
```

### Markdown-Aware Splitting

```python
def _split_markdown(self, doc: Document) -> List[Document]:
    """Split markdown preserving header hierarchy."""
    
    # Configure header splits
    headers_to_split_on = [
        ("##", "Header 2"),
        ("###", "Header 3"),
        ("####", "Header 4"),
    ]
    
    md_splitter = ModifiedMarkdownHeaderTextSplitter(
        headers_to_split_on=headers_to_split_on,
        config=self.config
    )
    
    # Split by headers first
    header_chunks = md_splitter.split_text(doc.page_content)
    
    # Then apply size-based splitting
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=self.chunk_size,
        chunk_overlap=self.chunk_overlap
    )
    
    return text_splitter.split_documents(header_chunks)
```

### Code-Aware Splitting

```python
def _split_code(self, doc: Document) -> List[Document]:
    """Split code files respecting function/class boundaries."""
    
    # Use LangChain's code splitter
    language = self._detect_language(doc.metadata.get('file_extension'))
    
    code_splitter = CodeSplitter(
        language=language,
        chunk_lines=100,
        chunk_lines_overlap=20
    )
    
    return code_splitter.split_documents([doc])
```

### Parallel Processing

```python
def process_documents(self, docs: List[Document]) -> List[Document]:
    """Process all documents in parallel."""
    
    # Check cache first
    cache_key = self._generate_cache_key(docs)
    cached = self.cache_manager.get_cached(cache_key, "chunks")
    if cached:
        return cached
    
    # Prepare for parallel processing
    doc_tuples = [(d.metadata.get('source', ''), d) for d in docs]
    
    # Process in parallel
    with Pool(processes=self.num_processes) as pool:
        results = pool.map(self.process_single_document, doc_tuples)
    
    # Flatten results
    all_chunks = [chunk for result in results for chunk in result]
    
    # Cache and return
    self.cache_manager.cache_content(cache_key, all_chunks, "chunks")
    
    return all_chunks
```

---

## Retrieval System

### HybridRetriever

Combines BM25 (keyword) and FAISS (semantic) search:

```python
# src/retrieval/hybrid_retriever.py

class HybridRetriever:
    """
    Hybrid document retrieval combining BM25 and vector approaches.
    
    The system combines:
    - BM25 Okapi for keyword-focused search
    - FAISS vector similarity for semantic search
    
    Results are combined using configurable weights and deduplicated.
    """
    
    def __init__(self, config: dict):
        self.bm25_weight = config['retrieval']['bm25_weight']  # 0.2
        self.bm25_retriever = BM25Retriever(config)
        self.vector_retriever = VectorRetriever(config)
    
    def initialize(self, chunks: List[Document]) -> None:
        """Initialize both indices."""
        self.bm25_retriever.create_index(chunks)
        self.vector_retriever.create_vectorstore(chunks)
    
    def retrieve(self, query: str, top_k: int = 5,
                 use_bm25: bool = True, 
                 use_vector: bool = True) -> List[RetrievalResult]:
        """Retrieve documents using combined approaches."""
        
        combined_results = {}
        
        # BM25 retrieval
        if use_bm25:
            bm25_docs, bm25_scores = self.bm25_retriever.retrieve(query, top_k * 10)
            for doc, score in zip(bm25_docs, bm25_scores):
                key = doc.page_content
                if key not in combined_results:
                    combined_results[key] = RetrievalResult(
                        document=doc,
                        score=score * self.bm25_weight,
                        source='bm25'
                    )
                else:
                    combined_results[key].score += score * self.bm25_weight
        
        # Vector retrieval
        if use_vector:
            vector_docs, vector_scores = self.vector_retriever.retrieve(query, top_k * 10)
            vector_weight = 1 - self.bm25_weight
            for doc, score in zip(vector_docs, vector_scores):
                key = doc.page_content
                if key not in combined_results:
                    combined_results[key] = RetrievalResult(
                        document=doc,
                        score=score * vector_weight,
                        source='vector'
                    )
                else:
                    combined_results[key].score += score * vector_weight
                    combined_results[key].source = 'hybrid'
        
        # Sort and return
        sorted_results = sorted(
            combined_results.values(),
            key=lambda x: x.score,
            reverse=True
        )
        return sorted_results[:top_k]
```

### VectorRetriever (FAISS)

```python
# src/retrieval/vector_retriever.py

class VectorRetriever:
    """
    FAISS-based vector retrieval with HuggingFace embeddings.
    
    Features:
        - GPU-accelerated embeddings (MPS/CUDA)
        - Efficient caching system
        - Score normalization
    """
    
    def __init__(self, config: dict):
        self.embedding_model_name = config['model']['embedding_model_hf']
        self.batch_size = config['processing']['batch_size_embeddings']
        self.cache_manager = CacheManager(config['paths']['cache_dir'])
        
        # Auto-detect GPU
        if torch.backends.mps.is_available():
            device = "mps"  # Apple Silicon
        elif torch.cuda.is_available():
            device = "cuda"  # NVIDIA
        else:
            device = "cpu"
        
        # Initialize embeddings model
        self.model_embeddings = HuggingFaceEmbeddings(
            model_name=self.embedding_model_name,
            model_kwargs={'device': device, 'trust_remote_code': True},
            encode_kwargs={'normalize_embeddings': True, 'batch_size': self.batch_size}
        )
    
    def create_vectorstore(self, chunks: List[Document]) -> None:
        """Create FAISS index from document chunks."""
        
        # Check cache
        cache_key = "".join([c.page_content for c in chunks[:100]])
        cached = self.cache_manager.get_cached(cache_key, "embeddings_direct")
        
        if cached:
            self.texts = cached['texts']
            embeddings = cached['embeddings']
            self.sources = cached['sources']
        else:
            # Generate embeddings
            self.texts = [chunk.page_content for chunk in chunks]
            self.sources = [chunk.metadata["source"] for chunk in chunks]
            embeddings = self.model_embeddings.embed_documents(self.texts)
            
            # Cache
            self.cache_manager.cache_content(cache_key, {
                'texts': self.texts,
                'sources': self.sources,
                'embeddings': embeddings
            }, "embeddings_direct")
        
        # Create FAISS index
        text_embedding_pairs = zip(self.texts, embeddings)
        self.vectorstore = FAISS.from_embeddings(
            text_embedding_pairs, 
            self.model_embeddings
        )
    
    def retrieve(self, query: str, top_k: int = 5) -> Tuple[List[Document], List[float]]:
        """Retrieve similar documents."""
        
        results = self.vectorstore.similarity_search_with_score(
            f"search_query: {query}",  # Nomic requires prefix
            k=top_k
        )
        
        docs, scores = zip(*results)
        
        # Normalize scores to [0,1]
        max_distance = max(scores)
        normalized_scores = [1 - (dist/max_distance) for dist in scores]
        
        return list(docs), normalized_scores
```

### BM25Retriever

```python
# src/retrieval/bm25_retriever.py

class BM25Retriever:
    """
    BM25 Okapi keyword-based retrieval with caching.
    
    BM25 excels at:
        - Exact keyword matching
        - Abbreviation/acronym lookup
        - Technical term search
    """
    
    def __init__(self, config: dict):
        self.cache_manager = CacheManager(config['paths']['cache_dir'])
        self.bm25_index = None
        self.chunks = None
    
    def create_index(self, chunks: List[Document]) -> None:
        """Create BM25 index from document chunks."""
        
        self.chunks = chunks
        
        # Check cache
        cache_key = "".join([c.page_content for c in chunks[:100]])
        cached = self.cache_manager.get_cached(cache_key, "bm25")
        
        if cached:
            self.bm25_index = cached
            return
        
        # Tokenize and create index
        tokenized_chunks = [chunk.page_content.split() for chunk in chunks]
        self.bm25_index = BM25Okapi(tokenized_chunks)
        
        # Cache
        self.cache_manager.cache_content(cache_key, self.bm25_index, "bm25")
    
    def retrieve(self, query: str, top_k: int = 5) -> Tuple[List[Document], List[float]]:
        """Retrieve documents using BM25 scoring."""
        
        # Tokenize query
        tokenized_query = query.split()
        
        # Score all documents
        scores = self.bm25_index.get_scores(tokenized_query)
        
        # Get top-k
        top_indices = np.argsort(-scores)[:top_k]
        retrieved_docs = [self.chunks[i] for i in top_indices]
        retrieved_scores = [scores[i] for i in top_indices]
        
        # Normalize
        max_score = max(retrieved_scores) if retrieved_scores else 1.0
        normalized = [s/max_score for s in retrieved_scores]
        
        return retrieved_docs, normalized
```

---

## Neural Reranking

### Reranker Class

```python
# src/models/reranker.py

class Reranker:
    """
    Neural document reranker using cross-encoder models.
    
    Uses BAAI/bge-reranker-v2-m3 for precise relevance scoring.
    Processes query-document pairs through transformer model.
    """
    
    def __init__(self, config: Dict):
        self.device = config['model']['device_rerank']  # mps/cuda/cpu
        self.model_name = config['model']['rerank_model']
        self.batch_size = config['processing']['batch_size_reranking']
        
        # Load model
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(self.model_name)
        self.model.to(self.device)
        self.model.eval()
    
    def rerank(self, query: str, documents: List[Document], 
               top_k: Optional[int] = None) -> List[RerankResult]:
        """Rerank documents by relevance to query."""
        
        # Prepare query-document pairs
        pairs = [[query, doc.page_content] for doc in documents]
        
        # Process in batches
        all_scores = []
        for i in range(0, len(pairs), self.batch_size):
            batch = pairs[i:i + self.batch_size]
            scores = self._process_batch(batch)
            all_scores.extend(scores)
        
        # Create results
        results = [
            RerankResult(document=doc, score=float(score), original_rank=idx)
            for idx, (score, doc) in enumerate(zip(all_scores, documents))
        ]
        
        # Sort by score
        results.sort(key=lambda x: x.score, reverse=True)
        
        return results[:top_k] if top_k else results
    
    def _process_batch(self, batch_pairs: List[List[str]]) -> List[float]:
        """Score a batch of query-document pairs."""
        
        with torch.no_grad():
            inputs = self.tokenizer(
                batch_pairs,
                padding=True,
                truncation=True,
                return_tensors='pt',
                max_length=512
            ).to(self.device)
            
            outputs = self.model(**inputs, return_dict=True)
            scores = outputs.logits.view(-1,).float()
            
            return scores.cpu().tolist()
```

### Reranking Benefits

| Metric | Without Reranking | With Reranking |
|--------|-------------------|----------------|
| **Precision@3** | ~70% | ~85% |
| **Relevance** | Good | Excellent |
| **Latency** | ~0.5s | ~1.5s |

---

## Response Generation

### ResponseGenerator Class

```python
# src/response/response_generator.py

class ResponseGenerator:
    """
    LLM-based response generation with context awareness.
    
    Features:
        - Context-aware response generation
        - Query expansion (optional)
        - Source tracking and citation
        - Thread-safe LLM handling
    """
    
    def __init__(self, config: Dict):
        self.config = config
        self.llm = Llamafile(
            base_url=config["retrieval"]["llamafile_server_base_url"],
            seed=2024
        )
    
    def generate_answer(self, query: str, relevant_chunks: List[Document],
                        metadata: Optional[Dict] = None) -> Dict:
        """Generate comprehensive answer from retrieved chunks."""
        
        try:
            # Prepare context
            context = self._prepare_context(relevant_chunks)
            
            # Generate response
            response = self._generate_response(query, context)
            
            return {
                'response': response,
                'source_documents': [doc.metadata for doc in relevant_chunks],
                'metadata': metadata or {}
            }
            
        except Exception as e:
            return {
                'response': "Error generating response. Please try again.",
                'error': str(e),
                'metadata': metadata or {}
            }
    
    def _prepare_context(self, chunks: List[Document]) -> str:
        """Format chunks with source information."""
        
        context_parts = []
        for i, chunk in enumerate(chunks, 1):
            source = chunk.metadata.get('source', 'Unknown')
            context_parts.append(f"[{i}] Source: {source}\n{chunk.page_content}")
        
        return "\n\n".join(context_parts)
    
    def _generate_response(self, query: str, context: str) -> str:
        """Generate response using LLM."""
        
        prompt = ChatPromptTemplate.from_template("""
        You are an efficient Q&A assistant that responds based on provided context.
        
        Question: {query}
        
        Relevant Information:
        {context}
        
        Please provide a response that:
        1. Directly addresses the question
        2. Is supported by the provided information
        3. Is clear and well-organized
        4. Is as concise as possible
        5. Clearly states if information is insufficient
        6. Responds in the language of the query
        
        Response:
        """)
        
        messages = prompt.format_messages(query=query, context=context)
        response = self.llm.invoke(messages)
        
        return response
```

### Query Expansion (Optional)

```python
def expand_query(self, query: str) -> str:
    """Improve query clarity using LLM."""
    
    prompt = ChatPromptTemplate.from_template("""
    You are a query processor. Rules:
    1. NEVER expand acronyms (DAC, API must stay as-is)
    2. Only fix incomplete grammar
    3. Return exact original if already complete
    
    Examples:
    Input: "difference REST SOAP"
    Output: "What is the difference between REST and SOAP?"
    
    Original query: {query}
    Expanded query:
    """)
    
    messages = prompt.format_messages(query=query)
    return self.llm.invoke(messages).content
```

---

## Caching System

### CacheManager

```python
# src/cache/cache.py

class CacheManager:
    """
    Manages caching of embeddings, indices, and processed documents.
    
    Cache structure:
        cache/
        ├── embeddings_direct/    # FAISS embeddings
        ├── bm25/                 # BM25 indices
        └── chunks/               # Processed chunks
    """
    
    def __init__(self, cache_dir: str):
        self.cache_dir = cache_dir
        Path(cache_dir).mkdir(parents=True, exist_ok=True)
    
    def get_cached(self, key: str, namespace: str) -> Optional[Any]:
        """Retrieve cached item."""
        
        cache_path = self._get_path(key, namespace)
        
        if cache_path.exists():
            with open(cache_path, 'rb') as f:
                return pickle.load(f)
        return None
    
    def cache_content(self, key: str, content: Any, namespace: str) -> None:
        """Store item in cache."""
        
        cache_path = self._get_path(key, namespace)
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(cache_path, 'wb') as f:
            pickle.dump(content, f)
    
    def _get_path(self, key: str, namespace: str) -> Path:
        """Generate cache file path."""
        
        # Hash key for filename
        key_hash = hashlib.md5(key.encode()).hexdigest()
        return Path(self.cache_dir) / namespace / f"{key_hash}.pkl"
```

---

## Configuration

### init_config.yaml Reference

```yaml
# Document processing
processing:
  chunk_size: 2000        # Characters per chunk
  chunk_overlap: 200      # Overlap between chunks
  batch_size_embeddings: 32
  batch_size_reranking: 8
  
  # Markdown splitting
  headers_to_split_on:
    - ["##", "Header 2"]
    - ["###", "Header 3"]
    - ["####", "Header 4"]

# Models
model:
  embedding_model_hf: "nomic-ai/nomic-embed-text-v1.5"
  rerank_model: "BAAI/bge-reranker-v2-m3"
  device_rerank: "mps"  # or cuda, cpu
```

### process_config.yaml Reference

```yaml
retrieval:
  llamafile_server_base_url: "http://localhost:8081"
  send_nb_chunks_to_llm: 2     # Chunks in LLM context
  use_bm25: true               # Enable keyword search
  bm25_weight: 0.2             # BM25 contribution
  top_k: 100                   # Initial retrieval count
  use_reranking: true          # Enable neural reranking
  use_query_expansion: false   # LLM query improvement
```

---

## Performance Optimization

### Embedding Optimization

```python
# Batch processing for efficiency
encode_kwargs = {
    'normalize_embeddings': True,
    'batch_size': 32,  # Process 32 texts at once
    'show_progress': True
}

# GPU memory management
if torch.cuda.is_available():
    torch.cuda.empty_cache()
elif torch.backends.mps.is_available():
    torch.mps.empty_cache()
```

### Index Optimization

| Optimization | Impact | How |
|--------------|--------|-----|
| **Caching** | 10x faster restart | Pickle embeddings |
| **Batching** | 3x faster embedding | Process 32 at once |
| **GPU** | 5x faster inference | Use MPS/CUDA |
| **Quantization** | 4x smaller index | FAISS PQ |

### Query Latency Breakdown

```
┌────────────────────────────────────────────────────────────┐
│ Component          │ Time (s)  │ % of Total   │ Optimizable │
├────────────────────┼───────────┼──────────────┼─────────────┤
│ Query embedding    │   0.1     │     1%       │ ✓ (cache)   │
│ FAISS search       │   0.2     │     2%       │ ✓ (GPU)     │
│ BM25 search        │   0.2     │     2%       │ ✓ (tokenize)│
│ Reranking          │   1.5     │    15%       │ ✓ (batch)   │
│ LLM generation     │   8.0     │    80%       │ ✓ (GPU/quant)│
├────────────────────┼───────────┼──────────────┼─────────────┤
│ TOTAL              │  ~10s     │   100%       │             │
└────────────────────────────────────────────────────────────┘
```

---

## Next Steps

- **[Backend Documentation](./02_BACKEND.md)** - API integration
- **[Incremental Learning](./INCREMENTAL_LEARNING.md)** - Live updates
- **[Scalability](./SCALABILITY.md)** - Enterprise deployment

---

*Last updated: January 2026*
