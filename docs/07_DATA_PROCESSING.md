# 07. Data Processing

> Document ingestion, text extraction, chunking, and preprocessing

---

## Overview

Data processing transforms raw documents into searchable chunks:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    RAW      │───▶│    TEXT     │───▶│   CHUNK     │───▶│   INDEX     │
│  DOCUMENTS  │    │ EXTRACTION  │    │  SPLITTING  │    │  STORAGE    │
│             │    │             │    │             │    │             │
│ PDF, DOCX   │    │ Plain text  │    │ 2000 char   │    │ FAISS +     │
│ TXT, MD     │    │ + metadata  │    │ overlapping │    │ BM25        │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

---

## Supported File Types

| Extension | Loader | Library | Notes |
|-----------|--------|---------|-------|
| `.pdf` | PyMuPDFLoader | pymupdf | Preserves page numbers |
| `.docx` | Docx2txtLoader | docx2txt | Plain text, loses formatting |
| `.txt` | TextLoader | langchain | Direct read |
| `.md` | UnstructuredMarkdownLoader | unstructured | Parses markdown structure |
| `.csv` | CSVLoader | langchain | Row-based documents |
| `.html` | BSHTMLLoader | beautifulsoup4 | Strips HTML tags |

---

## Document Ingestion

### Class: DataIngestion

**File:** `src/data/data_ingestion.py`

```python
class DataIngestion:
    def __init__(self, config: dict):
        self.data_dir = config['paths']['data_dir']  # "./data"
        self.document_paths = config['files'].get('document_paths', [])
        
    def load_documents(self) -> List[Document]:
        """Load all documents from configured paths"""
        documents = []
        
        # Load from explicit paths in config
        for path in self.document_paths:
            docs = self._load_single_file(path)
            documents.extend(docs)
        
        # Load from data/raw/ directory
        raw_dir = Path(self.data_dir) / "raw"
        for file_path in raw_dir.glob("**/*"):
            if file_path.is_file():
                docs = self._load_single_file(str(file_path))
                documents.extend(docs)
        
        return documents
```

### File Type Detection

```python
def _get_loader(self, file_path: str) -> BaseLoader:
    """Get appropriate loader for file type"""
    ext = Path(file_path).suffix.lower()
    
    loaders = {
        '.pdf': PyMuPDFLoader,
        '.docx': Docx2txtLoader,
        '.txt': TextLoader,
        '.md': UnstructuredMarkdownLoader,
        '.csv': CSVLoader,
        '.html': BSHTMLLoader,
    }
    
    loader_class = loaders.get(ext)
    if loader_class is None:
        raise ValueError(f"Unsupported file type: {ext}")
    
    return loader_class(file_path)
```

### Document Structure

Each loaded document has:

```python
Document(
    page_content="The actual text content of the document...",
    metadata={
        "source": "data/raw/document.pdf",
        "page": 1,                    # For PDFs
        "total_pages": 10,            # For PDFs
        "file_type": "pdf",
        "created_at": "2024-01-15"
    }
)
```

---

## PDF Processing

### PyMuPDF Loader

```python
from langchain_community.document_loaders import PyMuPDFLoader

def load_pdf(path: str) -> List[Document]:
    loader = PyMuPDFLoader(path)
    documents = loader.load()
    
    # Each page becomes a separate document
    # documents[0] = Page 1
    # documents[1] = Page 2
    # ...
    
    return documents
```

### PDF Extraction Details

```
Original PDF:
┌─────────────────────────────────────────────────────────────────┐
│  Page 1                                                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Title: Matter Protocol Specification                     │  │
│  │                                                           │  │
│  │  1. Introduction                                          │  │
│  │  This document describes the Matter protocol...           │  │
│  └───────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Page 2                                                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  2. Device Attestation                                    │  │
│  │  The DAC certificate contains...                          │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

Extracted Documents:
[
    Document(
        page_content="Title: Matter Protocol Specification\n\n1. Introduction\nThis document describes...",
        metadata={"source": "spec.pdf", "page": 1}
    ),
    Document(
        page_content="2. Device Attestation\nThe DAC certificate contains...",
        metadata={"source": "spec.pdf", "page": 2}
    )
]
```

---

## Text Chunking

### Class: DataPreprocessor

**File:** `src/data/data_preprocessing.py`

```python
class DataPreprocessor:
    def __init__(self, config: dict):
        self.chunk_size = config['processing']['chunk_size']      # 2000
        self.chunk_overlap = config['processing']['chunk_overlap'] # 200
        
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )
    
    def process_documents(self, documents: List[Document]) -> List[Document]:
        """Split documents into overlapping chunks"""
        chunks = self.text_splitter.split_documents(documents)
        return chunks
```

### Chunking Algorithm

