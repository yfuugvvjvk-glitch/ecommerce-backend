#!/bin/bash

echo "🧪 Testing Backend Server..."
echo ""

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s http://localhost:3001/health | jq '.'

echo ""
echo "2. Testing register endpoint..."
curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234",
    "name": "Test User"
  }' | jq '.'

echo ""
echo "3. Testing login endpoint..."
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }' | jq -r '.token')

echo "Token: $TOKEN"

echo ""
echo "4. Testing /me endpoint..."
curl -s http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo ""
echo "✅ Backend tests completed!"
