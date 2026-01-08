# 06. DevOps & Deployment

> Docker containerization, infrastructure, and deployment guide

---

## Overview

RagVault supports two deployment modes:

| Mode | Best For | Complexity |
|------|----------|------------|
| **Docker** | Production, CI/CD | Low |
| **Manual** | Development, debugging | Medium |

---

## Manual Deployment

### Production Startup (3 Terminals)

For non-Docker production deployments, run these commands in separate terminals:

**Terminal 1: LLM Server**
```bash
# Navigate to project
cd /path/to/RagVault

# Start LLM server with process manager (recommended)
nohup ./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile \
  --server --nobrowser -ngl 999 --port 8081 \
  > logs/llm_server.log 2>&1 &

# Or use screen/tmux for persistent sessions
screen -S llm
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081
# Detach with Ctrl+A, D
```

**Terminal 2: API Backend**
```bash
# Activate environment
conda activate ragvault

# Start with process manager (recommended)
nohup python api_server.py > logs/api_server.log 2>&1 &

# Or use screen/tmux
screen -S api
python api_server.py
# Detach with Ctrl+A, D
```

**Terminal 3: Frontend**
```bash
# For React UI (production build)
cd frontend
npm run build
npx serve -s dist -p 5173

# For Streamlit UI
conda activate ragvault
streamlit run streamlit_app.py --server.port 8501 --server.headless true
```

### Process Management with PM2

For better process management, use PM2:

```bash
# Install PM2
npm install -g pm2

# Start all services
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs

# Restart
pm2 restart all

# Stop
pm2 stop all
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [
    {
      name: 'llm-server',
      script: './models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile',
      args: '--server --nobrowser -ngl 999 --port 8081',
      autorestart: true,
      max_memory_restart: '10G'
    },
    {
      name: 'api-server',
      script: 'api_server.py',
      interpreter: 'python',
      autorestart: true,
      max_memory_restart: '4G'
    },
    {
      name: 'frontend',
      script: 'streamlit',
      args: 'run streamlit_app.py --server.port 8501 --server.headless true',
      autorestart: true
    }
  ]
};
```

### Using systemd (Linux)

For Linux servers, use systemd services:

**/etc/systemd/system/ragvault-llm.service:**
```ini
[Unit]
Description=RagVault LLM Server
After=network.target

[Service]
Type=simple
User=ragvault
WorkingDirectory=/opt/ragvault
ExecStart=/opt/ragvault/models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**/etc/systemd/system/ragvault-api.service:**
```ini
[Unit]
Description=RagVault API Server
After=network.target ragvault-llm.service
Requires=ragvault-llm.service

