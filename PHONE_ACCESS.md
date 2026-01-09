# 📱 Quick Guide: Access RagVault from Your Phone

## Problem with Current Token

The authtoken from the screenshot appears to be incorrectly formatted. Let me help you get the right one!

## ✅ Step-by-Step Solution

### 1. Get Your Real ngrok Authtoken

1. Open browser and go to: https://dashboard.ngrok.com/get-started/your-authtoken
2. Sign in to your ngrok account
3. Copy the authtoken (should look like: `2abc...xyz_123...789` - usually 40+ characters)

⚠️ **Important**: The token should be alphanumeric, NOT contain `+` or `/` characters like the one in your screenshot!

### 2. Run the Setup Helper

```bash
cd /Users/arnavangarkar/Desktop/Secure-Offline-RAG-System
./setup_ngrok.sh
```

This interactive script will:
- Ask you to paste the correct authtoken
- Check which services are running
- Start the appropriate ngrok tunnel

### 3. Access from Your Phone

After ngrok starts, you'll see:

```
Session Status                online
Account                       your@email.com

Forwarding                    https://abc123.ngrok-free.app -> http://localhost:5173
```

**On your phone:**
1. Open Safari (iOS) or Chrome (Android)
2. Enter the URL: `https://abc123.ngrok-free.app`
3. Click "Visit Site" (ngrok shows a warning page first)
4. You'll see RagVault! 🎉

---

## Quick Commands

### Start Everything (4 terminals needed)

```bash
# Terminal 1: LLM
./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile --server --nobrowser -ngl 999 --port 8081

# Terminal 2: API
python api_server.py

# Terminal 3: Frontend
cd frontend && npm run dev

# Terminal 4: ngrok
./setup_ngrok.sh  # Choose option 1
```

### Just Frontend (Simplest)

If you only want to access the UI from your phone:

```bash
# After starting all 3 services above
ngrok http 5173
```

---

## Troubleshooting

### "Authentication failed"
- Your authtoken is wrong
- Get it from: https://dashboard.ngrok.com/get-started/your-authtoken
- Run: `ngrok config add-authtoken YOUR_NEW_TOKEN`

### "Tunnel not found" or ERR_NGROK_3200
- Free accounts are limited to 1 tunnel
- Close other ngrok sessions
- Or upgrade to paid plan

### "Connection refused" on phone
- Make sure all 3 services are running first
- Check: `lsof -i :5173` (should show node process)

### Frontend loads but doesn't work
- The frontend needs to connect to the API
- Use option 2 in setup_ngrok.sh (Frontend + API)

---

## Alternative: Local Network Access (No ngrok needed!)

If your phone and computer are on the **same WiFi**:

1. Get your computer's local IP:
   ```bash
   ipconfig getifaddr en0
   # Example output: 192.168.1.100
   ```

2. On your phone, go to:
   ```
   http://192.168.1.100:5173
   ```

This works without ngrok and is faster! But only on the same network.

---

## Need Help?

See full documentation: [NGROK_SETUP.md](NGROK_SETUP.md)
