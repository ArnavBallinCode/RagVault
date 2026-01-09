#!/bin/bash
# Start ngrok tunnels for all RagVault services
# This exposes your local services to the internet

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🌐 Starting ngrok tunnels for RagVault..."
echo ""
echo "⚠️  IMPORTANT: Make sure all 3 services are running first:"
echo "   Terminal 1: LLM Server (port 8081)"
echo "   Terminal 2: API Backend (port 8000)"
echo "   Terminal 3: Frontend (port 5173)"
echo ""

# Check if services are running
echo "Checking if services are running..."

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ Frontend is running on port 5173"
else
    echo "❌ Frontend is NOT running on port 5173"
    echo "   Start it with: cd frontend && npm run dev"
fi

if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ API Backend is running on port 8000"
else
    echo "❌ API Backend is NOT running on port 8000"
    echo "   Start it with: python api_server.py"
fi

if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ LLM Server is running on port 8081"
else
    echo "❌ LLM Server is NOT running on port 8081"
    echo "   Start it with: ./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081"
fi

echo ""
echo "Starting ngrok with all 3 tunnels..."
echo ""
echo "📱 You'll be able to access RagVault from any device (including your phone)!"
echo ""

# Start ngrok with the config file
ngrok start --all --config ngrok.yml
