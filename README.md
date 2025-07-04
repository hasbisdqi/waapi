# WhatsApp API with Baileys

A powerful WhatsApp API built with Baileys library, featuring a web dashboard for session management, message sending, and webhook configuration.

## Features

- 🚀 Multiple WhatsApp session management
- 📱 QR Code generation for easy connection
- 💬 Send text, images, documents, audio, video, and sticker messages
- 🔗 Webhook support for real-time notifications
- 📊 Beautiful web dashboard
- 🔄 Real-time updates with Socket.IO
- 📁 File upload support
- 🎯 RESTful API endpoints

## Requirements

- [Bun](https://bun.sh/) (JavaScript runtime)
- Node.js 18+ (if using npm)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd waapi
```

2. Install dependencies using Bun:
```bash
bun install
```

3. Build the project:
```bash
bun run build
```

4. Start the development server:
```bash
bun run dev
```

Or start the production server:
```bash
bun run start
```

## Usage

### Web Dashboard

Visit `http://localhost:3000` to access the web dashboard where you can:

- Create and manage WhatsApp sessions
- Scan QR codes to connect WhatsApp accounts
- Send test messages
- Configure webhooks
- Monitor session status and message counts

### API Endpoints

#### Sessions

- `GET /api/sessions` - Get all sessions
- `POST /api/sessions` - Create a new session
- `GET /api/sessions/:sessionId` - Get session details
- `DELETE /api/sessions/:sessionId` - Delete a session
- `GET /api/sessions/:sessionId/qr` - Get QR code for session
- `POST /api/sessions/:sessionId/webhook` - Configure webhook
- `GET /api/sessions/:sessionId/webhook` - Get webhook configuration

#### Messages

- `POST /api/messages/:sessionId/send` - Send any type of message
- `POST /api/messages/:sessionId/send-text` - Send text message
- `POST /api/messages/:sessionId/send-image` - Send image (multipart/form-data)
- `POST /api/messages/:sessionId/send-document` - Send document (multipart/form-data)
- `POST /api/messages/:sessionId/send-audio` - Send audio (multipart/form-data)
- `POST /api/messages/:sessionId/send-video` - Send video (multipart/form-data)
- `POST /api/messages/:sessionId/send-sticker` - Send sticker (multipart/form-data)

#### Webhooks

- `POST /api/webhook/receive` - Receive webhooks from external services
- `GET /api/webhook/test` - Test webhook endpoint

## API Examples

### Create a Session

```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"name": "My WhatsApp Session"}'
```

### Send a Text Message

```bash
curl -X POST http://localhost:3000/api/messages/SESSION_ID/send-text \
  -H "Content-Type: application/json" \
  -d '{
    "to": "628123456789",
    "text": "Hello from WhatsApp API!"
  }'
```

### Send an Image

```bash
curl -X POST http://localhost:3000/api/messages/SESSION_ID/send-image \
  -F "image=@/path/to/image.jpg" \
  -F "to=628123456789" \
  -F "caption=Check out this image!"
```

### Send a Sticker

```bash
curl -X POST http://localhost:3000/api/messages/SESSION_ID/send-sticker \
  -F "sticker=@/path/to/sticker.webp" \
  -F "to=628123456789"
```

### Send a Video

```bash
curl -X POST http://localhost:3000/api/messages/SESSION_ID/send-video \
  -F "video=@/path/to/video.mp4" \
  -F "to=628123456789" \
  -F "caption=Check this video!"
```

### Configure Webhook

```bash
curl -X POST http://localhost:3000/api/sessions/SESSION_ID/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-webhook-url.com/webhook",
    "events": ["message.received", "message.sent"],
    "enabled": true
  }'
```

## Message Types

### Text Message

```json
{
  "to": "628123456789",
  "message": {
    "text": "Hello World!"
  }
}
```

### Image Message

```json
{
  "to": "628123456789",
  "message": {
    "image": {
      "url": "https://example.com/image.jpg",
      "caption": "Check this out!"
    }
  }
}
```

### Document Message

```json
{
  "to": "628123456789",
  "message": {
    "document": {
      "url": "https://example.com/document.pdf",
      "filename": "document.pdf",
      "mimetype": "application/pdf"
    }
  }
}
```

### Audio Message

```json
{
  "to": "628123456789",
  "message": {
    "audio": {
      "url": "https://example.com/audio.mp3"
    }
  }
}
```

### Video Message

```json
{
  "to": "628123456789",
  "message": {
    "video": {
      "url": "https://example.com/video.mp4",
      "caption": "Check this video!"
    }
  }
}
```

### Sticker Message

```json
{
  "to": "628123456789",
  "message": {
    "sticker": {
      "url": "https://example.com/sticker.webp"
    }
  }
}
```

## Webhook Events

The API can send webhooks for the following events:

- `message.received` - When a message is received
- `message.sent` - When a message is sent
- `session.connected` - When a session is connected
- `session.disconnected` - When a session is disconnected

### Webhook Payload

```json
{
  "event": "message.received",
  "sessionId": "session-uuid",
  "data": {
    "id": "message-uuid",
    "from": "628123456789@s.whatsapp.net",
    "to": "your-number@s.whatsapp.net",
    "message": { ... },
    "timestamp": "2023-12-07T10:30:00.000Z",
    "type": "conversation",
    "sessionId": "session-uuid"
  },
  "timestamp": "2023-12-07T10:30:00.000Z"
}
```

## Environment Variables

You can configure the following environment variables:

- `PORT` - Server port (default: 3000)

Create a `.env` file in the root directory:

```env
PORT=3000
```

## Project Structure

```
waapi/
├── src/
│   ├── controllers/
│   │   ├── SessionController.ts
│   │   ├── MessageController.ts
│   │   └── WebhookController.ts
│   ├── services/
│   │   └── WhatsAppManager.ts
│   ├── types/
│   │   └── index.ts
│   └── index.ts
├── public/
│   └── index.html
├── sessions/          # Auto-created for session data
├── uploads/          # Auto-created for file uploads
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Scripts

- `bun run dev` - Start development server with hot reload
- `bun run build` - Build the project
- `bun run start` - Start production server
- `bun run clean` - Clean build directory

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test your changes
5. Submit a pull request

## License

MIT License

## Support

For support and questions, please open an issue in the repository.

## Disclaimer

This project is for educational and development purposes. Please ensure you comply with WhatsApp's Terms of Service when using this API.
