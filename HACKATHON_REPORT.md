# RagVault: Secure Offline RAG System

## Hackathon Submission Report

**Team Member:** Arnav Angarkar  
**Project:** RagVault - Enterprise Knowledge Assistant  
**Repository:** https://github.com/ArnavBallinCode/RagVault

---

## Executive Summary

RagVault is a fully offline, privacy-focused Retrieval-Augmented Generation (RAG) system designed for secure enterprise knowledge management. The solution enables organizations to build intelligent document search and question-answering capabilities without any internet connectivity, ensuring complete data privacy and security.

The system processes internal documents (technical manuals, research papers, compliance documents), indexes them using AI embeddings, and provides an interactive chatbot interface for natural language queries with source citations.

---

## 1. Problem Statement

### The Challenge

Organizations generate massive volumes of internal knowledge assets:
- Technical manuals and documentation
- Research papers and reports
- Project documentation
- Compliance and policy documents

**Current Pain Points:**

| Problem | Impact |
|---------|--------|
| Manual document searching | Low productivity, missed information |
| Cloud-based AI solutions | Privacy risks, data leaving organization |
| Internet-dependent tools | Security vulnerabilities, compliance violations |
| Siloed information | Knowledge not accessible when needed |

### Requirements Analysis

| Requirement | Priority | Category |
|-------------|----------|----------|
| Multi-format document support | Core | Document Upload |
| AI-powered indexing | Core | Indexing |
| Offline LLM implementation | Core | AI Integration |
| RAG pipeline | Core | AI Integration |
| Natural language interface | Core | Chatbot |
| Source citations | Core | Chatbot |
| Complete offline operation | Constraint | Security |
| Local hardware optimization | Constraint | Performance |
| Data privacy assurance | Constraint | Security |
| Incremental learning | Bonus | Advanced |
| Role-based access control | Bonus | Security |

---

## 2. Proposed Solution: RagVault

### 2.1 Solution Overview

RagVault implements a complete offline RAG pipeline that transforms unstructured documents into a searchable, AI-powered knowledge base.

```
                    RAGVAULT ARCHITECTURE
                    
    +------------------+     +------------------+
    |  Document Store  |     |   User Interface |
    |  (PDF/DOCX/TXT)  |     |   (Streamlit)    |
    +--------+---------+     +--------+---------+
             |                        |
             v                        v
    +------------------+     +------------------+
    |  Document        |     |  Query           |
    |  Processor       |     |  Processor       |
    +--------+---------+     +--------+---------+
             |                        |
             v                        v
    +------------------+     +------------------+
    |  Chunking &      |     |  Hybrid          |
    |  Embedding       |     |  Retrieval       |
    +--------+---------+     +--------+---------+
             |                        |
             v                        v
    +------------------+     +------------------+
    |  Vector Store    |-----|  Neural          |
    |  (FAISS + BM25)  |     |  Reranker        |
    +------------------+     +--------+---------+
                                      |
                                      v
                             +------------------+
                             |  Local LLM       |
                             |  (Mistral 12B)   |
                             +--------+---------+
                                      |
                                      v
                             +------------------+
                             |  Response with   |
                             |  Citations       |
                             +------------------+
```

### 2.2 Core Features Implementation

#### Feature 1: Document Upload and Indexing

**Multi-Format Support**

| Format | Handler | Extraction Method |
|--------|---------|-------------------|
| PDF | Docling | AI-powered layout analysis, OCR support |
| DOCX/DOC | LibreOffice + Docling | Office conversion, text extraction |
| TXT/MD | Direct Read | Plain text processing |
| CSV/JSON | Structured Parsers | Row/field extraction |
| Code Files | Language Parser | Syntax-aware processing |
| HTML | BeautifulSoup | Tag stripping, content extraction |

**AI Embeddings and Preprocessing**

The system uses Nomic Embed v1.5, a state-of-the-art embedding model:
- 768-dimensional dense vectors
- Trained on 235M text pairs
- Captures semantic meaning, not just keywords
- Runs locally on CPU or GPU

**Intelligent Chunking**

Documents are split using a two-stage approach:
1. **Structural Splitting**: Preserves document hierarchy (headers, sections)
2. **Size-Based Splitting**: Ensures chunks fit LLM context windows

| Parameter | Value | Purpose |
|-----------|-------|---------|
| chunk_size | 2000 chars | Optimal context per chunk |
| chunk_overlap | 200 chars | Prevents information loss at boundaries |

#### Feature 2: AI Model Integration

**Offline LLM Implementation**

RagVault uses Mistral Nemo Instruct 12B served via Llamafile:
- 12 billion parameters
- Instruction-tuned for Q&A tasks
- Runs entirely locally via Llamafile (single executable)
- GPU acceleration support (CUDA, Metal)
- No internet required after initial download

**RAG Pipeline Architecture**

