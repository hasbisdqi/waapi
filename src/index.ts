import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { WhatsAppManager } from './services/WhatsAppManager';
import { SessionController } from './controllers/SessionController';
import { MessageController } from './controllers/MessageController';
import { WebhookController } from './controllers/WebhookController';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/temp', express.static(path.join(__dirname, '../temp')));

// Serve static files for dashboard
app.use(express.static(path.join(__dirname, '../public')));

// Initialize WhatsApp Manager
const whatsappManager = new WhatsAppManager(io);

// Controllers
const sessionController = new SessionController(whatsappManager);
const messageController = new MessageController(whatsappManager);
const webhookController = new WebhookController(whatsappManager);

// Routes
app.use('/api/sessions', sessionController.router);
app.use('/api/messages', messageController.router);
app.use('/api/webhook', webhookController.router);

// Dashboard route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 WhatsApp API Server running on port ${PORT}`);
  console.log(`📱 Dashboard: http://localhost:${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
});

export { app, server, io };
