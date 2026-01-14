#!/bin/bash
echo "=== Server Diagnostic ==="
echo "1. Checking port 3000:"
lsof -i :3000 2>&1 | head -3
echo ""
echo "2. Testing root endpoint:"
curl -s http://localhost:3000/ | head -3
echo ""
echo "3. Testing known API route:"
curl -s -X GET "http://localhost:3000/api/markets" -H "X-Merchant-API-Key: test" | head -3
echo ""
echo "4. Checking if .next directory exists:"
ls -la .next 2>&1 | head -3
echo ""
echo "=== Next Steps ==="
echo "If no process on port 3000, start server with: npm run dev"
echo "If server is running but routes don't work, check server console for errors"
