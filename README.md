<p align="center">
  <img src="https://img.shields.io/badge/🔒-RagVault-blue?style=for-the-badge&labelColor=1a1a2e" alt="RagVault"/>
</p>

<h1 align="center">RagVault</h1>

<p align="center">
  <strong>🔐 Secure Offline RAG System for Enterprise Knowledge Management</strong>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-installation">Installation</a> •
  <a href="#-usage">Usage</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat" alt="License"/>
  <img src="https://img.shields.io/badge/Offline-100%25-success?style=flat" alt="Offline"/>
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat&logo=docker&logoColor=white" alt="Docker"/>
</p>

---

## 🚀 Quick Start

### Option A: Docker (Recommended)

```bash
git clone https://github.com/ArnavBallinCode/RagVault.git && cd RagVault

# Download LLM (8.5 GB, one-time)
./docker-start.sh --download

# Start the system
./docker-start.sh
```

### Option B: Manual Setup

```bash
# Terminal 1: Start LLM Server
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081

# Terminal 2: Start Web App
conda activate rag_project && streamlit run streamlit_app.py
```

**🌐 Access:** http://localhost:8501  
**🔑 Login:** `admin` / `admin123`

---

## 🎯 What is RagVault?

RagVault is a **fully offline, privacy-first RAG system** that lets you query your documents using AI—without sending data to the cloud.

```
📄 Your Documents    →    🔍 Smart Search    →    💡 AI Answers
   (PDF, DOCX, TXT)       (Hybrid Retrieval)      (Local LLM)
```

### Why RagVault?

| ❌ Cloud RAG Systems | ✅ RagVault |
|---------------------|------------|
| Data leaves your network | **100% offline** |
| Requires API keys | **No external dependencies** |
| Ongoing subscription costs | **Free & open-source** |
| Vendor lock-in | **Fully self-hosted** |

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 📥 Document Processing
- PDF, DOCX, TXT, Markdown, CSV
- Automatic text extraction
- Intelligent chunking (2000 chars, 200 overlap)
- Web scraping with TOC traversal

</td>
<td width="50%">

### 🔍 Hybrid Search
- **Vector Search**: Semantic understanding
- **BM25**: Keyword matching
- **Neural Reranking**: BAAI/bge-reranker-v2-m3
- Weighted fusion (80% semantic, 20% keyword)

</td>
</tr>
<tr>
<td>

### 🤖 AI Generation
- **Mistral Nemo 12B** (local LLM)
- Context-aware responses
- Source citations
- 128K token context window

</td>
<td>

### 🔐 Security
- Zero data transmission
- Role-based access control
- No telemetry or tracking
- Air-gapped operation support

</td>
</tr>
</table>

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         USER QUERY                            │
│                             ↓                                 │
│  ┌─────────────┐    ┌────────────────┐    ┌───────────────┐ │
│  │   BM25      │    │                │    │   RERANKER    │ │
│  │  (keyword)  │───→│  TOP-100 DOCS  │───→│  (neural)     │ │
│  └─────────────┘    │                │    └───────────────┘ │
│  ┌─────────────┐    └────────────────┘           ↓          │
│  │   FAISS     │           ↑              ┌───────────────┐ │
│  │  (vector)   │───────────┘              │   LLM         │ │
│  └─────────────┘                          │ (Mistral 12B) │ │
│                                           └───────────────┘ │
│                                                  ↓          │
│                                           GROUNDED ANSWER   │
└──────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Embeddings** | nomic-ai/nomic-embed-text-v1.5 (768 dim) |
| **Vector Store** | FAISS |
| **Lexical Search** | BM25 (rank_bm25) |
| **Reranker** | BAAI/bge-reranker-v2-m3 |
| **LLM** | Mistral-Nemo-Instruct-2407 (12B, Q5_K_M) |
| **UI** | Streamlit |
| **Runtime** | Python 3.10+ |

---

## 📦 Installation

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Python | 3.10+ |
| RAM | 16GB minimum, 32GB recommended |
| Storage | 20GB free (for LLM model) |
| Docker | Optional, for containerized setup |

### Docker Installation

```bash
# 1. Clone repository
git clone https://github.com/ArnavBallinCode/RagVault.git
cd RagVault

# 2. Download LLM model (8.5 GB)
./docker-start.sh --download

# 3. Start containers
./docker-start.sh
```

### Manual Installation (macOS)