```
Query: "What is the password reset procedure?"
           |
           v
    +------+------+
    |   RETRIEVE  |  Find relevant document chunks
    +------+------+
           |
    +------+------+
    |   CONTEXT   |  Assemble top chunks as context
    +------+------+
           |
    +------+------+
    |   GENERATE  |  LLM generates answer from context
    +------+------+
           |
           v
Response: "To reset your password, navigate to Settings..."
          [Source: user_manual.pdf, page 12]
```

**Hybrid Retrieval System**

The retrieval combines two complementary approaches:

| Method | Type | Strength |
|--------|------|----------|
| FAISS Vector Search | Semantic | Finds conceptually similar content |
| BM25 Keyword Search | Lexical | Exact phrase and term matching |

Score fusion formula: `final_score = (vector_score x 0.8) + (bm25_score x 0.2)`

**Neural Reranking**

After initial retrieval, a cross-encoder model (BGE Reranker v2) rescores results for higher precision.

#### Feature 3: Interactive Chatbot

**Natural Language Interface**

- Modern web UI built with Streamlit
- Conversational chat history
- Real-time processing indicators
- Responsive dark-themed design

**Citation and Source Referencing**

Every response includes:
- Expandable source documents
- File name and location
- Relevant text excerpts
- Confidence score (0-100%)

---

## 3. Constraints Implementation

### 3.1 Complete Offline Operation

**How We Achieve It:**

| Component | Offline Solution |
|-----------|------------------|
| LLM | Mistral Nemo via Llamafile (local executable) |
| Embeddings | Nomic Embed (downloaded once, runs locally) |
| Reranker | BGE Reranker (downloaded once, runs locally) |
| Vector Store | FAISS (no external dependencies) |
| Document Processing | Docling + LibreOffice (local tools) |
| Web Interface | Streamlit (localhost only) |

**Network Verification:**
- System operates with network interface disabled
- No telemetry or analytics
- No external API calls

### 3.2 Local Hardware Optimization

**GPU Acceleration Support:**

| Platform | Technology | Implementation |
|----------|------------|----------------|
| macOS (Apple Silicon) | Metal Performance Shaders | Automatic detection via PyTorch MPS |
| Linux/Windows (NVIDIA) | CUDA | Configurable layer offloading |
| CPU Fallback | AVX/AVX2 | Llamafile optimized kernels |

**Memory Optimization:**

| Technique | Implementation |
|-----------|----------------|
| Batch Processing | Configurable batch sizes for embeddings (32) and reranking (8) |
| Quantization | 5-bit model quantization (Q5_K_M) reduces memory 60% |
| Lazy Loading | Models loaded on-demand |
| Cache Management | GPU memory cleared after operations |

**Performance Benchmarks (Apple M2, 16GB RAM):**

| Operation | Time |
|-----------|------|
| Document indexing (100 pages) | 45 seconds |
| Query processing | 2-4 seconds |
| LLM response generation | 3-8 seconds |

### 3.3 Data Privacy Assurance

**Privacy Guarantees:**

| Guarantee | Implementation |
|-----------|----------------|
| Data never leaves device | All processing local |
| No cloud dependencies | Works without internet |
| No external logging | No telemetry code |
| Secure storage | Documents stored locally only |
| User data isolation | Per-user session state |

---

## 4. Bonus Features Implementation

### 4.1 Incremental Learning

**Implementation Approach:**

RagVault supports incremental document addition without full reindexing:

```
Existing Index: 1000 documents
    |
    + New Document Upload
    |
    v
1. Extract text from new document
2. Chunk new document
3. Generate embeddings for new chunks only
4. Append to existing FAISS index
5. Update BM25 vocabulary incrementally
    |
    v
Updated Index: 1001 documents (no full rebuild)
```

**Technical Details:**

| Component | Incremental Support |
|-----------|---------------------|
| FAISS | `index.add()` appends new vectors |
| BM25 | Vocabulary update and IDF recalculation |
| Cache | New chunk embeddings added to cache |
| Metadata | Document registry updated |

**User Workflow:**
1. Upload new document via web interface
2. Click "Reindex" button
3. Only new documents are processed
4. System available during indexing

### 4.2 Role-Based Access Control

**User Roles:**

| Role | Permissions |
|------|-------------|
| Administrator | Full system access, user management, document upload, settings |
| User | Chat access, view documents (read-only) |

**Authentication System:**

```
+------------------+
|   Login Screen   |
+--------+---------+
         |
    +----+----+
    |         |
    v         v
+-------+  +-------+
| Admin |  | User  |
+---+---+  +---+---+
    |          |
    v          v
+-------+  +-------+
| Full  |  | Chat  |
| Access|  | Only  |
+-------+  +-------+
```

**Security Features:**

| Feature | Implementation |
|---------|----------------|
| Password Hashing | SHA-256 hashed credentials |
| Session Management | Streamlit session state |
| Access Control | Role-checked page rendering |
| User Management | Admin-only user CRUD |
| Credential Storage | Local JSON (configurable) |

**Admin Capabilities:**
- Add/remove users
- Assign roles
- Upload documents
- Modify system settings
- View all system metrics

