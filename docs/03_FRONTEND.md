# 03. Frontend Architecture

> Streamlit UI components, user flows, and interaction handling

---

## Overview

The frontend is a single-page Streamlit application that provides:

- **Login Page**: Authentication with role-based access
- **Chat Interface**: Natural language document Q&A
- **Documents Page**: File upload and web scraping (admin only)
- **Status Sidebar**: Real-time system health monitoring

**File:** `streamlit_app.py` (~650 lines)

---

## Application Structure

```python
# Main entry point
def main():
    setup_page_config()      # Streamlit settings
    inject_custom_css()      # Styling
    
    if not check_auth():
        show_login_page()
    else:
        show_main_app()
```

### Page Configuration

```python
st.set_page_config(
    page_title="RagVault - Secure RAG System",
    page_icon="🔒",
    layout="wide",
    initial_sidebar_state="expanded"
)
```

---

## Authentication System

### User Credentials

```python
USERS = {
    "admin": {
        "password": hash_password("admin123"),
        "role": "admin"
    },
    "user": {
        "password": hash_password("user123"),
        "role": "user"
    }
}
```

### Login Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     LOGIN PAGE                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Username: [_______________]                              │  │
│  │  Password: [_______________]                              │  │
│  │  [ Login ]                                                │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Validate        │
                    │ credentials     │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
         ┌────────┐    ┌──────────┐   ┌─────────┐
         │ ADMIN  │    │   USER   │   │ INVALID │
         │ role   │    │   role   │   │ error   │
         └────────┘    └──────────┘   └─────────┘
              │              │
              ▼              ▼
         Full access    Limited access
         (upload,       (chat only)
          scrape,
          chat)
```

### Session State Management

```python
# Authentication state
st.session_state.authenticated = True/False
st.session_state.username = "admin"
st.session_state.role = "admin"/"user"

# RAG components (initialized once)
st.session_state.rag_components = RAGComponents(...)

# Chat history
st.session_state.messages = [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
]
```

---

## Main Application Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔒 RagVault                                        Logged in: admin [Logout]│
├───────────────────┬─────────────────────────────────────────────────────────┤
│                   │                                                          │
│   SIDEBAR         │                    MAIN CONTENT                          │
│                   │                                                          │
│  ┌─────────────┐  │  ┌────────────────────────────────────────────────────┐ │
│  │ Navigation  │  │  │                                                    │ │
│  ├─────────────┤  │  │   [💬 Chat]  [📄 Documents]                        │ │
│  │ 💬 Chat     │  │  │                                                    │ │
│  │ 📄 Documents│  │  │   ┌────────────────────────────────────────────┐  │ │
│  └─────────────┘  │  │   │                                            │  │ │
│                   │  │   │           PAGE CONTENT                     │  │ │
│  ┌─────────────┐  │  │   │                                            │  │ │
│  │ Status      │  │  │   │   (Chat interface or Document manager)    │  │ │
│  ├─────────────┤  │  │   │                                            │  │ │
│  │ 🟢 LLM:     │  │  │   └────────────────────────────────────────────┘  │ │
│  │   Online    │  │  │                                                    │ │
│  │ 📊 Indexed: │  │  └────────────────────────────────────────────────────┘ │
│  │   248 chunks│  │                                                          │
│  └─────────────┘  │                                                          │
│                   │                                                          │
└───────────────────┴─────────────────────────────────────────────────────────┘
```

---

## Chat Interface

### Chat Flow

```
USER TYPES QUERY
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  st.chat_input("Ask a question about your documents...")       │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Add user message to chat history                       │
│  st.session_state.messages.append({"role": "user", ...})       │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Show "Thinking..." spinner                             │
│  with st.spinner("Searching documents..."):                     │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Hybrid retrieval (BM25 + Vector)                       │
│  results = retriever.retrieve(query, top_k=100)                 │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: Neural reranking                                       │
│  reranked = reranker.rerank(query, [r.document for r in results])│
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: LLM generation with top-2 chunks                       │
│  response = response_generator.generate_answer(query, top_chunks)│
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 6: Display response with sources                          │
│  st.markdown(response['response'])                              │
│  st.expander("Sources").write(response['source_documents'])     │
└─────────────────────────────────────────────────────────────────┘
```

### Chat Display Code

```python
# Display chat history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])
        if "sources" in message:
            with st.expander("📚 View Sources"):
                for source in message["sources"]:
                    st.caption(f"• {source}")
```

### Response Rendering

```
┌─────────────────────────────────────────────────────────────────┐
│  👤 User                                                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ What is the subject key identifier in Matter DAC?        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  🤖 Assistant                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ The Subject Key Identifier (SKI) in a Matter Device      │   │
│  │ Attestation Certificate is a cryptographic identifier    │   │
│  │ derived from the device's public key...                   │   │
│  │                                                           │   │
│  │ ▼ 📚 View Sources                                        │   │
│  │ ┌──────────────────────────────────────────────────────┐ │   │
│  │ │ • data/raw/matter_spec.pdf                           │ │   │
│  │ │ • data/raw/data.txt                                  │ │   │
│  │ └──────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Documents Page (Admin Only)

### Access Control

```python
def show_documents_page():
    if st.session_state.role != "admin":
        st.error("🔒 Admin access required")
        return
    # ... show document management UI