```bash
# 1. Install dependencies
brew install --cask libreoffice

# 2. Clone and setup environment
git clone https://github.com/ArnavBallinCode/RagVault.git
cd RagVault
conda create -n ragvault python=3.10 -y
conda activate ragvault
pip install -r requirements_macos.txt

# 3. Download LLM model
mkdir -p models
curl -L -o models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile \
  "https://huggingface.co/Mozilla/Mistral-Nemo-Instruct-2407-llamafile/resolve/main/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile"
chmod +x models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile

# 4. Initialize cache
python init_cache_data.py
```

### Manual Installation (Linux)

```bash
# 1. Install system dependencies
sudo apt update && sudo apt install -y libreoffice python3.10 python3.10-venv

# 2. Clone and setup
git clone https://github.com/ArnavBallinCode/RagVault.git
cd RagVault
python3.10 -m venv .venv
source .venv/bin/activate
pip install -r requirements_rag.txt

# 3. Download LLM (same as macOS step 3)
# 4. Initialize cache (same as macOS step 4)
```

---

## 🖥️ Usage

### Starting the System

**Docker:**
```bash
./docker-start.sh          # Start
./docker-start.sh --stop   # Stop
./docker-start.sh --logs   # View logs
```

**Manual:**
```bash
# Terminal 1: LLM Server
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081

# Terminal 2: Web App
streamlit run streamlit_app.py
```

### Web Interface

1. **Login** at http://localhost:8501
   - Admin: `admin` / `admin123`
   - User: `user` / `user123`

2. **Upload Documents** (Admin only)
   - Go to Documents tab
   - Upload PDF, DOCX, TXT files
   - Documents are automatically indexed

3. **Ask Questions**
   - Type your question in the chat
   - Receive AI-generated answers with sources

4. **Web Scraping** (Admin only)
   - Enter URLs to scrape
   - Content is automatically indexed

---

## ⚙️ Configuration

### `config/init_config.yaml`

```yaml
model:
  embedding_model_hf: "nomic-ai/nomic-embed-text-v1.5"
  rerank_model: "BAAI/bge-reranker-v2-m3"
  device_rerank: "mps"  # mps/cuda/cpu/auto

processing:
  chunk_size: 2000
  chunk_overlap: 200
```

### `config/process_config.yaml`

```yaml
retrieval:
  llamafile_server_base_url: "http://localhost:8081"
  bm25_weight: 0.2
  top_k: 100
  use_reranking: true
```

---

## 📁 Project Structure

```
RagVault/
├── streamlit_app.py          # Web UI
├── initialize_rag.py         # Core orchestration
├── docker-start.sh           # Docker helper script
├── config/
│   ├── init_config.yaml      # Model settings
│   └── process_config.yaml   # Retrieval settings
├── src/
│   ├── data/                 # Data ingestion & processing
│   ├── models/               # Reranker
│   ├── retrieval/            # BM25, Vector, Hybrid retrievers
│   └── response/             # LLM response generation
├── data/raw/                 # Your documents
├── cache/                    # Embedding cache
└── models/                   # LLM binary
```

---

## 🔧 Troubleshooting

<details>
<summary><b>LLM Server Offline</b></summary>

Ensure the llamafile is running:
```bash
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081
```
Check health: `curl http://localhost:8081/health`
</details>

<details>
<summary><b>Port Already in Use</b></summary>

```bash
lsof -ti:8501 | xargs kill -9
lsof -ti:8081 | xargs kill -9
```
</details>

<details>
<summary><b>Slow Performance</b></summary>

- Enable GPU acceleration (`device_rerank: mps` or `cuda`)
- Reduce `top_k` in config
- Use SSD storage for cache
</details>

<details>
<summary><b>Import Errors</b></summary>

```bash
pip install langchain langchain-core langchain-community langchain-huggingface
pip install faiss-cpu sentence-transformers transformers torch
```
</details>

---

## 📄 License

MIT License © 2024 Arnav Angarkar

---

## 🙏 Acknowledgments

Built with:
- [LangChain](https://github.com/langchain-ai/langchain) - RAG framework
- [FAISS](https://github.com/facebookresearch/faiss) - Vector search
- [Llamafile](https://github.com/Mozilla-Ocho/llamafile) - Local LLM
- [Streamlit](https://streamlit.io/) - Web interface
- [Hugging Face](https://huggingface.co/) - ML models

---

<p align="center">
  <sub>Made with ❤️ by <a href="https://github.com/ArnavBallinCode">Arnav Angarkar</a></sub>
</p>
