#!/bin/bash
# Quick Phone Access - No ngrok needed!
# Access RagVault from your phone on the same WiFi

echo "📱 RagVault - Local Network Access"
echo "=================================="
echo ""

# Get local IP
IP=$(ipconfig getifaddr en0)

if [ -z "$IP" ]; then
    echo "❌ Not connected to WiFi"
    echo "   Please connect to WiFi and try again"
    exit 1
fi

echo "✅ Your computer's IP: $IP"
echo ""

# Check services
echo "Checking services..."
FRONTEND_RUNNING=false
API_RUNNING=false
LLM_RUNNING=false

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ Frontend running on port 5173"
    FRONTEND_RUNNING=true
else
    echo "❌ Frontend NOT running"
fi

if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ API running on port 8000"
    API_RUNNING=true
else
    echo "⚠️  API NOT running (optional)"
fi

if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ LLM running on port 8081"
    LLM_RUNNING=true
else
    echo "⚠️  LLM NOT running (optional)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$FRONTEND_RUNNING" = true ]; then
    echo "📱 On your phone (connected to same WiFi):"
    echo ""
    echo "   Open Safari or Chrome and go to:"
    echo ""
    echo "   🔗  http://$IP:5173"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "💡 Tips:"
    echo "   • Make sure your phone is on the same WiFi network"
    echo "   • If it doesn't work, check your firewall settings"
    echo "   • Add to home screen for app-like experience!"
else
    echo "⚠️  Frontend is not running!"
    echo ""
    echo "Start it with:"
    echo "   cd frontend && npm run dev"
fi

echo ""
