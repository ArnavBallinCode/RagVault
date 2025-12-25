# Multi-stage build for Secure Offline RAG System
# ==============================================
# This Dockerfile creates a container for the Streamlit RAG application.
# The LLM model runs in a separate container.

# Stage 1: Base image with system dependencies
FROM python:3.10-slim as base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    libreoffice \
    && rm -rf /var/lib/apt/lists/*

# Stage 2: Python dependencies
FROM base as dependencies

WORKDIR /app

# Copy requirements file (Docker-specific without NVIDIA GPU packages)
COPY requirements_docker.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements_docker.txt

# Stage 3: Application
FROM dependencies as app

WORKDIR /app

# Copy application code
COPY src/ ./src/
COPY config/ ./config/
COPY streamlit_app.py .
COPY initialize_rag.py .
COPY init_cache_data.py .
COPY process_single_query.py .

# Create necessary directories
RUN mkdir -p data/raw data/uploads cache logs models

# Expose Streamlit port
EXPOSE 8501

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8501/_stcore/health || exit 1

# Run Streamlit
ENTRYPOINT ["streamlit", "run", "streamlit_app.py", \
    "--server.port=8501", \
    "--server.address=0.0.0.0", \
    "--server.headless=true", \
    "--browser.gatherUsageStats=false"]
