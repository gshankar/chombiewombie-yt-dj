#!/bin/bash
# ChombieWombie Tracklist Studio Startup Script

# Change working directory to the folder containing this script
cd "$(dirname "$0")"

echo "--------------------------------------------------"
echo "🎧 Starting ChombieWombie Tracklist Studio..."
echo "--------------------------------------------------"

# Check if python3 is installed
if command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
    PYTHON_CMD="python"
else
    echo "❌ Error: Python is not installed or not in PATH."
    echo "Please install Python or open index.html directly."
    read -p "Press Enter to exit..."
    exit 1
fi

# Define the port
PORT=8000

echo "🚀 Launching local web server on port $PORT..."
echo "🔗 Open your browser to: http://localhost:$PORT"
echo "--------------------------------------------------"
echo "Press Ctrl+C in this Terminal window to stop the server."
echo "--------------------------------------------------"

# Open the app in the default browser in the background
open "http://localhost:$PORT"

# Run the server
$PYTHON_CMD -m http.server $PORT
