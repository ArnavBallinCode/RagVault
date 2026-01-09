#!/bin/bash
# Fix ngrok authtoken issue

echo "🔧 ngrok Authtoken Fix"
echo "====================="
echo ""
echo "The authtoken '2xYCaLejjRaFHLzsNZiL1nHSTGn_367yw+vAYP5QCRRHu51ss' is invalid."
echo ""
echo "Steps to fix:"
echo ""
echo "1. A browser window should have opened to:"
echo "   https://dashboard.ngrok.com/get-started/your-authtoken"
echo ""
echo "2. On that page, you'll see a command like:"
echo "   ngrok config add-authtoken 2abc...xyz"
echo ""
echo "3. Copy the ENTIRE command and paste it here:"
echo ""
read -p "Paste the full command: " COMMAND

# Execute the command
eval "$COMMAND"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Authtoken saved!"
    echo ""
    echo "Now starting ngrok with your custom domain..."
    echo ""
    
    # Check if frontend is running
    if ! lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo "❌ Frontend is not running!"
        echo "   Start it first: cd frontend && npm run dev"
        exit 1
    fi
    
    echo "🌐 Starting ngrok tunnel..."
    echo ""
    echo "Access from ANYWHERE at: https://better-dashing-rattler.ngrok-free.app"
    echo ""
    
    ngrok http 5173 --domain=better-dashing-rattler.ngrok-free.app
else
    echo ""
    echo "❌ Failed to save authtoken. Please try again."
fi
