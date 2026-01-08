#!/bin/bash
# RagVault - Start API Backend and Frontend
# NOTE: You must start the LLM server separately in Terminal 1!

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Starting RagVault API Backend and Frontend..."
echo ""
echo "⚠️  IMPORTANT: This script starts services 2 & 3 only."
echo "   You must start the LLM server separately in Terminal 1:"
echo "   ./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081"
echo ""

# Check if LLM server is running
if ! curl -s http://localhost:8081/health > /dev/null 2>&1; then
    echo "❌ LLM server is NOT running on port 8081!"
    echo "   Please start it first in a separate terminal:"
    echo "   ./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081"
    echo ""
    read -p "Do you want to continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Activate conda
echo "📦 Activating conda environment..."
eval "$(conda shell.bash hook)"
conda activate rag_project

# Start API server in background
echo "📡 Starting API server on http://localhost:8000..."
python api_server.py &
API_PID=$!

# Wait for API to start
sleep 5

# Start frontend
echo "🎨 Starting React Frontend on http://localhost:5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Services started!"
echo ""
echo "   Terminal 1 (separate): LLM Server (port 8081)"
echo "   Terminal 2 (this):     API Backend (port 8000) - PID: $API_PID"
echo "   Terminal 2 (this):     React UI (port 5173) - PID: $FRONTEND_PID"
echo ""
echo "   Access the UI at: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop API and Frontend servers"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Shutting down API and Frontend..."
    kill $API_PID $FRONTEND_PID 2>/dev/null || true
    echo "✅ Cleanup complete"
    echo "   Note: LLM server in Terminal 1 is still running"
}
trap cleanup EXIT SIGINT

# Wait for processes
wait
