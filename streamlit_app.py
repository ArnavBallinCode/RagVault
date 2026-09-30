# Secure Offline RAG System - Enhanced UI with Role-Based Access Control
import streamlit as st
import logging
from typing import Dict, List, Optional
import random
import os
from pathlib import Path
from datetime import datetime
import hashlib
import json
from initialize_rag import RAGInitializer

# Page configuration - MUST be first Streamlit command
st.set_page_config(
    page_title="Secure RAG System",
    page_icon="🔒",
    layout="wide",
    initial_sidebar_state="expanded"
)

# =============================================================================
# USER & ROLE MANAGEMENT
# =============================================================================

USERS_FILE = "config/users.json"

# Default users (password is hashed)
DEFAULT_USERS = {
    "admin": {
        "password": hashlib.sha256("admin123".encode()).hexdigest(),
        "role": "admin",
        "name": "Administrator"
    },
    "user": {
        "password": hashlib.sha256("user123".encode()).hexdigest(),
        "role": "user", 
        "name": "Standard User"
    }
}

def load_users() -> dict:
    """Load users from JSON file or create default."""
    if Path(USERS_FILE).exists():
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    else:
        save_users(DEFAULT_USERS)
        return DEFAULT_USERS

def save_users(users: dict):
    """Save users to JSON file."""
    Path(USERS_FILE).parent.mkdir(parents=True, exist_ok=True)
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=2)

def hash_password(password: str) -> str:
    """Hash a password using SHA-256."""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_user(username: str, password: str) -> Optional[dict]:
    """Verify user credentials and return user data if valid."""
    users = load_users()
    if username in users:
        if users[username]["password"] == hash_password(password):
            return {
                "username": username,
                "role": users[username]["role"],
                "name": users[username]["name"]
            }
    return None

def is_admin() -> bool:
    """Check if current user is admin."""
    return st.session_state.get("user", {}).get("role") == "admin"

def is_logged_in() -> bool:
    """Check if user is logged in."""
    return "user" in st.session_state and st.session_state.user is not None

# =============================================================================
# CUSTOM STYLING
# =============================================================================

def inject_custom_css():
    st.markdown("""
    <style>
    /* Dark theme with modern styling */
    .stApp {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    }
    
    /* Header styling */
    .main-header {
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-size: 2.5rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
    }
    
    .sub-header {
        color: #a0a0a0;
        font-size: 1rem;
        margin-bottom: 2rem;
    }
    
    /* Login card */
    .login-card {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 2rem;
        max-width: 400px;
        margin: 2rem auto;
    }
    
    /* Role badge */
    .role-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
    }
    
    .role-admin {
        background: linear-gradient(90deg, #ff6b6b 0%, #ee5a5a 100%);
        color: white;
    }
    
    .role-user {
        background: linear-gradient(90deg, #4ecdc4 0%, #45b7af 100%);
        color: white;
    }
    
    /* Source citation styling */
    .source-citation {
        background: rgba(102, 126, 234, 0.1);
        border-left: 3px solid #667eea;
        padding: 0.75rem;
        margin: 0.5rem 0;
        border-radius: 0 8px 8px 0;
        font-size: 0.85rem;
    }
    
    /* Status indicators */
    .status-online {
        color: #00ff88;
        font-weight: 600;
    }
    
    .status-offline {
        color: #ff4444;
        font-weight: 600;
    }
    
    /* Sidebar styling */
    [data-testid="stSidebar"] {
        background: rgba(22, 33, 62, 0.95);
        backdrop-filter: blur(10px);
    }
    
    /* Button styling */
    .stButton > button {
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 10px;
        padding: 0.5rem 1.5rem;
        font-weight: 600;
        transition: transform 0.2s;
    }
    
    .stButton > button:hover {
        transform: translateY(-2px);
    }
    
    /* File uploader */
    [data-testid="stFileUploader"] {
        background: rgba(255, 255, 255, 0.05);
        border: 2px dashed rgba(102, 126, 234, 0.5);
        border-radius: 15px;
        padding: 2rem;
    }
    
    /* Metrics */
    [data-testid="stMetricValue"] {
        color: #667eea;
        font-size: 1.8rem;
    }
    
    /* Progress bar */
    .stProgress > div > div {
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    }
    
    /* Hide Streamlit branding */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    </style>
    """, unsafe_allow_html=True)