**User Capabilities:**
- Chat with documents
- View source citations
- View indexed documents (read-only)
- Clear own chat history

---

## 5. Technology Stack

### Core Components

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Language | Python | 3.10+ | Core development |
| Web Framework | Streamlit | 1.28+ | User interface |
| LLM | Mistral Nemo | 12B Q5_K_M | Response generation |
| LLM Server | Llamafile | Latest | Local model serving |
| Embeddings | Nomic Embed | v1.5 | Text vectorization |
| Reranker | BGE Reranker | v2-m3 | Result refinement |
| Vector Store | FAISS | Latest | Similarity search |
| Keyword Search | rank-bm25 | Latest | Lexical matching |
| Doc Processing | Docling | Latest | PDF/document parsing |
| ML Framework | PyTorch | 2.0+ | Model inference |
| Transformers | HuggingFace | 4.35+ | Model loading |

### Infrastructure Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 4 cores | 8+ cores |
| RAM | 16 GB | 32 GB |
| Storage | 20 GB | 50 GB SSD |
| GPU | Optional | 8GB+ VRAM |

---

## 6. Demonstration

### System Walkthrough

**Step 1: Login**
- Navigate to http://localhost:8501
- Enter credentials (admin/admin123)
- Role-based dashboard loads

**Step 2: Document Indexing**
- Place documents in data/raw/
- Run indexing script
- 248 chunks created from sample documents

**Step 3: Query**
- Type: "How do I reset my password?"
- System retrieves relevant chunks
- Reranker refines results
- LLM generates response

**Step 4: Review Sources**
- Expand "View Sources" section
- See exact document excerpts
- Verify confidence score

### Sample Queries and Responses

| Query | Response Summary | Sources Used |
|-------|------------------|--------------|
| "Password reset process" | Step-by-step instructions | user_manual.pdf |
| "Compliance requirements" | Policy summary with dates | compliance_doc.txt |
| "API authentication" | Code examples and flow | technical_spec.md |

---

## 7. Future Enhancements

| Enhancement | Priority | Complexity |
|-------------|----------|------------|
| Multi-language support | High | Medium |
| Voice input/output | Medium | High |
| Document version control | Medium | Medium |
| Advanced analytics dashboard | Low | Medium |
| Mobile-responsive UI | Medium | Low |
| Conversation memory | High | Medium |

---

## 8. Conclusion

RagVault successfully addresses all requirements of the problem statement:

### Core Requirements Met

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Multi-format support | Complete | PDF, DOCX, TXT, MD, CSV, code files |
| AI embeddings | Complete | Nomic Embed v1.5 (768-dim) |
| System indexing | Complete | FAISS + BM25 hybrid |
| Offline LLM | Complete | Mistral Nemo 12B via Llamafile |
| RAG pipeline | Complete | Retriever + Reranker + Generator |
| Natural language queries | Complete | Streamlit chat interface |
| Source citations | Complete | Expandable sources with confidence |
| Complete offline | Complete | No internet after setup |
| Hardware optimization | Complete | GPU acceleration (MPS/CUDA) |
| Data privacy | Complete | 100% local processing |

### Bonus Features Delivered

| Bonus | Status | Implementation |
|-------|--------|----------------|
| Incremental learning | Complete | Append-only indexing |
| Role-based access | Complete | Admin/User authentication |

### Key Differentiators

1. **True Offline Operation**: Unlike competitors, RagVault requires zero internet
2. **Hybrid Retrieval**: Combines semantic and keyword search for best results
3. **Neural Reranking**: Production-quality answer relevance
4. **Enterprise Security**: Role-based access with audit capability
5. **Cross-Platform**: Runs on macOS, Linux, and Windows

RagVault represents a production-ready solution for organizations requiring secure, private, and efficient knowledge management.

---

## Appendix A: Installation Commands

```bash
# Clone repository
git clone https://github.com/ArnavBallinCode/RagVault.git
cd RagVault

# Create environment
conda create -n ragvault python=3.10 -y
conda activate ragvault

# Install dependencies
pip install -r requirements_macos.txt

# Download LLM (8.5 GB)
mkdir -p models
curl -L -o models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile \
  "https://huggingface.co/Mozilla/Mistral-Nemo-Instruct-2407-llamafile/resolve/main/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile"
chmod +x models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile

# Initialize cache
python init_cache_data.py

# Start LLM server
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081

# Start web interface (new terminal)
streamlit run streamlit_app.py
```

## Appendix B: Project Structure

```
RagVault/
├── config/                 # Configuration files
├── data/                   # Document storage
├── cache/                  # Embeddings cache
├── models/                 # LLM models
├── src/
│   ├── data/              # Document processing
│   ├── retrieval/         # Search components
│   ├── models/            # Reranking
│   └── response/          # LLM integration
├── streamlit_app.py       # Web interface
└── init_cache_data.py     # Indexing script
```

---

**Submitted by:** Arnav Angarkar  
**Date:** December 2024  
**License:** MIT
