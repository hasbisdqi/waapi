import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { WhatsAppManager } from '../services/WhatsAppManager';
import { SendMessageRequest } from '../types';
import { MediaUtils } from '../utils/MediaUtils';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = './uploads';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

export class MessageController {
  public router: Router;

  constructor(private whatsappManager: WhatsAppManager) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post('/:sessionId/send', this.sendMessage.bind(this));
    this.router.post('/:sessionId/send-text', this.sendTextMessage.bind(this));
    this.router.post('/:sessionId/send-image', upload.single('image'), this.sendImageMessage.bind(this));
    this.router.post('/:sessionId/send-document', upload.single('document'), this.sendDocumentMessage.bind(this));
    this.router.post('/:sessionId/send-audio', upload.single('audio'), this.sendAudioMessage.bind(this));
    this.router.post('/:sessionId/send-video', upload.single('video'), this.sendVideoMessage.bind(this));
    this.router.post('/:sessionId/send-sticker', upload.single('sticker'), this.sendStickerMessage.bind(this));
  }

  private async sendMessage(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const messageRequest: SendMessageRequest = req.body;

      if (!messageRequest.to) {
        return res.status(400).json({
          success: false,
          error: 'Recipient phone number is required'
        });
      }

      if (!messageRequest.message) {
        return res.status(400).json({
          success: false,
          error: 'Message content is required'
        });
      }

      const session = this.whatsappManager.getSession(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      if (session.status !== 'connected') {
        return res.status(400).json({
          success: false,
          error: 'Session is not connected'
        });
      }

      let messageContent: any = {};

      if (messageRequest.message.text) {
        messageContent = { text: messageRequest.message.text };
      } else if (messageRequest.message.image) {
        if (messageRequest.message.image.url) {
          messageContent = {
            image: { url: messageRequest.message.image.url },
            caption: messageRequest.message.image.caption
          };
        } else if (messageRequest.message.image.base64) {
          const buffer = Buffer.from(messageRequest.message.image.base64, 'base64');
          messageContent = {
            image: buffer,
            caption: messageRequest.message.image.caption
          };
        }
      } else if (messageRequest.message.document) {
        if (messageRequest.message.document.url) {
          messageContent = {
            document: { url: messageRequest.message.document.url },
            fileName: messageRequest.message.document.filename,
            mimetype: messageRequest.message.document.mimetype
          };
        } else if (messageRequest.message.document.base64) {
          const buffer = Buffer.from(messageRequest.message.document.base64, 'base64');
          messageContent = {
            document: buffer,
            fileName: messageRequest.message.document.filename,
            mimetype: messageRequest.message.document.mimetype
          };
        }
      } else if (messageRequest.message.audio) {
        if (messageRequest.message.audio.url) {
          messageContent = {
            audio: { url: messageRequest.message.audio.url }
          };
        } else if (messageRequest.message.audio.base64) {
          const buffer = Buffer.from(messageRequest.message.audio.base64, 'base64');
          messageContent = {
            audio: buffer
          };
        }
      } else if (messageRequest.message.video) {
        if (messageRequest.message.video.url) {
          messageContent = {
            video: { url: messageRequest.message.video.url },
            caption: messageRequest.message.video.caption
          };
        } else if (messageRequest.message.video.base64) {
          const buffer = Buffer.from(messageRequest.message.video.base64, 'base64');
          messageContent = {
            video: buffer,
            caption: messageRequest.message.video.caption
          };
        }
      } else if (messageRequest.message.sticker) {
        if (messageRequest.message.sticker.url) {
          messageContent = {
            sticker: { url: messageRequest.message.sticker.url }
          };
        } else if (messageRequest.message.sticker.base64) {
          const buffer = Buffer.from(messageRequest.message.sticker.base64, 'base64');
          messageContent = {
            sticker: buffer
          };
        }
      }

      // Add delay if specified
      if (messageRequest.options?.delay) {
        await new Promise(resolve => setTimeout(resolve, messageRequest.options!.delay));
      }

      const result = await this.whatsappManager.sendMessage(sessionId, messageRequest.to, messageContent);

      res.json({
        success: true,
        data: result,
        message: 'Message sent successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to send message',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async sendTextMessage(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const { to, text } = req.body;

      if (!to || !text) {
        return res.status(400).json({
          success: false,
          error: 'Recipient and text are required'
        });
      }

      const session = this.whatsappManager.getSession(sessionId);
      if (!session || session.status !== 'connected') {
        return res.status(400).json({
          success: false,
          error: 'Session not found or not connected'
        });
      }

      const result = await this.whatsappManager.sendMessage(sessionId, to, { text });

      res.json({
        success: true,
        data: result,
        message: 'Text message sent successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to send text message',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async sendImageMessage(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const { to, caption } = req.body;
      const file = req.file;

      if (!to || !file) {
        return res.status(400).json({
          success: false,
          error: 'Recipient and image file are required'
        });
      }

      const session = this.whatsappManager.getSession(sessionId);
      if (!session || session.status !== 'connected') {
        return res.status(400).json({
          success: false,
          error: 'Session not found or not connected'
        });
      }

      // Move file to temp directory and create URL
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilename = `${Date.now()}-${file.originalname}`;
      const tempFilePath = path.join(tempDir, tempFilename);
      fs.renameSync(file.path, tempFilePath);

      const mediaUrl = `${process.env.MEDIA_BASE_URL || 'http://localhost:3000'}/temp/${tempFilename}`;
      
      const messageContent = {
        image: { url: mediaUrl },
        caption: caption || ''
      };

      const result = await this.whatsappManager.sendMessage(sessionId, to, messageContent);

      // Schedule file deletion after 3 minutes
      setTimeout(() => {
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        } catch (error) {
          console.error('Error deleting temp file:', error);
        }
      }, 3 * 60 * 1000);

      res.json({
        success: true,
        data: result,
        message: 'Image sent successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to send image',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async sendDocumentMessage(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const { to } = req.body;
      const file = req.file;

      if (!to || !file) {
        return res.status(400).json({
          success: false,
          error: 'Recipient and document file are required'
        });
      }

      const session = this.whatsappManager.getSession(sessionId);
      if (!session || session.status !== 'connected') {
        return res.status(400).json({
          success: false,
          error: 'Session not found or not connected'
        });
      }

      // Move file to temp directory and create URL
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilename = `${Date.now()}-${file.originalname}`;
      const tempFilePath = path.join(tempDir, tempFilename);
      fs.renameSync(file.path, tempFilePath);

      const mediaUrl = `${process.env.MEDIA_BASE_URL || 'http://localhost:3000'}/temp/${tempFilename}`;
      
      const messageContent = {
        document: { url: mediaUrl },
        fileName: file.originalname,
        mimetype: file.mimetype
      };

      const result = await this.whatsappManager.sendMessage(sessionId, to, messageContent);

      // Schedule file deletion after 3 minutes
      setTimeout(() => {
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        } catch (error) {
          console.error('Error deleting temp file:', error);
        }
      }, 3 * 60 * 1000);

      res.json({
        success: true,
        data: result,
        message: 'Document sent successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to send document',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async sendAudioMessage(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const { to } = req.body;
      const file = req.file;

      if (!to || !file) {
        return res.status(400).json({
          success: false,
          error: 'Recipient and audio file are required'
        });
      }

      const session = this.whatsappManager.getSession(sessionId);
      if (!session || session.status !== 'connected') {
        return res.status(400).json({
          success: false,
          error: 'Session not found or not connected'
        });
      }

      // Move file to temp directory and create URL
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilename = `${Date.now()}-${file.originalname}`;
      const tempFilePath = path.join(tempDir, tempFilename);
      fs.renameSync(file.path, tempFilePath);

      const mediaUrl = `${process.env.MEDIA_BASE_URL || 'http://localhost:3000'}/temp/${tempFilename}`;
      
      const messageContent = { audio: { url: mediaUrl } };

      const result = await this.whatsappManager.sendMessage(sessionId, to, messageContent);

      // Schedule file deletion after 3 minutes
      setTimeout(() => {
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        } catch (error) {
          console.error('Error deleting temp file:', error);
        }
      }, 3 * 60 * 1000);

      res.json({
        success: true,
        data: result,
        message: 'Audio sent successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to send audio',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async sendVideoMessage(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const { to, caption } = req.body;
      const file = req.file;

      if (!to || !file) {
        return res.status(400).json({
          success: false,
          error: 'Recipient and video file are required'
        });
      }

      const session = this.whatsappManager.getSession(sessionId);
      if (!session || session.status !== 'connected') {
        return res.status(400).json({
          success: false,
          error: 'Session not found or not connected'
        });
      }

      // Move file to temp directory and create URL
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilename = `${Date.now()}-${file.originalname}`;
      const tempFilePath = path.join(tempDir, tempFilename);
      fs.renameSync(file.path, tempFilePath);

      const mediaUrl = `${process.env.MEDIA_BASE_URL || 'http://localhost:3000'}/temp/${tempFilename}`;
      
      const messageContent = {
        video: { url: mediaUrl },
        caption: caption || ''
      };

      const result = await this.whatsappManager.sendMessage(sessionId, to, messageContent);

      // Schedule file deletion after 3 minutes
      setTimeout(() => {
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        } catch (error) {
          console.error('Error deleting temp file:', error);
        }
      }, 3 * 60 * 1000);

      res.json({
        success: true,
        data: result,
        message: 'Video sent successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to send video',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async sendStickerMessage(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const { to } = req.body;
      const file = req.file;

      if (!to || !file) {
        return res.status(400).json({
          success: false,
          error: 'Recipient and sticker file are required'
        });
      }

      const session = this.whatsappManager.getSession(sessionId);
      if (!session || session.status !== 'connected') {
        return res.status(400).json({
          success: false,
          error: 'Session not found or not connected'
        });
      }

      // Move file to temp directory and create URL
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilename = `${Date.now()}-${file.originalname}`;
      const tempFilePath = path.join(tempDir, tempFilename);
      fs.renameSync(file.path, tempFilePath);

      const mediaUrl = `${process.env.MEDIA_BASE_URL || 'http://localhost:3000'}/temp/${tempFilename}`;
      
      const messageContent = { sticker: { url: mediaUrl } };

      const result = await this.whatsappManager.sendMessage(sessionId, to, messageContent);

      // Schedule file deletion after 3 minutes
      setTimeout(() => {
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        } catch (error) {
          console.error('Error deleting temp file:', error);
        }
      }, 3 * 60 * 1000);

      res.json({
        success: true,
        data: result,
        message: 'Sticker sent successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to send sticker',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
