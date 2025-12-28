# 04. LLM Integration

> Llamafile server setup, model details, and prompt engineering

---

## Overview

RagVault uses a **local LLM** for 100% offline operation:

| Property | Value |
|----------|-------|
| **Model** | Mistral-Nemo-Instruct-2407 |
| **Parameters** | 12 billion |
| **Quantization** | Q5_K_M (5-bit) |
| **File Size** | 8.5 GB |
| **Format** | llamafile (self-contained executable) |
| **Context Window** | 128,000 tokens |

---

## What is Llamafile?

Llamafile is a Mozilla project that packages an LLM into a **single executable file**:

```
Traditional Setup:
┌─────────────────────────────────────────────────────────────────┐
│  1. Install Python                                              │
│  2. Install PyTorch                                             │
│  3. Install transformers                                        │
│  4. Download model weights (multiple files)                     │
│  5. Write inference code                                        │
│  6. Run                                                         │
└─────────────────────────────────────────────────────────────────┘

Llamafile:
┌─────────────────────────────────────────────────────────────────┐
│  1. Download single .llamafile                                  │
│  2. chmod +x                                                    │
│  3. Run                                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Key Features

- **Self-contained**: No dependencies to install
- **Cross-platform**: Works on macOS, Linux, Windows
- **OpenAI-compatible API**: Drop-in replacement
- **GPU acceleration**: Supports CUDA, Metal, ROCm

---

## Model: Mistral-Nemo-Instruct-2407

### Why This Model?

| Criterion | Mistral-Nemo | Alternatives |
|-----------|--------------|--------------|
| **Size** | 12B params (8.5GB Q5) | Llama-70B (40GB+) |
| **Context** | 128K tokens | Most: 4K-32K |
| **Quality** | Excellent for RAG | Comparable to GPT-3.5 |
| **Speed** | Fast on CPU | Larger models too slow |
| **License** | Apache 2.0 | Some restricted |

### Model Architecture

```
Mistral-Nemo-12B Architecture
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Input: "Question: What is X?\nContext: [document text]"        │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  TOKENIZER (SentencePiece)                                │   │
│  │  Vocabulary: 32,000 tokens                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  EMBEDDING LAYER                                          │   │
│  │  Dimension: 5,120                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  40 TRANSFORMER LAYERS                                    │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  Multi-Head Attention (32 heads)                   │  │   │
│  │  │  + Sliding Window Attention (128K context)         │  │   │
│  │  │  + Grouped Query Attention (8 KV heads)            │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  Feed-Forward Network                              │  │   │
│  │  │  (SwiGLU activation, 14,336 intermediate)          │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │  × 40 layers                                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  OUTPUT HEAD                                              │   │
│  │  → Next token probabilities (32,000 vocab)               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  Output: "The answer is..."                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Server Setup

### Download Model

```bash
# Create models directory
mkdir -p models

# Download from HuggingFace (8.5 GB)
curl -L -o models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile \
  "https://huggingface.co/Mozilla/Mistral-Nemo-Instruct-2407-llamafile/resolve/main/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile"

# Make executable
chmod +x models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile
```

### Start Server

```bash
# Basic start (CPU only)
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile \
  --server \
  --port 8081 \
  --nobrowser

# With GPU acceleration (Apple Silicon)
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile \
  --server \
  --port 8081 \
  --nobrowser \
  -ngl 999  # Offload all layers to GPU

# With GPU acceleration (NVIDIA)
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile \
  --server \
  --port 8081 \
  --nobrowser \
  -ngl 999
```

### Server Flags Explained

| Flag | Purpose |
|------|---------|
| `--server` | Run in API server mode |
| `--port 8081` | Listen on port 8081 |
| `--nobrowser` | Don't auto-open web UI |
| `-ngl 999` | Offload layers to GPU (999 = all) |
| `-ngl 0` | Force CPU only (Docker) |
| `--ctx-size 8192` | Override context window |
| `--threads 8` | CPU threads to use |

---

## API Reference

The llamafile server provides an **OpenAI-compatible API**:

### Health Check

```bash
curl http://localhost:8081/health

# Response:
{"status": "ok", "slots_idle": 1, "slots_processing": 0}
```

### Completion Endpoint

```bash
curl -X POST http://localhost:8081/completion \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is 2+2?",
    "n_predict": 100,
    "temperature": 0.7
  }'

# Response:
{
  "content": "2+2 equals 4.",
  "generation_settings": {...},
  "model": "Mistral-Nemo-Instruct-2407.Q5_K_M",
  "prompt": "What is 2+2?",
  "stop": true,
  "stopped_eos": true,
  ...
}
```

### Chat Completion (OpenAI format)

```bash
curl -X POST http://localhost:8081/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistral",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

---

## LangChain Integration

### ResponseGenerator Class

```python
from langchain_community.llms import Llamafile

class ResponseGenerator:
    def __init__(self, config: Dict):
        # Get URL from env (Docker) or config (local)
        llm_url = os.environ.get(
            "LLAMAFILE_SERVER_URL",
            config["retrieval"]["llamafile_server_base_url"]
        )
        
        # Initialize LangChain Llamafile wrapper
        self.llm = Llamafile(
            base_url=llm_url,  # "http://localhost:8081"
            seed=2024          # For reproducibility
        )
```

### Calling the LLM

```python
from langchain_core.prompts import ChatPromptTemplate

# Create prompt template
prompt = ChatPromptTemplate.from_template("""
You are a helpful assistant. Answer based on the context.

Context: {context}
Question: {question}

Answer:
""")

# Format and invoke
messages = prompt.format_messages(context=context, question=query)
response = self.llm.invoke(messages)

