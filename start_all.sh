#!/bin/bash
# RagVault - Start Both Servers

echo "🚀 Starting RagVault..."

# Navigate to project
cd /Users/rayyanshaikh/Desktop/RagVault

# Activate conda
source $(conda info --base)/etc/profile.d/conda.sh
conda activate rag_project

# Start API server in background
echo "📡 Starting API server on http://localhost:8000..."
python3 api_server.py &
API_PID=$!

# Wait for API to start
sleep 5

# Start frontend
echo "🎨 Starting Frontend on http://localhost:5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers started!"
echo "   API Server: http://localhost:8000"
echo "   Frontend:   http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap "kill $API_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped all servers'" SIGINT
wait
