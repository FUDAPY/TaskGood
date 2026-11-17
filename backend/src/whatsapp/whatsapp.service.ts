import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as fs from 'fs';

export interface WhatsAppStatus {
  isConnected: boolean;
  isConnecting: boolean;
  pairingCode: string | null;
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
    // Sanitizar número de teléfono (debe tener solo dígitos)
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    if (!cleanedNumber || cleanedNumber.length < 8) {
      throw new Error('El número de teléfono debe incluir el código de país y al menos 8 dígitos.');
    }

    this.activePhoneNumber = cleanedNumber;
    this.isConnecting = true;
    this.isConnected = false;
    this.pairingCode = null;
    this.lastError = null;
    this.notifyStatus();

    try {
      await this.destroyClient();

      const executablePath =
        process.env.PUPPETEER_EXECUTABLE_PATH ||
        (fs.existsSync('/usr/bin/google-chrome-stable')
          ? '/usr/bin/google-chrome-stable'
          : undefined);

      this.logger.log(`Inicializando cliente de WhatsApp para ${cleanedNumber} (Chrome: ${executablePath || 'default'})`);

      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: './.wwebjs_auth',
        }),
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
          ],
        },
      });

      this.client.on('qr', async () => {
        // En lugar de escanear QR, solicitamos explícitamente el Pairing Code de 8 dígitos
        try {
          if (this.client && cleanedNumber) {
            this.logger.log(`Solicitando Pairing Code para WhatsApp: ${cleanedNumber}`);
            const code = await (this.client as any).requestPairingCode(cleanedNumber);
            this.pairingCode = code;
            this.logger.log(`Pairing Code generado exitosamente: ${code}`);
            if (this.onPairingCodeCallback) {
              this.onPairingCodeCallback(code);
            }
            this.notifyStatus();
          }
        } catch (err: any) {
          this.logger.error('Error al solicitar Pairing Code', err?.message || err);
          this.lastError = err?.message || 'Error al generar código de emparejamiento.';
          this.notifyStatus();
        }
      });

      this.client.on('ready', () => {
        this.logger.log('Cliente de WhatsApp conectado y listo.');
        this.isConnected = true;
        this.isConnecting = false;
        this.pairingCode = null;
        this.lastError = null;
        this.notifyStatus();
      });

      this.client.on('authenticated', () => {
        this.logger.log('Cliente de WhatsApp autenticado exitosamente.');
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
        this.notifyStatus();
      });

      // Inicializar el cliente
      this.client.initialize().catch((initErr) => {
        this.logger.error('Error en initialize de WhatsApp', initErr?.message || initErr);
        this.lastError = initErr?.message || 'Error al iniciar Puppeteer';
        this.isConnecting = false;
        this.notifyStatus();
      });

      return {
        success: true,
        message: 'Solicitud de emparejamiento iniciada. Espere la generación del código de 8 dígitos.',
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
      this.logger.warn(`WhatsApp no está conectado. Mensaje a ${toPhone} omitido.`);
      return false;
    }

    try {
      const cleanPhone = toPhone.replace(/\D/g, '');
      const chatId = `${cleanPhone}@c.us`;
      await this.client.sendMessage(chatId, message);
      this.logger.log(`Mensaje de WhatsApp enviado exitosamente a ${cleanPhone}`);
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
        // Ignorar errores al destruir
      }
      this.client = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.pairingCode = null;
  }
}
