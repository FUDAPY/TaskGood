import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';

export interface WhatsAppStatus {
  isConnected: boolean;
  isConnecting: boolean;
  pairingCode: string | null;
  qrCode: string | null;
  phoneNumber: string | null;
  lastError: string | null;
}

@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappService.name);
  private client: Client | null = null;
  private isConnected = false;
  private isConnecting = false;
  private pairingCode: string | null = null;
  private qrCode: string | null = null;
  private activePhoneNumber: string | null = null;
  private lastError: string | null = null;
  private isManualLogout = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private onPairingCodeCallback: ((code: string) => void) | null = null;
  private onStatusChangeCallback: ((status: WhatsAppStatus) => void) | null = null;

  constructor() {}

  /**
   * Obtiene y asegura la existencia del directorio persistente de credenciales de WhatsApp
   */
  private getAuthDir(): string {
    const authDir =
      process.env.WHATSAPP_AUTH_DIR ||
      (fs.existsSync('/app')
        ? '/app/data/whatsapp-auth'
        : path.resolve('./.wwebjs_auth'));

    try {
      if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
      }
    } catch (e: any) {
      this.logger.warn(`No se pudo asegurar directorio ${authDir}: ${e?.message}`);
    }
    return authDir;
  }

  async onModuleInit() {
    // Al inicializar el backend, restaurar sesión previa si existen credenciales persistentes
    const authDir = this.getAuthDir();
    const sessionDir = path.join(authDir, 'session');
    if (fs.existsSync(sessionDir)) {
      try {
        const files = fs.readdirSync(sessionDir);
        if (files.length > 0) {
          this.logger.log(`Sesión persistente de WhatsApp detectada en ${sessionDir}. Reconectando automáticamente en segundo plano...`);
          this.autoRestoreSession();
          return;
        }
      } catch (err: any) {
        this.logger.warn(`Error al inspeccionar directorio de sesión ${sessionDir}:`, err?.message);
      }
    }

    // Compatibilidad: verificar si existía sesión previa en la ruta legacy ./.wwebjs_auth/session
    const legacySessionDir = path.resolve('./.wwebjs_auth/session');
    if (authDir !== path.resolve('./.wwebjs_auth') && fs.existsSync(legacySessionDir)) {
      try {
        const files = fs.readdirSync(legacySessionDir);
        if (files.length > 0) {
          this.logger.log(`Sesión previa en ruta legacy detectada (${legacySessionDir}). Reconectando...`);
          this.autoRestoreSession();
        }
      } catch {}
    }
  }

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

  /**
   * Remueve bloqueos residuales de Chromium (SingletonLock) que impiden el arranque en contenedores
   */
  private cleanSingletonLocks() {
    const authPath = this.getAuthDir();
    if (!fs.existsSync(authPath)) return;

    const removeLocksRecursively = (dir: string) => {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.lstatSync(fullPath);
          if (stat.isDirectory()) {
            removeLocksRecursively(fullPath);
          } else if (file.startsWith('Singleton') || file === 'DevToolsActivePort') {
            try {
              fs.unlinkSync(fullPath);
              this.logger.log(`Lock residual de Chromium eliminado: ${file}`);
            } catch {
              // Ignorar errores de acceso
            }
          }
        }
      } catch {
        // Ignorar
      }
    };

    removeLocksRecursively(authPath);
  }

  /**
   * Inicia el cliente WhatsApp en modo restauración o con código de emparejamiento
   */
  private async initClient(pairPhoneNumber?: string): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    await this.destroyClient(false);
    this.cleanSingletonLocks();

    const executablePath =
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      (fs.existsSync('/usr/bin/google-chrome-stable')
        ? '/usr/bin/google-chrome-stable'
        : undefined);

    const clientOptions: any = {
      authStrategy: new LocalAuth({
        dataPath: this.getAuthDir(),
      }),
      authTimeoutMs: 120000,
      takeoverOnConflict: true,
      takeoverTimeoutMs: 10000,
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1018949547-alpha.html',
      },
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
          '--disable-features=Translate,BackForwardCache,AcceptCHFrame,MediaRouter,OptimizationHints',
        ],
      },
    };

    if (pairPhoneNumber) {
      clientOptions.pairWithPhoneNumber = {
        phoneNumber: pairPhoneNumber,
        showNotification: true,
      };
    }

    this.client = new Client(clientOptions);

    this.client.on('code', (code: string) => {
      this.logger.log(`Pairing Code de WhatsApp recibido: ${code}`);
      this.pairingCode = code;
      this.isConnecting = false;
      this.lastError = null;
      if (this.onPairingCodeCallback) {
        this.onPairingCodeCallback(code);
      }
      this.notifyStatus();
    });

    this.client.on('qr', async (qr: string) => {
      this.logger.log('Código QR de WhatsApp recibido como respaldo.');
      try {
        this.qrCode = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
      } catch (err) {
        this.logger.warn('Error al convertir QR en imagen base64', err);
      }

      if (pairPhoneNumber && !this.pairingCode) {
        try {
          this.logger.log(`Solicitando pairing code explícito para ${pairPhoneNumber}`);
          const code = await (this.client as any).requestPairingCode(pairPhoneNumber);
          this.pairingCode = code;
          this.isConnecting = false;
          if (this.onPairingCodeCallback) {
            this.onPairingCodeCallback(code);
          }
        } catch (err: any) {
          this.logger.warn('Error al solicitar pairing code explícito:', err?.message || err);
        }
      }
      this.notifyStatus();
    });

    this.client.on('ready', () => {
      this.logger.log('Cliente WhatsApp conectado y sincronizado con éxito.');
      this.isConnected = true;
      this.isConnecting = false;
      this.pairingCode = null;
      this.qrCode = null;
      this.lastError = null;
      this.reconnectAttempts = 0;
      try {
        const widUser = (this.client as any)?.info?.wid?.user;
        if (widUser) {
          this.activePhoneNumber = widUser;
        }
      } catch {}
      this.notifyStatus();
    });

    this.client.on('authenticated', () => {
      this.logger.log('Cliente WhatsApp autenticado.');
      this.reconnectAttempts = 0;
    });

    this.client.on('auth_failure', (msg) => {
      this.logger.error(`Fallo de autenticación WhatsApp: ${msg}`);
      this.lastError = `Fallo de autenticación: ${msg}`;
      this.isConnected = false;
      this.isConnecting = false;
      this.notifyStatus();
    });

    this.client.on('disconnected', (reason) => {
      this.logger.warn(`Cliente WhatsApp desconectado. Causa: ${reason}`);
      this.isConnected = false;
      this.isConnecting = false;
      this.pairingCode = null;
      this.qrCode = null;
      this.notifyStatus();

      // Reconexión automática con backoff exponencial si no fue cierre explícito
      if (this.isManualLogout || reason === 'LOGOUT') {
        this.logger.log('Sesión revocada o desvinculada manualmente. Limpiando credenciales locales...');
        this.clearSessionAuth();
      } else {
        this.reconnectAttempts++;
        const delay = Math.min(3000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
        this.logger.log(
          `Desconexión transitoria (${reason}). Programando reconexión automática en ${delay / 1000}s (intento ${this.reconnectAttempts})...`,
        );
        this.reconnectTimer = setTimeout(() => {
          this.autoRestoreSession();
        }, delay);
      }
    });

    this.client.initialize().catch((err) => {
      this.logger.error('Error al inicializar cliente de WhatsApp:', err?.message || err);
      this.lastError = err?.message || 'Error al iniciar Puppeteer';
      this.isConnecting = false;
      this.notifyStatus();

      // Reconexión con backoff si falló en modo segundo plano (autoRestore)
      if (!this.isManualLogout && !this.isConnected && !pairPhoneNumber) {
        this.reconnectAttempts++;
        const delay = Math.min(3000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
        this.logger.log(`Reintentando inicialización de WhatsApp en ${delay / 1000}s (intento ${this.reconnectAttempts})...`);
        this.reconnectTimer = setTimeout(() => {
          this.autoRestoreSession();
        }, delay);
      }
    });
  }

  async autoRestoreSession(): Promise<void> {
    if (this.isConnected || this.isConnecting) return;
    this.isConnecting = true;
    this.lastError = null;
    this.notifyStatus();
    try {
      await this.initClient();
    } catch (err: any) {
      this.logger.error('Error al restaurar sesión previa de WhatsApp:', err?.message || err);
      this.isConnecting = false;
      this.notifyStatus();
    }
  }

  async requestPairing(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    if (!cleanedNumber || cleanedNumber.length < 8) {
      throw new Error('El número de teléfono debe incluir el código de país y al menos 8 dígitos.');
    }

    this.isManualLogout = false;
    this.reconnectAttempts = 0;
    this.activePhoneNumber = cleanedNumber;
    this.isConnecting = true;
    this.isConnected = false;
    this.pairingCode = null;
    this.qrCode = null;
    this.lastError = null;
    this.notifyStatus();

    try {
      this.logger.log(`Iniciando vinculación de WhatsApp para ${cleanedNumber}`);
      await this.initClient(cleanedNumber);

      return {
        success: true,
        message: 'Solicitud enviada. Generando código de vinculación de 8 dígitos...',
      };
    } catch (error: any) {
      this.logger.error('Error al solicitar vinculación de WhatsApp:', error?.message || error);
      this.isConnecting = false;
      this.lastError = error.message;
      this.notifyStatus();
      throw error;
    }
  }

  /**
   * Monitor de pulso (keep-alive) para evitar que WhatsApp Web caiga en inactividad
   */
  @Interval(45000)
  async handleKeepAlive() {
    if (this.client && this.isConnected) {
      try {
        const state = await this.client.getState();
        if (state !== 'CONNECTED') {
          this.logger.warn(`WhatsApp state reportado: ${state}`);
        }
      } catch (err: any) {
        this.logger.warn(`Keep-alive check issue: ${err?.message || err}`);
      }
    }
  }

  /**
   * Envía mensaje con normalización automática de número (Paraguay / Internacional)
   */
  async sendMessage(toPhone: string, message: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      this.logger.warn(`WhatsApp no está conectado actualmente. Mensaje para ${toPhone} omitido.`);
      return false;
    }

    try {
      let cleanPhone = toPhone.replace(/\D/g, '');
      if (!cleanPhone) return false;

      // Normalización para números locales (ej: Paraguay 0981... -> 595981...)
      if (cleanPhone.startsWith('0')) {
        cleanPhone = cleanPhone.substring(1);
      }
      if (cleanPhone.length === 9 && !cleanPhone.startsWith('595')) {
        cleanPhone = `595${cleanPhone}`;
      }

      let targetChatId = `${cleanPhone}@c.us`;

      // Intentar resolver ID exacto de WhatsApp
      try {
        const contactId = await this.client.getNumberId(cleanPhone);
        if (contactId && contactId._serialized) {
          targetChatId = contactId._serialized;
        }
      } catch (e) {
        // Fallback al chatId directo
      }

      await this.client.sendMessage(targetChatId, message);
      this.logger.log(`Mensaje de WhatsApp entregado exitosamente a ${targetChatId}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Error enviando mensaje WhatsApp a ${toPhone}:`, err?.message || err);
      return false;
    }
  }

  async logout(): Promise<void> {
    this.isManualLogout = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    await this.destroyClient(true);
    this.clearSessionAuth();

    this.activePhoneNumber = null;
    this.notifyStatus();
  }

  private clearSessionAuth() {
    const authPath = this.getAuthDir();
    if (fs.existsSync(authPath)) {
      try {
        fs.rmSync(authPath, { recursive: true, force: true });
        this.logger.log(`Directorio de sesión persistente de WhatsApp eliminado: ${authPath}`);
      } catch (e) {
        this.logger.warn(`No se pudo eliminar el directorio de sesión ${authPath}:`, e);
      }
    }
  }

  async destroyClient(isLogout = false): Promise<void> {
    if (this.client) {
      try {
        if (isLogout) {
          await this.client.logout();
        }
        await this.client.destroy();
      } catch (e) {
        // Ignorar excepciones al cerrar
      }
      this.client = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.pairingCode = null;
    this.qrCode = null;
  }
}
