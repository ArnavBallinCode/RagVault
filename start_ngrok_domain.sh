#!/bin/bash
# Start ngrok with your custom domain

echo "🌐 Starting ngrok for RagVault..."
echo ""
echo "Your custom domain: better-dashing-rattler.ngrok-free.app"
echo ""

# Check if frontend is running
if ! lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "❌ Frontend is not running on port 5173"
    echo "   Start it first: cd frontend && npm run dev"
    exit 1
fi

echo "✅ Frontend is running"
echo ""
echo "Starting ngrok tunnel..."
echo ""
echo "Once started, access from ANY device (phone, tablet, etc.) at:"
echo "   https://better-dashing-rattler.ngrok-free.app"
echo ""

ngrok http 5173 --domain=better-dashing-rattler.ngrok-free.app
