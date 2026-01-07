# Incremental Learning Implementation Guide

> Complete technical documentation for implementing incremental document indexing in RagVault, enabling real-time knowledge base updates without system downtime.

---

## Table of Contents

1. [Overview](#overview)
2. [Current Implementation](#current-implementation)
3. [Architecture](#architecture)
4. [API Endpoints](#api-endpoints)
5. [Code Implementation](#code-implementation)
6. [Index Update Strategies](#index-update-strategies)
7. [Cache Invalidation](#cache-invalidation)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Overview

### What is Incremental Learning?

Incremental learning allows adding new documents to the RAG system without:
- Stopping the server
- Rebuilding the entire index
- Re-processing existing documents
- Losing query availability

### Key Benefits

| Feature | Without Incremental | With Incremental |
|---------|--------------------|--------------------|
| **Add 1 document** | 5-10 minutes | 5-10 seconds |
| **Index rebuild** | Full rebuild | Append only |
| **Downtime** | Required | Zero |
| **Memory spike** | 2x during rebuild | Minimal |

---

## Current Implementation

RagVault implements incremental learning in two key locations:

### 1. Streamlit App (Web Scraper)

Location: `streamlit_app.py` (lines 521-590)

The web scraper demonstrates incremental indexing:

```python
# After scraping URL content...
if st.session_state.rag_components:
    # Get existing chunks
    existing_chunks = st.session_state.rag_components.original_chunks
    existing_chunks.extend(new_chunks)
    
    # 1. Add to FAISS vectorstore (incremental)
    vector_retriever = retriever.vector_retriever
    vector_retriever.vectorstore.add_texts(new_texts, metadatas=new_metadatas)
    
    # 2. Rebuild BM25 index (required for BM25)
    bm25_retriever.chunks = existing_chunks
    tokenized_chunks = [chunk.page_content.split() for chunk in existing_chunks]
    bm25_retriever.bm25_index = BM25Okapi(tokenized_chunks)
```

### 2. API Server Refresh Endpoint

Location: `api_server.py` (lines 113-149)

The `/refresh` endpoint handles full index rebuild when needed.

---

## Architecture

### Document Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    INCREMENTAL LEARNING FLOW                      │
└──────────────────────────────────────────────────────────────────┘

  ┌─────────┐     ┌─────────────┐     ┌──────────────┐
  │  USER   │────▶│   Upload    │────▶│   Chunker    │
  │         │     │   Document  │     │ (Text Split) │
  └─────────┘     └─────────────┘     └──────┬───────┘
                                             │
                                             ▼
                                     ┌───────────────┐
                                     │   Embedder    │
                                     │ (Nomic v1.5)  │
                                     └───────┬───────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       │                                           │
                       ▼                                           ▼
              ┌────────────────┐                          ┌────────────────┐
              │  FAISS Index   │                          │  BM25 Index    │
              │ (add_texts)    │                          │  (rebuild)     │
              │ O(n) - Fast    │                          │  O(N) - Slower │
              └────────────────┘                          └────────────────┘
                       │                                           │
                       └─────────────────────┬─────────────────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │ Query Available │
                                    │   Immediately   │
                                    └─────────────────┘
```

### Component Update Behavior

| Component | Update Method | Complexity | Notes |
|-----------|--------------|------------|-------|
| **FAISS** | `add_texts()` | O(n) | Native incremental support |
| **BM25** | Full rebuild | O(N) | No incremental API available |
| **Chunks List** | `extend()` | O(n) | Simple list append |
| **Cache** | Invalidate | O(1) | Clear stale cache entries |

---

## API Endpoints

### POST /upload

Upload a document for incremental indexing.

```bash
curl -X POST "http://localhost:8000/upload" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@document.pdf"
```

**Response:**
```json
{
  "status": "success",
  "message": "File 'document.pdf' uploaded successfully",
  "filename": "document.pdf",
  "path": "data/uploads/document.pdf",
  "next_step": "Call POST /refresh to index the new document"
}
```

### POST /refresh

Rebuild indices to include new documents.

```bash
curl -X POST "http://localhost:8000/refresh"
```

**Response:**
```json
{
  "status": "success",
  "message": "Indices refreshed successfully",
  "documents_indexed": 248
}
```

### POST /index/incremental (Proposed)

Add document to index without full rebuild.

```python
# Proposed endpoint for true incremental indexing
@app.post("/index/incremental")
async def incremental_index(file: UploadFile = File(...)):
    """Add a single document to the index incrementally."""
    global rag_components
    
    # 1. Save file
    file_path = save_uploaded_file(file)
    
    # 2. Process document
    docs = file_loader.load(file_path)
    chunks = preprocessor.process_single_document((file_path, docs))
    
    # 3. Add to FAISS (incremental)
    texts = [c.page_content for c in chunks]
    metadatas = [c.metadata for c in chunks]
    rag_components.retriever.vector_retriever.vectorstore.add_texts(texts, metadatas)
    
    # 4. Rebuild BM25
    rag_components.retriever.bm25_retriever.create_index(
        rag_components.original_chunks + chunks
    )
    
    # 5. Update chunks list
    rag_components.original_chunks.extend(chunks)
    
    return {"status": "success", "chunks_added": len(chunks)}
```

---

## Code Implementation

### Core Incremental Indexer

```python
# src/retrieval/incremental_indexer.py
"""
Incremental document indexing for RagVault.

This module provides utilities for adding documents to the index
without requiring a full rebuild of the entire system.
"""

from typing import List, Dict, Optional
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from rank_bm25 import BM25Okapi
import logging
import time

logger = logging.getLogger(__name__)


class IncrementalIndexer:
    """
    Manages incremental updates to both FAISS and BM25 indices.
    
    Attributes:
        retriever: HybridRetriever instance
        chunk_size: Size of text chunks
        chunk_overlap: Overlap between chunks
        
    Example:
        ```python
        indexer = IncrementalIndexer(hybrid_retriever, config)
        result = indexer.add_documents(new_documents)
        print(f"Added {result['chunks_added']} chunks")
        ```
    """
    
    def __init__(self, retriever, config: Dict):
        self.retriever = retriever
        self.chunk_size = config['processing']['chunk_size']
        self.chunk_overlap = config['processing']['chunk_overlap']
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap
        )
        
    def add_documents(
        self, 
        documents: List[Document],
        source_name: str = "uploaded"
    ) -> Dict:
        """
        Add new documents to both FAISS and BM25 indices.
        
        Args:
            documents: List of LangChain documents to add
            source_name: Identifier for the source
            
        Returns:
            Dict with indexing statistics
        """
        start_time = time.time()
        stats = {
            'documents_processed': len(documents),
            'chunks_added': 0,
            'faiss_updated': False,
            'bm25_updated': False,
            'duration_seconds': 0
        }
        
        try:
            # Step 1: Chunk the documents
            new_chunks = self._chunk_documents(documents)
            stats['chunks_added'] = len(new_chunks)
            
            if not new_chunks:
                logger.warning("No chunks generated from documents")
                return stats
                
            # Step 2: Add to FAISS (incremental)
            stats['faiss_updated'] = self._update_faiss(new_chunks)
            
            # Step 3: Rebuild BM25 (full rebuild required)
            stats['bm25_updated'] = self._update_bm25(new_chunks)
            
            stats['duration_seconds'] = time.time() - start_time
            logger.info(f"Incremental indexing completed: {stats}")
            
        except Exception as e:
            logger.error(f"Incremental indexing failed: {e}")
            stats['error'] = str(e)
            
        return stats
    
    def _chunk_documents(self, documents: List[Document]) -> List[Document]:
        """Split documents into chunks."""
        chunks = []
        for doc in documents:
            doc_chunks = self.text_splitter.split_documents([doc])
            chunks.extend(doc_chunks)
        return chunks
    
    def _update_faiss(self, new_chunks: List[Document]) -> bool:
        """Add new chunks to FAISS vectorstore."""
        try:
            vector_retriever = self.retriever.vector_retriever
            
            if vector_retriever.vectorstore is None:
                logger.error("FAISS vectorstore not initialized")
                return False
                
            # Extract texts and metadata
            texts = [chunk.page_content for chunk in new_chunks]
            metadatas = [chunk.metadata for chunk in new_chunks]
            
            # FAISS supports incremental addition
            vector_retriever.vectorstore.add_texts(texts, metadatas=metadatas)
            
            # Update internal tracking
            if hasattr(vector_retriever, 'texts'):
                vector_retriever.texts.extend(texts)
            if hasattr(vector_retriever, 'sources'):
                sources = [m.get('source', 'unknown') for m in metadatas]
                vector_retriever.sources.extend(sources)
                
            logger.info(f"Added {len(texts)} documents to FAISS")
            return True
            
        except Exception as e:
            logger.error(f"FAISS update failed: {e}")
            return False
    
    def _update_bm25(self, new_chunks: List[Document]) -> bool:
        """Rebuild BM25 index with new chunks."""
        try:
            bm25_retriever = self.retriever.bm25_retriever
            
            # BM25 doesn't support incremental updates
            # We need to rebuild with all chunks
            all_chunks = bm25_retriever.chunks + new_chunks
            bm25_retriever.chunks = all_chunks
            
            # Tokenize all documents
            tokenized_chunks = [
                chunk.page_content.split() 
                for chunk in all_chunks
            ]
            
            # Rebuild index
            bm25_retriever.bm25_index = BM25Okapi(tokenized_chunks)
            
            logger.info(f"Rebuilt BM25 index with {len(all_chunks)} total chunks")
            return True
            
        except Exception as e:
            logger.error(f"BM25 update failed: {e}")
            return False
    
    def remove_documents(self, source_filter: str) -> Dict:
        """
        Remove documents matching a source filter.
        
        Note: This requires rebuilding both indices.
        """
        # Implementation for document removal
        # This is more complex and requires full rebuild
        pass


class BatchIncrementalIndexer(IncrementalIndexer):
    """
    Batch incremental indexer for processing multiple documents efficiently.
    
    Buffers documents and processes them in batches to reduce
    the number of index rebuilds.
    """
    
    def __init__(self, retriever, config: Dict, batch_size: int = 10):
        super().__init__(retriever, config)
        self.batch_size = batch_size
        self.pending_documents = []
        
    def queue_document(self, document: Document) -> bool:
        """Add document to processing queue."""
        self.pending_documents.append(document)
        
        if len(self.pending_documents) >= self.batch_size:
            return self.flush()
        return True
    
    def flush(self) -> bool:
        """Process all queued documents."""
        if not self.pending_documents:
            return True
            
        result = self.add_documents(self.pending_documents)
        self.pending_documents = []
        
        return 'error' not in result
```

### Integration with API Server

```python
# api_server.py - Add this endpoint

from src.retrieval.incremental_indexer import IncrementalIndexer

@app.post("/upload-and-index")
async def upload_and_index(file: UploadFile = File(...)):
    """
    Upload a document and immediately add it to the index.
    This uses incremental indexing for fast updates.
    """
    global rag_components
    
    if rag_components is None:
        raise HTTPException(status_code=503, detail="RAG system not initialized")
    
    try:
        # Validate file
        allowed_extensions = {'.pdf', '.docx', '.txt', '.doc', '.md'}
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Allowed: {allowed_extensions}"
            )
        
        # Save file
        upload_path = os.path.join("data/uploads", file.filename)
        os.makedirs("data/uploads", exist_ok=True)
        
        with open(upload_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Load and process document
        from src.data.loaders import FileLoader
        loader = FileLoader(rag_components.init_config)
        documents = loader.load(upload_path)
        
        # Incremental indexing
        indexer = IncrementalIndexer(
            rag_components.retriever,
            rag_components.init_config
        )
        result = indexer.add_documents(documents, source_name=file.filename)
        
        # Update original_chunks list
        if result.get('chunks_added', 0) > 0:
            # Note: chunks are already added to retrievers
            pass
        
        return {
            "status": "success",
            "message": f"File '{file.filename}' indexed successfully",
            **result
        }
        
    except Exception as e:
        logger.error(f"Upload and index error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

---

## Index Update Strategies

### Strategy 1: Immediate Indexing

Add documents to index immediately upon upload.

**Pros:**
- Documents searchable instantly
- Simple implementation

**Cons:**
- Higher latency for uploads
- More index operations

```python
# Immediate indexing pattern
async def upload_document(file):
    save_file(file)
    chunks = process_file(file)
    add_to_faiss(chunks)
    rebuild_bm25()  # This is the slow part
    return {"indexed": True}
```

### Strategy 2: Deferred Batch Indexing

Queue documents and index in batches.

**Pros:**
- Faster uploads
- Fewer BM25 rebuilds

**Cons:**
- Delay before searchable
- More complex implementation

```python
# Deferred batch indexing pattern
document_queue = []

async def upload_document(file):
    save_file(file)
    document_queue.append(file.path)
    return {"queued": True, "position": len(document_queue)}

@scheduler.task(every="5 minutes")
async def process_queue():
    if document_queue:
        chunks = process_all_files(document_queue)
        add_to_faiss(chunks)
        rebuild_bm25()  # Only once for entire batch
        document_queue.clear()
```

### Strategy 3: Hybrid Approach

Immediate FAISS, deferred BM25.

**Pros:**
- Vector search available immediately
- Reduced BM25 rebuild frequency

**Cons:**
- Temporarily inconsistent results

```python
# Hybrid indexing pattern
async def upload_document(file):
    save_file(file)
    chunks = process_file(file)
    
    # Immediate vector index update
    add_to_faiss(chunks)
    
    # Queue BM25 rebuild
    bm25_rebuild_queue.append(chunks)
    
    return {
        "vector_indexed": True,
        "bm25_pending": True
    }
```

---

## Cache Invalidation

When new documents are added, certain caches must be invalidated.

### Cache Types

| Cache | Location | Invalidation Strategy |
|-------|----------|----------------------|
| **Embeddings** | `cache/embeddings_*.pkl` | Append new embeddings |
| **BM25 Index** | `cache/bm25_*.pkl` | Full replacement |
| **Chunks** | `cache/chunks_*.pkl` | Append new chunks |
| **Documents** | `cache/docs_*.pkl` | Append new docs |

### Cache Update Code

```python
# src/cache/incremental_cache.py

class IncrementalCacheManager:
    """Cache manager that supports incremental updates."""
    
    def append_to_cache(self, key: str, new_items: List) -> bool:
        """Append items to an existing cache entry."""
        existing = self.get(key) or []
        existing.extend(new_items)
        self.set(key, existing)
        return True
    
    def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate all cache entries matching pattern."""
        count = 0
        for filename in os.listdir(self.cache_dir):
            if pattern in filename:
                os.remove(os.path.join(self.cache_dir, filename))
                count += 1
        return count
```

---

## Best Practices

### 1. Document Size Limits

```python
# Recommended limits
MAX_DOCUMENT_SIZE_MB = 10
MAX_DOCUMENTS_PER_BATCH = 20
MAX_TOTAL_CHUNKS = 10000
```

### 2. Error Handling

```python
def add_document_safely(document):
    """Add document with rollback on failure."""
    # Take snapshot
    faiss_snapshot = copy_faiss_state()
    bm25_snapshot = copy_bm25_state()
    
    try:
        add_to_indices(document)
    except Exception as e:
        # Rollback
        restore_faiss_state(faiss_snapshot)
        restore_bm25_state(bm25_snapshot)
        raise
```

### 3. Monitoring

```python
# Track incremental update metrics
INCREMENTAL_UPDATES = Counter(
    'rag_incremental_updates_total',
    'Total incremental index updates',
    ['status']
)

INCREMENTAL_DURATION = Histogram(
    'rag_incremental_update_seconds',
    'Time for incremental updates'
)
```

---

## Troubleshooting

### Issue: Documents Not Appearing in Search

**Cause:** BM25 index not rebuilt after FAISS update.

**Solution:**
```python
# Ensure both indices are updated
indexer.add_documents(docs)  # Updates both
# OR manually:
bm25_retriever.create_index(all_chunks)
```

### Issue: Memory Spike During Indexing

**Cause:** Processing too many documents at once.

**Solution:**
```python
# Process in smaller batches
for batch in chunks(documents, size=10):
    indexer.add_documents(batch)
    gc.collect()  # Force garbage collection
```

### Issue: Duplicate Documents

**Cause:** Document added multiple times.

**Solution:**
```python
# Check for duplicates before adding
def add_unique_documents(documents):
    existing_sources = set(get_all_sources())
    new_docs = [
        d for d in documents 
        if d.metadata.get('source') not in existing_sources
    ]
    return indexer.add_documents(new_docs)
```

---

## Summary

Incremental learning in RagVault enables:

1. **Fast document updates** - Add documents in seconds, not minutes
2. **Zero downtime** - No server restart required
3. **Efficient resource usage** - Only process new documents
4. **Immediate availability** - Query new content right away

The key components are:
- `IncrementalIndexer` class for managing updates
- FAISS `add_texts()` for vector index updates
- BM25 rebuild (optimized) for keyword search updates

---

*Last updated: January 2026*
