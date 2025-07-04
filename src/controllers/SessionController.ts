import { Router, Request, Response } from 'express';
import { WhatsAppManager } from '../services/WhatsAppManager';
import { v4 as uuidv4 } from 'uuid';

export class SessionController {
  public router: Router;

  constructor(private whatsappManager: WhatsAppManager) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get('/', this.getAllSessions.bind(this));
    this.router.post('/', this.createSession.bind(this));
    this.router.get('/:sessionId', this.getSession.bind(this));
    this.router.delete('/:sessionId', this.deleteSession.bind(this));
    this.router.post('/:sessionId/start', this.startSession.bind(this));
    this.router.get('/:sessionId/qr', this.getQR.bind(this));
    this.router.post('/:sessionId/webhook', this.setWebhook.bind(this));
    this.router.get('/:sessionId/webhook', this.getWebhook.bind(this));
  }

  private async getAllSessions(req: Request, res: Response) {
    try {
      const sessions = this.whatsappManager.getAllSessions();
      res.json({
        success: true,
        data: sessions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get sessions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async createSession(req: Request, res: Response) {
    try {
      const { name, sessionId } = req.body;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Session name is required'
        });
      }

      const id = sessionId || uuidv4();
      const session = await this.whatsappManager.createSession(id, name);
      
      res.status(201).json({
        success: true,
        data: session,
        message: 'Session created successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create session',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const session = this.whatsappManager.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      res.json({
        success: true,
        data: session
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get session',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async deleteSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const session = this.whatsappManager.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      await this.whatsappManager.deleteSession(sessionId);
      
      res.json({
        success: true,
        message: 'Session deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete session',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async startSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const session = this.whatsappManager.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      await this.whatsappManager.startSession(sessionId);
      
      res.json({
        success: true,
        message: 'Session started successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to start session',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getQR(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const session = this.whatsappManager.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      if (!session.qr) {
        return res.status(404).json({
          success: false,
          error: 'QR code not available'
        });
      }

      res.json({
        success: true,
        data: {
          qr: session.qr,
          status: session.status
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get QR code',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async setWebhook(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const { url, events, enabled } = req.body;
      
      const session = this.whatsappManager.getSession(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      if (!Array.isArray(events)) {
        return res.status(400).json({
          success: false,
          error: 'Events must be an array'
        });
      }

      this.whatsappManager.setWebhookConfig(sessionId, {
        url,
        events,
        enabled: enabled !== false
      });

      res.json({
        success: true,
        message: 'Webhook configuration updated'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to set webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getWebhook(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const session = this.whatsappManager.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      const webhookConfig = this.whatsappManager.getWebhookConfig(sessionId);
      
      res.json({
        success: true,
        data: webhookConfig || {
          url: '',
          events: [],
          enabled: false
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
