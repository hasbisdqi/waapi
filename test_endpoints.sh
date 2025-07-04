#!/bin/bash

# WhatsApp API Testing Script
BASE_URL="http://localhost:3000"
SESSION_ID=""
PHONE_NUMBER="628123456789"  # Replace with actual phone number

echo "🚀 WhatsApp API Test Suite"
echo "=========================="

# Test 1: Health Check
echo "1. Testing health endpoint..."
curl -s "$BASE_URL/health" | jq . 2>/dev/null || curl -s "$BASE_URL/health"
echo -e "\n"

# Test 2: Create Session
echo "2. Creating a new session..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/sessions" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Session"}')
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

# Extract session ID
SESSION_ID=$(echo "$RESPONSE" | jq -r '.data.id' 2>/dev/null || echo "session-test")
echo "Session ID: $SESSION_ID"
echo -e "\n"

# Test 3: List Sessions
echo "3. Listing all sessions..."
curl -s "$BASE_URL/api/sessions" | jq . 2>/dev/null || curl -s "$BASE_URL/api/sessions"
echo -e "\n"

# Test 4: Get Session Details
echo "4. Getting session details..."
curl -s "$BASE_URL/api/sessions/$SESSION_ID" | jq . 2>/dev/null || curl -s "$BASE_URL/api/sessions/$SESSION_ID"
echo -e "\n"

# Test 5: Get QR Code
echo "5. Getting QR code..."
curl -s "$BASE_URL/api/sessions/$SESSION_ID/qr" | jq . 2>/dev/null || curl -s "$BASE_URL/api/sessions/$SESSION_ID/qr"
echo -e "\n"

# Test 6: Send Text Message (Will fail if not connected)
echo "6. Testing text message endpoint..."
curl -s -X POST "$BASE_URL/api/messages/$SESSION_ID/send-text" \
  -H "Content-Type: application/json" \
  -d "{\"to\": \"$PHONE_NUMBER\", \"text\": \"Hello from WhatsApp API Test!\"}" \
  | jq . 2>/dev/null || curl -s -X POST "$BASE_URL/api/messages/$SESSION_ID/send-text" \
  -H "Content-Type: application/json" \
  -d "{\"to\": \"$PHONE_NUMBER\", \"text\": \"Hello from WhatsApp API Test!\"}"
echo -e "\n"

# Test 7: Send Message with URL
echo "7. Testing send message with image URL..."
curl -s -X POST "$BASE_URL/api/messages/$SESSION_ID/send" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$PHONE_NUMBER\",
    \"message\": {
      \"image\": {
        \"url\": \"https://picsum.photos/200/300\",
        \"caption\": \"Test image from URL\"
      }
    }
  }" | jq . 2>/dev/null || curl -s -X POST "$BASE_URL/api/messages/$SESSION_ID/send" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$PHONE_NUMBER\",
    \"message\": {
      \"image\": {
        \"url\": \"https://picsum.photos/200/300\",
        \"caption\": \"Test image from URL\"
      }
    }
  }"
echo -e "\n"

# Test 8: Configure Webhook
echo "8. Configuring webhook..."
curl -s -X POST "$BASE_URL/api/sessions/$SESSION_ID/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://httpbin.org/post",
    "events": ["message.received", "message.sent"],
    "enabled": true
  }' | jq . 2>/dev/null || curl -s -X POST "$BASE_URL/api/sessions/$SESSION_ID/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://httpbin.org/post",
    "events": ["message.received", "message.sent"],
    "enabled": true
  }'
echo -e "\n"

# Test 9: Get Webhook Configuration
echo "9. Getting webhook configuration..."
curl -s "$BASE_URL/api/sessions/$SESSION_ID/webhook" | jq . 2>/dev/null || curl -s "$BASE_URL/api/sessions/$SESSION_ID/webhook"
echo -e "\n"

# Test 10: Test Webhook Endpoint
echo "10. Testing webhook receive endpoint..."
curl -s -X POST "$BASE_URL/api/webhook/receive" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "test.webhook",
    "sessionId": "test-session",
    "data": {
      "message": "This is a test webhook"
    }
  }' | jq . 2>/dev/null || curl -s -X POST "$BASE_URL/api/webhook/receive" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "test.webhook",
    "sessionId": "test-session",
    "data": {
      "message": "This is a test webhook"
    }
  }'
echo -e "\n"

# Test 11: Test Webhook Test Endpoint
echo "11. Testing webhook test endpoint..."
curl -s "$BASE_URL/api/webhook/test" | jq . 2>/dev/null || curl -s "$BASE_URL/api/webhook/test"
echo -e "\n"

# Test 12: Create Test Image File and Upload
echo "12. Testing image upload..."
# Create a small test image (1x1 pixel PNG)
echo -n "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > test_image.png

curl -s -X POST "$BASE_URL/api/messages/$SESSION_ID/send-image" \
  -F "image=@test_image.png" \
  -F "to=$PHONE_NUMBER" \
  -F "caption=Test image upload" \
  | jq . 2>/dev/null || curl -s -X POST "$BASE_URL/api/messages/$SESSION_ID/send-image" \
  -F "image=@test_image.png" \
  -F "to=$PHONE_NUMBER" \
  -F "caption=Test image upload"

# Clean up test file
rm -f test_image.png
echo -e "\n"

echo "🎉 All tests completed!"
echo "Note: Message sending tests will fail if the session is not connected to WhatsApp."
echo "To connect a session:"
echo "1. Go to $BASE_URL"
echo "2. Create a session"
echo "3. Get QR code and scan with WhatsApp"
echo "4. Wait for connection"
echo "5. Run tests again"
