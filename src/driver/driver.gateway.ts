import { UseGuards } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Socket, Server } from 'socket.io';
import { UpdateLocationDto, driver_location_dto, near_rides_dto } from './dto/driver.dto';
import { DriverService } from './driver.service';
import { SocketGuard } from 'src/auth/guard/socket.guard';
import { jwtConstants } from 'src/constants';
import { JwtService } from '@nestjs/jwt';

interface CustomSocket extends Socket {
  user: any;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})

export class DriverGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly driverService: DriverService, private jwtService: JwtService) { }
  @WebSocketServer()
  server: Server;

  handleConnection(socket: CustomSocket) { }

  handleDisconnect(socket: CustomSocket) { }

  @SubscribeMessage('update_location')
  async handleUpdateLocation(socket: CustomSocket, payload: UpdateLocationDto) {

    let token = payload.token;
    const token_payload = await this.jwtService.verifyAsync(token, {
      secret: jwtConstants.secret,
    });
    const user_id = token_payload.user_id;
    let response = await this.driverService.update_driver_location(user_id, payload);

    let ongoingBooking = await this.driverService.GetOngoingBookings(user_id);
    console.log("ongoingBooking", ongoingBooking)
    if (ongoingBooking) {
      const isCustomerConnected = this.server.sockets.sockets.has(ongoingBooking.customer_socket_id);
      console.log("isCustomerConnected", isCustomerConnected)
      console.log("ongoingBooking.customer_socket_id", ongoingBooking.customer_socket_id)
      this.server.to(ongoingBooking.customer_socket_id).emit('current_driver_location', ongoingBooking.driver);
    }

    console.log("response.socket_id", response.socket_id)
    const isDriverConnected = this.server.sockets.sockets.has(response.socket_id);
    console.log("isDriverConnected", isDriverConnected)
    this.server.to(response.socket_id).emit('update_location', response);

  }

  // @UseGuards(SocketGuard)
  // @SubscribeMessage('near_rides')
  // async handleNear_Rides(socket: CustomSocket, payload: near_rides_dto) {
  //   let response = await this.driverService.near_me_rides(payload);
  //   socket.emit('near_rides', response);
  // }

  @UseGuards(SocketGuard)
  @SubscribeMessage('driver_location')
  async handledriver_location(socket: CustomSocket, payload: driver_location_dto) {
    let customer = await this.driverService.findCustomer(socket.user.user_id)
    let response = await this.driverService.driver_location(payload);
    this.server.to(customer.socket_id).emit('driver_location', response);
  }
}
