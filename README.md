# RagVault - Secure Offline RAG System

A fully offline, privacy-focused Retrieval-Augmented Generation (RAG) system designed for secure enterprise knowledge management. Process and query internal documents without any internet connectivity or external API dependencies.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [System Requirements](#system-requirements)
4. [Architecture](#architecture)
5. [Installation](#installation)
6. [Configuration](#configuration)
7. [Usage](#usage)
8. [Supported File Types](#supported-file-types)
9. [Project Structure](#project-structure)
10. [Troubleshooting](#troubleshooting)
11. [License](#license)

---

## Overview

RagVault enables organizations to build a secure, private knowledge base from internal documents. Unlike cloud-based solutions, all processing occurs locally on your hardware, ensuring complete data privacy and security.

### Core Capabilities

- **Document Ingestion**: Process PDF, DOCX, TXT, and other formats into searchable chunks
- **Semantic Search**: Hybrid retrieval using both vector similarity and keyword matching (BM25)
- **Response Generation**: Local LLM generates answers based solely on your indexed documents
- **Access Control**: Role-based authentication with Admin and User roles
- **Complete Offline Operation**: No internet required after initial setup

---

## Features

### Document Upload and Indexing
- Multi-format support (PDF, DOCX, TXT, Markdown)
- Automatic text extraction and preprocessing
- Intelligent chunking with configurable overlap
- AI-powered embeddings using Nomic Embed
- FAISS vector store for efficient similarity search

### Web Scraping
- **URL Web Scraper**: Scrape content from any website directly from the UI
- Automatic Table of Contents (TOC) traversal for multi-page documentation
- Configurable CSS selectors for navigation links
- Immediate indexing of scraped content for instant querying
- Saved as Markdown files for persistence

### AI Model Integration
- Local LLM via Llamafile (Mistral Nemo 12B)
- Hybrid RAG pipeline combining BM25 and vector retrieval
- Neural reranking with BGE Reranker
- Document-grounded responses with source citations

### Interactive Interface
- Modern web UI built with Streamlit
- Natural language query interface
- Source citation and document referencing
- Confidence scoring for responses
- Role-based access control

### Security and Privacy
- 100% offline operation
- No external API calls or telemetry
- Local data processing and storage
- Role-based user authentication

---

## System Requirements

### Minimum Hardware

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores | 8+ cores |
| RAM | 16 GB | 32 GB |
| Storage | 20 GB free | 50 GB+ SSD |
| GPU | Not required | 8GB+ VRAM (optional) |

### Software Requirements

| Platform | Python | Package Manager | Document Converter |
|----------|--------|-----------------|-------------------|
| macOS | 3.10+ | conda/pip | LibreOffice |
| Linux | 3.10+ | conda/pip | LibreOffice |
| Windows | 3.10+ | conda/pip | LibreOffice |

### GPU Acceleration

- **macOS (Apple Silicon)**: Uses Metal Performance Shaders (MPS) automatically
- **Linux/Windows (NVIDIA)**: Requires CUDA 12.x and compatible drivers
- **CPU-only**: Fully functional but slower inference

---

## Architecture

### System Components

```
+-------------------+     +-------------------+     +-------------------+
|   Web Interface   |     |    RAG Pipeline   |     |    LLM Server     |
|   (Streamlit)     |<--->|   (Python Core)   |<--->|   (Llamafile)     |
+-------------------+     +-------------------+     +-------------------+
                                   |
                    +--------------+--------------+
                    |              |              |
              +-----v-----+  +-----v-----+  +-----v-----+
              |   FAISS   |  |   BM25    |  |  Reranker |
              |  Vectors  |  |   Index   |  |   Model   |
              +-----------+  +-----------+  +-----------+
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Streamlit | Web interface with authentication |
| Embeddings | Nomic Embed v1.5 | Text vectorization (768-dim) |
| Vector Store | FAISS | Similarity search |
| Keyword Search | BM25 (rank-bm25) | Lexical matching |
| Reranking | BGE Reranker v2 | Result refinement |
| LLM | Mistral Nemo 12B | Response generation |
| LLM Server | Llamafile | Local model serving |
| Document Processing | Docling, LangChain | Text extraction and chunking |

### RAG Pipeline Flow

1. **Query Input**: User submits natural language question
2. **Retrieval**: Hybrid search combines FAISS (semantic) and BM25 (keyword)
3. **Reranking**: BGE model reorders results by relevance
4. **Context Assembly**: Top-k chunks assembled as context
5. **Generation**: LLM generates response grounded in retrieved context
6. **Citation**: Sources attached to response for verification

### URL Web Scraper - Technical Deep Dive

The URL Web Scraper enables real-time ingestion of web content directly into the RAG system.

#### Architecture

```
+-------------------+     +-------------------+     +-------------------+
|   User Input      |     | EnhancedWebLoader |     |   Docling         |
|   (URL + Options) |---->|   (Async Crawler) |---->|   (HTML→Markdown) |
+-------------------+     +-------------------+     +-------------------+
                                   |
                    +--------------+--------------+
                    |                             |
              +-----v-----+                 +-----v-----+
              | TOC Links |                 |  Content  |
              | Traversal |                 | Extraction|
              +-----------+                 +-----------+
                    |                             |
                    +-------------+---------------+
                                  v
                    +----------------------------+
                    |     Direct Indexing        |
                    |  (Bypasses Cache System)   |
                    +----------------------------+
                          |             |
                    +-----v-----+ +-----v-----+
                    |   FAISS   | |   BM25    |
                    | add_texts | |  Rebuild  |
                    +-----------+ +-----------+
```

#### Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| Crawler | aiohttp + asyncio | Asynchronous page fetching |
| Parser | BeautifulSoup | TOC link extraction |
| Converter | Docling | HTML to Markdown conversion |
| Chunker | RecursiveCharacterTextSplitter | Text segmentation |
| Vector Index | FAISS.add_texts() | Live vector addition |
| Keyword Index | BM25Okapi | Full index rebuild |

#### Indexing Pipeline

1. **Scrape**: `EnhancedWebLoader` fetches URL content asynchronously
2. **Convert**: Docling converts HTML to clean Markdown
3. **Save**: Content saved to `data/raw/scraped/` as `.md` files
4. **Chunk**: `RecursiveCharacterTextSplitter` segments content (bypasses cache)
5. **Embed**: FAISS `add_texts()` generates embeddings and adds to vector store
6. **Index**: BM25 index rebuilt with all chunks including new content
7. **Ready**: Content immediately available for RAG queries

#### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| Traverse TOC | Follow navigation links | `true` |
| TOC Selector | CSS selector for nav links | `.toc a, nav a` |
| Chunk Size | Characters per chunk | From `init_config.yaml` |
| Chunk Overlap | Overlap between chunks | From `init_config.yaml` |

---

## Installation

### Option 1: Docker (Recommended)

The easiest way to run the RAG system. Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
# 1. Clone the repository
git clone https://github.com/ArnavBallinCode/RagVault.git
cd RagVault

# 2. Download the LLM model (8.5 GB) - one time only
mkdir -p models
curl -L -o models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile \
  "https://huggingface.co/Mozilla/Mistral-Nemo-Instruct-2407-llamafile/resolve/main/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile"

# 3. Start with one command
./docker-start.sh
```

**Access:** http://localhost:8501

**Docker Commands:**
| Command | Purpose |
|---------|---------|
| `./docker-start.sh` | Start the system |
| `./docker-start.sh --download` | Download LLM model (8.5 GB) |
| `./docker-start.sh --stop` | Stop containers |
| `./docker-start.sh --logs` | View logs |
| `./docker-start.sh --cleanup` | Remove containers and images |

---

### Option 2: Manual Installation

#### macOS (Apple Silicon / Intel)

```bash
# 1. Install LibreOffice (required for Office document conversion)
brew install --cask libreoffice

# 2. Clone the repository
git clone https://github.com/ArnavBallinCode/RagVault.git
cd RagVault

# 3. Create and activate conda environment
conda create -n ragvault python=3.10 -y
conda activate ragvault

# 4. Install dependencies
pip install -r requirements_macos.txt

# 5. Download the LLM model (8.5 GB)
mkdir -p models
curl -L -o models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile \
  "https://huggingface.co/Mozilla/Mistral-Nemo-Instruct-2407-llamafile/resolve/main/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile"
chmod +x models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile

# 6. Initialize the document cache
python init_cache_data.py

# 7. Start the LLM server (in a separate terminal)
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081

# 8. Launch the web interface (in another terminal)
conda activate ragvault
streamlit run streamlit_app.py
```

### Linux (Ubuntu/Debian)

```bash
# 1. Install system dependencies
sudo apt update
sudo apt install -y libreoffice python3.10 python3.10-venv

# 2. Clone the repository
git clone https://github.com/ArnavBallinCode/RagVault.git
cd RagVault

# 3. Create virtual environment
python3.10 -m venv venv
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements_rag.txt

# 5. Download the LLM model
mkdir -p models
wget -O models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile \
  "https://huggingface.co/Mozilla/Mistral-Nemo-Instruct-2407-llamafile/resolve/main/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile"
chmod +x models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile

# 6. For NVIDIA GPU support (optional)
# Ensure CUDA 12.x is installed, then:
# ./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 12 --port 8081

# 7. Initialize and run (same as macOS steps 6-8)
python init_cache_data.py
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081 &
streamlit run streamlit_app.py
```

### Windows

```powershell
# 1. Install prerequisites
# - Download and install Python 3.10 from python.org
# - Download and install LibreOffice from libreoffice.org
# - Install Anaconda or Miniconda

# 2. Clone the repository
git clone https://github.com/ArnavBallinCode/RagVault.git
cd RagVault

# 3. Create conda environment
conda create -n ragvault python=3.10 -y
conda activate ragvault

# 4. Install dependencies (note: use CPU-compatible torch)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements_rag.txt

# 5. Download the LLM model (use browser or curl if available)
# Save to: models\Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile

# 6. Windows-specific: Llamafile may need .exe extension
# Rename the file to .exe if it doesn't run directly

# 7. Initialize the cache
python init_cache_data.py

# 8. Start LLM server (in Command Prompt)
.\models\Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser --port 8081

# 9. Start web interface (in another Command Prompt)
conda activate ragvault
streamlit run streamlit_app.py
```

### Platform-Specific Notes

| Platform | GPU Acceleration | LLM Flag | Config Change |
|----------|-----------------|----------|---------------|
| macOS (Apple Silicon) | MPS (automatic) | `-ngl 999` | `device_rerank: "mps"` |
| macOS (Intel) | CPU only | (none) | `device_rerank: "cpu"` |
| Linux (NVIDIA) | CUDA | `-ngl 12` to `-ngl 99` | `device_rerank: "cuda"` |
| Linux (AMD/CPU) | CPU only | (none) | `device_rerank: "cpu"` |
| Windows (NVIDIA) | CUDA | `-ngl 12` to `-ngl 99` | `device_rerank: "cuda"` |
| Windows (CPU) | CPU only | (none) | `device_rerank: "cpu"` |

---

## Configuration

### Main Configuration (config/init_config.yaml)

```yaml
# Logging settings
logging:
  level: "INFO"
  show_progress: true

# Model configuration
model:
  embedding_model_hf: "nomic-ai/nomic-embed-text-v1.5"
  rerank_model: "BAAI/bge-reranker-v2-m3"
  device_rerank: "mps"  # Options: "mps", "cuda", "cpu"

# Processing parameters
processing:
  chunk_size: 2000
  chunk_overlap: 200
  batch_size_embeddings: 32
  batch_size_reranking: 8

# Paths
paths:
  cache_dir: "./cache"
  data_dir: "./data"

# Document sources
files:
  document_paths:
    - "data/raw/your_document.pdf"
    - "data/raw/another_file.txt"
```

### Retrieval Configuration (config/process_config.yaml)

```yaml
retrieval:
  llamafile_server_base_url: "http://localhost:8081"
  send_nb_chunks_to_llm: 3
  use_bm25: true
  bm25_weight: 0.2
  top_k: 100
  use_reranking: true
  use_query_expansion: false
```

---

## Usage

### Starting the System

1. Start the LLM server:
   ```bash
   ./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081
   ```

2. Launch the web interface:
   ```bash
   streamlit run streamlit_app.py
   ```

3. Open http://localhost:8501 in your browser

### Default User Accounts

| Username | Password | Role | Permissions |
|----------|----------|------|-------------|
| admin | admin123 | Administrator | Full access, user management, document upload |
| user | user123 | User | Chat access, view documents |

### Adding Documents

1. Place documents in `data/raw/` or `data/uploads/`
2. Update `config/init_config.yaml` with the document paths
3. Run `python init_cache_data.py` to reindex

### Web Scraping (Admin Only)

Scrape content from websites directly through the web interface:

1. Log in as admin and navigate to **📁 Documents**
2. In the **🌐 Web Scraper** section, enter a URL to scrape
3. Configure options:
   - **Traverse Table of Contents**: Follow navigation links to scrape multiple pages
   - **TOC CSS Selector**: Customize which links to follow (e.g., `nav a`, `.sidebar a`)
4. Click **🕷️ Scrape URL**
5. Content is automatically:
   - Saved to `data/raw/scraped/` as Markdown files
   - Indexed immediately for querying (no restart needed)

### Command-Line Query

```bash
python process_single_query.py --query "Your question here"
```

---

## Supported File Types

| Category | Extensions | Notes |
|----------|------------|-------|
| Text | .txt, .md | Direct text processing |
| PDF | .pdf | Extracted via Docling |
| Microsoft Office | .docx, .doc, .pptx, .ppt, .xlsx | Requires LibreOffice |
| OpenDocument | .odt | Requires LibreOffice |
| Code | .py, .js, .ts, .java, .cpp, .go, .rs | Language-aware parsing |
| Data | .csv, .json | Structured data handling |
| Web | .html, .htm | HTML parsing |
| Notebooks | .ipynb | Jupyter notebook support |

---

## Project Structure

```
RagVault/
├── config/
│   ├── init_config.yaml      # Main configuration
│   ├── process_config.yaml   # Retrieval settings
│   └── users.json            # User credentials (auto-generated)
├── data/
│   ├── raw/                  # Source documents
│   ├── uploads/              # User-uploaded files
│   └── processed/            # Processed outputs
├── cache/                    # Embeddings and index cache
├── models/                   # LLM model files
├── src/
│   ├── cache/               # Caching system
│   ├── data/                # Document processing
│   │   └── loaders/         # File type handlers
│   ├── retrieval/           # Search and retrieval
│   ├── models/              # Reranking models
│   ├── response/            # Response generation
│   └── utils/               # Utilities
├── streamlit_app.py         # Web interface
├── init_cache_data.py       # Cache initialization
├── initialize_rag.py        # RAG system setup
├── process_single_query.py  # CLI query tool
└── requirements_*.txt       # Dependencies
```

---

## Troubleshooting

### LLM Server Not Starting

- Ensure the llamafile has execute permissions: `chmod +x models/*.llamafile`
- Check if port 8081 is in use: `lsof -i :8081`
- Try without GPU layers: remove `-ngl` flag

### Out of Memory Errors

- Reduce `batch_size_embeddings` in config (try 16 or 8)
- Reduce `batch_size_reranking` (try 4)
- Use CPU instead of GPU: set `device_rerank: "cpu"`
- Reduce `-ngl` value for LLM (layers on GPU)

### LibreOffice Not Found (macOS)

The system expects LibreOffice at `/Applications/LibreOffice.app/`. If installed elsewhere, the path is automatically detected.

### Slow Performance

- Ensure GPU acceleration is enabled where available
- Reduce `top_k` retrieval value
- Decrease `chunk_size` for faster processing
- Use SSD storage for cache directory

### Import Errors

If you encounter `ModuleNotFoundError`, ensure all dependencies are installed:
```bash
pip install langchain langchain-core langchain-community langchain-huggingface
pip install faiss-cpu sentence-transformers transformers
pip install torch torchvision einops
```

---

## License

MIT License

Copyright (c) 2024 Arnav Angarkar

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## Acknowledgments

This project builds upon several open-source technologies:

- [LangChain](https://github.com/langchain-ai/langchain) - RAG framework
- [FAISS](https://github.com/facebookresearch/faiss) - Vector similarity search
- [Docling](https://github.com/DS4SD/docling) - Document processing
- [Llamafile](https://github.com/Mozilla-Ocho/llamafile) - Local LLM serving
- [Streamlit](https://streamlit.io/) - Web interface framework
- [Hugging Face Transformers](https://huggingface.co/) - ML models
