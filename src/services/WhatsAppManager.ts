import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  BaileysEventMap,
  ConnectionState,
  proto
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { SessionInfo, WebhookConfig, MessageData } from '../types';

export class WhatsAppManager {
  private sessions: Map<string, WASocket> = new Map();
  private sessionInfos: Map<string, SessionInfo> = new Map();
  private webhookConfigs: Map<string, WebhookConfig> = new Map();
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.ensureDirectories();
  }

  private ensureDirectories() {
    const dirs = ['./sessions', './uploads'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async createSession(sessionId: string, name: string): Promise<SessionInfo> {
    if (this.sessions.has(sessionId)) {
      throw new Error('Session already exists');
    }

    const sessionInfo: SessionInfo = {
      id: sessionId,
      name,
      status: 'disconnected',
      messageCount: 0
    };

    this.sessionInfos.set(sessionId, sessionInfo);
    await this.startSession(sessionId);
    
    return sessionInfo;
  }

  async startSession(sessionId: string): Promise<void> {
    const sessionDir = path.join('./sessions', sessionId);
    
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    
    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      defaultQueryTimeoutMs: 60000,
    });

    this.sessions.set(sessionId, socket);

    // Handle events
    socket.ev.on('creds.update', saveCreds);
    
    socket.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
      await this.handleConnectionUpdate(sessionId, update);
    });

    socket.ev.on('messages.upsert', async (messageUpdate: any) => {
      await this.handleIncomingMessages(sessionId, messageUpdate);
    });

    this.updateSessionStatus(sessionId, 'connecting');
  }

  private async handleConnectionUpdate(sessionId: string, update: Partial<ConnectionState>) {
    const { connection, lastDisconnect, qr } = update;
    const sessionInfo = this.sessionInfos.get(sessionId);

    if (!sessionInfo) return;

    if (qr) {
      try {
        const qrDataURL = await QRCode.toDataURL(qr);
        sessionInfo.qr = qrDataURL;
        sessionInfo.status = 'qr_ready';
        this.sessionInfos.set(sessionId, sessionInfo);
        
        // Emit QR code to dashboard
        this.io.emit('qr_generated', { sessionId, qr: qrDataURL });
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
      
      if (shouldReconnect) {
        console.log(`Session ${sessionId} disconnected, reconnecting...`);
        setTimeout(() => this.startSession(sessionId), 3000);
      } else {
        console.log(`Session ${sessionId} logged out`);
        this.sessions.delete(sessionId);
        this.updateSessionStatus(sessionId, 'disconnected');
      }
    } else if (connection === 'open') {
      console.log(`Session ${sessionId} connected successfully`);
      const socket = this.sessions.get(sessionId);
      if (socket?.user) {
        sessionInfo.phone = socket.user.id;
      }
      this.updateSessionStatus(sessionId, 'connected');
      sessionInfo.lastSeen = new Date();
      this.sessionInfos.set(sessionId, sessionInfo);
    }
  }

  private async handleIncomingMessages(sessionId: string, messageUpdate: any) {
    const { messages } = messageUpdate;
    const sessionInfo = this.sessionInfos.get(sessionId);
    
    if (!sessionInfo) return;

    for (const message of messages) {
      if (message.key && message.key.fromMe) continue; // Skip own messages
      
      const messageData: MessageData = {
        id: uuidv4(),
        from: message.key.remoteJid || '',
        to: sessionInfo.phone || '',
        message: message.message,
        timestamp: new Date(),
        type: Object.keys(message.message || {})[0] || 'unknown',
        sessionId
      };

      // Update message count
      sessionInfo.messageCount++;
      this.sessionInfos.set(sessionId, sessionInfo);

      // Emit to dashboard
      this.io.emit('message_received', { sessionId, message: messageData });

      // Send webhook if configured
      await this.sendWebhook(sessionId, 'message.received', messageData);
    }
  }

  private updateSessionStatus(sessionId: string, status: SessionInfo['status']) {
    const sessionInfo = this.sessionInfos.get(sessionId);
    if (sessionInfo) {
      sessionInfo.status = status;
      this.sessionInfos.set(sessionId, sessionInfo);
      
      // Emit status update to dashboard
      this.io.emit('session_status_update', { sessionId, status });
    }
  }

  async sendMessage(sessionId: string, to: string, message: any): Promise<any> {
    const socket = this.sessions.get(sessionId);
    if (!socket) {
      throw new Error('Session not found or not connected');
    }

    const formattedNumber = to.includes('@') ? to : `${to}@s.whatsapp.net`;
    
    try {
      const result = await socket.sendMessage(formattedNumber, message);
      
      // Send webhook for sent message
      const messageData: MessageData = {
        id: uuidv4(),
        from: socket.user?.id || '',
        to: formattedNumber,
        message,
        timestamp: new Date(),
        type: Object.keys(message)[0] || 'unknown',
        sessionId
      };
      
      await this.sendWebhook(sessionId, 'message.sent', messageData);
      
      return result;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const socket = this.sessions.get(sessionId);
    
    if (socket) {
      try {
        await socket.logout();
      } catch (error) {
        console.error('Error logging out session:', error);
      }
      this.sessions.delete(sessionId);
    }

    this.sessionInfos.delete(sessionId);
    this.webhookConfigs.delete(sessionId);

    // Clean up session files
    const sessionDir = path.join('./sessions', sessionId);
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true });
    }

    this.io.emit('session_deleted', { sessionId });
  }

  getAllSessions(): SessionInfo[] {
    return Array.from(this.sessionInfos.values());
  }

  getSession(sessionId: string): SessionInfo | undefined {
    return this.sessionInfos.get(sessionId);
  }

  getSocket(sessionId: string): WASocket | undefined {
    return this.sessions.get(sessionId);
  }

  setWebhookConfig(sessionId: string, config: WebhookConfig): void {
    this.webhookConfigs.set(sessionId, config);
  }

  getWebhookConfig(sessionId: string): WebhookConfig | undefined {
    return this.webhookConfigs.get(sessionId);
  }

  private async sendWebhook(sessionId: string, event: string, data: any): Promise<void> {
    const config = this.webhookConfigs.get(sessionId);
    
    if (!config || !config.enabled || !config.url || !config.events.includes(event)) {
      return;
    }

    try {
      await axios.post(config.url, {
        event,
        sessionId,
        data,
        timestamp: new Date().toISOString()
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error(`Failed to send webhook for session ${sessionId}:`, error);
    }
  }
}
