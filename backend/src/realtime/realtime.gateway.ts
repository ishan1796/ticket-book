import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class RealtimeGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('subscribe_show')
  handleSubscribeShow(@MessageBody() data: { showId: string }, @ConnectedSocket() client: Socket) {
    client.join(`show_${data.showId}`);
    return { event: 'subscribed', showId: data.showId };
  }

  @SubscribeMessage('unsubscribe_show')
  handleUnsubscribeShow(@MessageBody() data: { showId: string }, @ConnectedSocket() client: Socket) {
    client.leave(`show_${data.showId}`);
    return { event: 'unsubscribed', showId: data.showId };
  }

  emitSeatUpdate(showId: string, seatData: any) {
    if (this.server) {
      this.server.to(`show_${showId}`).emit('seat_updated', seatData);
    }
  }
}
