export interface SessionInfo {
  id: string;
  name: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'qr_ready';
  qr?: string;
  phone?: string;
  lastSeen?: Date;
  messageCount: number;
}

export interface WebhookConfig {
  url?: string;
  events: string[];
  enabled: boolean;
}

export interface MessageData {
  id: string;
  from: string;
  to: string;
  message: any;
  timestamp: Date;
  type: string;
  sessionId: string;
}

export interface SendMessageRequest {
  to: string;
  message: {
    text?: string;
    image?: {
      url?: string;
      base64?: string;
      caption?: string;
    };
    document?: {
      url?: string;
      base64?: string;
      filename: string;
      mimetype?: string;
    };
    audio?: {
      url?: string;
      base64?: string;
    };
    video?: {
      url?: string;
      base64?: string;
      caption?: string;
    };
    sticker?: {
      url?: string;
      base64?: string;
    };
  };
  options?: {
    quoted?: string;
    delay?: number;
  };
}
