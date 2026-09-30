# Quick Start Guide (macOS)

This project runs locally on macOS using the configured Mistral Nemo Llamafile, Nomic embeddings, and BGE reranker.

## Prerequisites ✅
- Python 3.10 environment at `/Users/arnavangarkar/miniconda3/envs/ragvault`
- The configured local model files under `models/`
- Node.js and npm for the React interface

## First-Time Setup

### 1. Install runtime dependencies

```bash
/Users/arnavangarkar/miniconda3/envs/ragvault/bin/python -m pip install -r requirements_macos.txt
```

### 2. Start the system

Start the configured Llamafile in a separate terminal:

```bash
chmod +x models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081
```

Then start the API and React interface from the repository root:

```bash
./start_all.sh
```

### 3. Access the Web Interface

Once the services are running, open your browser:

- **React UI**: http://localhost:5173 (recommended for full visual experience)
- **API Documentation**: http://localhost:8000/docs (FastAPI Swagger UI)

### 4. Verify All Services Are Running

Check that all ports are active:
```bash
# Check the LLM server
curl http://localhost:8081/health

# Check API backend
curl http://localhost:8000/health

# Check frontend (React)
curl http://localhost:5173

```

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

## Web Scraping

Scrape websites directly from the UI (Admin only):

1. Go to **📁 Documents** page
2. Enter a URL in the **🌐 Web Scraper** section
3. Click **🕷️ Scrape URL**
4. Content is indexed immediately - ask questions right away!

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