[Service]
Type=simple
User=ragvault
WorkingDirectory=/opt/ragvault
Environment="PATH=/opt/conda/envs/ragvault/bin:/usr/bin"
ExecStart=/opt/conda/envs/ragvault/bin/python api_server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable ragvault-llm ragvault-api
sudo systemctl start ragvault-llm ragvault-api
sudo systemctl status ragvault-llm ragvault-api
```

---

## Docker Architecture

### Container Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HOST MACHINE                                    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        ragvault-network                              │    │
│  │                      (Docker bridge network)                         │    │
│  │                                                                      │    │
│  │  ┌──────────────────────────┐    ┌────────────────────────────────┐ │    │
│  │  │     ragvault-llm         │    │        ragvault-app            │ │    │
│  │  │     ─────────────        │    │        ────────────            │ │    │
│  │  │                          │    │                                │ │    │
│  │  │  Image: Dockerfile.llm   │    │  Image: Dockerfile             │ │    │
│  │  │  Base:  debian:bookworm  │    │  Base:  python:3.10-slim      │ │    │
│  │  │                          │    │                                │ │    │
│  │  │  ┌────────────────────┐  │    │  ┌──────────────────────────┐ │ │    │
│  │  │  │  llamafile server  │  │◀───│──│  Streamlit App          │ │ │    │
│  │  │  │  (Mistral-Nemo)    │  │    │  │  + RAG Pipeline         │ │ │    │
│  │  │  └────────────────────┘  │    │  └──────────────────────────┘ │ │    │
│  │  │                          │    │                                │ │    │
│  │  │  Port: 8081 (internal)   │    │  Port: 8501 → 8501 (exposed)  │ │    │
│  │  │        8081 (exposed)    │    │                                │ │    │
│  │  └──────────────────────────┘    └────────────────────────────────┘ │    │
│  │              ▲                              ▲                        │    │
│  └──────────────┼──────────────────────────────┼────────────────────────┘    │
│                 │                              │                              │
│  ┌──────────────┴──────┐        ┌──────────────┴────────────────────────┐   │
│  │  Volume Mount       │        │  Volume Mounts                        │   │
│  │  ./models (RO)      │        │  ./data   (RW) - documents            │   │
│  │                     │        │  ./cache  (RW) - embeddings           │   │
│  │  Contains:          │        │  ./config (RO) - settings             │   │
│  │  - Mistral LLM      │        │  ./logs   (RW) - logs                 │   │
│  │    (8.5 GB)         │        │                                        │   │
│  └─────────────────────┘        └────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Exposed Ports                                                        │   │
│  │  • http://localhost:8501  →  Streamlit UI                            │   │
│  │  • http://localhost:8081  →  LLM Server (for debugging)              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Dockerfile Analysis

### App Container (Dockerfile)

```dockerfile
# ===== STAGE 1: Base =====
FROM python:3.10-slim as base

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \        # Compilation tools
    libffi-dev \            # FFI library
    libreoffice \           # Office document conversion
    curl \                  # Health checks
    && rm -rf /var/lib/apt/lists/*

# ===== STAGE 2: Dependencies =====
FROM base as dependencies

WORKDIR /app

# Install Python packages (CPU-only)
COPY requirements_docker.txt .
RUN pip install --no-cache-dir -r requirements_docker.txt

# ===== STAGE 3: Application =====
FROM dependencies as app

WORKDIR /app

# Copy application code
COPY src/ ./src/
COPY config/ ./config/
COPY streamlit_app.py .
COPY initialize_rag.py .
COPY init_cache_data.py .
COPY process_single_query.py .

# Create runtime directories
RUN mkdir -p data/raw data/uploads cache logs models

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV FORCE_CPU=1
ENV STREAMLIT_SERVER_PORT=8501
ENV STREAMLIT_SERVER_ADDRESS=0.0.0.0

EXPOSE 8501

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8501/_stcore/health || exit 1

# Run Streamlit
CMD ["streamlit", "run", "streamlit_app.py", \
     "--server.address=0.0.0.0", \
     "--server.port=8501"]
```

### LLM Container (Dockerfile.llm)

```dockerfile
# Minimal image for llamafile
FROM debian:bookworm-slim

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \                  # Health checks
    ca-certificates \       # HTTPS
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN mkdir -p models

EXPOSE 8081

# Health check for LLM server
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8081/health || exit 1

# Run llamafile directly with CPU-only mode
ENTRYPOINT ["sh", "-c", \
    "/app/models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile \
     --server \
     --host 0.0.0.0 \
     --port 8081 \
     -ngl 0"]
```

---

## Docker Compose

### docker-compose.yml

```yaml
services:
  # LLM Server (starts first)
  llm-server:
    build:
      context: .
      dockerfile: Dockerfile.llm
    container_name: ragvault-llm
    volumes:
      - ./models:/app/models:ro    # Read-only LLM binary
    ports:
      - "8081:8081"                # Expose for debugging
    networks:
      - ragvault-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8081/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    restart: unless-stopped

  # Streamlit App (waits for LLM)
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ragvault-app
    depends_on:
      llm-server:
        condition: service_healthy  # Wait for LLM health
    environment:
      - LLAMAFILE_SERVER_URL=http://llm-server:8081  # Internal network
      - FORCE_CPU=1
    volumes:
      - ./data:/app/data           # Documents (RW)
      - ./cache:/app/cache         # Embeddings (RW)
      - ./config:/app/config:ro    # Config (RO)
      - ./logs:/app/logs           # Logs (RW)
    ports:
      - "8501:8501"
    networks:
      - ragvault-network
    restart: unless-stopped

networks:
  ragvault-network:
    driver: bridge
```

### Key Configuration Points

| Setting | Purpose |
|---------|---------|
| `depends_on.condition: service_healthy` | App waits for LLM to be ready |
| `LLAMAFILE_SERVER_URL` | Override for Docker internal networking |
| `volumes:ro` | Read-only mount for security |
| `restart: unless-stopped` | Auto-restart on failure |

---

## Helper Script: docker-start.sh

### Full Script

```bash
#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "  Secure Offline RAG System - Docker   "
echo "========================================"

# Detect docker compose command
if command -v docker-compose &> /dev/null; then
    COMPOSE="docker-compose"
elif docker compose version &> /dev/null 2>&1; then
    COMPOSE="docker compose"
else
    echo -e "${RED}Error: Docker Compose not found${NC}"
    exit 1
fi

echo "Using: $COMPOSE"

# Command handling
case "${1:-}" in
    --download)
        echo "Downloading LLM model (8.5 GB)..."
        mkdir -p models
        curl -L -o models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile \
            "https://huggingface.co/Mozilla/Mistral-Nemo-Instruct-2407-llamafile/resolve/main/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile"
        chmod +x models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile
        echo -e "${GREEN}Download complete!${NC}"
        ;;
    
    --stop)
        echo "Stopping containers..."
        $COMPOSE down
        echo -e "${GREEN}Stopped!${NC}"
        ;;
    
    --logs)
        $COMPOSE logs -f
        ;;
    
    --cleanup)
        echo "Removing all containers, images, and volumes..."
        $COMPOSE down --rmi all --volumes --remove-orphans
        echo -e "${GREEN}Cleanup complete!${NC}"
        ;;
    
    --build)
        echo "Rebuilding images..."
        $COMPOSE build --no-cache
        ;;
    
    *)
        # Check for LLM model
        if [ ! -f "models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile" ]; then
            echo -e "${YELLOW}LLM model not found!${NC}"
            echo "Run: ./docker-start.sh --download"
            exit 1
        fi
        
        # Start containers
        echo "Building and starting containers..."
        $COMPOSE up -d --build
        
        echo ""
        echo -e "${GREEN}Started!${NC}"
        echo "Access: http://localhost:8501"
        echo "Login:  admin / admin123"
        ;;
esac
```

### Command Reference

| Command | Action |
|---------|--------|
| `./docker-start.sh` | Start containers |
| `./docker-start.sh --download` | Download LLM model |
| `./docker-start.sh --stop` | Stop containers |
| `./docker-start.sh --logs` | View logs |
| `./docker-start.sh --cleanup` | Remove everything |
| `./docker-start.sh --build` | Force rebuild |

---

## .dockerignore

```
# Ignore large/unnecessary files
.git
.gitignore
__pycache__
*.pyc
*.pyo
.pytest_cache
.venv
venv
*.egg-info
dist
build

# Models (mounted as volume)
models/

# Data (mounted as volume)
data/
cache/
logs/

# IDE
.vscode
.idea
*.swp

# Docs
*.md
docs/
```

---

## Environment Variables

### Docker-Specific

| Variable | Default | Purpose |
|----------|---------|---------|
| `LLAMAFILE_SERVER_URL` | `http://llm-server:8081` | LLM server URL (Docker internal) |
| `FORCE_CPU` | `1` | Force CPU mode for reranker |
| `STREAMLIT_SERVER_PORT` | `8501` | Streamlit port |
| `STREAMLIT_SERVER_ADDRESS` | `0.0.0.0` | Bind address |

### How Environment Override Works

```python
# In response_generator.py
llm_url = os.environ.get(
    "LLAMAFILE_SERVER_URL",           # Check env first
    config["retrieval"]["llamafile_server_base_url"]  # Fallback
)

# Docker:  Returns "http://llm-server:8081"
# Manual:  Returns "http://localhost:8081" (from config)
```

---

## Volume Mounts

### Data Persistence

```yaml
volumes:
  - ./data:/app/data       # Documents survive container restart
  - ./cache:/app/cache     # Embeddings cached for performance
  - ./logs:/app/logs       # Logs for debugging
  - ./config:/app/config:ro # Config (read-only)
  - ./models:/app/models:ro # LLM binary (read-only)
```

### Directory Structure

```
./data/
├── raw/                 # Original documents
│   ├── document.pdf
│   ├── notes.txt
│   └── scraped/         # Web scraped content
├── processed/           # Generated outputs
└── uploads/             # UI uploads (temporary)

./cache/
├── bm25_index.pkl       # BM25 index
├── embeddings_*.pkl     # Document embeddings
└── faiss_index/         # FAISS vector store

./logs/
└── rag_system.log       # Application logs
```

---

## Health Checks

### LLM Container

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8081/health || exit 1
```

### App Container

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8501/_stcore/health || exit 1
```

### Interpreting Health Status

```bash
docker-compose ps

# Output:
NAME           IMAGE                    STATUS
ragvault-llm   ...llm-server:latest    Up 5m (healthy)    ✅
ragvault-app   ...app:latest           Up 4m (healthy)    ✅
```

| Status | Meaning |
|--------|---------|
| `healthy` | Service responding correctly |
| `unhealthy` | Health check failing |
| `starting` | Health check not yet run |

---

## Networking

### Internal Communication

```
┌─────────────────────────────────────────────────────────────────┐
│                     ragvault-network                             │
│                                                                  │
│  ragvault-app ────────────────────────► ragvault-llm            │
│               http://llm-server:8081                             │
│                                                                  │
│  (Docker DNS resolves "llm-server" to container IP)            │
└─────────────────────────────────────────────────────────────────┘
```

### Port Mapping

```
Host                    Container
────                    ─────────
localhost:8501  ───────► ragvault-app:8501
localhost:8081  ───────► ragvault-llm:8081
```

---

## Logs and Debugging

### View All Logs

```bash
# Follow all container logs
docker-compose logs -f

# View specific container
docker logs ragvault-app -f
docker logs ragvault-llm -f

# Last N lines
docker logs ragvault-app --tail 100
```

### Enter Container Shell

```bash
# App container
docker exec -it ragvault-app bash

# Check environment
echo $LLAMAFILE_SERVER_URL

# Test LLM connectivity
curl http://llm-server:8081/health
```

### Common Debug Commands

```bash
# Check container status
docker-compose ps

# Check resource usage
docker stats

# Check network
docker network inspect secure-offline-rag-system_ragvault-network

# Check volumes
docker volume ls
```

---

## Production Considerations

### Security

```yaml
# In docker-compose.yml
services:
  app:
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
```

### Resource Limits

```yaml
services:
  llm-server:
    deploy:
      resources:
        limits:
          memory: 12G
          cpus: "4"
        reservations:
          memory: 8G

  app:
    deploy:
      resources:
        limits:
          memory: 8G
          cpus: "2"
```

### Logging

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Test

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker images
        run: docker-compose build
      
      - name: Start services (without LLM for CI)
        run: |
          # Skip LLM for CI (too large)
          docker-compose up -d app
      
      - name: Run tests
        run: docker exec ragvault-app pytest tests/
      
      - name: Stop services
        run: docker-compose down
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs for errors
docker-compose logs

# Common issues:
# 1. Port already in use
lsof -i :8501
lsof -i :8081

# 2. Docker daemon not running
docker info

# 3. Missing LLM model
ls -la models/
```

### LLM Container Unhealthy

```bash
# Check llamafile logs
docker logs ragvault-llm

# Common causes:
# 1. Model file missing or corrupt
# 2. Insufficient memory
# 3. Model not executable
chmod +x models/*.llamafile
```

### App Can't Connect to LLM

```bash
# Test from app container
docker exec ragvault-app curl http://llm-server:8081/health

# Check if LLM is healthy
docker-compose ps

# Check network
docker network inspect <network-name>
```

---

## Next: Data Processing →

See [07_DATA_PROCESSING.md](./07_DATA_PROCESSING.md) for document ingestion details.

---

*Author: Arnav Angarkar*