# response is a string containing the LLM's answer
```

---

## Prompt Engineering

### Main RAG Prompt

The carefully crafted prompt ensures accurate, grounded responses:

```python
PROMPT_TEMPLATE = """
You are an efficient Q&A assistant that responds to user queries 
based on provided context.

Based on the following information, please provide a clear, accurate, 
and comprehensive answer to the question.

If the information is not sufficient to answer the question completely, 
acknowledge this and provide what you can.

Question: {query}

Relevant Information:
{context}

Please provide a response that:
1. Directly addresses the question
2. Is supported by the provided information
3. Is clear and well-organized
4. Is as short as possible with relevant information
5. Don't mention the source of the information
6. Do not repeat the question
7. Clearly state the lack of information if applicable
8. Respond only in the language of the query

Response:
"""
```

### Prompt Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Grounding** | "Based on the following information" |
| **Honesty** | "If information is not sufficient, acknowledge this" |
| **Conciseness** | "As short as possible" |
| **No hallucination** | "Supported by the provided information" |
| **Multilingual** | "Respond only in the language of the query" |

### Query Expansion Prompt

For improving retrieval when queries are ambiguous:

```python
QUERY_EXPANSION_PROMPT = """
You are a query processor that MUST follow these rules strictly:
1. NEVER expand or define acronyms/abbreviations 
   (e.g., DAC, ULA, API must stay exactly as written)
2. Only fix grammatical structure if the query is incomplete
3. Return the exact original query if it's already a complete sentence

Examples:
Input: "acronym of ULA"
Output: "What is the acronym of ULA"

Input: "difference REST SOAP"
Output: "What is the difference between REST and SOAP?"

Original query: {query}
Expanded query:
"""
```

---

## Context Preparation

### How Context is Built

```python
def _prepare_context(self, chunks: List[Document]) -> str:
    """Format retrieved chunks for LLM context"""
    context_parts = []
    
    for i, chunk in enumerate(chunks, 1):
        # Get source file name
        source = chunk.metadata.get('source', 'Unknown')
        
        # Format with enumeration
        context_parts.append(
            f"[{i}] Source: {source}\n{chunk.page_content}"
        )
    
    return "\n\n".join(context_parts)
```

### Example Context

```
[1] Source: data/raw/matter_spec.pdf
The Device Attestation Certificate (DAC) is a X.509 certificate that
contains the device's attestation public key. The Subject Key Identifier
field is derived from the public key using SHA-1 hash...

[2] Source: data/raw/security_notes.txt
Certificate validation involves checking the Subject Key Identifier
against the Authority Key Identifier of the issuing certificate...
```

---

## Performance Tuning

### Generation Parameters

| Parameter | Default | Purpose |
|-----------|---------|---------|
| `temperature` | 0.7 | Randomness (0=deterministic, 1=creative) |
| `n_predict` | 512 | Max tokens to generate |
| `top_p` | 0.9 | Nucleus sampling threshold |
| `top_k` | 40 | Top-k sampling |
| `repeat_penalty` | 1.1 | Penalize repetition |

### Speed Optimization

```bash
# Faster generation (lower quality)
--ctx-size 4096      # Smaller context
--batch-size 512     # Larger batches
--threads 8          # More CPU threads

# Higher quality (slower)
--ctx-size 16384     # Larger context
--temp 0.3           # More deterministic
```

### Memory Usage

| Configuration | RAM Usage |
|---------------|-----------|
| Q5_K_M (default) | ~10 GB |
| Q4_K_M | ~8 GB |
| Q8_0 | ~14 GB |
| CPU only | RAM |
| GPU offload | VRAM + some RAM |

---

## Docker Configuration

### Environment Variable Override

```yaml
# docker-compose.yml
services:
  app:
    environment:
      - LLAMAFILE_SERVER_URL=http://llm-server:8081
```

### How It Works

```python
# In ResponseGenerator.__init__()
llm_url = os.environ.get(
    "LLAMAFILE_SERVER_URL",    # Check env first (Docker)
    config["retrieval"]["..."] # Fallback to config (local)
)

# Docker: Uses http://llm-server:8081 (internal network)
# Local:  Uses http://localhost:8081 (from config)
```

---

## Error Handling

### Connection Errors

```python
def check_llm_status() -> bool:
    """Check if LLM server is responding"""
    try:
        response = requests.get(f"{llm_url}/health", timeout=5)
        return response.status_code == 200
    except requests.exceptions.ConnectionError:
        return False
    except requests.exceptions.Timeout:
        return False
```

### Generation Errors

```python
try:
    response = self.llm.invoke(messages)
except Exception as e:
    logger.error(f"LLM generation failed: {e}")
    return {
        "response": "I apologize, but I encountered an error. Please try again.",
        "error": str(e)
    }
```

---

## Troubleshooting

### LLM Server Won't Start

```bash
# Check if file is executable
ls -la models/*.llamafile

# Make executable
chmod +x models/*.llamafile

# Check if port is in use
lsof -i :8081
```

### Slow Response Times

```bash
# Enable GPU (Apple Silicon)
./models/*.llamafile --server -ngl 999 --port 8081

# Reduce context size
./models/*.llamafile --server --ctx-size 4096 --port 8081
```

### Out of Memory

```bash
# Use smaller model or quantization
# Download Q4_K_M version instead of Q5_K_M

# Or reduce batch size
./models/*.llamafile --server --batch-size 256 --port 8081
```

---

## Next: RAG Pipeline →

See [05_RAG_PIPELINE.md](./05_RAG_PIPELINE.md) for the complete retrieval-generation flow.

---

*Author: Arnav Angarkar*
