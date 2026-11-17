import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { WhatsappService, WhatsAppStatus } from './whatsapp.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WhatsappGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WhatsappGateway.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  afterInit() {
    this.logger.log('WhatsApp WebSocket Gateway inicializado.');
    this.whatsappService.setCallbacks(
      (code: string) => {
        this.server.emit('whatsapp:pairing_code', { pairingCode: code });
      },
      (status: WhatsAppStatus) => {
        this.server.emit('whatsapp:status', status);
      },
    );
  }

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado al socket WhatsApp: ${client.id}`);
    client.emit('whatsapp:status', this.whatsappService.getStatus());
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado del socket WhatsApp: ${client.id}`);
  }
}
