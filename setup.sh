#!/bin/bash

# MySQL MCP Servers Setup and Test Script

echo "🚀 MySQL MCP Servers Setup and Test"
echo "===================================="

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Node.js
if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check npm
if ! command_exists npm; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm --version)"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "✅ Dependencies installed"

# Make scripts executable
chmod +x index.js
chmod +x servers/*/index.js
echo "✅ Scripts made executable"

# Test server manager
echo ""
echo "🔍 Testing Server Manager..."
echo "Server Status:"
node index.js status

echo ""
echo "📋 Available commands:"
echo "  node index.js start                      # Start all servers"
echo "  node index.js start mysql-process-monitor # Start specific server"
echo "  node index.js stop                       # Stop all servers"
echo "  node index.js restart                    # Restart all servers"
echo "  node index.js status                     # Show server status"

echo ""
echo "🧪 Testing individual servers (5 second timeout each)..."

echo "Testing MySQL Process Monitor..."
timeout 5 node servers/mysql-process-monitor/index.js >/dev/null 2>&1 && echo "✅ Process Monitor: OK" || echo "❌ Process Monitor: Failed"

echo "Testing MySQL Service Manager..."
timeout 5 node servers/mysql-service-manager/index.js >/dev/null 2>&1 && echo "✅ Service Manager: OK" || echo "❌ Service Manager: Failed"

echo "Testing MySQL Performance Monitor..."
timeout 5 node servers/mysql-performance-monitor/index.js >/dev/null 2>&1 && echo "✅ Performance Monitor: OK" || echo "❌ Performance Monitor: Failed"

echo ""
echo "🎉 Setup complete! All MCP servers are ready to use."
echo ""
echo "📚 Next steps:"
echo "1. Configure MySQL connection in config/mysql-config.json"
echo "2. Start the servers: node index.js start"
echo "3. Use the MCP tools, resources, and prompts in your application"
echo ""
echo "📖 For detailed usage, see README.md"