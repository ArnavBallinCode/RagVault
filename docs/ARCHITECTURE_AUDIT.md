# RAGVault architecture audit

## Current system

- **Frontend:** React 19/Vite single-page application. `frontend/src/App.tsx` calls the FastAPI service through `frontend/src/api/client.ts` and already renders answers and source details.
- **Backend:** `api_server.py` owns authentication, uploads, refreshes, query orchestration, source-detail formatting, history, and operational metrics.
- **Knowledge pipeline:** `DataIngestion` loads local/uploaded files, `DataPreprocessor` chunks them, `VectorRetriever` stores Nomic embeddings in FAISS, `BM25Retriever` supplies lexical matches, and `HybridRetriever` merges them.
- **Ranking and generation:** `Reranker` uses the configured local BGE v2-M3 model; `ResponseGenerator` calls the configured Mistral Nemo Llamafile server.
- **Persistence:** document department metadata and users are JSON-backed. There is no database, migration framework, LangGraph graph, or pre-existing automated test suite.

## Query trace

`App.tsx` → `api.query()` → `POST /query` → RBAC department filter → `HybridRetriever` → `Reranker` → `ResponseGenerator` → source-detail extraction → response to the UI.

## Document trace

`POST /upload` → `data/uploads/` and `document_metadata` → `POST /refresh` → `DataIngestion`/loader → `DataPreprocessor` → Nomic embeddings/FAISS plus BM25 index.

## Incremental plan

The first extension is an `evaluation/` package and a CI workflow. It reuses the current retriever rather than introducing another vector store or generation layer. Provenance, confidence, feedback, and experiment records should extend the existing query response and JSON metadata only after this benchmark baseline is established.

## Current risks

- The legacy `test_api.sh` has no authentication and exits successfully after failed requests.
- Local model artifacts are intentionally ignored by Git, so cloud CI cannot perform a genuine model inference test. CI therefore validates deterministic harness logic and configuration; a local benchmark command validates the actual model stack.
- Document metadata currently identifies files by filename, so versioned revisions will need a backwards-compatible metadata extension rather than a schema replacement.
