import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CommonService } from 'src/common/common.service';
import { jwtConstants } from 'src/constants';
import { DbService } from 'src/db/db.service';
import * as mongosse from 'mongoose';
import { NotificationService } from 'src/notification/notification.service';
import { ChatListDto } from './dto/chat.dto';
import { ChatAggregator } from './chat.aggregation';
import { StaffRoles } from 'src/auth/role/user.role';
import { chat_type } from './schema/chat.schema';
import { EmailService } from 'src/common/common.emails.sesrvice';


@Injectable()
export class ChatService {
  constructor(
    private readonly model: DbService,
    private readonly jwtService: JwtService,
    private readonly commonService: CommonService,
    private readonly emailService: EmailService,
    private readonly notification: NotificationService,
    private readonly aggregator: ChatAggregator,
  ) { }

  async update_socket_id(token, socket_id) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: jwtConstants.secret,
      });

      if (payload.scope === 'customer') {
        await this.model.customers.updateOne(
          { _id: payload.user_id },
          {
            socket_id: socket_id,
            connection_id: null
          },
        );
      } else if (payload.scope === 'driver') {
        await this.model.drivers.updateOne(
          { _id: payload.user_id },
          {
            socket_id: socket_id,
            connection_id: null
          },
        );
      } else if (payload.scope === 'staff') {
        await this.model.admin.updateOne(
          { _id: payload.user_id },
          {
            socket_id: socket_id,
            connection_id: null
          },
        );
      }
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async create_connection(sender: string, receiver: string, scope: string, booking_id: string, type?: string, sender_scope?: string) {
    try {
      console.log(sender, '<----sender');
      console.log(receiver, '<----receiver');
      console.log(scope, '<----scope');
      console.log(booking_id, '<----booking_id');
      console.log(type, '<----type');
      console.log(sender_scope, '<----sender_scope');
      
      // Special case for staff: check for existing connection with null receiver
      if (sender_scope === 'staff') {
        const staffQuery = {
          sender: new mongosse.Types.ObjectId(receiver), // receiver becomes sender in existing connection
          receiver: null, // existing connection has null receiver
          is_exit_chat: false,
        };
        
        console.log(staffQuery, '<----staff query');
        let existingStaffConnection = await this.model.connections.findOne(staffQuery);
        
        if (existingStaffConnection) {
          console.log('####### found existing staff connection', existingStaffConnection);
          // Update the receiver to the current sender (staff)
          existingStaffConnection.receiver = sender;
          existingStaffConnection.updated_at = +new Date();
          await existingStaffConnection.save();
          
          return existingStaffConnection._id;
        }
      }
      
      const query = {
        $and: [
          {
            $or: [
              { sender: new mongosse.Types.ObjectId(sender) },
              { receiver: new mongosse.Types.ObjectId(sender) },
            ],
          },
          {
            $or: [
              { sender: new mongosse.Types.ObjectId(receiver) },
              { receiver: new mongosse.Types.ObjectId(receiver) },
            ],
          }
        ],
        ...(booking_id) && {
          booking_id: new mongosse.Types.ObjectId(booking_id)
        },
        ...(type) && { chat_type: type },
        is_exit_chat: false
      }

      console.log(query, '<----query');
      let find_connection_id = await this.model.connections.findOne(query);
      console.log('####### find_connection_id', find_connection_id)
      if (!find_connection_id) {
        console.log('####### create connection');
        find_connection_id = await this.model.connections.create({
          sender, receiver, booking_id, created_at: new Date(), sent_by: scope,
          updated_at: new Date(), chat_type: type ?? chat_type.booking, initiated_by: scope
        });
        console.log('####### find_connection_id', find_connection_id)
      }

      if(sender_scope === 'staff') {
        await this.model.drivers.findByIdAndUpdate(
          { _id: receiver },
          {
            support_connection: find_connection_id._id
          },
        )
      }

      if (scope === 'customer') {
        console.log('####### update customer connection');
        console.log('####### find_connection_id', find_connection_id)
        await this.model.customers.findByIdAndUpdate(
          { _id: sender },
          {
            ...(!type) && {
              connection_id: find_connection_id._id
            }
          },
        );
      } else if (scope === 'driver') {
        console.log('####### update driver connection');
        console.log('####### find_connection_id', find_connection_id)
        await this.model.drivers.findByIdAndUpdate(
          { _id: sender },
          {
            ...(!type) && {
              connection_id: find_connection_id._id
            }
          },
        );
      } else {
        await this.model.admin.findByIdAndUpdate(
          { _id: sender },
          {
            ...(!type) && {
              connection_id: find_connection_id._id
            }
          },
        );
      }
      return find_connection_id._id;
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async createConnectionWithDispatcher(receiver: string, sender: string, scope: string, booking?: string) {
    try {
      console.log(receiver, '<---receiver');

      let query: any = {
        ...(booking) && {
          booking_id: booking
        }
      }
      if (scope == "driver") {
        query = {
          ...query,
          driver_id: receiver,
          dispatcher_id: sender,

        }
      } else {
        query = {
          ...query,
          customer_id: receiver,
          dispatcher_id: sender,
        }
      }
      console.log(query, '<---query');

      let connection = await this.model.connections.findOne(query, {}, { lean: true })
      console.log(connection, '<----connection');

      if (!connection) {
        connection = await this.model.connections.create({
          ...query,
          created_at: +new Date()
        })
      }
      return connection?._id
    } catch (error) {
      throw error
    }
  }

  async get_connection(connection_id) {
    try {
      let connection = await this.model.connections.findOne({ _id: connection_id });
      if (!connection) {
        return { message: 'connection not found' };
      } else {
        return connection;
      }
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async send_message(
    connection,
    receiver,
    message,
    scope,
    booking_id,
    user_id,
    chat_type
  ) {
    try {
      const dataToSave = {
        connection_id: connection,
        receiver: receiver,
        sent_by: scope,
        message: message,
        sender: user_id,
        booking_id, chat_type,
        created_at: Date.now()
      }
      console.log(dataToSave, '<------datatosave');

      const add_message = await this.model.chats.create(dataToSave);
      console.log(scope, '<----send_by');
      await this.sendNotification(scope, receiver, connection, message, booking_id, user_id)

      return add_message;
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async sendNotification(scope: string, receiver: string, connection_id: string, message: string, booking_id: string, user_id: string) {
    try {
      let data; let check_connection_id; let key_1
      if (scope === 'driver') {
        check_connection_id = await this.model.customers.findOneAndUpdate(
          { _id: new mongosse.Types.ObjectId(receiver) },
          { connection_id: connection_id }
        );
        if (!check_connection_id) {
          check_connection_id = await this.model.admin.findOneAndUpdate(
            { _id: new mongosse.Types.ObjectId(receiver) },
            { connection_id: connection_id }
          );
        }
        if (!check_connection_id?.connection_id) {
          key_1 = 'message_driver';
        }
        data = {
          booking: booking_id ?? null,
          type: "chat",
          sender: user_id, scope,
          connection_id: connection_id
        }
      } else if (scope === 'customer') {
        check_connection_id = await this.model.drivers.findOneAndUpdate(
          { _id: new mongosse.Types.ObjectId(receiver) },
          { connection_id: connection_id }
        );;
        if (!check_connection_id) {
          check_connection_id = await this.model.admin.findOneAndUpdate(
            { _id: new mongosse.Types.ObjectId(receiver) },
            { connection_id: connection_id }
          );
        }
        if (!check_connection_id?.connection_id) {
          key_1 = 'message_customer';
        }
        data = {
          booking: booking_id ?? null,
          type: "chat",
          sender: user_id, scope,
          connection_id: connection_id
        }
      } else {
        check_connection_id = await this.model.drivers.findOneAndUpdate(
          { _id: new mongosse.Types.ObjectId(receiver) },
          { connection_id: connection_id }
        )
        if (!check_connection_id) {
          check_connection_id = await this.model.customers.findOneAndUpdate(
            { _id: new mongosse.Types.ObjectId(receiver) },
            { connection_id: connection_id }
          )
        }
        if (!check_connection_id?.connection_id) {
          key_1 = 'message_dispatcher';
        }
        data = {
          booking: booking_id ?? null,
          type: "support_chat",
          sender: user_id, scope,
          connection_id: connection_id
        }
        console.log(data, '<---data');

      }
      let fcm_token = await this.model.sessions.find({
        user_id: check_connection_id?._id, fcm_token: { $ne: null }
      });
      const message_title = await this.commonService.localization(
        check_connection_id?.preferred_language ?? "english",
        key_1,
      );
      // for (const fcmtoken of fcm_token) {
      let push_data = {
        title: message_title[check_connection_id?.preferred_language] ?? 'A new message received!',
        message: message,
      };

      const tokens = await fcm_token.reduce((prev, curr) => {
        if (curr.fcm_token && curr.fcm_token.length > 100) prev.push(curr.fcm_token)
        return prev
      }, [])
      try {
        await this.notification.send_notification(
          push_data,
          tokens,
          data,
        );
      } catch (error) {
        console.log(error, "notificaiton fail---->");

      }

      // }
    } catch (error) {
      throw error
    }
  }

  async getAllMessage(connection_id: string) {
    try {
      const data = await this.model.chats.find({
        connection_id: new mongosse.Types.ObjectId(connection_id), /* booking_id: booking_id */
      });
      const connection = await this.model.connections.findById({
        _id: new mongosse.Types.ObjectId(connection_id), /* booking_id: booking_id */
      });
      return { data, is_exit_chat: connection?.is_exit_chat ?? false };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async markAllMsg(user_id: string, connection_id: string) {
    try {
      const query = {
        receiver: new mongosse.Types.ObjectId(user_id),
        connection_id: new mongosse.Types.ObjectId(connection_id)
      };
      return await this.model.chats.updateMany(
        query,
        { read: true }
      )
    } catch (error) {
      throw error
    }
  }

  async read_Message(connection_id: string, user_id: string) {
    try {
      console.log(user_id, '<---receiver');

      let update = await this.model.chats.updateMany({
        connection_id: new mongosse.Types.ObjectId(connection_id),
        receiver: new mongosse.Types.ObjectId(user_id), read: false
      }, { read: true })
      console.log(update, '<---mark as read');
      return update
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async leave_connection(id, scope, connection_id: string) {
    try {
      const connection = await this.model.connections.findById({ _id: new mongosse.Types.ObjectId(connection_id) })
      if (connection.chat_type == chat_type.booking) {
        if (scope === 'customer') {
          await this.model.customers.updateOne(
            { _id: id },
            { connection_id: null },
          );
        } else if (scope === 'staff') {
          await this.model.admin.updateOne(
            { _id: id },
            { connection_id: null },
          );
        } else {
          await this.model.drivers.updateOne(
            { _id: id },
            { connection_id: null },
          );
        }
      }
      return { message: 'connection leave successfully' };
    } catch (error) {
      console.log('error', error);
    }
  }

  async findCustomer(id, scope?) {
    try {
      let data
      if (scope == 'staff') {
        data = await this.model.admin.findById({ _id: new mongosse.Types.ObjectId(id) });
      } else if (scope == 'driver') {
        data = await this.model.drivers.findById({ _id: new mongosse.Types.ObjectId(id) });
      } else {
        data = await this.model.customers.findById({ _id: new mongosse.Types.ObjectId(id) });
      }
      return data;
    } catch (error) {
      throw error;
    }
  }

  async findReceiver(id: string) {
    try {
      let data
      let admin = await this.model.admin.findById(id)
      if (!admin) {
        const driver = await this.model.drivers.findById(id)
        if (!driver) {
          data = await this.model.customers.findById(id)
        } else {
          data = driver
        }
      } else {
        data = admin
      }

      return data
    } catch (error) {
      throw error;
    }
  }

  async findDispatcher(id) {
    try {
      const data = await this.model.admin.findOne({ _id: id });
      return data;
    } catch (error) {
      throw error;
    }
  }

  async findDriver(id, scope?) {
    try {
      let data
      if (scope == 'staff') {
        data = await this.model.admin.findOne({ _id: id });
      } else if (scope == 'customer') {
        data = await this.model.customers.findOne({ _id: id });
      } else {
        data = await this.model.drivers.findOne({ _id: id });
      }
      return data;
    } catch (error) {
      throw error;
    }
  }

  async bookingDetail(id) {
    try {
      const booking = await this.model.booking.findById({ _id: new mongosse.Types.ObjectId(id) });
      return booking;
    } catch (error) {
      throw error;
    }
  }

  async unreadMessageCount(scope, user_id: string, booking_id: string) {
    try {

      let booking_chat_count = await this.model.chats.countDocuments({
        receiver: new mongosse.Types.ObjectId(user_id), read: false,
        booking_id: new mongosse.Types.ObjectId(booking_id), chat_type: chat_type.booking
      })

      let support_chat_count = await this.model.chats.countDocuments({
        receiver: new mongosse.Types.ObjectId(user_id), read: false, chat_type: chat_type.support,
        $or: [
          { booking_id: null },
          { booking_id: { $exists: false } }
        ]
      })

      let support_booking_chat_count = await this.model.chats.countDocuments({
        receiver: new mongosse.Types.ObjectId(user_id), read: false,
        booking_id: new mongosse.Types.ObjectId(booking_id), chat_type: chat_type.support
      })

      let user
      if (scope === 'driver') {
        user = await this.model.drivers.findOne({ _id: new mongosse.Types.ObjectId(user_id) })
      } else if (scope === 'customer') {
        user = await this.model.customers.findOne({ _id: new mongosse.Types.ObjectId(user_id) })
      } else {
        user = await this.model.admin.findOne({ _id: new mongosse.Types.ObjectId(user_id) })
      }
      return { booking_chat_count, support_chat_count, support_booking_chat_count, user }
    } catch (error) {
      console.log("error from unreadMessageCount ===>", error);
      throw error
    }
  }

  async connetionList(body: ChatListDto, dispatcher_id: string) {
    try {
      const options = await this.commonService.set_options(+body.pagination, +body.limit)
      const pipeline = await this.aggregator.getListOfChat(dispatcher_id, body.search, options.skip, options.limit)
      const data = await this.model.connections.aggregate(pipeline)
      return { data: data[0]?.data, count: data[0]?.count[0]?.count ?? 0 }
      return { data }
    } catch (error) {
      console.log(error);
      throw error
    }
  }

  async findAllDispatcherToExitSession(id: string) {
    try {
      const dispatchers = await this.model.admin.find({
        _id: { $ne: new mongosse.Types.ObjectId(id) },
        roles: { $in: [StaffRoles.dispatcher] },
      })
      const socketIds = dispatchers.map((res) => { if (res.socket_id) { return res.socket_id } }).filter(Boolean);
      return { socketIds, dispatchers }
    } catch (error) {
      console.log(error);
    }
  }

  async findAllDispatcher() {
    try {
      const dispatchers = await this.model.admin.find({ roles: { $in: [StaffRoles.dispatcher] } })
      const socketIds = dispatchers.map((res) => { if (res.socket_id) { return res.socket_id } }).filter(Boolean);
      return { socketIds, dispatchers }
    } catch (error) {
      console.log(error);
    }
  }

  async updateConnection(connection_id: string, last_msg: string, dispatcher_id?: string) {
    try {
      return await this.model.connections.findByIdAndUpdate(connection_id, {
        receiver: dispatcher_id, last_message: last_msg, updated_at: +new Date()
      }, { new: true })
      // .populate([{ path: 'driver_id' }, { path: 'customer_id' }, { path: 'dispatcher_id', select: '-password' }])
    } catch (error) {
      console.log(error);
      throw error
    }
  }

  async updateChat(connection_id: string, dispatcher_id: string) {
    try {
      return await this.model.chats.updateMany({
        connection_id: new mongosse.Types.ObjectId(connection_id),
        receiver: null
      }, {
        receiver: dispatcher_id
      }, { new: true })
      // .populate([{ path: 'driver_id' }, { path: 'customer_id' }, { path: 'dispatcher_id', select: '-password' }])
    } catch (error) {
      console.log(error);
      throw error
    }
  }

  async injectWithRef(sender: string, booking: string, connection: string, scope: string) {
    try {
      if (booking) {
        return await this.model.booking.findOneAndUpdate({ _id: new mongosse.Types.ObjectId(booking) },
          {
            ...(scope == 'driver') && {
              connection_driver: connection
            },
            ...(scope == 'customer') && {
              connection_customer: connection
            }
          }
        )
      } else {
        if (scope == 'driver') {
          return await this.model.drivers.findOneAndUpdate({ _id: new mongosse.Types.ObjectId(sender) },
            { support_connection: connection }
          )
        } else {
          return await this.model.customers.findOneAndUpdate({ _id: new mongosse.Types.ObjectId(sender) },
            { support_connection: connection })
        }
      }
    } catch (error) {
      throw error
    }
  }

  async closeChat(connection_id: string, user_id: string, scope: string) {
    try {
      const connection = await this.model.connections.findByIdAndUpdate(connection_id,
        { is_exit_chat: true, updated_at: +new Date() },
        { new: true }
      )
      console.log(connection, '<---connection');
      await this.model.chats.updateMany({ connection_id: connection?._id }, { read: true })
      const chats = await this.model.chats.find({ connection_id: connection?._id })

      let sendTo
      if (connection.initiated_by == "driver") {
        sendTo = await this.model.drivers.findById(connection.sender)
      }
      else if (connection.initiated_by == "customer") {
        sendTo = await this.model.customers.findById(connection.sender)
      }
      else {
        sendTo = await this.model.customers.findById(connection.receiver)
        if (!sendTo) {
          sendTo = await this.model.drivers.findById(connection.receiver)
        }
      }
      const formattedChats = chats.map(chat => ({
        message: chat?.message,
        sender: chat?.sender == user_id ? "Tiptop Support" : sendTo?.name,
        receiver_type: chat?.sender == user_id ? "Tiptop Support" : undefined,
      }));

      this.emailService.sendAllMshHistory(sendTo?.email, sendTo?.name, formattedChats)
      if (connection?.booking_id) {
        await this.model.booking.findByIdAndUpdate(connection?.booking_id, {
          ...(connection.initiated_by == 'driver') && { connection_driver: null },
          ...(connection.initiated_by == 'customer') && { connection_customer: null },
        }
        )
      };
      let user;
      if (String(connection?.receiver) == user_id) {
        user = await this.model.customers.findByIdAndUpdate(connection?.sender, { support_connection: null })
        if (!user) {
          user = await this.model.drivers.findByIdAndUpdate(connection?.sender, { support_connection: null })
        }
      } else {
        user = await this.model.customers.findByIdAndUpdate(connection?.receiver, { support_connection: null })
        if (!user) {
          user = await this.model.drivers.findByIdAndUpdate(connection?.receiver, { support_connection: null })
        }
      }

      sendTo.support_connection = null;
      sendTo.connection_id = null;
      await sendTo.save();

      return { connection, user }
    } catch (error) {
      console.log(error, '<---from chatClose');

    }
  }
}