```
RecursiveCharacterTextSplitter tries separators in order:

1. First try: "\n\n" (paragraph breaks)
   "Para 1\n\nPara 2\n\nPara 3" → ["Para 1", "Para 2", "Para 3"]

2. If chunks too big, try: "\n" (line breaks)
   "Line 1\nLine 2\nLine 3" → ["Line 1", "Line 2", "Line 3"]

3. If still too big, try: " " (word breaks)
   "Word1 Word2 Word3" → ["Word1", "Word2", "Word3"]

4. Last resort: "" (character by character)
   "ABCDEF" → ["AB", "CD", "EF"]
```

### Chunking Visualization

```
Original Document (5000 characters):
┌──────────────────────────────────────────────────────────────────────────────┐
│████████████████████████████████████████████████████████████████████████████│
└──────────────────────────────────────────────────────────────────────────────┘
  0                        2000                       4000                5000

After Chunking (chunk_size=2000, overlap=200):

Chunk 1: [0 ─────────────────────────── 2000]
                                   │
                              OVERLAP (200 chars)
                                   │
Chunk 2:                    [1800 ─────────────────────────── 3800]
                                                          │
                                                     OVERLAP (200 chars)
                                                          │
Chunk 3:                                           [3600 ─────────────── 5000]

Result: 3 chunks with overlapping content
```

### Why These Settings?

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `chunk_size=2000` | ~500 words | Fits in LLM context with multiple chunks |
| `chunk_overlap=200` | 10% | Preserves context at boundaries |
| `separators` | [\\n\\n, \\n, , ""] | Prefer semantic boundaries |

---

## Web Scraping

### Class: EnhancedWebLoader

**File:** `src/data/loaders/web_scraper.py`

```python
class EnhancedWebLoader:
    def __init__(self, config: dict):
        self.headers_to_split = config['processing']['headers_to_split_on_for_urls']
        
    def load(self, url: str, follow_toc: bool = True, max_pages: int = 10) -> List[Document]:
        """Scrape URL and optionally follow TOC links"""
        
        # 1. Fetch main page
        response = requests.get(url, timeout=30)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 2. Extract text content
        text = self._extract_text(soup)
        
        # 3. Convert to markdown
        markdown = self._html_to_markdown(soup)
        
        # 4. Optionally follow TOC links
        if follow_toc:
            toc_links = self._find_toc_links(soup)
            for link in toc_links[:max_pages]:
                sub_docs = self.load(link, follow_toc=False)
                # ... append sub_docs
        
        return documents
```

### Scraping Flow

```
URL: https://docs.example.com/guide

STEP 1: Fetch HTML
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│  <html>                                                          │
│    <nav>                                                         │
│      <a href="/intro">Introduction</a>                          │
│      <a href="/setup">Setup</a>                                  │
│    </nav>                                                        │
│    <main>                                                        │
│      <h1>Guide</h1>                                              │
│      <p>Welcome to the guide...</p>                             │
│    </main>                                                       │
│  </html>                                                         │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
STEP 2: Extract main content (ignore nav, footer, etc.)
        │
        ▼
STEP 3: Convert to Markdown
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│  # Guide                                                         │
│                                                                  │
│  Welcome to the guide...                                        │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
STEP 4: Save to data/raw/scraped/{domain}_{timestamp}.md
        │
        ▼
STEP 5: Immediately index (add to FAISS + BM25)
```

### Scraped File Format

```markdown
# Source: https://docs.example.com/guide

# Guide

Welcome to the guide...

## Section 1

Content of section 1...

## Section 2

Content of section 2...
```

---

## Markdown Header Splitting

### Class: ModifiedMarkdownHeaderTextSplitter

For documents with clear heading structure:

```python
class ModifiedMarkdownHeaderTextSplitter:
    def __init__(self, headers_to_split_on: List[Tuple[str, str]]):
        # [("##", "Header 2"), ("###", "Header 3"), ...]
        self.headers = headers_to_split_on
    
    def split_text(self, text: str) -> List[Document]:
        """Split markdown by headers"""
```

### Header-Based Splitting

```
Input Markdown:
┌─────────────────────────────────────────────────────────────────┐
│  # Main Title                                                    │
│                                                                  │
│  Introduction paragraph...                                       │
│                                                                  │
│  ## Section 1                                                    │
│                                                                  │
│  Content of section 1...                                        │
│                                                                  │
│  ### Subsection 1.1                                              │
│                                                                  │
│  Content of subsection 1.1...                                   │
│                                                                  │
│  ## Section 2                                                    │
│                                                                  │
│  Content of section 2...                                        │
└─────────────────────────────────────────────────────────────────┘

Output Chunks:
[
    Document(
        page_content="Introduction paragraph...",
        metadata={"Header 1": "Main Title"}
    ),
    Document(
        page_content="Content of section 1...",
        metadata={"Header 1": "Main Title", "Header 2": "Section 1"}
    ),
    Document(
        page_content="Content of subsection 1.1...",
        metadata={"Header 1": "Main Title", "Header 2": "Section 1", "Header 3": "Subsection 1.1"}
    ),
    Document(
        page_content="Content of section 2...",
        metadata={"Header 1": "Main Title", "Header 2": "Section 2"}
    )
]
```

