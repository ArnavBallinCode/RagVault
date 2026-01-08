# RagVault Startup Guide

## Required: 3 Terminals Running Simultaneously

RagVault is a distributed system with 3 independent services that must all be running:

```
┌─────────────────────────────────────────────────────────┐
│                    RAGVAULT SERVICES                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Terminal 1: LLM Server (Llamafile) - Port 8081        │
│  Terminal 2: API Backend (FastAPI) - Port 8000         │
│  Terminal 3: Frontend UI (React/Streamlit) - Port 5173/8501 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Start (3 Commands, 3 Terminals)

### Terminal 1: Start LLM Server

```bash
# Navigate to project directory
cd /Users/arnavangarkar/Desktop/Secure-Offline-RAG-System

# Make executable (first time only)
chmod +x models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile

# Start LLM server
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081
```

**What you'll see:** Model loading messages, then waiting for requests
**Keep this terminal running!**

---

### Terminal 2: Start API Backend

```bash
# Navigate to project directory
cd /Users/arnavangarkar/Desktop/Secure-Offline-RAG-System

# Activate conda environment
conda activate rag_project

# Start API server
python api_server.py
```

**What you'll see:** FastAPI startup, "Uvicorn running on http://0.0.0.0:8000"
**Keep this terminal running!**

---

### Terminal 3: Start Frontend

Choose ONE option:

#### Option A: React UI (Recommended - Visual Pipeline)

```bash
# Navigate to frontend directory
cd /Users/arnavangarkar/Desktop/Secure-Offline-RAG-System/frontend

# Install dependencies (first time only)
npm install

# Start React dev server
npm run dev
```

**What you'll see:** "Local: http://localhost:5173/"
**Access at:** http://localhost:5173

#### Option B: Streamlit UI (Memory-Efficient Alternative)

```bash
# Navigate to project directory
cd /Users/arnavangarkar/Desktop/Secure-Offline-RAG-System

# Activate conda environment
conda activate rag_project

# Start Streamlit
streamlit run streamlit_app.py
```

**What you'll see:** "You can now view your Streamlit app in your browser"
**Access at:** http://localhost:8501

---

## Verification

### Check All Services Are Running

Open a **4th terminal** and run:

```bash
# Check LLM server
curl http://localhost:8081/health

# Check API backend
curl http://localhost:8000/health

# Check ports are listening
lsof -i :8081  # LLM
lsof -i :8000  # API
lsof -i :5173  # React (or 8501 for Streamlit)
```

---

## Helper Scripts

We provide scripts, but they still require separate terminals:

### Using start_all.sh (Terminals 2 & 3 only)

```bash
# Terminal 1: Start LLM manually
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081

# Terminal 2: Start API + React UI together
./start_all.sh
```

### Using start.sh (Legacy - Streamlit only)

```bash
# This only starts LLM + Streamlit (no API server)
./start.sh
```

---

## Troubleshooting

### "Port already in use"

```bash
# Kill existing processes
lsof -ti:8081 | xargs kill -9  # LLM
lsof -ti:8000 | xargs kill -9  # API
lsof -ti:5173 | xargs kill -9  # React
lsof -ti:8501 | xargs kill -9  # Streamlit
```

### "LLM server not responding"

- Wait 20-30 seconds after starting - model takes time to load
- Check available RAM (needs ~10GB)
- Try reducing `-ngl` value: `-ngl 20` instead of `-ngl 999`

### "API server can't connect to LLM"

- Ensure Terminal 1 (LLM) is running first
- Check `http://localhost:8081/health` in browser
- Look for error messages in Terminal 1

### "Frontend shows connection error"

- Ensure Terminal 2 (API) is running
- Check `http://localhost:8000/health` in browser
- Verify API logs in Terminal 2

---

## Shutdown

To stop all services:

1. **Terminal 3** (Frontend): Press `Ctrl+C`
2. **Terminal 2** (API): Press `Ctrl+C`
3. **Terminal 1** (LLM): Press `Ctrl+C`

Or kill all at once:

```bash
lsof -ti:8081,8000,5173,8501 | xargs kill -9
```

---

## Why 3 Terminals?

Each service is independent and designed to run continuously:

1. **LLM Server**: Heavy process, long startup time, serves many requests
2. **API Backend**: Orchestrates RAG pipeline, connects to LLM
3. **Frontend**: User interface, makes API calls

Running them separately allows:
- ✅ Better debugging (separate logs)
- ✅ Independent restarts (restart UI without LLM)
- ✅ Resource monitoring per service
- ✅ Production-like architecture

---

## Production Deployment

For production, use process managers:

```bash
# Install PM2
npm install -g pm2

# Start all services with PM2
pm2 start ecosystem.config.js
```

Or use Docker Compose (see `docker-compose.yml`).

---

*Last updated: January 2026*
