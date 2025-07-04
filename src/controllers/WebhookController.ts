import { Router, Request, Response } from 'express';
import { WhatsAppManager } from '../services/WhatsAppManager';

export class WebhookController {
  public router: Router;

  constructor(private whatsappManager: WhatsAppManager) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post('/receive', this.receiveWebhook.bind(this));
    this.router.get('/test', this.testWebhook.bind(this));
  }

  private async receiveWebhook(req: Request, res: Response) {
    try {
      // This endpoint can be used by external services to send webhooks
      // For example, other WhatsApp services or integrations
      console.log('Received webhook:', req.body);
      
      res.json({
        success: true,
        message: 'Webhook received'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to process webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testWebhook(req: Request, res: Response) {
    try {
      res.json({
        success: true,
        message: 'Webhook endpoint is working',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Webhook test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
