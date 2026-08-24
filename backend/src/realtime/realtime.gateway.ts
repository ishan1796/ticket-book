import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/realtime',
})
export class RealtimeGateway {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('subscribe_show')
  handleSubscribeShow(@MessageBody() data: { showId: string }, @ConnectedSocket() client: Socket) {
    if (data?.showId) {
      client.join(`show_${data.showId}`);
      this.logger.debug(`Client ${client.id} joined show_${data.showId}`);
      return { event: 'subscribed', showId: data.showId };
    }
  }

  @SubscribeMessage('unsubscribe_show')
  handleUnsubscribeShow(@MessageBody() data: { showId: string }, @ConnectedSocket() client: Socket) {
    if (data?.showId) {
      client.leave(`show_${data.showId}`);
      this.logger.debug(`Client ${client.id} left show_${data.showId}`);
      return { event: 'unsubscribed', showId: data.showId };
    }
  }

  emitSeatUpdate(showId: string, seatData: { showSeatId: string; status: string }) {
    if (this.server) {
      // Emit both 'seat_update' (frontend SeatMap listener) and 'seat_updated'
      this.server.to(`show_${showId}`).emit('seat_update', seatData);
      this.server.to(`show_${showId}`).emit('seat_updated', seatData);
      this.logger.debug(`Emitted seat update for show ${showId}: ${JSON.stringify(seatData)}`);
    }
  }
}
