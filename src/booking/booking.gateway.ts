import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Socket, Server } from 'socket.io';
import { BookingService } from './booking.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface CustomSocket extends Socket {
  user: any;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})

export class BookingGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly booking_service: BookingService,
    private readonly eventEmitter: EventEmitter2,
  ) { }
  @WebSocketServer()
  server: Server;

  handleConnection(socket: CustomSocket) { }

  handleDisconnect(socket: CustomSocket) { }

}
