import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsMongoId, IsBoolean, IsNumber, IsNotEmpty } from "class-validator";
import { Transform } from "class-transformer";
import { PayToDriver } from "../schema/booking.schema";


class Stop {
    @ApiProperty()
    name: string;

    @ApiProperty()
    lat: string;

    @ApiProperty()
    long: string;
}
export enum Status {
    Drivers = "drivers",
    AvailableNow = "available_now",
}

export enum requestStatus {
    Ride = "ride",
    Parcel = "parcel",
}

export enum paymentMethod {
    Card = "card",
    Wallet = "wallet",
}

class CompanyPassenger {
    @ApiProperty({ example: 'Amitabh' })
    @IsString()
    name: string;

    @ApiProperty({ example: '+91' })
    country_code: string;

    @ApiProperty({ example: '9899999999' })
    @IsString()
    number: string;

    @ApiProperty({ example: 'text' })
    @IsString()
    notes?: string;
}

export class CreateBookingDto {
    @ApiProperty()
    pickup_address: string;

    @ApiProperty()
    drop_address: string;

    @ApiProperty()
    pick_up_lat: string;

    @ApiProperty()
    pick_up_long: string;

    @ApiProperty()
    drop_lat: string;

    @ApiProperty()
    drop_long: string;

    @ApiProperty({ type: [Stop] })
    stops: Stop[];

    @ApiProperty()
    vehicle_id: string;

    @ApiProperty({ type: String, default: paymentMethod.Card })
    payment_method: paymentMethod;

    @ApiProperty()
    coupon_id: string;

    @ApiProperty({ type: [String] })
    filter: string[];

    @ApiProperty({ enum: requestStatus, default: requestStatus.Ride })
    request_type: requestStatus;

    @ApiProperty()
    sender_name: string;

    @ApiProperty()
    sender_country_code: string;

    @ApiProperty()
    sender_number: string;

    @ApiProperty()
    receiver_name: string;

    @ApiProperty()
    receiver_country_code: string;

    @ApiProperty()
    receiver_number: string;

    @ApiProperty()
    parcel_details: string;

    @ApiProperty()
    flight_number: string;

    @ApiProperty()
    notes: string;

    @ApiProperty()
    luggage: number;

    @ApiProperty()
    handbags: number;

    @ApiProperty()
    passenger: number;

    @ApiProperty()
    no_of_wheelchair: number;

    @ApiProperty()
    no_of_childseat: number;

    @ApiProperty()
    no_of_childcapsule: number;

    @ApiProperty({ default: false })
    include_airport_toll: boolean
}

export class ScheduleBookingDto {
    @ApiProperty()
    pickup_address: string;

    @ApiProperty()
    drop_address: string;

    @ApiProperty()
    pick_up_lat: string;

    @ApiProperty()
    pick_up_long: string;

    @ApiProperty()
    drop_lat: string;

    @ApiProperty()
    drop_long: string;

    @ApiProperty({ type: [Stop] })
    stops: Stop[];

    @ApiProperty()
    scheduled_date: number;

    @ApiProperty({ default: "schedule" })
    booking_type: string;

    @ApiProperty()
    vehicle_id: string;

    @ApiProperty()
    vehicle_name: string;

    @ApiProperty()
    base_fee: string;

    @ApiProperty()
    payment_method: string;

    @ApiProperty()
    flight_number: string;

    @ApiProperty()
    notes: string;

    @ApiProperty()
    coupon_id: string;

    @ApiProperty()
    luggage: number;

    @ApiProperty()
    handbags: number;

    @ApiProperty()
    passenger: number;

    @ApiProperty({ type: [String] })
    filter: string[];

    @ApiProperty()
    no_of_wheelchair: string;

    @ApiProperty()
    no_of_childseat: string;

    @ApiProperty()
    no_of_childcapsule: string;

    @ApiProperty({ default: false })
    include_airport_toll: boolean

    @ApiProperty({ default: null })
    company_passenger?: CompanyPassenger
}



export class CreateBookingByDispatcherDto extends ScheduleBookingDto {
    @ApiProperty({ required: false })
    company_id?: string;

    @ApiProperty({ required: false })
    name: string;

    @ApiProperty({ required: false })
    email: string;

    @ApiProperty({ required: false })
    country_code: string;

    @ApiProperty({ required: false })
    phone: string;

    @ApiProperty({ type: Number, required: false })
    invoice_number?: number;

    @ApiProperty({ type: Number, required: false })
    transaction_number?: number;

    @ApiProperty({ type: Number, required: false })
    amount_for_driver?: number;

    @ApiProperty({ type: Number, required: false })
    total_amount?: number;

    @ApiProperty({ default: false })
    include_airport_toll: boolean

    @ApiProperty({})
    company_passenger?: CompanyPassenger

}

export class CreateBookingByWebApp extends ScheduleBookingDto {

    @ApiProperty({ required: false })
    name: string;

    @ApiProperty({ required: false })
    email: string;

    @ApiProperty({ required: false })
    country_code: string;

    @ApiProperty({ required: false })
    phone: string;

}


export class UpdateTipPaymentTypeDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    tip: number;

    @ApiProperty()
    payment_type: string;
}

export class findBookingListDto {
    @ApiProperty()
    id: string;
}

export class supportMsgDto {
    @ApiProperty()
    msg: string
    @ApiProperty()
    message: string
    @ApiProperty()
    booking_id: string
}

