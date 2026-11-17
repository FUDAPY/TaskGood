import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor() {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'UUxI4O8M3Mv5_sB8u3xH7T0q1hH6yK9P4Y0F6r3fF4Q';
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@taskgood.app';

    try {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    } catch (e) {
      this.logger.warn('Error configurando VAPID keys para Web Push', e);
    }
  }

  async sendNotification(subscription: any, payload: { title: string; body: string; url?: string }) {
    if (!subscription || !subscription.endpoint) {
      return false;
    }
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      return true;
    } catch (err: any) {
      this.logger.warn(`Fallo al enviar notificación Push: ${err?.message || err}`);
      return false;
    }
  }
}