---

## Code and Notebook Processing

### Class: CodeSplitter

**File:** `src/data/jupyter_and_code_spliter.py`

```python
class CodeSplitter:
    """Split code files by functions/classes"""
    
    LANGUAGE_CONFIGS = {
        'python': {
            'separators': ['\nclass ', '\ndef ', '\n\n', '\n'],
        },
        'javascript': {
            'separators': ['\nfunction ', '\nclass ', '\nconst ', '\n\n'],
        }
    }
```

### Jupyter Notebook Processing

```python
class JupyterNotebookSplitter:
    """Split notebooks by cells"""
    
    def split(self, notebook_path: str) -> List[Document]:
        with open(notebook_path) as f:
            nb = json.load(f)
        
        chunks = []
        for i, cell in enumerate(nb['cells']):
            cell_type = cell['cell_type']  # 'code' or 'markdown'
            content = ''.join(cell['source'])
            
            chunks.append(Document(
                page_content=content,
                metadata={
                    'source': notebook_path,
                    'cell_type': cell_type,
                    'cell_index': i
                }
            ))
        
        return chunks
```

---

## Office Document Conversion

### Class: OfficeConverter

**File:** `src/data/loaders/file_converter.py`

Uses LibreOffice for .doc and .odt files:

```python
class OfficeConverter:
    def __init__(self):
        self.libreoffice_path = self._find_libreoffice()
    
    def convert_to_pdf(self, input_path: str, output_dir: str) -> str:
        """Convert office doc to PDF for processing"""
        subprocess.run([
            self.libreoffice_path,
            '--headless',
            '--convert-to', 'pdf',
            '--outdir', output_dir,
            input_path
        ])
        return output_path
```

---

## Caching

### Embedding Cache

```python
def create_vectorstore(self, chunks: List[Document]):
    # Generate cache key from chunk content
    cache_key = hashlib.md5(
        ''.join([c.page_content[:100] for c in chunks]).encode()
    ).hexdigest()
    
    # Check cache
    cached = self.cache_manager.get(f"embeddings_{cache_key}")
    if cached:
        return FAISS.load_local(cached)
    
    # Compute embeddings
    vectorstore = FAISS.from_documents(chunks, self.embedding_model)
    
    # Save to cache
    self.cache_manager.set(f"embeddings_{cache_key}", vectorstore)
    
    return vectorstore
```

### Cache Directory Structure

```
cache/
├── bm25_abc123.pkl           # BM25 index
├── embeddings_def456.pkl     # Document embeddings
├── faiss_index/              # FAISS vector store
│   ├── index.faiss
│   └── index.pkl
└── chunks_ghi789.pkl         # Processed chunks
```

---

## Processing Pipeline

### Complete Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DATA PROCESSING PIPELINE                              │
│                                                                              │
│  ┌─────────────────────────┐                                                │
│  │  1. DOCUMENT LOADING    │                                                │
│  │                         │                                                │
│  │  data/raw/              │                                                │
│  │  ├── spec.pdf    ───────┼──► PyMuPDFLoader ─────┐                       │
│  │  ├── notes.txt   ───────┼──► TextLoader ────────┤                       │
│  │  └── scraped/    ───────┼──► MarkdownLoader ────┤                       │
│  │                         │                       │                        │
│  └─────────────────────────┘                       ▼                        │
│                                            List[Document]                    │
│                                                    │                         │
│  ┌─────────────────────────┐                       │                        │
│  │  2. TEXT SPLITTING      │◀──────────────────────┘                        │
│  │                         │                                                │
│  │  RecursiveCharacter     │                                                │
│  │  TextSplitter           │                                                │
│  │  chunk_size=2000        │                                                │
│  │  overlap=200            │                                                │
│  │                         │                                                │
│  └─────────────────────────┘                                                │
│              │                                                               │
│              ▼                                                               │
│       List[Document]  (248 chunks)                                          │
│              │                                                               │
│              ├────────────────────────────────┐                             │
│              │                                │                             │
│  ┌───────────▼─────────────┐    ┌─────────────▼─────────────┐              │
│  │  3. BM25 INDEXING       │    │  4. VECTOR INDEXING       │              │
│  │                         │    │                           │              │
│  │  Tokenize chunks        │    │  Embed with nomic-embed   │              │
│  │  Build inverted index   │    │  Store in FAISS           │              │
│  │  Cache to disk          │    │  Cache to disk            │              │
│  │                         │    │                           │              │
│  └─────────────────────────┘    └───────────────────────────┘              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Next: Retrieval System →

See [08_RETRIEVAL_SYSTEM.md](./08_RETRIEVAL_SYSTEM.md) for search algorithms.

---

*Author: Arnav Angarkar*