```

### File Upload Section

```
┌─────────────────────────────────────────────────────────────────┐
│  📤 Upload Documents                                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Drag and drop files here                                 │   │
│  │  Limit 200MB per file • PDF, DOCX, TXT, MD, CSV          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [Upload and Index]                                              │
└─────────────────────────────────────────────────────────────────┘
```

### Upload Flow

```python
uploaded_files = st.file_uploader(
    "Upload Documents",
    type=["pdf", "docx", "txt", "md", "csv"],
    accept_multiple_files=True
)

if st.button("Upload and Index"):
    for file in uploaded_files:
        # 1. Save to data/raw/
        save_path = f"data/raw/{file.name}"
        with open(save_path, "wb") as f:
            f.write(file.getbuffer())
        
        # 2. Load and chunk
        loader = FileLoader()
        docs = loader.load(save_path)
        chunks = text_splitter.split_documents(docs)
        
        # 3. Add to indexes
        vectorstore.add_documents(chunks)
        bm25_index.add_documents(chunks)
        
    st.success(f"✅ Indexed {len(chunks)} chunks")
```

### Web Scraping Section

```
┌─────────────────────────────────────────────────────────────────┐
│  🌐 Web Scraper                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  URL: [https://example.com/docs________________]          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ☑️ Follow Table of Contents links                              │
│  Max pages: [10]                                                 │
│                                                                  │
│  [Scrape and Index]                                              │
└─────────────────────────────────────────────────────────────────┘
```

### Scrape Flow

```
USER ENTERS URL
       │
       ▼
EnhancedWebLoader.load(url, follow_toc=True)
       │
       ├──► Fetch main page HTML
       │
       ├──► Extract Table of Contents links
       │         │
       │         └──► Recursively fetch linked pages (max 10)
       │
       ├──► Convert HTML to Markdown
       │
       └──► Save to data/raw/scraped/{domain}_{timestamp}.md
                │
                ▼
       Immediately index (add to FAISS + BM25)
                │
                ▼
       st.success("Scraped and indexed!")
```

---

## Sidebar Components

### LLM Status Check

```python
def check_llm_status() -> bool:
    """Check if LLM server is responding"""
    llm_url = os.environ.get(
        "LLAMAFILE_SERVER_URL",
        config["retrieval"]["llamafile_server_base_url"]
    )
    try:
        response = requests.get(f"{llm_url}/health", timeout=5)
        return response.status_code == 200
    except:
        return False
```

### Status Display

```python
# Sidebar status display
with st.sidebar:
    st.subheader("System Status")
    
    # LLM status
    if check_llm_status():
        st.success("🟢 LLM Server: Online")
    else:
        st.error("🔴 LLM Server: Offline")
    
    # Index status
    chunk_count = len(st.session_state.rag_components.original_chunks)
    st.info(f"📊 Indexed: {chunk_count} document chunks")
```

---

## Custom Styling

### CSS Injection

```python
def inject_custom_css():
    st.markdown("""
    <style>
    /* Chat message styling */
    .stChatMessage {
        padding: 1rem;
        border-radius: 0.5rem;
    }
    
    /* Sidebar styling */
    .css-1d391kg {
        background-color: #1a1a2e;
    }
    
    /* Button styling */
    .stButton > button {
        background-color: #4f46e5;
        color: white;
        border-radius: 0.5rem;
    }
    
    /* Success/Error message styling */
    .stSuccess, .stError {
        border-radius: 0.5rem;
    }
    </style>
    """, unsafe_allow_html=True)
```

---

## State Management

### Session State Architecture

```
st.session_state
├── authenticated: bool
├── username: str
├── role: str ("admin" | "user")
├── rag_components: RAGComponents
│   ├── retriever: HybridRetriever
│   ├── reranker: Reranker
│   ├── response_generator: ResponseGenerator
│   └── original_chunks: List[Document]
├── messages: List[Dict]
│   └── [{"role": "user/assistant", "content": "...", "sources": [...]}]
├── current_page: str ("chat" | "documents")
└── processing: bool
```

### Initialization Pattern

```python
# Initialize only once per session
if "rag_components" not in st.session_state:
    with st.spinner("Initializing RAG system..."):
        initializer = RAGInitializer(
            "config/init_config.yaml",
            "config/process_config.yaml"
        )
        st.session_state.rag_components = initializer.initialize()
```

---

## Error Handling

### User-Friendly Errors

```python
try:
    response = generate_response(query)
except Exception as e:
    st.error("❌ Failed to generate response. Please try again.")
    with st.expander("Technical Details"):
        st.code(str(e))
```

### LLM Offline Handling

```python
if not check_llm_status():
    st.warning("""
    ⚠️ LLM Server is offline. Please start it with:
    ```
    ./models/Mistral-Nemo-*.llamafile --server --port 8081
    ```
    """)
    st.stop()
```

---

## Responsive Design

### Layout Adaptation

```python
# Detect screen size and adjust layout
col1, col2 = st.columns([2, 1])  # 2:1 ratio for main content

with col1:
    # Main chat/content area
    pass

with col2:
    # Sidebar-like additional info
    pass
```

---

## Next: LLM Integration →

See [04_LLM_INTEGRATION.md](./04_LLM_INTEGRATION.md) for details on the llamafile server.

---

*Author: Arnav Angarkar*
