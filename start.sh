#!/bin/bash
# Startup script for Secure Offline RAG System on macOS
# This is a LEGACY script that starts LLM + Streamlit only
# 
# RECOMMENDED: Use the 3-terminal manual approach instead:
#   Terminal 1: ./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081
#   Terminal 2: python api_server.py
#   Terminal 3: cd frontend && npm run dev

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Starting Secure Offline RAG System (Streamlit Mode)..."
echo ""
echo "⚠️  NOTE: This script only starts LLM + Streamlit"
echo "   For full functionality with React UI, you need to:"
echo "   1. Start LLM server (Terminal 1)"
echo "   2. Start API server (Terminal 2): python api_server.py"
echo "   3. Start React UI (Terminal 3): cd frontend && npm run dev"
echo ""

# Activate conda environment
echo "📦 Activating conda environment..."
eval "$(conda shell.bash hook)"
conda activate rag_project

# Check if LLM model exists
if [ ! -f "models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile" ]; then
    echo "❌ LLM model not found. Please download it first:"
    echo "   curl -L -o models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile \\"
    echo "   'https://huggingface.co/Mozilla/Mistral-Nemo-Instruct-2407-llamafile/resolve/main/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile'"
    exit 1
fi

# Make llamafile executable
chmod +x models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile

echo ""
echo "📝 Starting LLM server in background..."
echo "   (This uses Metal/MPS acceleration on Apple Silicon)"

# Start LLM server in background
# -ngl 999 means offload all layers to GPU (Metal on macOS)
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081 &
LLM_PID=$!

echo "   LLM Server PID: $LLM_PID"
echo ""

# Wait for LLM server to start
echo "⏳ Waiting for LLM server to start..."
sleep 10

# Check if server is running
if curl -s http://localhost:8081/health > /dev/null 2>&1; then
    echo "✅ LLM server is running!"
else
    echo "⚠️  LLM server may still be loading. Please wait..."
fi

echo ""
echo "🎯 Starting Streamlit web interface..."
echo "   Access the RAG system at: http://localhost:8501"
echo ""
echo "   Press Ctrl+C to stop all services"
echo ""

# Trap to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    kill $LLM_PID 2>/dev/null || true
    echo "✅ Cleanup complete"
}
trap cleanup EXIT

# Start Streamlit
streamlit run streamlit_app.py --server.port 8501
