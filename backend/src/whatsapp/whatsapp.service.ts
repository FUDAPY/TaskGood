import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as QRCode from 'qrcode';
import * as fs from 'fs';

export interface WhatsAppStatus {
  isConnected: boolean;
  isConnecting: boolean;
  pairingCode: string | null;
  qrCode: string | null;
  phoneNumber: string | null;
  lastError: string | null;
}

@Injectable()
export class WhatsappService implements OnModuleDestroy {
  private readonly logger = new Logger(WhatsappService.name);
  private client: Client | null = null;
  private isConnected = false;
  private isConnecting = false;
  private pairingCode: string | null = null;
  private qrCode: string | null = null;
  private activePhoneNumber: string | null = null;
  private lastError: string | null = null;
  private onPairingCodeCallback: ((code: string) => void) | null = null;
  private onStatusChangeCallback: ((status: WhatsAppStatus) => void) | null = null;

  constructor() {}

  onModuleDestroy() {
    this.destroyClient();
  }

  setCallbacks(
    onPairingCode: (code: string) => void,
    onStatusChange: (status: WhatsAppStatus) => void,
  ) {
    this.onPairingCodeCallback = onPairingCode;
    this.onStatusChangeCallback = onStatusChange;
  }

  getStatus(): WhatsAppStatus {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      pairingCode: this.pairingCode,
      qrCode: this.qrCode,
      phoneNumber: this.activePhoneNumber,
      lastError: this.lastError,
    };
  }

  private notifyStatus() {
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback(this.getStatus());
    }
  }

  async requestPairing(phoneNumber: string): Promise<{ success: boolean; message: string; pairingCode?: string }> {
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    if (!cleanedNumber || cleanedNumber.length < 8) {
      throw new Error('El número de teléfono debe incluir el código de país y al menos 8 dígitos.');
    }

    this.activePhoneNumber = cleanedNumber;
    this.isConnecting = true;
    this.isConnected = false;
    this.pairingCode = null;
    this.qrCode = null;
    this.lastError = null;
    this.notifyStatus();

    try {
      await this.destroyClient();

      const executablePath =
        process.env.PUPPETEER_EXECUTABLE_PATH ||
        (fs.existsSync('/usr/bin/google-chrome-stable')
          ? '/usr/bin/google-chrome-stable'
          : undefined);

      this.logger.log(`Inicializando WhatsApp Web para ${cleanedNumber} (Chrome: ${executablePath || 'default'})`);

      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: './.wwebjs_auth',
        }),
        pairWithPhoneNumber: {
          phoneNumber: cleanedNumber,
          showNotification: true,
        },
        authTimeoutMs: 120000, // 2 minutos para evitar "Waiting failed: 30000ms exceeded"
        takeoverOnConflict: true,
        takeoverTimeoutMs: 0,
        puppeteer: {
          executablePath,
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-software-rasterizer',
            '--no-default-browser-check',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
          ],
        },
      });

      // Evento nativo cuando el código de emparejamiento es recibido
      this.client.on('code', (code: string) => {
        this.logger.log(`Pairing Code recibido: ${code}`);
        this.pairingCode = code;
        this.isConnecting = false;
        this.lastError = null;
        if (this.onPairingCodeCallback) {
          this.onPairingCodeCallback(code);
        }
        this.notifyStatus();
      });

      // Evento QR (como respaldo visual inmediato)
      this.client.on('qr', async (qr: string) => {
        this.logger.log('Código QR generado.');
        try {
          this.qrCode = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
        } catch (e) {
          this.logger.warn('No se pudo convertir QR a imagen', e);
        }

        // Si aún no tenemos pairing code, solicitarlo explícitamente
        if (!this.pairingCode && cleanedNumber) {
          try {
            this.logger.log(`Solicitando pairing code explícito para ${cleanedNumber}`);
            const code = await (this.client as any).requestPairingCode(cleanedNumber);
            this.pairingCode = code;
            this.isConnecting = false;
            if (this.onPairingCodeCallback) {
              this.onPairingCodeCallback(code);
            }
          } catch (err: any) {
            this.logger.warn('Error al solicitar pairing code alternativo', err?.message || err);
          }
        }
        this.notifyStatus();
      });

      this.client.on('ready', () => {
        this.logger.log('Cliente de WhatsApp conectado y listo para operar.');
        this.isConnected = true;
        this.isConnecting = false;
        this.pairingCode = null;
        this.qrCode = null;
        this.lastError = null;
        this.notifyStatus();
      });

      this.client.on('authenticated', () => {
        this.logger.log('Cliente de WhatsApp autenticado con éxito.');
      });

      this.client.on('auth_failure', (msg) => {
        this.logger.error(`Fallo de autenticación WhatsApp: ${msg}`);
        this.lastError = `Fallo de autenticación: ${msg}`;
        this.isConnected = false;
        this.isConnecting = false;
        this.notifyStatus();
      });

      this.client.on('disconnected', (reason) => {
        this.logger.warn(`Cliente WhatsApp desconectado: ${reason}`);
        this.isConnected = false;
        this.isConnecting = false;
        this.pairingCode = null;
        this.qrCode = null;
        this.notifyStatus();
      });

      this.client.initialize().catch((initErr) => {
        this.logger.error('Error al inicializar cliente WhatsApp:', initErr?.message || initErr);
        this.lastError = initErr?.message || 'Error al iniciar Puppeteer';
        this.isConnecting = false;
        this.notifyStatus();
      });

      return {
        success: true,
        message: 'Solicitud enviada. Generando código de emparejamiento de 8 dígitos...',
      };
    } catch (error: any) {
      this.logger.error('Error crítico al solicitar emparejamiento', error);
      this.isConnecting = false;
      this.lastError = error.message;
      this.notifyStatus();
      throw error;
    }
  }

  async sendMessage(toPhone: string, message: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      this.logger.warn(`WhatsApp no está conectado. Mensaje a ${toPhone} no enviado.`);
      return false;
    }

    try {
      const cleanPhone = toPhone.replace(/\D/g, '');
      const chatId = `${cleanPhone}@c.us`;
      await this.client.sendMessage(chatId, message);
      this.logger.log(`Mensaje de WhatsApp enviado a ${cleanPhone}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Error enviando mensaje WhatsApp a ${toPhone}:`, err?.message || err);
      return false;
    }
  }

  async destroyClient(): Promise<void> {
    if (this.client) {
      try {
        await this.client.destroy();
      } catch (e) {
        // Ignorar
      }
      this.client = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.pairingCode = null;
    this.qrCode = null;
  }
}