# =============================================================================
# LOGIN PAGE
# =============================================================================

def render_login_page():
    """Render the login page."""
    st.markdown('<h1 class="main-header" style="text-align: center;">🔒 Secure RAG System</h1>', unsafe_allow_html=True)
    st.markdown('<p class="sub-header" style="text-align: center;">Enterprise Knowledge Assistant • Offline • Private • Secure</p>', unsafe_allow_html=True)
    
    col1, col2, col3 = st.columns([1, 2, 1])
    
    with col2:
        st.markdown("### 🔐 Login")
        
        with st.form("login_form"):
            username = st.text_input("Username", placeholder="Enter username")
            password = st.text_input("Password", type="password", placeholder="Enter password")
            
            col_a, col_b = st.columns(2)
            with col_a:
                submitted = st.form_submit_button("🔑 Login", use_container_width=True)
            
            if submitted:
                if username and password:
                    user = verify_user(username, password)
                    if user:
                        st.session_state.user = user
                        st.success(f"Welcome, {user['name']}!")
                        st.rerun()
                    else:
                        st.error("Invalid username or password")
                else:
                    st.warning("Please enter both username and password")
        
        st.divider()
        st.caption("**Default Accounts:**")
        st.caption("Admin: `admin` / `admin123`")
        st.caption("User: `user` / `user123`")

# =============================================================================
# QUERY PROCESSING
# =============================================================================

def process_query(query: str,
                 retriever,
                 reranker,
                 response_generator,
                 process_config: Dict,
                 send_nb_chunks_to_llm=1) -> Dict:
    """Process a single query through the complete RAG pipeline."""
    try:
        # Expand query if configured
        if process_config['retrieval']['use_query_expansion']:
            expanded_query = response_generator.expand_query(query)
        else:
            expanded_query = query
            
        # Retrieve relevant documents
        if process_config['retrieval']['use_bm25']:
            retrieved_results = retriever.retrieve_with_method(
                expanded_query, method="hybrid", top_k=process_config['retrieval']['top_k'])
        else:
            retrieved_results = retriever.retrieve_with_method(
                expanded_query, method="vector", top_k=process_config['retrieval']['top_k'])
        
        # Apply reranking if configured
        if process_config['retrieval']['use_reranking']:
            reranked_results = reranker.rerank(
                query, [r.document for r in retrieved_results], top_k=send_nb_chunks_to_llm)
            relevant_docs = [r.document for r in reranked_results]
            best_score = reranked_results[0].score if reranked_results else 0.0
        else:
            relevant_docs = [r.document for r in retrieved_results]
            best_score = retrieved_results[0].score if retrieved_results else 0.0
        
        # Generate response
        response_data = response_generator.generate_answer(
            query, relevant_docs, metadata={'retrieval_score': best_score})
        
        return {
            'Query': query,
            'Response': response_data['response'].rstrip('</s>').rstrip(),
            'Score': best_score,
            'Sources': relevant_docs
        }
        
    except Exception as e:
        logging.error(f"Error processing query: {str(e)}")
        return {
            'Query': query,
            'Response': f"⚠️ Error: {str(e)}\n\nPlease check if the LLM server is running.",
            'Score': 0.0,
            'Sources': []
        }

def check_llm_status(url: str) -> bool:
    """Check if LLM server is accessible."""
    import requests
    try:
        response = requests.get(f"{url}/health", timeout=2)
        return response.status_code == 200
    except:
        return False

# =============================================================================
# SESSION STATE
# =============================================================================

