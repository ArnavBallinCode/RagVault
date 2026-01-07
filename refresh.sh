#!/bin/bash

# Quick refresh script for RagVault
# Run this after adding new documents to data/uploads/

echo "🔄 Refreshing RagVault indices..."

# Clear cache
echo "Clearing cache..."
find cache -type f -delete 2>/dev/null || true

# Kill existing services
echo "Stopping services..."
lsof -ti:8501 | xargs kill -9 2>/dev/null || true
lsof -ti:8081 | xargs kill -9 2>/dev/null || true

# Rebuild cache
echo "Rebuilding indices (this may take a minute)..."
source $(conda info --base)/etc/profile.d/conda.sh
conda activate rag_project
python init_cache_data.py

# Restart services
echo "Starting services..."
nohup ./start.sh > start_log.txt 2>&1 &

echo "✅ Done! Wait 15-20 seconds, then open http://localhost:8501"
