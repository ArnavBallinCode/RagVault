# Docker deployment

RAGVault has two Compose modes. Both require the local Nomic and BGE model folders because they are intentionally not checked into Git.

## Recommended macOS mode

Run Mistral on the host to retain Apple Metal acceleration:

```bash
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081
docker compose up --build
```

Open `http://localhost:5173`. The frontend, API, uploads, caches, receipts, and learning exports are containerised; the backend reaches the host model through `host.docker.internal`.

## Fully bundled Linux/server mode

For Linux/server deployment, include the model server in Compose. This mode
uses the official multi-architecture `llama.cpp` server image and therefore
requires a **GGUF model file**, not a `.llamafile` executable.

The checked-in local Mistral file is a macOS executable. Keep using it in the
recommended macOS mode above; it is deliberately never replaced or downloaded
by Compose.

Place a Linux-compatible GGUF model in `models/`, then run:

```bash
RAGVAULT_GGUF_MODEL=your-model.gguf \
  docker compose -f docker-compose.yml -f docker-compose.bundled.yml up --build
```

This starts all three services and runs the model on CPU (`--n-gpu-layers 0`).
For NVIDIA Linux hosts, use a CUDA-capable llama.cpp image and pass the host's
GPU configuration explicitly.

## Persistent state and operations

- `data/` stores uploads, document metadata, receipts, and learning exports.
- `cache/` stores local indexes and embeddings. Delete it only when intentionally rebuilding the index.
- Models are mounted read-only; Compose never downloads or substitutes them.
- To point the backend to an external LLM service, set `RAGVAULT_LLM_URL`, for example `RAGVAULT_LLM_URL=http://llm.example:8081 docker compose up`.

Useful commands:

```bash
docker compose ps
docker compose logs -f backend
docker compose down
```
