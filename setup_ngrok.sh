#!/bin/bash
# Setup ngrok for RagVault
# This script helps you configure ngrok properly

echo "🌐 RagVault - ngrok Setup Helper"
echo ""
echo "Step 1: Get your ngrok authtoken"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Go to: https://dashboard.ngrok.com/get-started/your-authtoken"
echo "2. Sign in to your ngrok account"
echo "3. Copy your authtoken (it should look like: 2abc...xyz_123...789)"
echo ""
echo "⚠️  Note: The token should NOT contain special characters like + or /"
echo ""
read -p "Paste your authtoken here: " AUTHTOKEN
echo ""

if [ -z "$AUTHTOKEN" ]; then
    echo "❌ No authtoken provided. Exiting."
    exit 1
fi

echo "Step 2: Configuring ngrok..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ngrok config add-authtoken "$AUTHTOKEN"

if [ $? -eq 0 ]; then
    echo "✅ Authtoken saved successfully!"
else
    echo "❌ Failed to save authtoken. Please check if it's correct."
    exit 1
fi

echo ""
echo "Step 3: Testing connection..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ngrok config check

echo ""
echo "Step 4: What services are running?"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

SERVICES_RUNNING=0

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ Frontend is running on port 5173"
    SERVICES_RUNNING=$((SERVICES_RUNNING + 1))
else
    echo "❌ Frontend is NOT running on port 5173"
    echo "   Start it: cd frontend && npm run dev"
fi

if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ API Backend is running on port 8000"
    SERVICES_RUNNING=$((SERVICES_RUNNING + 1))
else
    echo "❌ API Backend is NOT running on port 8000"
    echo "   Start it: python api_server.py"
fi

if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ LLM Server is running on port 8081"
    SERVICES_RUNNING=$((SERVICES_RUNNING + 1))
else
    echo "❌ LLM Server is NOT running on port 8081"
    echo "   Start it: ./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081"
fi

echo ""
if [ $SERVICES_RUNNING -eq 0 ]; then
    echo "⚠️  No services are running. Please start them first!"
    echo ""
    echo "See QUICKSTART.md for instructions on starting all 3 services."
    exit 0
fi

echo "Step 5: Choose which services to expose"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Select option:"
echo "  1) Frontend only (most common - access UI from phone)"
echo "  2) Frontend + API (recommended if API calls fail)"
echo "  3) All 3 services (requires ngrok paid plan for 3+ tunnels)"
echo ""
read -p "Enter choice (1-3): " CHOICE
echo ""

case $CHOICE in
    1)
        echo "Starting ngrok for Frontend only..."
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "📱 After ngrok starts, you'll see a URL like:"
        echo "   https://abc123.ngrok-free.app"
        echo ""
        echo "   Open this URL on your phone to access RagVault!"
        echo ""
        ngrok http 5173
        ;;
    2)
        echo "Starting ngrok for Frontend + API..."
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "⚠️  This requires 2 separate terminal windows!"
        echo ""
        echo "Terminal A (this one): Frontend"
        echo "Terminal B (open new): API"
        echo ""
        read -p "Press Enter to start Frontend tunnel in this terminal..."
        echo ""
        echo "In another terminal, run: ngrok http 8000"
        echo ""
        ngrok http 5173
        ;;
    3)
        echo "Starting ngrok for all 3 services..."
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "⚠️  Free ngrok accounts are limited to 1 tunnel at a time."
        echo "   You need a paid plan to run 3 simultaneous tunnels."
        echo ""
        echo "Alternatives:"
        echo "  • Use Tailscale (free, secure) - see NGROK_SETUP.md"
        echo "  • Upgrade to ngrok paid plan"
        echo "  • Use option 1 or 2 above"
        echo ""
        read -p "Continue anyway? (y/N): " CONFIRM
        if [[ $CONFIRM =~ ^[Yy]$ ]]; then
            ngrok start --all --config ngrok.yml
        else
            echo "Cancelled."
        fi
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac
