#!/bin/bash
# =============================================================================
# Docker Setup Script for Secure Offline RAG System
# =============================================================================
#
# This script prepares and starts the Docker containers for the RAG system.
#
# Usage:
#   ./docker-start.sh              # Build and start containers
#   ./docker-start.sh --download   # Download the LLM model (8.5 GB)
#   ./docker-start.sh --build      # Force rebuild images
#   ./docker-start.sh --stop       # Stop containers
#   ./docker-start.sh --logs       # View logs
#   ./docker-start.sh --cleanup    # Stop and remove containers/images
#
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Model configuration
MODEL_DIR="./models"
MODEL_NAME="Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile"
MODEL_PATH="$MODEL_DIR/$MODEL_NAME"
MODEL_URL="https://huggingface.co/Mozilla/Mistral-Nemo-Instruct-2407-llamafile/resolve/main/Mistral-Nemo-Instruct-2407.Q5_K_M.llamafile"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Secure Offline RAG System - Docker   ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed.${NC}"
    echo "Please install Docker Desktop from https://www.docker.com/products/docker-desktop/"
    exit 1
fi

# Check for Docker Compose (v2 or v1)
if docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}Error: Docker Compose is not installed.${NC}"
    exit 1
fi

echo -e "${BLUE}Using: $COMPOSE_CMD${NC}"

# Function to download the model
download_model() {
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}  Downloading LLM Model (8.5 GB)       ${NC}"
    echo -e "${YELLOW}========================================${NC}"
    echo ""
    echo "This may take 15-30 minutes depending on your connection..."
    echo ""
    
    mkdir -p "$MODEL_DIR"
    
    # Check if curl supports progress bar
    if curl --version | grep -q "Progress"; then
        curl -L --progress-bar -o "$MODEL_PATH" "$MODEL_URL"
    else
        curl -L -o "$MODEL_PATH" "$MODEL_URL"
    fi
    
    chmod +x "$MODEL_PATH"
    
    echo ""
    echo -e "${GREEN}Model downloaded successfully!${NC}"
    echo -e "Location: ${BLUE}$MODEL_PATH${NC}"
}

# Function to cleanup containers and images
cleanup() {
    echo -e "${YELLOW}Cleaning up Docker resources...${NC}"
    $COMPOSE_CMD down --rmi local --volumes --remove-orphans 2>/dev/null || true
    echo -e "${GREEN}Cleanup complete.${NC}"
}

# Handle command line arguments
case "$1" in
    --download)
        download_model
        exit 0
        ;;
    --stop)
        echo -e "${YELLOW}Stopping containers...${NC}"
        $COMPOSE_CMD down
        echo -e "${GREEN}Containers stopped.${NC}"
        exit 0
        ;;
    --cleanup)
        cleanup
        exit 0
        ;;
    --logs)
        echo -e "${YELLOW}Showing logs (Ctrl+C to exit)...${NC}"
        $COMPOSE_CMD logs -f
        exit 0
        ;;
    --build)
        if [ ! -f "$MODEL_PATH" ]; then
            echo -e "${RED}Error: LLM model not found.${NC}"
            echo "Run: ./docker-start.sh --download"
            exit 1
        fi
        chmod +x "$MODEL_PATH"
        echo -e "${YELLOW}Forcing rebuild of images...${NC}"
        $COMPOSE_CMD build --no-cache
        $COMPOSE_CMD up -d
        ;;
    --help|-h)
        echo "Usage: ./docker-start.sh [OPTION]"
        echo ""
        echo "Options:"
        echo "  (none)      Build and start containers"
        echo "  --download  Download the LLM model (8.5 GB)"
        echo "  --build     Force rebuild images"
        echo "  --stop      Stop all containers"
        echo "  --logs      View container logs"
        echo "  --cleanup   Stop and remove containers/images"
        echo "  --help      Show this help"
        echo ""
        echo "First-time setup:"
        echo "  1. ./docker-start.sh --download"
        echo "  2. ./docker-start.sh"
        exit 0
        ;;
    *)
        # Check for LLM model
        if [ ! -f "$MODEL_PATH" ]; then
            echo -e "${RED}Error: LLM model not found at $MODEL_PATH${NC}"
            echo ""
            echo "First, download the model (8.5 GB):"
            echo -e "${GREEN}  ./docker-start.sh --download${NC}"
            echo ""
            echo "Or download manually:"
            echo "  mkdir -p models"
            echo "  curl -L -o $MODEL_PATH \\"
            echo "    '$MODEL_URL'"
            exit 1
        fi
        
        chmod +x "$MODEL_PATH"
        echo -e "${YELLOW}Building and starting containers...${NC}"
        $COMPOSE_CMD up -d --build
        ;;
esac

echo ""

# Wait for containers to initialize
sleep 3

echo -e "${YELLOW}Container status:${NC}"
$COMPOSE_CMD ps

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Containers are starting...           ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "LLM Server:  ${BLUE}http://localhost:8081${NC} (wait ~2 min to load model)"
echo -e "Web App:     ${BLUE}http://localhost:8501${NC}"
echo ""
echo -e "${YELLOW}Commands:${NC}"
echo "  ./docker-start.sh --logs    # View logs"
echo "  ./docker-start.sh --stop    # Stop containers"
echo "  ./docker-start.sh --cleanup # Remove everything"
