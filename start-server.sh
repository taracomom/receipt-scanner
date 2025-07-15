#!/bin/bash

# Receipt Scanner Development Server Setup
echo "🚀 Receipt Scanner サーバーを起動しています..."

# Change to project directory
cd /mnt/c/Users/owner/CascadeProjects/receipt-scanner

# Start HTTP server
echo "📡 HTTPサーバーを起動中 (ポート8000)..."
python3 -m http.server 8000 &
SERVER_PID=$!

# Wait for server to start
sleep 2

echo "✅ サーバーが起動しました"
echo "📱 ローカルアクセス: http://localhost:8000/working-version.html"
echo ""
echo "🌐 外部アクセス用にCloudflare Tunnelを起動するには:"
echo "cloudflared tunnel --url http://localhost:8000"
echo ""
echo "📝 サーバーを停止するには: kill $SERVER_PID"
echo "PID: $SERVER_PID"