export class CalculateVehiclePriceDto {
    @ApiProperty()
    pick_up_lat: string;

    @ApiProperty()
    pick_up_long: string;

    @ApiProperty()
    drop_lat: string;

    @ApiProperty()
    drop_long: string;

    @ApiProperty({ type: [Stop] })
    stops: Stop[];

    @ApiProperty({ type: [String] })
    filter: string[];

    @ApiProperty()
    no_of_wheelchair: number;

    @ApiProperty()
    no_of_childseat: number;

    @ApiProperty()
    no_of_childcapsule: number;

    @ApiProperty({ default: false })
    include_airport_toll: boolean
}

export class UpdateBookingDto {
    @ApiProperty({ type: [Stop] })
    stops: Stop[];

    @ApiProperty({ type: Number })
    invoice_number: number;

    @ApiProperty({ type: Number })
    transaction_number: number;
}

export class AddtipDto {
    @ApiProperty()
    tip_amount: number;
}
export enum BookingStatus {
    Current = "current",
    Past = "past",
}
export class BookingStatusDto {
    @ApiProperty({ required: false, enum: BookingStatus })
    status: string;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;
}

export class driverResponseDto {
    @ApiProperty()
    driverId: string;

    @ApiProperty()
    response: string;

    @ApiProperty()
    booking_id: string;
}

export class CancelBookingDto {
    @ApiPropertyOptional()
    cancelled_reason: string;
}
export class ConfirmStopsDto {
    @ApiProperty()
    status: string;

    @ApiProperty()
    stop_address: string;
}
export class AvailableCouponDto {
    @ApiProperty()
    amount: number;

    @ApiPropertyOptional()
    search?: string;
}
export class findBookingDto {
    @ApiProperty({
        default: "accepted",
        enum: ["accepted", "completed", "cancelled", "failed", "scheduled"],
    })
    status: "accepted" | "completed" | "cancelled" | "failed" | 'scheduled';

    @ApiPropertyOptional()
    search?: string;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;
}

export class RideStatus {
    @ApiProperty()
    booking_id: string;

    @ApiProperty()
    otp: number;

    @ApiProperty({
        default: "reached_at_pickup",
        enum: [
            "reached_at_pickup",
            "start_ride",
            "reached_at_stop_1",
            "started_from_Stop_1",
            "reached_at_stop_2",
            "started_from_Stop_2",
            "ride_completed",
        ],
    })
    status:
        | "reached_at_pickup"
        | "start_ride"
        | "reached_at_stop_1"
        | "started_from_Stop_1"
        | "reached_at_stop_2"
        | "started_from_Stop_2"
        | "ride_completed" = "ride_completed";
}

export class AssignDriverDto {
    @ApiProperty({ required: true })
    driver_id: string;
}

export enum DispatcherBookingStatus {
    upcoming = "upcoming",
    ongoing = "ongoing",
    completed = "completed",
    AssignByMe = "assign_by_me",
    AssignForBooking = "assign_for_bookings",
}

export class DispatcherGetBookingsDto {
    @ApiProperty({
        enum: DispatcherBookingStatus,
        default: DispatcherBookingStatus.upcoming,
    })
    status: string;



    @ApiProperty({ required: false })
    company_id: string;

    @ApiProperty({ required: false })
    payment_status: string;

    @ApiPropertyOptional({})
    search: string

    @ApiProperty({ default: 1 })
    pagination: number;

    @ApiProperty({ default: 10 })
    limit: number;
}

export class DriverIdDto {
    @ApiProperty({ enum: Status, default: Status.Drivers })
    status: Status;

    @ApiProperty({ required: false })
    id: string;

    @ApiPropertyOptional()
    search: string;

    @ApiPropertyOptional()
    vehicle_id: string;


    @ApiProperty({ default: 1 })
    pagination: number;

    @ApiProperty({ default: 10 })
    limit: number;
}


export class sendMail {
    @ApiProperty()
    name: string

    @ApiProperty()
    email: string

    @ApiProperty()
    otp: string

    @ApiProperty()
    waiting_charge: string
}


export class NotifyDto {

    @ApiProperty()
    fcm_token: string

    @ApiProperty()
    title: string

    @ApiProperty()
    description: string

    @ApiProperty()
    type: string
    @ApiProperty()
    id: string
    @ApiProperty()
    clickAction: string
}

export class DriverListOnDispatcherForAssignDto {
    // @ApiProperty({ enum: Status, default: Status.Drivers })
    // status: Status;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsMongoId()
    booking_id: string;

    @Transform(({ value }) => parseInt(value))
    @ApiProperty({ required: false, default: 1 })
    @IsNumber()
    @IsOptional()
    pagination: number;

    @Transform(({ value }) => parseInt(value))
    @ApiProperty({ required: false, default: 10 })
    @IsNumber()
    @IsOptional()
    limit: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    search?: string;

}

export class BookingPaidUnpaidListDto {
    @ApiProperty({ enum: PayToDriver, default: PayToDriver.Paid })
    @IsEnum(PayToDriver)
    status: PayToDriver;

    @Transform(({ value }) => parseInt(value))
    @ApiProperty({ required: false, default: 1 })
    @IsNumber()
    @IsOptional()
    pagination: number;

    @Transform(({ value }) => parseInt(value))
    @ApiProperty({ required: false, default: 10 })
    @IsNumber()
    @IsOptional()
    limit: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    search?: string;

}