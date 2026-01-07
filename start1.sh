#!/bin/bash

echo "Killing existing services..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:8081 | xargs kill -9 2>/dev/null

echo "Starting LLM..."
nohup ./models/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile \
  --server \
  --nobrowser \
  -ngl 999 \
  --port 8081 \
  > llm_server.log 2>&1 &

echo "Waiting for LLM to initialize..."
sleep 20

echo "Activating conda environment..."
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate rag_project

echo "Starting API server..."
nohup python api_server.py > api_server.log 2>&1 &

echo "All services started successfully."
