# Docker deployment

RAGVault has two Compose modes. Both require the local Nomic and BGE model folders because they are intentionally not checked into Git.

## Recommended macOS mode

Run Mistral on the host to retain Apple Metal acceleration:

```bash
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081
docker compose up --build
```

Open `http://localhost:5173`. The frontend, API, uploads, caches, receipts, and learning exports are containerised; the backend reaches the host model through `host.docker.internal`.

## Fully bundled portable mode

For Linux/server deployment, include the model server in Compose:

```bash
docker compose -f docker-compose.yml -f docker-compose.bundled.yml up --build
```

This starts all three services, but the Llamafile runs CPU-only (`-ngl 0`). On Docker Desktop for macOS this is substantially slower than the recommended host-model mode because Metal is not passed through to Linux containers.

## Persistent state and operations

- `data/` stores uploads, document metadata, receipts, and learning exports.
- `cache/` stores local indexes and embeddings. Delete it only when intentionally rebuilding the index.
- Models are mounted read-only; compose never downloads or substitutes models.
- To point the backend to an external LLM service, set `RAGVAULT_LLM_URL`, for example `RAGVAULT_LLM_URL=http://llm.example:8081 docker compose up`.

Useful commands:

```bash
docker compose ps
docker compose logs -f backend
docker compose down
```
