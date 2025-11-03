import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";



export class addVehicleDto {
    @ApiProperty()
    vehicle_id: string

    @ApiProperty()
    commission_percentage: number

    @ApiProperty()
    base_fare: number

    @ApiProperty({ default: [{ min_range: 0, max_range: 0, price: 0 }] })
    distance_price: []

    @ApiProperty()
    surcharge_price: number

    @ApiProperty()
    stop_charges: number

    @ApiProperty()
    gst_percentage: number

    @ApiProperty()
    child_seat_charges: number;

    @ApiProperty()
    wheel_chair_charges: number;

    @ApiProperty()
    child_capsule_charges: number;

    @ApiProperty()
    passenger: number;

    @ApiProperty()
    luggage: number;

    @ApiProperty()
    handbags: number;

}

export class findVehicleDto {
    @ApiPropertyOptional()
    search?: string;

    @ApiProperty()
    page: number

    @ApiProperty()
    limit: number
}
