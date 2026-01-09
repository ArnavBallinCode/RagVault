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

**⚠️ IMPORTANT: This system requires 3 terminals running simultaneously**

The RagVault system consists of 3 separate services that must all be running:
1. **LLM Server** (Mistral Nemo via Llamafile) - Port 8081
2. **API Backend** (FastAPI) - Port 8000  
3. **Frontend UI** (React/Vite OR Streamlit) - Port 5173 or 8501

**Option A: Manual startup (RECOMMENDED - to understand the system)**

**Terminal 1 - Start LLM Server:**
```bash
# Make the model executable (only needed once)
chmod +x models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile

# Start the LLM server on port 8081
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081

# Keep this terminal running - you'll see model loading and inference logs
```

**Terminal 2 - Start API Backend:**
```bash
# Activate the conda environment
conda activate rag_project

# Start the FastAPI server on port 8000
python api_server.py

# Keep this terminal running - you'll see API request logs
```

**Terminal 3 - Start Frontend UI:**

Choose ONE of the following:

*Option 3A: React UI (Modern visual pipeline)*
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (first time only)
npm install

# Start the React development server on port 5173
npm run dev

# Keep this terminal running - you'll see Vite dev server logs
```

*Option 3B: Streamlit UI (Memory-efficient alternative)*
```bash
# Activate the conda environment
conda activate rag_project

# Start Streamlit on port 8501
streamlit run streamlit_app.py

# Keep this terminal running - you'll see Streamlit logs
```

**Option B: Using helper scripts**

We provide scripts to help, but you still need separate terminals:

```bash
# Terminal 1: Start LLM
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081

# Terminal 2: Start API + Frontend together (if using start_all.sh)
./start_all.sh
```

### 3. Access the Web Interface

Once all 3 services are running, open your browser:

- **React UI**: http://localhost:5173 (recommended for full visual experience)
- **Streamlit UI**: http://localhost:8501 (alternative, memory-efficient)
- **API Documentation**: http://localhost:8000/docs (FastAPI Swagger UI)

### 4. Verify All Services Are Running

Check that all ports are active:
```bash
# Check LLM server
curl http://localhost:8081/health

# Check API backend
curl http://localhost:8000/health

# Check frontend (React)
curl http://localhost:5173

# OR check frontend (Streamlit)
curl http://localhost:8501
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

## Remote Access (Phone/Tablet)

**Want to access RagVault from your phone or other devices?**

Use ngrok to create secure tunnels:

```bash
# Terminal 4 (after starting all 3 services)
./start_ngrok.sh
```

You'll get public URLs like `https://abc123.ngrok-free.app` that you can access from any device!

📱 **See [NGROK_SETUP.md](NGROK_SETUP.md) for detailed instructions**
