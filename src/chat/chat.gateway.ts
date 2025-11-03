import { UseGuards } from '@nestjs/common';
import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SocketGuard } from 'src/auth/guard/socket.guard';
import { ChatService } from './chat.service';
import {
    BookingListDto,
    CreateConnectionDto,
    GetMessageDto,
    LeaveConnectionDto,
    SendMessageDto,
} from './dto/chat.dto';
import { findBookingListDto, supportMsgDto } from 'src/booking/dto/booking.dto';
import { BookingService } from 'src/booking/booking.service';
import { chat_type } from './schema/chat.schema';
import * as moment from 'moment';

interface CustomSocket extends Socket { user: any; }

@WebSocketGateway({ cors: { origin: '*' } })

export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    constructor(private readonly chatService: ChatService, private readonly booking_service: BookingService) { }
    @WebSocketServer()
    server: Server;

    async handleConnection(socket: CustomSocket) {
        let token
        token = socket.handshake.headers.token;
        if (!token) {
            token = socket.handshake.query.token;
        }
        let type = socket.handshake.query.type || socket.handshake.headers.type;

        console.log('socket.handshake.query', socket.handshake.query)
        // if (type === "flutter") {
        // if (type !== "native") {
            console.log("INNNNNSIDE SOOOCTKE CONNNNNN")
            await this.chatService.update_socket_id(token, socket?.id);
        // }
        socket.emit('connected', 'Socket connected');
    }

    async handleDisconnect(socket: CustomSocket) {
        let token
        token = socket.handshake.headers.token;
        if (!token) {
            token = socket.handshake.query.token;
        }
        // await this.chatService.update_socket_id(token, socket?.id);
        let type = socket.handshake.query.type || socket.handshake.headers.type;

        console.log('socket.handshake.query handleDisconnect', socket.handshake.query)
        // if (type === "flutter") {
        // // if (type !== "native") {
        //     console.log("INNNNNSIDE SOOOCTKE CONNNNNN")
        //     await this.chatService.update_socket_id(token, socket?.id);
        // }
        socket.emit('disconnected', 'Socket disconnected');
    }

    @UseGuards(SocketGuard)
    @SubscribeMessage('create-connection')
    async handleCreateConnection(
        socket: CustomSocket,
        body: CreateConnectionDto,
    ) {
        let user_data
        let user_detail
        let booking
        let response;
        booking = await this.chatService.bookingDetail(body?.booking_id)

        if (socket.user.scope === 'driver') {
            console.log('Condition: DRIVER scope detected');
            console.log('Driver data - user_id:', socket.user.user_id, 'customer_id:', booking.customer_id, 'booking_id:', booking._id);
            response = await this.chatService.create_connection(
                socket.user.user_id,
                booking.customer_id,
                socket.user.scope,
                booking._id
            );
            user_data = await this.chatService.findDriver(socket.user.user_id)
            user_detail = await this.chatService.findCustomer(booking.customer_id)
            console.log('Driver user_data:', user_data);
            console.log('Driver user_detail:', user_detail);

        } else if (socket.user.scope === 'customer') {
            console.log('Condition: CUSTOMER scope detected');
            console.log('Customer data - user_id:', socket.user.user_id, 'driver_id:', booking.driver_id, 'booking_id:', booking._id);
            response = await this.chatService.create_connection(
                socket?.user?.user_id,
                booking?.driver_id,
                socket.user.scope,
                booking._id
            );
            user_data = await this.chatService.findCustomer(socket.user.user_id, socket.user.scope)
            user_detail = await this.chatService.findDriver(booking.driver_id)
            console.log('Customer user_data:', user_data);
            console.log('Customer user_detail:', user_detail);
        } else {
            console.log('Condition: STAFF/OTHER scope detected - scope:', socket.user.scope);
            console.log('Staff data - user_id:', socket.user.user_id, 'receiver:', body.receiver, 'scope:', body.scope, 'booking_id:', body.booking_id);
            response = await this.chatService.create_connection(
                socket?.user?.user_id,
                body?.receiver,
                body?.scope,
                body?.booking_id,
                undefined,
                "staff",
            );
            user_data = await this.chatService.findDispatcher(socket.user.user_id)
            user_detail = await this.chatService.findCustomer(body.receiver, body.scope)
            console.log('Staff user_data:', user_data);
            console.log('Staff user_detail:', user_detail);
        }

        let data = {
            response,
            user_detail: user_detail,
            booking: booking?._id ?? null
        }
        console.log(user_data?.socket_id, '<----user_data?.socket_id');

        console.log('JSON.stringify(data) :>> ', JSON.stringify(data));

        const x = await this.server.to(user_data?.socket_id).emit('create-connection', data);
        console.log(x, '<--connection response');

    }

    @UseGuards(SocketGuard)
    @SubscribeMessage('leave-connection')
    async handleLeaveConnection(
        socket: CustomSocket,
        body: LeaveConnectionDto,
    ) {
        let response = await this.chatService.leave_connection(
            socket.user.user_id,
            socket.user.scope,
            body.connection_id
        );
        socket.emit('leave-connection', response);
    }

    @UseGuards(SocketGuard)
    @SubscribeMessage('send-message')
    async handleSendMessage(socket: CustomSocket, body: SendMessageDto) {
        try {
            console.log(body, '<----body');

            let connection: any = await this.chatService.get_connection(
                body.connection_id,
            );
            let data = await this.chatService.findReceiver(body.receiver)
            let sender = await this.chatService.findReceiver(socket.user.user_id)

            if (body.type == "support") {
                connection = await this.chatService.updateConnection(body.connection_id, body.message, socket.user.user_id)
                // connection = await this.chatService.updateConnection(body.connection_id, body.message)    //dispatcher id removed to show change to all the dispatcher
                await this.chatService.updateChat(body.connection_id, socket.user.user_id)
            } else {
                connection = await this.chatService.updateConnection(body.connection_id, body.message)
            }
            let response: any = await this.chatService.send_message(
                body.connection_id,
                body.receiver,
                body.message,
                socket.user.scope,
                connection?.booking_id,
                socket.user.user_id,
                connection?.chat_type
            );
            response = {
                ...response?._doc, sender, receiver: data
            }
            console.log(response);
            console.log(data?.socket_id, '<----data.socket_id');
            if (body.type === "support") {
                const findDispatcherList = await this.chatService.findAllDispatcher();

                console.log("findDispatcherList", findDispatcherList)
                if (Array.isArray(findDispatcherList?.socketIds) && findDispatcherList.socketIds.length) {
                    findDispatcherList.socketIds
                        .filter(id => id !== socket.id) // exclude sender's socket
                        .forEach(id => {
                            console.log("sending on " , id)
                            this.server.to(id).emit('get_message', response);
                        });
                }

                // Also send to driver if connected
                if (data?.socket_id && data.socket_id !== socket.id) {
                    this.server.to(data.socket_id).emit('get_message', response);
                }

            } else if (data?.socket_id && data.socket_id !== socket.id) {
                this.server.to(data.socket_id).emit('get_message', response);
            }

        } catch (error) {
            console.log(error);
            this.server.to(socket.id).emit('error', error.message);
        }
    }

    @UseGuards(SocketGuard)
    @SubscribeMessage('getAllMessages')
    async handleGetAllMessage(socket: CustomSocket, body: GetMessageDto) {
        try {
            const user_id = socket.user.user_id;
            const scope = socket.user.scope;

            const sender = await this.chatService.findCustomer(user_id, scope)
            console.log(body.connection_id, '<-------body.connection_id,');

            let data: any = await this.chatService.getAllMessage(body.connection_id);
            await this.chatService.markAllMsg(user_id, body.connection_id)
            console.log(sender?.socket_id, '<-----sender?.socket_id');
            console.log(data, '<---data');

            const s = this.server.to(sender?.socket_id).emit('getAllMessages', data);
            console.log(s, '<----------connection update');

        } catch (error) {
            console.log(error);
            this.server.to(socket.id).emit('error', error.message);
        }
    }

    @UseGuards(SocketGuard)
    @SubscribeMessage('ReadMessages')
    async handleReadMessage(socket: CustomSocket, body: GetMessageDto) {
        try {
            await this.chatService.read_Message(body.connection_id, socket.user.user_id);
            this.server.to(socket.id).emit('ReadMessages', "READ MESSAGE SUCCESSFULLY");
        } catch (error) {
            console.log(error);
            this.server.to(socket.id).emit('error', error.message);
        }
    }

    /* this socket only emit by dispatcher */
    @UseGuards(SocketGuard)
    @SubscribeMessage('close_chat')
    async closeChat(socket: CustomSocket, body: GetMessageDto) {
        try {
            const user_id = socket.user.user_id;
            const scope = socket.user.scope;
            const data = await this.chatService.closeChat(body.connection_id, user_id, scope);
            console.log(data?.user?.socket_id, '<---data?.user?.socket_id');

            this.server.to(data?.user?.socket_id).emit('close_chat',
                { message: `chat closed`, is_exit_chat: data?.connection?.is_exit_chat ?? true }
            );
        } catch (error) {
            console.log(error);
            this.server.to(socket.id).emit('error', error.message);
        }
    }

    @UseGuards(SocketGuard)
    @SubscribeMessage('UnreadMessage')
    async handleUnreadMessage(socket: CustomSocket, body: GetMessageDto) {
        try {
            let data: any = await this.chatService.unreadMessageCount(socket.user.scope, socket.user.user_id, body.booking_id);
            let response = {
                booking_chat_count: data.booking_chat_count ?? 0,
                support_chat_count: data.support_chat_count ?? 0,
                support_booking_chat_count: data.support_booking_chat_count ?? 0,
            }
            console.log(response, '<----reasponse');

            this.server.to(data?.user?.socket_id).emit('UnreadMessage', response);
        } catch (error) {
            console.log('handleUnreadMessage ==>', error);
            this.server.to(socket.id).emit('error', error.message);
        }
    }

    @UseGuards(SocketGuard)
    @SubscribeMessage('booking_detail')
    async handlebookingdetail(socket: CustomSocket, body: findBookingListDto) {
        let response = await this.booking_service.findBookingWithSocket(body.id, socket.user);
        let response_driver = await this.booking_service.findBookingWithSocketForDriver(body.id);

        this.server.to(response.driver_id.socket_id).emit('booking_detail', response_driver);

        this.server.to(response.customer_id.socket_id).emit('booking_detail', response);
    }


    @UseGuards(SocketGuard)
    @SubscribeMessage('current_ride_request')
    async CurrentRideRequest(socket: CustomSocket) {
        const user_id = socket.user.user_id;
        let response = await this.booking_service.current_ride_request_socket(user_id)
        if (!response.booking) {
            console.log('driver already cancelled this booking ')
            return
        }
        let data = {
            booking: response.booking,
            generated_at: response.driver.currently_send_ride_request_generate_at,
        }

        this.server.to(response.driver.socket_id).emit('current_ride_request', data);
    }


    @UseGuards(SocketGuard)
    @SubscribeMessage('socket_booking_accepted')
    async socket_booking_accepted(socket: CustomSocket, body: BookingListDto) {
        const booking_id = body.booking_id;

        let data = await this.booking_service.socket_booking_accepted(booking_id)
        const { socketIds, booking_details }: any = data
        console.log('socket_booking_accepted === booking_details', {
            _id: booking_details._id,
            booking_id: booking_details.booking_id,
            schedule_date: moment(booking_details.schedule_date).format('lll'),
            pickup_address: booking_details.pickup_address,
            drop_address: booking_details.drop_address,
        })
        console.log('socket_booking_accepted === socketIds', socketIds)
        socketIds.forEach((socketId) => {
            this.server.to(socketId).emit("socket_booking_accepted", { booking: booking_details });
        });
    }


    @UseGuards(SocketGuard)
    @SubscribeMessage('waiting_charge_noti')
    async WaitingChargeNoti(socket: CustomSocket, body: findBookingListDto) {
        const response: any = await this.booking_service.socketWaitingChargeNoti(body.id)
        this.server.to(response.data.driver).to(response.data.customer).emit('waiting_charge_noti', response.data.booking);
    }

    @UseGuards(SocketGuard)
    @SubscribeMessage('chat_support')
    async checkListen(socket: CustomSocket, body: supportMsgDto) {
        console.log(body, '<---body for support');

        const dispatcher_scoket = await this.chatService.findAllDispatcher()
        const user_id = socket.user.user_id;
        const scope = socket.user.scope;

        const sender = await this.chatService.findCustomer(user_id, scope)
        const connection = await this.chatService.create_connection(user_id, null, scope, body.booking_id, chat_type.support)
        await this.chatService.send_message(connection?._id, null, body.msg ?? body?.message, scope, body.booking_id, user_id, chat_type.support)
        await this.chatService.updateConnection(String(connection?._id), body.msg ?? body.message)
        await this.chatService.injectWithRef(user_id, body?.booking_id, String(connection._id), scope)
        let data = { msg: body.msg ?? body?.message, sender, booking: body.booking_id ?? null, connection, type: chat_type.support }
        dispatcher_scoket.dispatchers.map((res) => {
            this.chatService.sendNotification(scope, String(res?._id), String(connection?._id), body?.msg ?? body?.message, body?.booking_id, user_id)
        })
        dispatcher_scoket.socketIds.forEach((id) => {
            console.log(id, '<----emitted on');
            const targetSocket = this.server.sockets.sockets.get(id);
            if (targetSocket) {
                targetSocket.emit("chat_support", data);
            }
        });
        this.server.to(sender.socket_id).emit('chat_support', data);
    }
}