def initialize_session_state():
    """Initialize Streamlit session state variables."""
    defaults = {
        'messages': [],
        'rag_components': None,
        'current_page': "Chat",
        'llm_status': False,
        'user': None
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value

# =============================================================================
# CHAT INTERFACE
# =============================================================================

def display_chat_message(role: str, content: str, sources: list = None, score: float = None):
    """Display a chat message with optional sources and confidence score."""
    with st.chat_message(role, avatar="🧑‍💻" if role == "user" else "🤖"):
        st.markdown(content)
        
        if score is not None and role == "assistant":
            normalized_score = max(0.0, min(abs(score), 1.0))
            col1, col2 = st.columns([3, 1])
            with col1:
                st.progress(normalized_score)
            with col2:
                st.caption(f"Confidence: {normalized_score:.0%}")
        
        if sources and role == "assistant":
            with st.expander(f"📚 View {len(sources)} Source(s)"):
                for idx, source in enumerate(sources, 1):
                    source_file = Path(source.metadata.get("source", "Unknown")).name
                    st.markdown(f"**📄 Source {idx}:** {source_file}")
                    st.text_area(
                        label=f"Content from {source_file}",
                        value=source.page_content,
                        height=150,
                        label_visibility="collapsed",
                        key=f"src_{role}_{idx}_{hash(content)}_{random.randint(0, 999999)}",
                        disabled=True
                    )

def render_chat_page():
    """Render the main chat interface."""
    st.markdown('<h1 class="main-header">🔒 Secure RAG Assistant</h1>', unsafe_allow_html=True)
    st.markdown('<p class="sub-header">Ask questions about your indexed documents • Fully Offline • Private & Secure</p>', unsafe_allow_html=True)
    
    # Check LLM status
    if st.session_state.rag_components:
        llm_url = st.session_state.rag_components.process_config['retrieval']['llamafile_server_base_url']
        st.session_state.llm_status = check_llm_status(llm_url)
    
    # Status indicator
    col1, col2, col3 = st.columns([2, 2, 1])
    with col1:
        if st.session_state.llm_status:
            st.success("🟢 LLM Server: Online")
        else:
            st.error("🔴 LLM Server: Offline - Start the llamafile server")
    with col2:
        if st.session_state.rag_components:
            chunks = len(st.session_state.rag_components.original_chunks)
            st.info(f"📊 Indexed: {chunks} document chunks")
    
    # Chat history display
    for message in st.session_state.messages:
        display_chat_message(
            role=message["role"],
            content=message["content"],
            sources=message.get("sources"),
            score=message.get("score")
        )
    
    # Chat input
    if prompt := st.chat_input("💬 Ask a question about your documents...", disabled=not st.session_state.llm_status):
        display_chat_message("user", prompt)
        st.session_state.messages.append({"role": "user", "content": prompt})
        
        with st.spinner("🔍 Searching documents and generating response..."):
            result = process_query(
                prompt,
                st.session_state.rag_components.retriever,
                st.session_state.rag_components.reranker,
                st.session_state.rag_components.response_generator,
                st.session_state.rag_components.process_config,
                st.session_state.rag_components.process_config['retrieval']['send_nb_chunks_to_llm']
            )
            
            display_chat_message(
                role="assistant",
                content=result['Response'],
                sources=result['Sources'],
                score=result['Score']
            )
            
            st.session_state.messages.append({
                "role": "assistant",
                "content": result['Response'],
                "sources": result['Sources'],
                "score": result['Score']
            })
            st.rerun()

# =============================================================================
# DOCUMENT MANAGEMENT (All users can view, Admin can manage)
# =============================================================================

def render_documents_page():
    """Render the document management page."""
    st.markdown('<h1 class="main-header">📁 Document Management</h1>', unsafe_allow_html=True)
    st.markdown('<p class="sub-header">Upload, manage, and index your documents</p>', unsafe_allow_html=True)
    
    # Document upload section - Admin only
    if is_admin():
        st.subheader("📤 Upload New Documents")
        
        uploaded_files = st.file_uploader(
            "Drag and drop files here",
            type=["pdf", "docx", "txt", "md"],
            accept_multiple_files=True,
            help="Supported formats: PDF, DOCX, TXT, Markdown"
        )
        
        if uploaded_files:
            upload_dir = Path("data/uploads")
            upload_dir.mkdir(parents=True, exist_ok=True)
            
            for uploaded_file in uploaded_files:
                file_path = upload_dir / uploaded_file.name
                with open(file_path, "wb") as f:
                    f.write(uploaded_file.getbuffer())
                st.success(f"✅ Uploaded: {uploaded_file.name}")
            
            st.info("💡 Run `python init_cache_data.py` after adding paths to config to re-index")
        
        st.divider()
        
        # URL Web Scraper section - Admin only
        st.subheader("🌐 Web Scraper")
        st.markdown("Scrape content from web pages and add to your knowledge base")
        
        with st.form("url_scraper_form"):
            url_input = st.text_input(
                "Enter URL to scrape",
                placeholder="https://example.com/documentation",
                help="Enter a URL to scrape. The scraper will extract content and optionally follow TOC links."
            )
            
            col1, col2 = st.columns(2)
            with col1:
                traverse_toc = st.checkbox(
                    "Traverse Table of Contents",
                    value=True,
                    help="Follow navigation/TOC links to scrape multiple pages"
                )
            with col2:
                toc_selector = st.text_input(
                    "TOC CSS Selector (optional)",
                    value=".table-of-contents a, .toc a, nav a",
                    help="CSS selector to identify TOC/navigation links"
                )
            
            scrape_submitted = st.form_submit_button("🕷️ Scrape URL", use_container_width=True)
            
            if scrape_submitted and url_input:
                try:
                    with st.spinner(f"🔍 Scraping content from {url_input}..."):
                        import yaml
                        # Load config for the web loader
                        with open("config/init_config.yaml", 'r') as f:
                            config = yaml.safe_load(f)
                        
                        from src.data.loaders.web_scraper import EnhancedWebLoader
                        
                        loader = EnhancedWebLoader(
                            config=config,
                            base_url=url_input,
                            toc_selector=toc_selector,
                            traverse_toc=traverse_toc
                        )
                        
                        documents = loader.load()
                        
                        if documents:
                            # Save scraped documents to data/raw
                            save_dir = Path("data/raw/scraped")
                            save_dir.mkdir(parents=True, exist_ok=True)
                            
                            from urllib.parse import urlparse
                            domain = urlparse(url_input).netloc.replace(".", "_")
                            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                            
                            saved_files = []
                            for idx, doc in enumerate(documents):
                                filename = f"{domain}_{timestamp}_{idx+1}.md"
                                filepath = save_dir / filename
                                with open(filepath, "w", encoding="utf-8") as f:
                                    f.write(f"# Source: {doc.metadata.get('source', url_input)}\n\n")
                                    f.write(doc.page_content)
                                saved_files.append(filename)
                            
                            st.success(f"✅ Successfully scraped {len(documents)} page(s)!")
                            
                            # Now add to RAG index directly for immediate use
                            if st.session_state.rag_components:
                                with st.spinner("📊 Adding to search index..."):
                                    try:
                                        from langchain_text_splitters import RecursiveCharacterTextSplitter
                                        from langchain_core.documents import Document
                                        from rank_bm25 import BM25Okapi
                                        
                                        # Create text splitter for chunking
                                        text_splitter = RecursiveCharacterTextSplitter(
                                            chunk_size=config['processing']['chunk_size'],
                                            chunk_overlap=config['processing']['chunk_overlap']
                                        )
                                        
                                        # Process scraped documents into chunks directly (bypass cache)
                                        new_chunks = []
                                        for doc in documents:
                                            chunks = text_splitter.split_documents([doc])
                                            new_chunks.extend(chunks)
                                        
                                        st.info(f"📝 Created {len(new_chunks)} chunks from scraped content")
                                        logging.info(f"Created {len(new_chunks)} chunks from {len(documents)} scraped documents")
                                        
                                        if new_chunks:
                                            # Add to existing chunks list
                                            existing_chunks = st.session_state.rag_components.original_chunks
                                            chunk_count_before = len(existing_chunks)
                                            existing_chunks.extend(new_chunks)
                                            
                                            st.info(f"📊 Chunks before: {chunk_count_before}, after: {len(existing_chunks)}")
                                            
                                            # Get retriever components
                                            retriever = st.session_state.rag_components.retriever
                                            
                                            # 1. Add to FAISS vectorstore directly
                                            vector_retriever = retriever.vector_retriever
                                            if vector_retriever.vectorstore is not None:
                                                new_texts = [chunk.page_content for chunk in new_chunks]
                                                new_metadatas = [chunk.metadata for chunk in new_chunks]
                                                
                                                st.info(f"🔍 Adding {len(new_texts)} texts to vector store...")
                                                vector_retriever.vectorstore.add_texts(new_texts, metadatas=new_metadatas)
                                                
                                                # Update internal tracking lists
                                                if hasattr(vector_retriever, 'texts'):
                                                    vector_retriever.texts.extend(new_texts)
                                                if hasattr(vector_retriever, 'sources'):
                                                    vector_retriever.sources.extend([m.get("source", url_input) for m in new_metadatas])
                                                
                                                st.success("✅ Added to vector search index")
                                                logging.info(f"Added {len(new_chunks)} documents to FAISS vectorstore")
                                            else:
                                                st.warning("⚠️ Vector store not initialized - skipping vector indexing")
                                            
                                            # 2. Rebuild BM25 index with all chunks
                                            bm25_retriever = retriever.bm25_retriever
                                            bm25_retriever.chunks = existing_chunks
                                            tokenized_chunks = [chunk.page_content.split() for chunk in existing_chunks]
                                            bm25_retriever.bm25_index = BM25Okapi(tokenized_chunks)
                                            st.success(f"✅ Rebuilt BM25 index with {len(existing_chunks)} total chunks")
                                            logging.info(f"Rebuilt BM25 index with {len(existing_chunks)} total chunks")
                                            
                                            st.success(f"🎉 Successfully indexed {len(new_chunks)} chunks! You can now ask questions about this content.")
                                        else:
                                            st.warning("⚠️ No chunks created from scraped content")
                                    except Exception as idx_error:
                                        st.error(f"❌ Indexing error: {str(idx_error)}")
                                        logging.exception("Failed to index scraped content")
                                        import traceback
                                        st.code(traceback.format_exc())
                            
                            with st.expander("📄 Saved Files"):
                                for fname in saved_files:
                                    st.markdown(f"- `{fname}`")
                        else:
                            st.warning("⚠️ No content was extracted from the URL")
                            
                except Exception as e:
                    st.error(f"❌ Error scraping URL: {str(e)}")
                    logging.error(f"Web scraper error: {str(e)}")
    else:
        st.info("📋 View-only mode. Contact an administrator to upload documents.")
    
    st.divider()
    
    # Current indexed documents
    st.subheader("📚 Indexed Documents")
    
    if st.session_state.rag_components:
        # Show files from data/raw
        docs_path = Path("data/raw")
        if docs_path.exists():
            files = [f for f in docs_path.glob("*") if f.is_file() and not f.name.startswith('.')]
            
            if files:
                for f in files:
                    col1, col2, col3 = st.columns([3, 1, 1])
                    with col1:
                        icon = "📄" if f.suffix == ".txt" else "📕" if f.suffix == ".pdf" else "📘"
                        st.markdown(f"{icon} **{f.name}**")
                    with col2:
                        st.caption(f"{f.stat().st_size / 1024:.1f} KB")
                    with col3:
                        st.caption(datetime.fromtimestamp(f.stat().st_mtime).strftime("%Y-%m-%d"))
            else:
                st.info("No documents in data/raw/")
        
        # Show scraped URL documents
        scraped_path = Path("data/raw/scraped")
        if scraped_path.exists():
            scraped_files = [f for f in scraped_path.glob("*.md") if f.is_file()]
            
            if scraped_files:
                st.divider()
                st.subheader("🌐 Scraped URLs")
                
                for f in sorted(scraped_files, key=lambda x: x.stat().st_mtime, reverse=True):
                    col1, col2, col3 = st.columns([3, 1, 1])
                    with col1:
                        st.markdown(f"🔗 **{f.name}**")
                    with col2:
                        st.caption(f"{f.stat().st_size / 1024:.1f} KB")
                    with col3:
                        st.caption(datetime.fromtimestamp(f.stat().st_mtime).strftime("%Y-%m-%d %H:%M"))
        
        # Show current index stats
        st.divider()
        st.subheader("📊 Index Statistics")
        col1, col2 = st.columns(2)
        with col1:
            st.metric("Total Chunks in Index", len(st.session_state.rag_components.original_chunks))
        with col2:
            if hasattr(st.session_state.rag_components.retriever.vector_retriever, 'texts'):
                st.metric("Vector Store Docs", len(st.session_state.rag_components.retriever.vector_retriever.texts))

# =============================================================================
# SETTINGS PAGE (View for all, Edit for Admin)
# =============================================================================

def render_settings_page():
    """Render the settings page."""
    st.markdown('<h1 class="main-header">⚙️ Settings</h1>', unsafe_allow_html=True)
    st.markdown('<p class="sub-header">Configure your RAG system parameters</p>', unsafe_allow_html=True)
    
    if st.session_state.rag_components:
        config = st.session_state.rag_components.process_config['retrieval']
        
        st.subheader("🤖 LLM Configuration")
        col1, col2 = st.columns(2)
        with col1:
            st.text_input("LLM Server URL", value=config['llamafile_server_base_url'], disabled=True)
        with col2:
            st.success("Connected") if st.session_state.llm_status else st.error("Not Connected")
        
        st.divider()
        
        st.subheader("🔍 Retrieval Settings")
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Top K Documents", config['top_k'])
        with col2:
            st.metric("Chunks to LLM", config['send_nb_chunks_to_llm'])
        with col3:
            st.metric("BM25 Weight", f"{config['bm25_weight']:.1%}")
        
        st.divider()
        
        st.subheader("🔧 Actions")
        col1, col2 = st.columns(2)
        with col1:
            if st.button("🗑️ Clear Chat History", use_container_width=True):
                st.session_state.messages = []
                st.success("Chat history cleared!")
                st.rerun()
        with col2:
            if st.button("🔄 Refresh LLM Status", use_container_width=True):
                st.session_state.llm_status = check_llm_status(config['llamafile_server_base_url'])
                st.rerun()

# =============================================================================
# USER MANAGEMENT PAGE (Admin only)
# =============================================================================

def render_users_page():
    """Render the user management page (Admin only)."""
    st.markdown('<h1 class="main-header">👥 User Management</h1>', unsafe_allow_html=True)
    st.markdown('<p class="sub-header">Manage users and access control</p>', unsafe_allow_html=True)
    
    if not is_admin():
        st.error("⛔ Access Denied. Administrator privileges required.")
        return
    
    users = load_users()
    
    # Display existing users
    st.subheader("📋 Current Users")
    
    for username, user_data in users.items():
        col1, col2, col3, col4 = st.columns([2, 2, 1, 1])
        with col1:
            st.markdown(f"**{user_data['name']}**")
            st.caption(f"@{username}")
        with col2:
            role = user_data['role']
            badge_class = "role-admin" if role == "admin" else "role-user"
            st.markdown(f'<span class="role-badge {badge_class}">{role}</span>', unsafe_allow_html=True)
        with col3:
            if username != "admin" and is_admin():  # Can't delete main admin
                if st.button("🗑️", key=f"del_{username}"):
                    del users[username]
                    save_users(users)
                    st.success(f"Deleted user: {username}")
                    st.rerun()
    
    st.divider()
    
    # Add new user
    st.subheader("➕ Add New User")
    
    with st.form("add_user_form"):
        col1, col2 = st.columns(2)
        with col1:
            new_username = st.text_input("Username")
            new_password = st.text_input("Password", type="password")
        with col2:
            new_name = st.text_input("Display Name")
            new_role = st.selectbox("Role", ["user", "admin"])
        
        if st.form_submit_button("➕ Add User", use_container_width=True):
            if new_username and new_password and new_name:
                if new_username in users:
                    st.error("Username already exists")
                else:
                    users[new_username] = {
                        "password": hash_password(new_password),
                        "role": new_role,
                        "name": new_name
                    }
                    save_users(users)
                    st.success(f"Created user: {new_username}")
                    st.rerun()
            else:
                st.warning("Please fill in all fields")

# =============================================================================
# SIDEBAR
# =============================================================================

def render_sidebar():
    """Render the sidebar navigation."""
    with st.sidebar:
        st.markdown("## 🔒 Secure RAG")
        
        # User info
        if is_logged_in():
            user = st.session_state.user
            role_badge = "role-admin" if user['role'] == "admin" else "role-user"
            st.markdown(f"""
            **{user['name']}**  
            <span class="role-badge {role_badge}">{user['role']}</span>
            """, unsafe_allow_html=True)
        
        st.markdown("---")
        
        # Navigation - different pages based on role
        pages = {"💬 Chat": "Chat", "📁 Documents": "Documents", "⚙️ Settings": "Settings"}
        
        if is_admin():
            pages["👥 Users"] = "Users"  # Admin-only page
        
        for label, page in pages.items():
            if st.button(label, use_container_width=True, 
                        type="primary" if st.session_state.current_page == page else "secondary"):
                st.session_state.current_page = page
                st.rerun()
        
        st.markdown("---")
        
        # Quick stats
        st.markdown("### 📊 Quick Stats")
        if st.session_state.rag_components:
            st.metric("Indexed Chunks", len(st.session_state.rag_components.original_chunks))
            st.metric("Chat Messages", len(st.session_state.messages))
        
        st.markdown("---")
        
        # Status
        st.markdown("### 🔌 Status")
        st.markdown(f'<span class="{"status-online" if st.session_state.llm_status else "status-offline"}">● LLM {"Online" if st.session_state.llm_status else "Offline"}</span>', unsafe_allow_html=True)
        
        st.markdown("---")
        
        # Logout button
        if st.button("🚪 Logout", use_container_width=True):
            st.session_state.user = None
            st.session_state.messages = []
            st.rerun()
        
        st.caption("🔒 100% Offline • Private • Secure")

# =============================================================================
# MAIN APPLICATION
# =============================================================================

def main():
    """Main application entry point."""
    inject_custom_css()
    initialize_session_state()
    
    # Show login page if not logged in
    if not is_logged_in():
        render_login_page()
        return
    
    # Initialize RAG components if not already done
    if st.session_state.rag_components is None:
        with st.spinner("🚀 Initializing Secure RAG System..."):
            try:
                initializer = RAGInitializer(
                    "config/init_config.yaml",
                    "config/process_config.yaml"
                )
                components = initializer.initialize()
                components.retriever.initialize(components.original_chunks)
                st.session_state.rag_components = components
                
                llm_url = components.process_config['retrieval']['llamafile_server_base_url']
                st.session_state.llm_status = check_llm_status(llm_url)
                
            except Exception as e:
                st.error(f"❌ Error initializing RAG system: {str(e)}")
                st.info("Make sure you've run `python init_cache_data.py` first!")
                return
    
    # Render sidebar
    render_sidebar()
    
    # Render current page
    page_renderers = {
        "Chat": render_chat_page,
        "Documents": render_documents_page,
        "Settings": render_settings_page,
        "Users": render_users_page
    }
    
    renderer = page_renderers.get(st.session_state.current_page, render_chat_page)
    renderer()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()
