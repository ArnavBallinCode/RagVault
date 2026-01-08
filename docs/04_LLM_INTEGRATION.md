# RagVault LLM Integration Guide

> Complete documentation for integrating and configuring the Llamafile LLM server, including model selection, GPU acceleration, and prompt engineering.

---

## Table of Contents

1. [Overview](#overview)
2. [Llamafile Architecture](#llamafile-architecture)
3. [Model Selection](#model-selection)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [GPU Acceleration](#gpu-acceleration)
7. [Prompt Templates](#prompt-templates)
8. [API Reference](#api-reference)
9. [Troubleshooting](#troubleshooting)

---

## Overview

### What is Llamafile?

**Llamafile** is Mozilla's solution for running LLMs locally. It bundles:
- The LLM model weights
- An inference engine (llama.cpp)
- An HTTP server (OpenAI-compatible API)

All in a single executable file that runs on any platform.

### Why Llamafile?

| Feature | Llamafile | Other Solutions |
|---------|-----------|-----------------|
| **Installation** | Single file download | Complex setup |
| **Dependencies** | None (self-contained) | Python, CUDA, etc. |
| **GPU Support** | Auto-detect Metal/CUDA | Manual configuration |
| **API** | OpenAI-compatible | Varies |
| **Offline** | 100% local | May require internet |

---

## Llamafile Architecture

### Starting the LLM Server

**⚠️ The LLM server is Service 1 of 3 required services:**

**Terminal 1: Start LLM Server (this terminal)**
```bash
# Make executable (first time only)
chmod +x models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile

# Start server
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081

# What you'll see:
# - Model loading messages
# - "HTTP server listening at http://0.0.0.0:8081"
# - Keep this terminal running!
```

**Also Required (in separate terminals):**
```bash
# Terminal 2: API Backend
python api_server.py

# Terminal 3: Frontend UI
cd frontend && npm run dev  # React
# OR
streamlit run streamlit_app.py  # Streamlit
```

### System Integration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LLM INTEGRATION ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌───────────────────┐         ┌───────────────────┐
  │  ResponseGenerator │        │    Streamlit UI   │
  │   (Python)        │        │    (Chat Interface)│
  └─────────┬─────────┘        └──────────┬────────┘
            │                              │
            └──────────────┬───────────────┘
                           │
                           ▼
            ┌───────────────────────────────┐
            │        LangChain Llamafile    │
            │    (langchain_community.llms) │
            └───────────────┬───────────────┘
                           │
                           ▼
            ┌───────────────────────────────┐
            │      HTTP REST API            │
            │   http://localhost:8081/v1    │
            └───────────────┬───────────────┘
                           │
                           ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                        LLAMAFILE SERVER                                  │
  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
  │  │   HTTP Server   │  │  llama.cpp      │  │   Model Weights │          │
  │  │   (Port 8081)   │  │  (Inference)    │  │   (GGUF format) │          │
  │  └─────────────────┘  └─────────────────┘  └─────────────────┘          │
  │                                                                          │
  │  GPU Acceleration: Metal (macOS) / CUDA (Linux/Windows) / CPU (fallback)│
  └─────────────────────────────────────────────────────────────────────────┘
```

### Communication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LLM REQUEST FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

  Python Code                LangChain                  Llamafile
  ───────────                ─────────                  ─────────
       │                          │                          │
       │  llm.invoke(prompt)      │                          │
       │─────────────────────────▶│                          │
       │                          │                          │
       │                          │  POST /v1/chat/completions
       │                          │─────────────────────────▶│
       │                          │                          │
       │                          │                          │ ← GPU inference
       │                          │                          │ ← Token generation
       │                          │                          │
       │                          │  { "choices": [...] }    │
       │                          │◀─────────────────────────│
       │                          │                          │
       │  "The answer is..."      │                          │
       │◀─────────────────────────│                          │
       │                          │                          │
```

---

## Model Selection

### Default Model: Mistral Nemo 12B

RagVault uses **Mistral-Nemo-Instruct-2407.Q5_K_M** by default:

| Attribute | Value |
|-----------|-------|
| **Parameters** | 12.2 billion |
| **Quantization** | Q5_K_M (5-bit) |
| **File Size** | ~8.5 GB |
| **Context Length** | 128K tokens |
| **Languages** | Multilingual |
| **License** | Apache 2.0 |

### Alternative Models

| Model | Size | Quality | Speed | Use Case |
|-------|------|---------|-------|----------|
| **Mistral-7B-Instruct** | 4 GB | Good | Fast | Development |
| **Mistral-Nemo-12B** | 8.5 GB | Better | Medium | **Default** |
| **Llama-3.1-8B-Instruct** | 5 GB | Good | Fast | General |
| **Mixtral-8x7B-Instruct** | 25 GB | Best | Slow | High quality |
| **Phi-3-mini** | 2.4 GB | Fair | Fastest | Low resources |

### Quantization Levels

```
Model Quality vs Size Tradeoff:

┌────────────────────────────────────────────────────────────────────────────┐
│ Quantization │ Size Reduction │ Quality Loss │ Recommended          │
├──────────────┼────────────────┼──────────────┼──────────────────────│
│ Q8_0         │ 2x smaller     │ Minimal      │ Best quality         │
│ Q6_K         │ 2.5x smaller   │ Very small   │ High quality         │
│ Q5_K_M       │ 3x smaller     │ Small        │ ★ Recommended        │
│ Q4_K_M       │ 4x smaller     │ Moderate     │ Memory constrained   │
│ Q3_K_M       │ 5x smaller     │ Noticeable   │ Very low memory      │
│ Q2_K         │ 6x smaller     │ Significant  │ Not recommended      │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Installation

### Step 1: Download Model

```bash
# Create models directory
mkdir -p models
cd models

# Download Mistral Nemo 12B (recommended, 8.5 GB)
curl -L -o Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile \
  "https://huggingface.co/Mozilla/Mistral-Nemo-Instruct-2407-llamafile/resolve/main/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile"

# Alternative: Smaller model for testing (4 GB)
# curl -L -o mistral-7b-instruct-v0.2.Q5_K_M.llamafile \
#   "https://huggingface.co/Mozilla/Mistral-7B-Instruct-v0.2-llamafile/resolve/main/mistral-7b-instruct-v0.2.Q5_K_M.llamafile"
```

### Step 2: Make Executable

```bash
chmod +x models/*.llamafile
```

### Step 3: First Run (Downloads Dependencies)

```bash
# First run may download additional components
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --help
```

### Step 4: Start Server

```bash
# Start with GPU acceleration
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile \
  --server \
  --nobrowser \
  -ngl 999 \
  --port 8081
```

---

## Configuration

### Server Command Options

```bash
./model.llamafile \
  --server           # Run as HTTP server
  --nobrowser        # Don't open browser UI
  -ngl 999           # Offload all layers to GPU
  --port 8081        # Server port
  --host 0.0.0.0     # Listen on all interfaces
  -c 8192            # Context window size
  --threads 8        # CPU threads (fallback)
  --seed 2024        # Reproducible outputs
```

### Full Options Reference

| Option | Description | Default |
|--------|-------------|---------|
| `--server` | Run as HTTP server | Required |
| `--nobrowser` | Disable browser auto-open | Recommended |
| `-ngl N` | GPU layers (999 = all) | 0 (CPU) |
| `--port PORT` | HTTP server port | 8080 |
| `--host HOST` | Bind address | 127.0.0.1 |
| `-c N` | Context length | 4096 |
| `--threads N` | CPU threads | Auto |
| `--batch-size N` | Batch size | 512 |
| `-t N` | Temperature | 0.7 |
| `--seed N` | Random seed | Random |

### RagVault Integration

```yaml
# config/process_config.yaml

retrieval:
  llamafile_server_base_url: "http://localhost:8081"
  send_nb_chunks_to_llm: 2
```

```python
# src/response/response_generator.py

from langchain_community.llms import Llamafile

class ResponseGenerator:
    def __init__(self, config):
        self.llm = Llamafile(
            base_url=config["retrieval"]["llamafile_server_base_url"],
            seed=2024
        )
```

---

## GPU Acceleration

### Automatic Detection

Llamafile automatically detects and uses available GPUs:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                      GPU ACCELERATION SUPPORT                               │
├────────────────────────────────────────────────────────────────────────────┤
│ Platform        │ GPU              │ Framework    │ Performance            │
├─────────────────┼──────────────────┼──────────────┼────────────────────────┤
│ macOS M1/M2/M3  │ Apple Silicon    │ Metal        │ ★★★★★ Excellent        │
│ Linux           │ NVIDIA RTX       │ CUDA         │ ★★★★★ Excellent        │
│ Windows         │ NVIDIA RTX       │ CUDA         │ ★★★★☆ Good             │
│ Any             │ CPU              │ AVX2/AVX512  │ ★★☆☆☆ Slow             │
└────────────────────────────────────────────────────────────────────────────┘
```

### Apple Silicon (Metal)

```bash
# Automatic Metal detection on M1/M2/M3 Macs
./model.llamafile --server -ngl 999 --port 8081

# Output:
# ggml_metal_init: allocating
# ggml_metal_init: found device: Apple M3
# ggml_metal_init: recommending unified memory: 24 GB
# llm_load_tensors: offloading 40 layers to GPU
```

### NVIDIA CUDA

```bash
# Ensure CUDA drivers are installed
nvidia-smi

# Run with GPU offloading
./model.llamafile --server -ngl 999 --port 8081

# For partial offload (limited VRAM):
./model.llamafile --server -ngl 20 --port 8081
```

### CPU Fallback

```bash
# Force CPU-only mode
./model.llamafile --server -ngl 0 --threads 8 --port 8081
```

### Performance Comparison

| Hardware | Tokens/sec | 100-token Response |
|----------|------------|-------------------|
| Apple M3 Max (Metal) | ~40 | ~2.5 seconds |
| RTX 4090 (CUDA) | ~80 | ~1.2 seconds |
| RTX 3080 (CUDA) | ~45 | ~2.2 seconds |
| Intel i9 (CPU) | ~8 | ~12 seconds |
| Apple M3 (CPU-only) | ~10 | ~10 seconds |

---

## Prompt Templates

### Default RAG Prompt

```python
# src/response/response_generator.py

prompt = ChatPromptTemplate.from_template("""
You are an efficient Q&A assistant that responds based on provided context.

Question: {query}

Relevant Information:
{context}

Please provide a response that:
1. Directly addresses the question
2. Is supported by the provided information
3. Is clear and well-organized
4. Is as concise as possible
5. States if information is insufficient
6. Responds in the language of the query

Response:
""")
```

### Query Expansion Prompt

```python
prompt = ChatPromptTemplate.from_template("""
You are a query processor. Rules:
1. NEVER expand acronyms (DAC, API must stay as-is)
2. Only fix grammatical issues
3. Return exact original if already complete

Examples:
Input: "difference REST SOAP"
Output: "What is the difference between REST and SOAP?"

Original query: {query}
Expanded query:
""")
```

### Customizing Prompts

```python
# Custom prompt for technical documentation
TECHNICAL_PROMPT = """
You are a technical documentation expert. Based on the following
documentation excerpts, provide a precise technical answer.

Documentation:
{context}

Question: {query}

Provide a technical answer with:
- Specific details from the documentation
- Code examples if relevant
- References to specific sections

Answer:
"""
```

---

## API Reference

### LangChain Integration

```python
from langchain_community.llms import Llamafile

# Initialize
llm = Llamafile(
    base_url="http://localhost:8081",
    seed=2024  # For reproducibility
)

# Simple invocation
response = llm.invoke("What is RAG?")

# With prompt template
from langchain_core.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_template("Explain {topic} simply.")
chain = prompt | llm
response = chain.invoke({"topic": "vector databases"})
```

### Direct HTTP API

```bash
# Health check
curl http://localhost:8081/health

# List models
curl http://localhost:8081/v1/models

# Chat completion
curl http://localhost:8081/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistral",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "temperature": 0.7,
    "max_tokens": 256
  }'

# Embeddings (if supported by model)
curl http://localhost:8081/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistral",
    "input": "Hello world"
  }'
```

### API Response Format

```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1704628800,
  "model": "mistral",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 5,
    "completion_tokens": 10,
    "total_tokens": 15
  }
}
```

---

## Troubleshooting

### Common Issues

#### 1. Server Won't Start

```bash
# Check if port is in use
lsof -i :8081

# Kill existing process
pkill -f llamafile

# Restart
./model.llamafile --server --nobrowser -ngl 999 --port 8081
```

#### 2. Out of Memory (GPU)

```bash
# Reduce GPU layers
./model.llamafile --server -ngl 20 --port 8081

# Or use CPU
./model.llamafile --server -ngl 0 --threads 8 --port 8081
```

#### 3. Slow Response

```bash
# Enable GPU
./model.llamafile --server -ngl 999 --port 8081

# Check GPU usage
# macOS:
powermetrics --samplers gpu

# Linux:
nvidia-smi
```

#### 4. Connection Refused

```python
# Check if server is running
import requests

try:
    response = requests.get("http://localhost:8081/health", timeout=2)
    print("Server is running:", response.json())
except Exception as e:
    print("Server not running:", e)
```

#### 5. Model Not Loading

```bash
# Verify file integrity
ls -la models/*.llamafile

# Check file is executable
chmod +x models/*.llamafile

# Verify model works
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --help
```

### Health Check Script

```python
#!/usr/bin/env python3
"""Check LLM server health."""

import requests
import sys

def check_llm_health(url: str = "http://localhost:8081") -> bool:
    endpoints = [
        f"{url}/health",
        f"{url}/v1/models",
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(endpoint, timeout=5)
            if response.status_code == 200:
                print(f"✅ {endpoint} - OK")
                return True
        except Exception as e:
            print(f"❌ {endpoint} - {e}")
    
    return False

if __name__ == "__main__":
    if not check_llm_health():
        print("\n⚠️  LLM server is not running!")
        print("Start it with:")
        print("  ./models/Mistral-Nemo-*.llamafile --server -ngl 999 --port 8081")
        sys.exit(1)
```

---

## Next Steps

- **[RAG Pipeline](./05_RAG_PIPELINE.md)** - How LLM integrates with retrieval
- **[Configuration](./09_CONFIGURATION.md)** - Full config reference
- **[Scalability](./SCALABILITY.md)** - Multi-instance LLM deployment

---

*Last updated: January 2026*
