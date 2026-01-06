#!/bin/bash
# Complete API Test Script for RagVault

echo "🧪 RagVault API Test Suite"
echo "=================================="
echo ""

# Colors
GREEN='\033[0.32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Health Check
echo -e "${BLUE}1. Health Check${NC}"
curl -s http://localhost:8000/health | python3 -m json.tool
echo ""

# 2. Upload Document
echo -e "${BLUE}2. Uploading test document${NC}"
curl -s -X POST "http://localhost:8000/upload" \
  -F "file=@test_networking.txt" | python3 -m json.tool
echo ""

# 3. Refresh Indices
echo -e "${BLUE}3. Refreshing indices (this takes ~30 seconds)${NC}"
curl -s -X POST "http://localhost:8000/refresh" | python3 -m json.tool
echo ""

# 4. List Documents
echo -e "${BLUE}4. Listing indexed documents${NC}"
curl -s "http://localhost:8000/documents" | python3 -m json.tool
echo ""

# 5. Query 1
echo -e "${BLUE}5. Query: What is the Stop-and-Wait protocol?${NC}"
curl -s -X POST "http://localhost:8000/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the Stop-and-Wait protocol?", "top_k": 2}' | python3 -m json.tool
echo ""

# 6. Query 2
echo -e "${BLUE}6. Query: What is TCP/IP?${NC}"
curl -s -X POST "http://localhost:8000/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is TCP/IP?", "top_k": 2}' | python3 -m json.tool
echo ""

echo -e "${GREEN}✅ All tests completed!${NC}"
echo ""
echo "API Documentation: http://localhost:8000/docs"
