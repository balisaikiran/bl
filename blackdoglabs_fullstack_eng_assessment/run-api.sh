#!/bin/bash
# Run script for the API server
# This ensures we're running from the project root

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Run uvicorn from project root
echo "Starting API server from project root: $SCRIPT_DIR"
echo "Running: uv run uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000"
echo ""

uv run uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000

