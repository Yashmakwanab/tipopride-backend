import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import * as moment from "moment";
import mongoose, { HydratedDocument } from 'mongoose';
import { UsersType } from "src/auth/role/user.role";
@Schema()
export class Admin {

  @Prop({ enum: UsersType.Staff })
  type: string

  @Prop({ default: null, trim: true })
  name: string

  @Prop({ default: null, lowercase: true, unique: true, trim: true })
  email: string;

  @Prop({ default: null, trim: true })
  password: string;

  @Prop({ default: null })
  image: string;

  @Prop({ default: UsersType.Staff })
  user_type: string;

  @Prop({ default: 0 })
  total_tax_pay: number;

  @Prop({ type: [String], default: null })
  roles: string[];

  @Prop({ default: true })
  is_active: boolean;

  @Prop({ default: false })
  superAdmin: boolean;

  @Prop({ default: null, trim: true })
  country_code: string;

  @Prop({ default: null, trim: true })
  phone: string;

  @Prop({ default: null })
  socket_id: string

  @Prop({ type: mongoose.Types.ObjectId, default: null })
  connection_id: string

  @Prop({ type: mongoose.Types.ObjectId, default: null })
  support_connection: string

  @Prop({ default: false })
  is_deleted: boolean;

  @Prop({ type: Number, default: moment().utc().valueOf() })
  created_at: number;

  @Prop({ type: Number, default: null })
  updated_at: number;

  @Prop({ type: Number, default: null })
  deleted_at: number;
}

export type AdminDocment = HydratedDocument<Admin>;
export const AdminModel = SchemaFactory.createForClass(Admin);


