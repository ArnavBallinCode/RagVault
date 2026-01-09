# RagVault - Remote Access with ngrok

## Overview

This guide shows you how to access RagVault from any device (phone, tablet, other computers) using ngrok tunnels.

---

## What is ngrok?

ngrok creates secure tunnels from public URLs to your local RagVault services, allowing access from anywhere.

```
Your Phone/Tablet          Internet           Your Computer
    │                         │                    │
    │  https://abc123.ngrok-free.app              │
    └──────────────────────────┼────────────────────┘
                               │
                        ┌──────┴───────┐
                        │  ngrok Agent │
                        └──────┬───────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
         ┌──────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
         │ Frontend   │ │    API    │ │    LLM    │
         │ :5173      │ │   :8000   │ │   :8081   │
         └────────────┘ └───────────┘ └───────────┘
```

---

## Quick Start

### Prerequisites

✅ All 3 RagVault services must be running:
- Terminal 1: LLM Server (port 8081)
- Terminal 2: API Backend (port 8000)
- Terminal 3: Frontend (port 5173)

### Start ngrok Tunnels

**Terminal 4 (new terminal):**

```bash
cd /Users/arnavangarkar/Desktop/Secure-Offline-RAG-System
./start_ngrok.sh
```

You'll see output like:

```
Session Status                online
Account                       your-email@example.com
Version                       3.x.x
Region                        United States (us)

Web Interface                 http://127.0.0.1:4040

Forwarding                    https://abc123.ngrok-free.app -> http://localhost:5173
Forwarding                    https://def456.ngrok-free.app -> http://localhost:8000
Forwarding                    https://ghi789.ngrok-free.app -> http://localhost:8081
```

---

## Access from Your Phone

### Step 1: Get the URLs

From the ngrok output, copy the **Frontend URL** (the one pointing to port 5173):

```
https://abc123.ngrok-free.app -> http://localhost:5173
         ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
      This is your URL!
```

### Step 2: Update Frontend Configuration

The React frontend needs to know the ngrok URLs for the API and LLM servers.

**Option A: Update via environment variables (Recommended)**

Create a `.env` file in the frontend directory:

```bash
cd frontend
cat > .env << 'EOF'
VITE_API_BASE_URL=https://def456.ngrok-free.app
VITE_LLM_BASE_URL=https://ghi789.ngrok-free.app
EOF
```

**Option B: Update the API client directly**

Edit `frontend/src/api/client.ts` and change the base URLs to your ngrok URLs.

### Step 3: Access on Your Phone

1. **Open your phone's browser** (Safari on iPhone, Chrome on Android)
2. **Enter the Frontend ngrok URL**: `https://abc123.ngrok-free.app`
3. **Click "Visit Site"** (ngrok shows a warning page first)
4. **You'll see the RagVault interface!** 🎉

---

## Important Notes

### ⚠️ Security Warnings

1. **ngrok Warning Page**: You'll see a warning page first - click "Visit Site" to continue
2. **HTTPS Required**: Modern browsers require HTTPS for many features - ngrok provides this automatically
3. **Public Access**: Anyone with your ngrok URL can access your RAG system
4. **Free Tier Limits**: ngrok free tier has session time limits and may require clicking through warnings

### 🔒 Securing Your Tunnels

Add basic authentication to your ngrok tunnels:

Edit `ngrok.yml`:

```yaml
tunnels:
  frontend:
    addr: 5173
    proto: http
    auth: "username:password"  # Add this line
```

### 📱 Mobile-Specific Tips

1. **Save to Home Screen** (iOS):
   - Tap the Share button in Safari
   - Select "Add to Home Screen"
   - Now RagVault appears as an app icon!

2. **Save to Home Screen** (Android):
   - Tap the menu in Chrome
   - Select "Add to Home screen"

3. **Enable Desktop Site** if the mobile view has issues:
   - iOS Safari: Tap 'aA' → Request Desktop Website
   - Android Chrome: Menu → Desktop site

---

## Advanced Configuration

### Custom Domains (Paid Plan)

With ngrok Pro or higher:

```yaml
tunnels:
  frontend:
    addr: 5173
    proto: http
    domain: ragvault.yourdomain.com
```

### Regional Endpoints

Specify a region closer to you:

```yaml
tunnels:
  frontend:
    addr: 5173
    proto: http
    region: eu  # or 'ap', 'au', 'sa', 'jp', 'in'
```

### IP Restrictions (Paid Plan)

Allow only specific IP addresses:

```yaml
tunnels:
  frontend:
    addr: 5173
    proto: http
    ip_restriction:
      allow_cidrs:
        - 203.0.113.0/24  # Your home network
```

---

## Troubleshooting

### "Failed to start tunnel"

**Problem**: ngrok can't connect to your local service

**Solution**: 
```bash
# Check if services are running
lsof -i :5173  # Frontend
lsof -i :8000  # API
lsof -i :8081  # LLM

# If not running, start them first
```

### "Tunnel session expired"

**Problem**: ngrok free tier has session limits

**Solution**: Restart ngrok:
```bash
# Stop with Ctrl+C, then restart
./start_ngrok.sh
```

### "ERR_NGROK_3200"

**Problem**: ngrok account limit reached

**Solution**: 
- Wait for existing sessions to expire
- Or upgrade to ngrok paid plan
- Or use only 1-2 tunnels instead of 3

### Frontend can't connect to API

**Problem**: Frontend is trying to connect to `localhost:8000` instead of ngrok URL

**Solution**: Update frontend configuration (see Step 2 above)

### CORS errors

**Problem**: Browser blocks cross-origin requests

**Solution**: Update `api_server.py` to allow your ngrok domain:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend.ngrok-free.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Monitoring

### ngrok Web Interface

ngrok provides a web dashboard at: **http://localhost:4040**

Features:
- See all active tunnels
- Inspect HTTP requests/responses
- Replay requests
- View traffic statistics

### View Logs

```bash
# View ngrok logs
tail -f ~/.ngrok2/ngrok.log

# View service logs
tail -f logs/api_server.log
tail -f logs/llm_server.log
```

---

## Stopping ngrok

1. In the ngrok terminal, press `Ctrl+C`
2. All tunnels will close immediately
3. Your local services continue running

---

## Alternative: Tailscale (Recommended for Teams)

For more secure remote access, consider Tailscale:

1. Install Tailscale on your computer and phone
2. Access services via Tailscale IP: `http://100.x.x.x:5173`
3. No public exposure, encrypted mesh network

---

## Example Workflow

**Complete startup for remote access:**

```bash
# Terminal 1: LLM Server
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081

# Terminal 2: API Backend
conda activate rag_project
python api_server.py

# Terminal 3: Frontend
cd frontend
npm run dev

# Terminal 4: ngrok
./start_ngrok.sh
```

**On your phone:**
1. Open Safari/Chrome
2. Go to the ngrok URL (e.g., `https://abc123.ngrok-free.app`)
3. Click "Visit Site"
4. Use RagVault from anywhere! 📱✨

---

*Last updated: January 2026*
