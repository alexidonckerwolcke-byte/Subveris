#!/bin/bash

# Test what the API is actually returning for subscriptions

TOKEN="a.eyJzdWIiOiIzYzIwODViNy1kZTE5LTQ1NmEtODA1NS1mZmIyMmRkOWNiYjIifQ.b"

echo "=========================================="
echo "Testing /api/subscriptions response"
echo "=========================================="
echo ""

curl -s \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:5000/api/subscriptions | jq '.[0] | {id, name, nextBillingDate, status, allKeys: keys}'

echo ""
echo "=========================================="
echo "Full response (first subscription):"
echo "=========================================="
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:5000/api/subscriptions | jq '.[0]'
