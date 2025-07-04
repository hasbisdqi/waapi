import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export class MediaUtils {
  private static tempDir = path.join(process.cwd(), 'temp');
  private static mediaBaseUrl = process.env.MEDIA_BASE_URL || 'http://localhost:3000';

  static ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  static async downloadMedia(socket: any, message: any): Promise<string | null> {
    try {
      this.ensureTempDir();

      const messageType = Object.keys(message.message || {})[0];
      if (!['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'].includes(messageType)) {
        return null;
      }

      const mediaMessage = message.message[messageType];
      if (!mediaMessage) return null;

      // Download media buffer
      const buffer = await socket.downloadMediaMessage(message);
      if (!buffer) return null;

      // Generate filename
      const extension = this.getExtensionFromMimetype(mediaMessage.mimetype) || 'bin';
      const filename = `${uuidv4()}.${extension}`;
      const filepath = path.join(this.tempDir, filename);

      // Save to temp directory
      fs.writeFileSync(filepath, buffer);

      // Schedule deletion after 3 minutes
      setTimeout(() => {
        try {
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
          }
        } catch (error) {
          console.error('Error deleting temp file:', error);
        }
      }, 3 * 60 * 1000); // 3 minutes

      // Return public URL
      return `${this.mediaBaseUrl}/temp/${filename}`;
    } catch (error) {
      console.error('Error downloading media:', error);
      return null;
    }
  }

  static async downloadFromUrl(url: string, mimetype?: string): Promise<Buffer | null> {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      return Buffer.from(response.data);
    } catch (error) {
      console.error('Error downloading from URL:', error);
      return null;
    }
  }

  static getExtensionFromMimetype(mimetype: string): string {
    const mimeToExt: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/avi': 'avi',
      'video/mov': 'mov',
      'video/webm': 'webm',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/ogg': 'ogg',
      'audio/aac': 'aac',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/zip': 'zip',
      'text/plain': 'txt'
    };

    return mimeToExt[mimetype] || 'bin';
  }

  static cleanupTempFiles() {
    try {
      if (fs.existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir);
        const now = Date.now();
        
        files.forEach(file => {
          const filePath = path.join(this.tempDir, file);
          const stats = fs.statSync(filePath);
          const fileAge = now - stats.ctime.getTime();
          
          // Delete files older than 3 minutes
          if (fileAge > 3 * 60 * 1000) {
            fs.unlinkSync(filePath);
            console.log(`Cleaned up temp file: ${file}`);
          }
        });
      }
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }
}

// Clean up temp files every minute
setInterval(() => {
  MediaUtils.cleanupTempFiles();
}, 60 * 1000);
