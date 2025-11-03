import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from 'mongoose';
import * as moment from "moment";
@Schema()
export class Vehicle_types {
    @Prop({ default: null })
    vehicle_type: string

    @Prop({ default: null })
    image: string

    @Prop({ default: [] })
    seating_options: []

}
export type Vehicle_typesDocment = HydratedDocument<Vehicle_types>;
export const Vehicle_typesModel = SchemaFactory.createForClass(Vehicle_types);