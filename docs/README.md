# RagVault Documentation

> Complete Technical Documentation for the Secure Offline RAG System

## Documentation Index

| Document | Description |
|----------|-------------|
| [01_OVERVIEW.md](./01_OVERVIEW.md) | System overview, goals, and high-level architecture |
| [02_BACKEND.md](./02_BACKEND.md) | Backend architecture, data flow, and API internals |
| [03_FRONTEND.md](./03_FRONTEND.md) | Streamlit UI, components, and user interaction flow |
| [04_LLM_INTEGRATION.md](./04_LLM_INTEGRATION.md) | LLM server setup, llamafile, and prompt engineering |
| [05_RAG_PIPELINE.md](./05_RAG_PIPELINE.md) | Complete RAG pipeline with step-by-step breakdown |
| [06_DEVOPS.md](./06_DEVOPS.md) | Docker, deployment, CI/CD, and infrastructure |
| [07_DATA_PROCESSING.md](./07_DATA_PROCESSING.md) | Document ingestion, chunking, and preprocessing |
| [08_RETRIEVAL_SYSTEM.md](./08_RETRIEVAL_SYSTEM.md) | BM25, vector search, hybrid retrieval deep dive |
| [09_CONFIGURATION.md](./09_CONFIGURATION.md) | All configuration options explained |
| [10_TROUBLESHOOTING.md](./10_TROUBLESHOOTING.md) | Common issues and debugging guide |
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | Technical handbook (original) |
| [QUICKSTART.md](./QUICKSTART.md) | Quick start guide |
| [HACKATHON_REPORT.md](./HACKATHON_REPORT.md) | Hackathon submission report |

---

## Quick Links

- **Getting Started**: See [README.md](../README.md)
- **Architecture Overview**: See [SYSTEM_ARCHITECTURE.md](../SYSTEM_ARCHITECTURE.md)
- **Hackathon Report**: See [HACKATHON_REPORT.md](../HACKATHON_REPORT.md)

---

## Project Structure

```
RagVault/
├── docs/                    # 📚 Documentation (you are here)
├── src/                     # 🔧 Source code
│   ├── data/               # Data ingestion & processing
│   ├── models/             # Reranker model
│   ├── retrieval/          # BM25, Vector, Hybrid retrievers
│   ├── response/           # LLM response generation
│   └── utils/              # Helper utilities
├── config/                  # ⚙️ Configuration files
├── data/raw/               # 📄 Your documents
├── cache/                  # 💾 Embedding cache
├── models/                 # 🤖 LLM binary
└── streamlit_app.py        # 🌐 Web UI
```

---

*Documentation Version: 1.0.0*  
*Last Updated: December 2024*  
*Author: Arnav Angarkar*
