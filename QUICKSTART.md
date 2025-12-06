# Quick Start Guide (macOS)

This RAG system has been configured for your macOS system with Apple Silicon (MPS) acceleration.

## Prerequisites ✅
- [x] Python 3.10 (via conda environment `rag_project`)
- [x] LibreOffice (already installed)
- [x] Dependencies installed
- [ ] LLM Model (downloading...)

## First-Time Setup

### 1. Initialize the RAG Cache
Before using the system, you need to process your documents:

```bash
# Activate the environment
conda activate rag_project

# Initialize the cache (processes documents and creates embeddings)
python init_cache_data.py
```

This will:
- Load documents from `data/raw/`
- Convert them to markdown format
- Create embeddings using `nomic-ai/nomic-embed-text-v1.5`
- Store everything in `./cache/`

### 2. Start the System

**Option A: Using the startup script (recommended)**
```bash
./start.sh
```
This starts both the LLM server and Streamlit web interface.

**Option B: Manual startup**
```bash
# Terminal 1: Start LLM server
chmod +x models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081

# Terminal 2: Start Streamlit
conda activate rag_project
streamlit run streamlit_app.py
```

### 3. Access the Web Interface
Open your browser to: **http://localhost:8501**

## Usage Options

### Streamlit Web Interface
```bash
streamlit run streamlit_app.py
```

### Command Line Query
```bash
python process_single_query.py --query "Your question here"
```

### Jupyter Notebook
Open and run `inference_notebook.ipynb`

## Adding Your Own Documents

1. Add your documents to `data/raw/` or any folder
2. Update `config/init_config.yaml`:
   ```yaml
   files:
     document_paths:
       - "path/to/your/documents"
       - "path/to/another/file.pdf"
   ```
3. Re-run `python init_cache_data.py`

## Configuration Files

- `config/init_config.yaml` - Main configuration (models, paths, processing)
- `config/process_config.yaml` - Query processing settings

## Troubleshooting

### MPS (Metal) Issues
If you encounter MPS errors, edit `config/init_config.yaml`:
```yaml
model:
  device_rerank: "cpu"  # Change from "mps" to "cpu"
```

### Memory Issues
Reduce batch sizes in `config/init_config.yaml`:
```yaml
processing:
  batch_size_embeddings: 16  # Lower this
  batch_size_reranking: 4    # Lower this
```

### LLM Server Not Starting
Check if port 8081 is available:
```bash
lsof -i :8081
```

## Supported File Types
- PDF, Word (.doc, .docx), PowerPoint (.ppt, .pptx), Excel (.xlsx, .xls)
- Text, Markdown, HTML, CSV, JSON
- Python, JavaScript, TypeScript, Java, C++, and more
- Jupyter Notebooks (.ipynb)
